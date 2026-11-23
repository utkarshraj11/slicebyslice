import { chromium } from 'playwright';
import { createServer } from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const T={'.js':'text/javascript','.css':'text/css','.png':'image/png'};
const srv=createServer(async(q,r)=>{const p=new URL(q.url,'http://x').pathname;try{r.writeHead(200,{'content-type':T[extname(p)]||'text/html'}).end(await readFile(join('dist',p.endsWith('/')?p+'index.html':p)))}catch{r.writeHead(404).end()}}).listen(0);
const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}); const pg=await b.newPage({viewport:{width:1440,height:900}});
pg.on('pageerror',e=>console.log('PAGEERROR',e.message)); pg.on('console',m=>{if(m.type()==='error')console.log('ERR',m.text())});
await pg.goto(`http://localhost:${srv.address().port}/`); await pg.waitForTimeout(2500);
await pg.click('.looks button:nth-child(1)');
for (const h of process.argv.slice(2)) { await pg.evaluate(h=>{location.hash=h},h); await pg.waitForTimeout(2200); await pg.screenshot({path:'/private/tmp/claude-501/-Users-utkarsh-projects-slice-by-slice/2b7ccc23-546c-432a-a2a4-08bc9e8d33a1/scratchpad/sk_'+h+'.png'}); }
await b.close(); srv.close();
