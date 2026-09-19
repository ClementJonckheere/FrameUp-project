import assert from 'node:assert/strict';
import {argon2id} from 'hash-wasm';
import {chromium} from 'playwright';
import {serve} from './server.mjs';

// Independent agreement: @noble/hashes 2.4.0, Argon2id v19, m=65536,t=3,p=4.
const vector=await argon2id({password:'FrameUp-benchmark-fixture',salt:'0123456789abcdef',parallelism:4,iterations:3,memorySize:65536,hashLength:32,outputType:'hex'});
assert.equal(vector,'f73c573380f52adf53825d3ce890ab74282a06a6088470ed67ccd1bbc793eb2e');
const server=await serve();let browser;
try{
  browser=await chromium.launch({headless:true});const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/benchmark.html');
  await page.locator('#hardware').fill('AUTOMATION — not target hardware');
  await page.locator('#system').fill('Playwright smoke validation');
  await page.locator('#conditions').fill('Not an acceptance performance measurement');
  await page.locator('#run').click();
  await page.waitForFunction(()=>!document.querySelector('#download').disabled,{},{timeout:180000});
  const report=JSON.parse(await page.locator('#result').textContent());
  assert.equal(report.status,'COMPLETE');assert.equal(report.rounds.length,10);
  assert.equal(report.metadata.declaredSlowestPhysicalTarget,false);
  assert.equal(report.gateDecision,'PENDING_TARGET_REVIEW');
  assert.equal(report.metadata.provenance.hashes['dist/benchmark-worker.js'].length,64);
  for(const row of report.rounds)for(const kind of ['pbkdf2','argon2id','actualVault'])for(const value of Object.values(row[kind]))assert.ok(Number.isFinite(value)&&value>=0);
  assert.equal(await page.evaluate(async()=>{const dbs=await indexedDB.databases();return dbs.filter(d=>d.name.startsWith('frameup-benchmark:')||d.name.startsWith('frameup-j0:benchmark-')).length;}),0);
  assert.deepEqual(errors,[]);
  const download=page.waitForEvent('download');await page.locator('#download').click();assert.equal((await download).suggestedFilename(),'frameup-coffre-mesure.json');
  console.log('PASS: independent Argon2 vector, browser Worker/CSP, 10 rounds, actual Vault, cleanup and export. Not target-device evidence.');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
