import test from 'node:test';
import assert from 'node:assert/strict';
import {Relay} from '../scripts/relay.mjs';
import {canonical,encrypt,decrypt,aes,random} from '../web/crypto.js';
test('canonicalization rejects unsupported values and sorts object keys',()=>{
  assert.equal(canonical({b:2,a:1}),'{"a":1,"b":2}');
  assert.throws(()=>canonical({a:undefined}));assert.throws(()=>canonical(NaN));
});
test('AES-GCM authenticates project context',async()=>{
  const key=await aes(random(32));const ct=await encrypt(key,{secret:'fictional'},{project:'P'});
  assert.equal((await decrypt(key,ct,{project:'P'})).secret,'fictional');
  await assert.rejects(()=>decrypt(key,ct,{project:'Q'}));
});
test('relay idempotence and event ID collision',()=>{
  const r=new Relay(),e={id:'1',bytes:[1,2,3]};r.put(e);r.put(e);assert.equal(r.events.size,1);
  assert.throws(()=>r.put({id:'1',bytes:[9]}),/EVENT_ID_REUSED/);
});
test('relay snapshot retains revoked recipients',()=>{
  const r=new Relay();r.put({id:'1',bytes:[1]});r.revoke('B');
  const restored=Relay.restore(r.snapshot());assert.throws(()=>restored.deliver('1','B'),/ACCESS_REVOKED/);
  assert.deepEqual(restored.deliver('1','A').bytes,[1]);
});
