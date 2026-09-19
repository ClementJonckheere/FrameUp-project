import init,{MlsDevice} from './pkg/frameup_j0_mls.js';
import * as C from './crypto.js';
import {Vault,acquireDeviceLock} from './vault.js';
await init('/pkg/frameup_j0_mls_bg.wasm');

let mls=null,vault=null,state=null,release=null,active=false;
async function close(){if(mls)mls.free();mls=null;if(vault)vault.close();vault=null;state=null;if(release)release();release=null;}
async function create(name,password){
  await close();release=await acquireDeviceLock(name);
  try {
    mls=new MlsDevice(name);const signing=await C.signingPair();
    state={format:1,deviceId:name,signing,mls:mls.snapshot(),outbox:[],inbox:[],seen:[]};
    vault=await Vault.create(name,password,state);
    return {deviceId:name,signingPublic:signing.publicJwk,mlsPublic:C.b64(mls.public_key())};
  }catch(e){await close();throw e;}
}
async function unlock(name,password){
  await close();release=await acquireDeviceLock(name);
  try{vault=await Vault.unlock(name,password);state=await vault.read();mls=MlsDevice.restore(state.mls);return {deviceId:name,outbox:state.outbox.length};}
  catch(e){await close();throw e;}
}
function need(){if(!vault||!mls)throw new Error('LOCKED');}
async function mutate(fn,{fault='none'}={}){
  need();if(active)throw new Error('OPERATION_BUSY');active=true;
  try{
    await vault.begin();
    if(fault==='after-dirty')throw new Error('INJECTED_CRASH');
    const result=fn();
    if(fault==='after-operation')throw new Error('INJECTED_CRASH');
    state.mls=mls.snapshot();await vault.commit(state);
    if(fault==='after-persist')throw new Error('INJECTED_CRASH');
    return result;
  }catch(e){await close();throw e;}finally{active=false;}
}
async function keyPackage(){return mutate(()=>Array.from(mls.key_package()));}
async function packageInfo(kp){need();return JSON.parse(mls.key_package_info(Uint8Array.from(kp)));}
async function group(id){return mutate(()=>{mls.create_group(id);return JSON.parse(mls.info());});}
async function add(kp,options){return mutate(()=>{
  const result={id:crypto.randomUUID(),...JSON.parse(mls.add(Uint8Array.from(kp)))};
  state.outbox.push({id:result.id,kind:'add',bytes:result.commit,welcome:result.welcome});return result;
},options);}
async function join(welcome){return mutate(()=>{mls.join(Uint8Array.from(welcome));return JSON.parse(mls.info());});}
async function remove(leaf,options){return mutate(()=>{
  const result={id:crypto.randomUUID(),kind:'remove',bytes:Array.from(mls.remove(leaf))};state.outbox.push(result);return result;
},options);}
async function send(message,options){return mutate(()=>{
  const event={id:crypto.randomUUID(),bytes:Array.from(mls.send(C.bytes(message)))};
  state.outbox.push(event);return event;
},options);}
async function receive(wire,options){
  need();const id=await C.digest(Uint8Array.from(wire));
  if(state.seen.includes(id))return {kind:'duplicate'};
  return mutate(()=>{const result=JSON.parse(mls.receive(Uint8Array.from(wire)));state.seen.push(id);state.inbox.push(result);return result;},options);
}
async function drain(){need();return structuredClone(state.outbox);}
async function ack(id){return mutate(()=>{state.outbox=state.outbox.filter(x=>x.id!==id);return true;});}
async function inspect(){need();return vault.inspect();}
async function info(){need();return JSON.parse(mls.info());}
async function runCryptoTests(){
  const checks=[];
  async function check(id,fn){await fn();checks.push(id);}
  function assert(ok,msg){if(!ok)throw new Error(msg);}
  async function rejects(fn){try{await fn();}catch{return;}throw new Error('EXPECTED_REJECTION');}
  const kit=await C.createKit();const identity=await C.recoverIdentity(kit.words,kit.bundle);
  const fp=await C.fingerprint(identity.publicJwk);
  await check('REC-01',async()=>assert(kit.words.split(' ').length===24 && fp===await C.fingerprint(kit.bundle.identityPublic),'IDENTITY_ROUNDTRIP'));
  await check('REC-02',()=>rejects(()=>C.recoverIdentity(Array(24).fill('abandon').join(' '),kit.bundle)));
  const other=await C.createKit();
  await check('REC-03',()=>rejects(()=>C.recoverIdentity(other.words,kit.bundle)));
  await check('REC-04',()=>rejects(()=>C.recoverWithWrongPurpose(kit.words,kit.bundle)));
  const archiveSecret=C.random(32), archiveKey=await C.aes(archiveSecret);
  const document=await C.encrypt(archiveKey,{text:'archive-canary'}, {project:'P',version:1});
  const packet=await C.backupArchives(kit.words,kit.bundle.accountId,[C.b64(archiveSecret)]);
  const recovered=await C.recoverArchives(kit.words,kit.bundle.accountId,packet);
  await check('REC-05',async()=>assert((await C.decrypt(await C.aes(C.unb64(recovered.archiveKeys[0])),document,{project:'P',version:1})).text==='archive-canary','ARCHIVE_ROUNDTRIP'));
  await check('REC-06',()=>rejects(()=>C.recoverArchives(kit.words,kit.bundle.accountId,kit.bundle.identityVault)));
  await check('REC-07',()=>rejects(()=>C.recoverArchives(kit.words,kit.bundle.accountId,{...packet,ciphertext:packet.ciphertext.slice(0,-8)+'AAAAAAAA'})));
  await check('REC-08',()=>rejects(()=>C.decrypt(archiveKey,document,{project:'Q',version:1})));
  const policy={domain:'frameup-j0/policy/v1',projectId:'P',version:2,ownerAccount:kit.bundle.accountId,members:[{id:kit.bundle.accountId,role:'owner'}]};
  const signed=await C.issuePolicy(identity.privateJwk,policy);
  const expected={projectId:'P',minimumVersion:2,ownerFingerprint:fp};
  await check('ID-01',async()=>assert((await C.checkPolicy(identity.publicJwk,signed,expected)).version===2,'POLICY'));
  await check('ID-02',()=>rejects(()=>C.checkPolicy(identity.publicJwk,{...signed,policy:{...policy,version:3}},expected)));
  await check('ID-03',()=>rejects(()=>C.checkPolicy(identity.publicJwk,signed,{...expected,projectId:'Q'})));
  await check('ID-04',()=>rejects(()=>C.checkPolicy(identity.publicJwk,signed,{...expected,minimumVersion:3})));
  const rogue=await C.signingPair();const forged=await C.issuePolicy(rogue.privateJwk,policy);
  await check('ID-05',()=>rejects(()=>C.checkPolicy(identity.publicJwk,forged,expected)));
  await check('ID-06',()=>rejects(()=>C.checkPolicy(rogue.publicJwk,forged,expected)));
  const certDevice=new MlsDevice('A1');const certPublic=C.b64(certDevice.public_key());
  const certPackage=Array.from(certDevice.key_package());
  const inspected=JSON.parse(certDevice.key_package_info(Uint8Array.from(certPackage)));certDevice.free();
  const cert={domain:'frameup-j0/device/v1',accountId:kit.bundle.accountId,generation:1,deviceId:'A1',mlsPublic:certPublic,signingPublic:rogue.publicJwk};
  const certified=await C.issueDevice(identity.privateJwk,cert);
  await check('ID-07',async()=>assert((await C.checkDevice(identity.publicJwk,certified,cert)).deviceId==='A1','DEVICE_CERT'));
  await check('ID-08',()=>rejects(()=>C.checkDevice(identity.publicJwk,certified,{...cert,generation:2})));
  await check('ID-09',()=>rejects(()=>C.checkDevice(identity.publicJwk,certified,{...cert,mlsPublic:'substituted'})));
  await check('ID-10',async()=>assert(inspected.deviceId===cert.deviceId && C.b64(inspected.signaturePublic)===cert.mlsPublic,'MLS_CERT_BINDING'));
  // Recovery does not manufacture membership: recovered identity must still
  // occur in an authenticated current policy before any application admission.
  await check('REC-09',async()=>{
    assert(policy.members.some(m=>m.id===kit.bundle.accountId),'INITIAL_MEMBERSHIP_MISSING');
    const current={...policy,version:3,members:[]};const signedCurrent=await C.issuePolicy(identity.privateJwk,current);
    const valid=await C.checkPolicy(identity.publicJwk,signedCurrent,{...expected,minimumVersion:3});
    assert(!valid.members.some(m=>m.id===kit.bundle.accountId),'RECOVERY_REJOINED');
  });
  await check('REC-10',()=>rejects(()=>C.recoverArchives(kit.words,kit.bundle.accountId,null)));
  archiveSecret.fill(0);
  return {checks,wordCount:24,identityFingerprint:fp}; // Never return words or private keys.
}
window.j0={create,unlock,close,keyPackage,packageInfo,group,add,join,remove,send,receive,drain,ack,inspect,info,runCryptoTests};
document.querySelector('#status').textContent='OpenMLS chargé. Harnais J0 prêt ; aucune validation de sécurité présumée.';
window.j0Ready=true;
