import {execFileSync} from 'node:child_process';
import {mkdir,copyFile,cp} from 'node:fs/promises';
import {build} from 'esbuild';
const run=(cmd,args)=>execFileSync(cmd,args,{stdio:'inherit'});
if(!process.argv.includes('--js-only')){
  run('cargo',['build','--locked','--manifest-path','mls/Cargo.toml','--target','wasm32-unknown-unknown','--release']);
  run('wasm-bindgen',['--target','web','--out-dir','web/pkg','--out-name','frameup_j0_mls','mls/target/wasm32-unknown-unknown/release/frameup_j0_mls.wasm']);
}
await mkdir('dist/pkg',{recursive:true});
await build({entryPoints:['web/harness.js'],bundle:true,format:'esm',outfile:'dist/app.js',target:['chrome140','firefox141'],sourcemap:false});
await copyFile('web/index.html','dist/index.html');await copyFile('web/style.css','dist/style.css');
await cp('web/pkg','dist/pkg',{recursive:true});
