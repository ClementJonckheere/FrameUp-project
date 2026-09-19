import {chromium,firefox} from 'playwright';
import {mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {serve} from './server.mjs';
import {Relay} from './relay.mjs';

const password='J0-fictional-vault-password-only';
const root=resolve('test-profiles');await mkdir(root,{recursive:true});await mkdir('reports',{recursive:true});
const server=await serve(4173);const results=[];const versions={};const contexts=new Set();
const started=new Date().toISOString();
const implementations={chromium,firefox};
async function launch(type,name,fresh=true){
  const path=resolve(root,name);if(fresh)await rm(path,{recursive:true,force:true});
  console.log('LAUNCH',type,name);
  const ctx=await implementations[type].launchPersistentContext(path,{headless:true,timeout:20000,viewport:{width:1000,height:700}});
  contexts.add(ctx);const page=ctx.pages()[0]||await ctx.newPage();
  page.setDefaultTimeout(20000);await page.goto('http://127.0.0.1:4173');
  await page.waitForFunction(()=>window.j0Ready===true);
  versions[type]=await page.evaluate(()=>navigator.userAgent);
  return {ctx,page,type,name};
}
const call=(actor,method,...args)=>actor.page.evaluate(async({method,args})=>window.j0[method](...args),{method,args});
const dispose=async actor=>{await actor.ctx.close();contexts.delete(actor.ctx);};
async function pass(id,fn){
  const t=Date.now();try{const detail=await fn();results.push({id,status:'PASS',ms:Date.now()-t,...(detail?{detail}: {})});console.log('PASS',id);return true;}
  catch(e){results.push({id,status:'FAIL',ms:Date.now()-t,error:e.message.split('\n')[0].slice(0,350)});console.log('FAIL',id,e.message.split('\n')[0]);return false;}
}
async function reject(fn,expected){
  let error;try{await fn();}catch(e){error=e;}
  assert.ok(error,'Expected rejection');
  if(expected)assert.match(error.message,expected);
  return error.message.split('\n')[0];
}
async function groupPair(typeA,typeB,prefix){
  const a=await launch(typeA,prefix+'A'),b=await launch(typeB,prefix+'B');
  const ai=await call(a,'create',prefix+'A',password),bi=await call(b,'create',prefix+'B',password);
  assert.notEqual(ai.mlsPublic,bi.mlsPublic);
  await call(a,'group',prefix+'-project');const kp=await call(b,'keyPackage');
  const inspected=await call(a,'packageInfo',kp);assert.equal(inspected.deviceId,bi.deviceId);assert.equal(Buffer.from(inspected.signaturePublic).toString('base64'),bi.mlsPublic);
  const add=await call(a,'add',kp);
  await call(b,'join',add.welcome);return {a,b,ai,bi};
}
try{
  for(const type of ['chromium','firefox']){
    let actor;
    try{actor=await launch(type,'crypto-'+type);}
    catch(e){results.push({id:type+'/browser',status:'BLOCKED',error:e.message.slice(0,1800)});console.log('BLOCKED',type,e.message.split('\n')[0]);continue;}
    await pass(type+'/identity-recovery',async()=>{
      const detail=await call(actor,'runCryptoTests');
      return {checks:detail.checks,wordCount:detail.wordCount};
    });
    await dispose(actor);
  }
  for(const [ta,tb] of [['chromium','chromium'],['firefox','firefox'],['chromium','firefox']]){
    const prefix=ta+'-'+tb;
    if(!versions[ta]||!versions[tb]){results.push({id:prefix+'/MLS',status:'BLOCKED',error:'Browser unavailable'});continue;}
    let pair;
    if(!await pass(prefix+'/MLS-01-join',async()=>{pair=await groupPair(ta,tb,prefix);assert.equal((await call(pair.a,'info')).epoch,(await call(pair.b,'info')).epoch);})){continue;}
    let {a,b,ai,bi}=pair;
    await pass(prefix+'/MLS-02-exchange',async()=>{
      const event=await call(a,'send','fictional-canary-alpha');
      const received=await call(b,'receive',event.bytes);
      assert.equal(new TextDecoder().decode(Uint8Array.from(received.bytes)),'fictional-canary-alpha');
      const response=await call(b,'send','fictional-canary-beta');
      assert.equal(new TextDecoder().decode(Uint8Array.from((await call(a,'receive',response.bytes)).bytes)),'fictional-canary-beta');
    });
    await pass(prefix+'/VAULT-01-ciphertext-at-rest',async()=>{
      const stored=JSON.stringify(await call(a,'inspect'));
      assert.ok(!stored.includes('fictional-canary-alpha'));assert.ok(!stored.includes('privateJwk'));assert.ok(!stored.includes('"mls"'));
      assert.ok(stored.includes('ciphertext'));
    });
    await pass(prefix+'/VAULT-02-second-tab',async()=>{
      const other=await a.ctx.newPage();await other.goto('http://127.0.0.1:4173');await other.waitForFunction(()=>window.j0Ready);
      await reject(()=>other.evaluate(async({name,password})=>window.j0.unlock(name,password),{name:ai.deviceId,password}),/DEVICE_ALREADY_OPEN/);await other.close();
    });
    await pass(prefix+'/MLS-03-browser-restart',async()=>{
      const name=b.name;await dispose(b);b=await launch(tb,name,false);await call(b,'unlock',bi.deviceId,password);
      const event=await call(a,'send','after-full-restart');
      assert.equal(new TextDecoder().decode(Uint8Array.from((await call(b,'receive',event.bytes)).bytes)),'after-full-restart');
    });
    await pass(prefix+'/MLS-04-out-of-order-and-replay',async()=>{
      const one=await call(a,'send','first'),two=await call(a,'send','second');
      assert.equal((await call(b,'receive',two.bytes)).kind,'application');
      assert.equal((await call(b,'receive',one.bytes)).kind,'application');
      assert.equal((await call(b,'receive',one.bytes)).kind,'duplicate');
    });
    await pass(prefix+'/FAULT-01-durable-outbox',async()=>{
      await reject(()=>call(a,'send','persisted-before-transmit',{fault:'after-persist'}),/INJECTED_CRASH/);
      const name=a.name;await dispose(a);a=await launch(ta,name,false);await call(a,'unlock',ai.deviceId,password);
      const event=(await call(a,'drain')).at(-1);
      const relay=new Relay();relay.put(event); // transport accepted, response lost
      const restored=Relay.restore(relay.snapshot());restored.put(event);
      assert.equal(restored.events.size,1);
      const received=await call(b,'receive',restored.deliver(event.id,bi.deviceId).bytes);
      assert.equal(new TextDecoder().decode(Uint8Array.from(received.bytes)),'persisted-before-transmit');
      assert.equal((await call(b,'receive',event.bytes)).kind,'duplicate');await call(a,'ack',event.id);
    });
    let c;
    await pass(prefix+'/MLS-05-add-second-device',async()=>{
      c=await launch(ta,prefix+'A2');await call(c,'create',prefix+'A2',password);
      const kp=await call(c,'keyPackage');
      // Inject a failure after persistence, then close and restart the browser.
      await reject(()=>call(a,'add',kp,{fault:'after-persist'}),/INJECTED_CRASH/);
      const name=a.name;await dispose(a);a=await launch(ta,name,false);await call(a,'unlock',ai.deviceId,password);
      const add=(await call(a,'drain')).at(-1);assert.equal(add.kind,'add');
      await call(b,'receive',add.bytes);await call(c,'join',add.welcome);await call(a,'ack',add.id);
      const event=await call(c,'send','third-device');assert.equal((await call(a,'receive',event.bytes)).kind,'application');assert.equal((await call(b,'receive',event.bytes)).kind,'application');
    });
    await pass(prefix+'/MLS-06-removal-cryptographic',async()=>{
      assert.ok(c);const members=(await call(a,'info')).members;
      const leaf=members.find(m=>Buffer.from(m.signaturePublic).toString('base64')===bi.mlsPublic).leaf;
      const removal=await call(a,'remove',leaf);
      await call(c,'receive',removal.bytes);
      // B is deliberately kept offline and does not receive the removal commit.
      const event=await call(a,'send','only-current-members');
      assert.equal((await call(c,'receive',event.bytes)).kind,'application');
      // B gets the exact ciphertext despite any relay ACL: crypto must reject it.
      const reason=await reject(()=>call(b,'receive',event.bytes));
      assert.doesNotMatch(reason,/LOCKED|NO_GROUP|OPERATION_BUSY/);
      return {rejection:reason};
    });
    await pass(prefix+'/MLS-07-tampered-ciphertext',async()=>{
      const event=await call(a,'send','tamper-test');const forged=[...event.bytes];forged[forged.length-1]^=1;
      const reason=await reject(()=>call(c,'receive',forged));
      assert.doesNotMatch(reason,/LOCKED|NO_GROUP|OPERATION_BUSY/);
      return {rejection:reason};
    });
    if(c)await dispose(c);await dispose(a);await dispose(b);
    await pass(prefix+'/FAULT-02-dirty-state-after-operation',async()=>{
      const d=await launch(ta,prefix+'dirty');await call(d,'create','dirty-device',password);await call(d,'group','dirty-project');
      await reject(()=>call(d,'send','unpersisted',{fault:'after-operation'}),/INJECTED_CRASH/);
      const name=d.name;await dispose(d);const restart=await launch(ta,name,false);
      let reason='';try{await call(restart,'unlock','dirty-device',password);}catch(e){reason=e.message;}
      assert.match(reason,/RECOVERY_REQUIRED/);await dispose(restart);
    });
    await pass(prefix+'/VAULT-03-wrong-passphrase',async()=>{
      const d=await launch(ta,prefix+'password');await call(d,'create','password-device',password);await call(d,'close');
      const reason=await reject(()=>call(d,'unlock','password-device','another-fictional-password'));
      assert.doesNotMatch(reason,/DEVICE_ALREADY_OPEN|VAULT_MISSING|RECOVERY_REQUIRED/);
      await call(d,'unlock','password-device',password);await dispose(d);
    });
  }
}finally{
  for(const ctx of contexts)await ctx.close().catch(()=>{});
  await new Promise(r=>server.close(r));
  let wasmHash=null;try{wasmHash=createHash('sha256').update(await readFile('web/pkg/frameup_j0_mls_bg.wasm')).digest('hex');}catch{}
  const metadata={started,finished:new Date().toISOString(),node:process.version,platform:process.platform,playwright:JSON.parse(await readFile('node_modules/playwright/package.json','utf8')).version,openmls:'0.9.0',wasmBindgen:'0.2.128',wasmSha256:wasmHash,chromiumVariant:'Playwright default Chromium headless shell',faultModel:'Injected exceptions at persistence boundaries followed by browser close/relaunch; not a power-loss simulation',browsers:versions};
  const summary={passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,blocked:results.filter(x=>x.status==='BLOCKED').length};
  const report={metadata,summary,results,unvalidated:['Production account recovery endpoint and atomic generation revocation','Complete owner recovery and group reinitialization','Protection against malicious JavaScript or complete local rollback without trusted checkpoint','Independent cryptographic review','Latest stable browser compatibility beyond recorded builds']};
  await writeFile('reports/j0-results.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(summary));
  if(summary.failed||summary.blocked)process.exitCode=1;
}
