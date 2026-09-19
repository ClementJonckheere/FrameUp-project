import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
await mkdir('dist',{recursive:true});
await build({entryPoints:['benchmark/worker.js'],bundle:true,format:'esm',outfile:'dist/benchmark-worker.js',target:['chrome140','firefox141']});
await build({entryPoints:['benchmark/page.js'],bundle:true,format:'esm',outfile:'dist/benchmark.js',target:['chrome140','firefox141']});
await copyFile('benchmark/index.html','dist/benchmark.html');await copyFile('web/style.css','dist/style.css');
const sha=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
let commit=null,dirty=null;
try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();dirty=execFileSync('git',['status','--porcelain'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()!=='';}catch{}
const files=['benchmark/worker.js','benchmark/page.js','benchmark/index.html','scripts/build-benchmark.mjs','scripts/server.mjs','web/crypto.js','web/vault.js','package-lock.json','dist/benchmark-worker.js','dist/benchmark.js'];
const hashes=Object.fromEntries(await Promise.all(files.map(async p=>[p,await sha(p)])));
await writeFile('dist/benchmark-build.json',JSON.stringify({builtAt:new Date().toISOString(),commit,dirty,node:process.version,hashes},null,2));
console.log('Benchmark prêt : npm run serve puis http://127.0.0.1:4173/benchmark.html');
