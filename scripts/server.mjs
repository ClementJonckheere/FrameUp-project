import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function serve(port=4173){
  const root=resolve('dist');
  const server=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    try{
      const data=await readFile(path);
      res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.wasm':'application/wasm','.css':'text/css'})[extname(path)]||'application/octet-stream','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'",'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(data);
    }catch{res.writeHead(404);res.end('Not found');}
  });
  await new Promise((r,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',r);});return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){await serve();console.log('Harnais local : http://127.0.0.1:4173');}
