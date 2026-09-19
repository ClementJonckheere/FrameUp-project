import {random,b64,unb64,passwordKey,encrypt,decrypt,canonical} from './crypto.js';

function request(req) {return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function openDB(name) {
  const req=indexedDB.open('frameup-j0:'+name,1);
  req.onupgradeneeded=()=>req.result.createObjectStore('vault');
  return request(req);
}
async function get(db,key) {return request(db.transaction('vault','readonly').objectStore('vault').get(key));}
function putAtomic(db,pairs) {
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('vault','readwrite');
    for(const [key,value] of pairs)tx.objectStore('vault').put(value,key);
    tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||new Error('TRANSACTION_ABORT'));tx.onerror=()=>reject(tx.error);
  });
}
export class Vault {
  static async create(name,password,state) {
    const db=await openDB(name);
    if(await get(db,'meta')){db.close();throw new Error('VAULT_EXISTS');}
    const salt=random(16);const key=await passwordKey(password,salt);
    const meta={format:1,kdf:'PBKDF2-SHA256',iterations:600000,salt:b64(salt),revision:0,dirty:false};
    const v=new Vault(db,name,key,meta);
    const sealed=await encrypt(key,state,v.context(0));
    await putAtomic(db,[['meta',meta],['sealed',sealed]]);return v;
  }
  static async unlock(name,password) {
    const db=await openDB(name);const meta=await get(db,'meta');
    if(!meta){db.close();throw new Error('VAULT_MISSING');}
    if(meta.format!==1 || meta.kdf!=='PBKDF2-SHA256' || meta.iterations!==600000){db.close();throw new Error('VAULT_FORMAT');}
    if(meta.dirty){db.close();throw new Error('RECOVERY_REQUIRED');}
    const v=new Vault(db,name,await passwordKey(password,unb64(meta.salt)),meta);
    try {await v.read();return v;} catch(e){v.close();throw e;}
  }
  constructor(db,name,key,meta){Object.assign(this,{db,name,key,meta});}
  context(revision){return {domain:'frameup-j0/local-vault/v1',vault:this.name,revision};}
  async read(){return decrypt(this.key,await get(this.db,'sealed'),this.context(this.meta.revision));}
  async begin(){
    const fresh=await get(this.db,'meta');
    if(fresh.dirty || fresh.revision!==this.meta.revision)throw new Error('VAULT_CONCURRENT_OR_DIRTY');
    this.meta={...fresh,dirty:true};await putAtomic(this.db,[['meta',this.meta]]);
  }
  async commit(state){
    const revision=this.meta.revision+1;
    const sealed=await encrypt(this.key,state,this.context(revision));
    this.meta={...this.meta,revision,dirty:false};
    await putAtomic(this.db,[['sealed',sealed],['meta',this.meta]]);
  }
  async inspect(){return {meta:await get(this.db,'meta'),sealed:await get(this.db,'sealed')};}
  close(){this.key=null;this.db.close();}
}

// Hold a Web Lock for the full unlocked session, not merely one transaction.
export async function acquireDeviceLock(name) {
  let release;
  const holding=new Promise(resolve=>release=resolve);
  let grant;
  const granted=new Promise((resolve,reject)=>grant={resolve,reject});
  if(!navigator.locks)throw new Error('WEB_LOCKS_UNAVAILABLE');
  navigator.locks.request('frameup-j0:'+name,{ifAvailable:true},async lock=>{
    if(!lock){grant.reject(new Error('DEVICE_ALREADY_OPEN'));return;}
    grant.resolve(release);await holding;
  }).catch(grant.reject);
  return granted;
}
