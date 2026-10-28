import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.m3u8':'application/vnd.apple.mpegurl','.ts':'video/mp2t'};
http.createServer((req,res)=>{
  let name; try { name=decodeURIComponent(new URL(req.url,'http://local').pathname); } catch {res.writeHead(400).end();return;}
  if(name==='/')name='/index.html';
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep) && file!==root){res.writeHead(403).end();return;}
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404).end('Not found');return;}
    const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
    const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
    let start=0,end=stat.size-1;
    if(range){start=+range[1];end=range[2]?Math.min(+range[2],end):end;if(start>end){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;}
    headers['Content-Length']=end-start+1;res.writeHead(range?206:200,headers);
    if(req.method==='HEAD'){res.end();return;}fs.createReadStream(file,{start,end}).pipe(res);
  });
}).listen(Number(process.env.PORT||4173),process.env.HOST||'127.0.0.1',()=>console.log(`LUMA: http://${process.env.HOST||'127.0.0.1'}:${process.env.PORT||4173}`));
