import {argon2id} from 'hash-wasm';
import {passwordKey,random,aes,encrypt,decrypt,canonical,bytes} from '../web/crypto.js';
import {Vault} from '../web/vault.js';

const password='FrameUp-benchmark-fixture'; // Public fixture, never a user secret.
const parameters={pbkdf2:{hash:'SHA-256',iterations:600000,saltBytes:16,keyBytes:32},argon2id:{version:19,memoryKiB:65536,iterations:3,parallelism:4,saltBytes:16,keyBytes:32}};
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const measure=async fn=>{const start=performance.now();const value=await fn();return {value,ms:performance.now()-start};};
function stats(values){const s=[...values].sort((a,b)=>a-b);return {count:s.length,medianMs:(s[Math.floor((s.length-1)/2)]+s[Math.ceil((s.length-1)/2)])/2,p95Ms:s[Math.ceil(s.length*.95)-1],maxMs:s.at(-1)};}
async function key(kind,salt){
  if(kind==='pbkdf2')return passwordKey(password,salt);
  const raw=await argon2id({password,salt,parallelism:4,iterations:3,memorySize:65536,hashLength:32,outputType:'binary'});
  try{return await aes(raw);}finally{raw.fill(0);}
}
async function drop(name){await request(indexedDB.deleteDatabase(name));}
async function open(name){const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('data');return request(r);}
async function save(db,value){await new Promise((resolve,reject)=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(value,'sealed');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});}
async function comparator(kind,payload){
  const name='frameup-benchmark:'+crypto.randomUUID(),salt=random(16),context={domain:'frameup-benchmark/v1',kind};
  let db;
  try{
    db=await open(name);
    const derived=await measure(()=>key(kind,salt));
    const sealed=await measure(()=>encrypt(derived.value,payload,context));
    const write=await measure(()=>save(db,sealed.value));
    db.close();db=null;
    const unlock=await measure(async()=>{
      db=await open(name);
      const stored=await request(db.transaction('data','readonly').objectStore('data').get('sealed'));
      const nextKey=await key(kind,salt);
      const clear=await decrypt(nextKey,stored,context);
      if(clear.payload!==payload.payload)throw Error('ROUNDTRIP_MISMATCH');
    });
    return {deriveMs:derived.ms,encryptMs:sealed.ms,writeMs:write.ms,unlockMs:unlock.ms};
  }finally{if(db)db.close();await drop(name);}
}
async function actualVault(payload){
  const name='benchmark-'+crypto.randomUUID();let v;
  try{
    const create=await measure(async()=>{v=await Vault.create(name,password,payload);});
    v.close();v=null;
    const unlock=await measure(async()=>{v=await Vault.unlock(name,password);});
    const commit=await measure(async()=>{await v.begin();await v.commit(payload);});
    return {createMs:create.ms,unlockMs:unlock.ms,commitMs:commit.ms};
  }finally{if(v)v.close();await drop('frameup-j0:'+name);}
}
self.onmessage=async({data})=>{
  const report={format:1,started:new Date().toISOString(),parameters,argonImplementation:'hash-wasm@4.12.0',actualVault:'web/vault.js unchanged PBKDF2 path',memory:{argonConfiguredMiB:64,measuredPeakMiB:null},rounds:[],status:'RUNNING'};
  try{
    const count=data.smoke?1:10;
    const payload={format:1,payload:'x'.repeat(data.smoke?1024:1024*1024)};
    report.payloadBytes=bytes(canonical(payload)).length;
    // Cold first invocation is retained separately; warm measurements alternate order.
    report.cold={};
    for(const kind of ['pbkdf2','argon2id']){self.postMessage({progress:'Première exécution '+kind});report.cold[kind]=await comparator(kind,payload);}
    for(let i=0;i<count;i++){
      const row={index:i+1};
      for(const kind of i%2?['argon2id','pbkdf2']:['pbkdf2','argon2id']){self.postMessage({progress:`Mesure ${i+1}/${count} — ${kind}`});row[kind]=await comparator(kind,payload);}
      row.actualVault=await actualVault(payload);report.rounds.push(row);
    }
    report.summary={};
    for(const kind of ['pbkdf2','argon2id','actualVault']){
      report.summary[kind]={};for(const metric of Object.keys(report.rounds[0][kind]))report.summary[kind][metric]=stats(report.rounds.map(r=>r[kind][metric]));
    }
    report.status='COMPLETE';
  }catch(e){report.status='FAILED';report.error=String(e);}
  report.finished=new Date().toISOString();self.postMessage({report});
};
