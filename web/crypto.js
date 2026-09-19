import { generateMnemonic, mnemonicToEntropy, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

const enc = new TextEncoder();
const dec = new TextDecoder();
export const bytes = value => enc.encode(value);
export const text = value => dec.decode(value);
export const random = length => crypto.getRandomValues(new Uint8Array(length));
export const b64 = value => {
  const data=new Uint8Array(value);let result='';
  for(let i=0;i<data.length;i+=32768)result+=String.fromCharCode(...data.subarray(i,i+32768));
  return btoa(result);
};
export const unb64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));

// Only JSON-compatible inputs are accepted. Canonical envelope for the POC,
// NOT a claim of RFC 8785 compliance or a production serialization standard.
export function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  throw new Error('NON_CANONICAL_INPUT');
}
export async function digest(value) { return b64(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? bytes(value) : value)); }
export async function aes(raw) { return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt','decrypt']); }
export async function encrypt(key, value, context) {
  const iv = random(12);
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:bytes(canonical(context)),tagLength:128},key,bytes(canonical(value)));
  return {format:1,iv:b64(iv),ciphertext:b64(ciphertext)};
}
export async function decrypt(key, envelope, context) {
  if (envelope.format !== 1) throw new Error('ENVELOPE_VERSION');
  const data = await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(envelope.iv),additionalData:bytes(canonical(context)),tagLength:128},key,unb64(envelope.ciphertext));
  return JSON.parse(text(data));
}
export async function passwordKey(password,salt) {
  if (password.length < 12) throw new Error('PASSPHRASE_TOO_SHORT');
  const material = await crypto.subtle.importKey('raw',bytes(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:600000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function recoveryKey(words,accountId,purpose) {
  if (words.trim().split(/\s+/).length !== 24 || !validateMnemonic(words,wordlist)) throw new Error('INVALID_MNEMONIC');
  const entropy = mnemonicToEntropy(words,wordlist);
  try {
    const key = await crypto.subtle.importKey('raw',entropy,'HKDF',false,['deriveKey']);
    return await crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:bytes('frameup-j0/recovery/v1'),info:bytes(canonical({accountId,purpose}))},key,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  } finally { entropy.fill(0); }
}
export async function signingPair() {
  // Transiently exportable for encrypted persistence, reimported non-exportable.
  const pair = await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const privateJwk = await crypto.subtle.exportKey('jwk',pair.privateKey);
  const publicJwk = await crypto.subtle.exportKey('jwk',pair.publicKey);
  return {privateJwk,publicJwk};
}
export async function sign(privateJwk,value) {
  const key=await crypto.subtle.importKey('jwk',privateJwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  return b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,bytes(canonical(value))));
}
export async function verify(publicJwk,value,signature) {
  try {
    const key=await crypto.subtle.importKey('jwk',publicJwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
    return await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,unb64(signature),bytes(canonical(value)));
  } catch { return false; }
}
export async function fingerprint(publicJwk) {
  const key=await crypto.subtle.importKey('jwk',publicJwk,{name:'ECDSA',namedCurve:'P-256'},true,['verify']);
  const raw=new Uint8Array(await crypto.subtle.exportKey('spki',key));
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',raw));
  return [...hash].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function createKit() {
  const words=generateMnemonic(wordlist,256);
  const accountId=crypto.randomUUID();
  const pair=await signingPair();
  const context={domain:'frameup-j0/identity-vault/v1',accountId};
  const identityVault=await encrypt(await recoveryKey(words,accountId,'identity-wrap'),pair,context);
  return {words,bundle:{accountId,identityPublic:pair.publicJwk,identityVault}};
}
export async function recoverIdentity(words,bundle) {
  const pair=await decrypt(await recoveryKey(words,bundle.accountId,'identity-wrap'),bundle.identityVault,{domain:'frameup-j0/identity-vault/v1',accountId:bundle.accountId});
  if (await fingerprint(pair.publicJwk) !== await fingerprint(bundle.identityPublic)) throw new Error('IDENTITY_MISMATCH');
  const probe={purpose:'identity-self-check',nonce:crypto.randomUUID()};
  if (!await verify(pair.publicJwk,probe,await sign(pair.privateJwk,probe))) throw new Error('IDENTITY_KEY_MISMATCH');
  return pair;
}
export async function backupArchives(words,accountId,archiveKeys) {
  return encrypt(await recoveryKey(words,accountId,'archives-wrap'),{archiveKeys},{domain:'frameup-j0/archive-backup/v1',accountId});
}
export async function recoverArchives(words,accountId,packet) {
  return decrypt(await recoveryKey(words,accountId,'archives-wrap'),packet,{domain:'frameup-j0/archive-backup/v1',accountId});
}
export async function recoverWithWrongPurpose(words,bundle) {
  return decrypt(await recoveryKey(words,bundle.accountId,'archives-wrap'),bundle.identityVault,{domain:'frameup-j0/identity-vault/v1',accountId:bundle.accountId});
}
export async function issuePolicy(ownerPrivate,policy) { return {policy,signature:await sign(ownerPrivate,policy)}; }
export async function checkPolicy(ownerPublic,signed,{projectId,minimumVersion,ownerFingerprint}) {
  if (await fingerprint(ownerPublic)!==ownerFingerprint) throw new Error('OWNER_FINGERPRINT');
  if (signed.policy.domain!=='frameup-j0/policy/v1' || signed.policy.projectId!==projectId) throw new Error('POLICY_CONTEXT');
  if (!Number.isSafeInteger(signed.policy.version) || signed.policy.version<minimumVersion) throw new Error('POLICY_ROLLBACK');
  if (!await verify(ownerPublic,signed.policy,signed.signature)) throw new Error('POLICY_SIGNATURE');
  return signed.policy;
}
export async function issueDevice(identityPrivate,certificate) {return {certificate,signature:await sign(identityPrivate,certificate)};}
export async function checkDevice(identityPublic,signed,{accountId,generation,deviceId,mlsPublic}) {
  const cert=signed.certificate;
  if (cert.domain!=='frameup-j0/device/v1' || cert.accountId!==accountId || cert.generation!==generation || cert.deviceId!==deviceId || cert.mlsPublic!==mlsPublic) throw new Error('DEVICE_CONTEXT');
  if (!await verify(identityPublic,cert,signed.signature)) throw new Error('DEVICE_SIGNATURE');
  return cert;
}
