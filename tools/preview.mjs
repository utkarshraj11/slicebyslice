#!/usr/bin/env node
// Screenshot + smoke test for Slice by Slice.
//
//   pnpm build && pnpm shots              overview + every neighborhood (1440x900)
//   pnpm shots --mobile                   same at 390x844
//   pnpm shots --place joes               also open a review card
//   pnpm shots --hood village             only this neighborhood
//   pnpm shots --url http://localhost:5173   shoot a running dev server instead of dist/
//   pnpm shots --hood dumbo --zoom 6      zoom in N wheel steps (at --at x,y, default centre) at 2x, to judge detail
//
// Writes PNGs to ./shots and prints console/page errors and an approximate fps.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOODS = ['hoboken', 'midtown', 'village', 'fidi', 'dumbo', 'midwood'];
const { values: a } = parseArgs({
  options: { mobile: { type: 'boolean' }, place: { type: 'string' }, hood: { type: 'string' }, url: { type: 'string' }, out: { type: 'string' }, zoom: { type: 'string' }, at: { type: 'string' } },
});

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
let server;
let url = a.url;
if (!url) {
  const dist = join(ROOT, 'dist');
  server = createServer(async (req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    try {
      const body = await readFile(join(dist, p.endsWith('/') ? p + 'index.html' : p));
      res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'text/html' }).end(body);
    } catch { res.writeHead(404).end(); }
  }).listen(0);
  url = `http://localhost:${server.address().port}/`;
}

const out = resolve(ROOT, a.out || 'shots');
await mkdir(out, { recursive: true });
const b = await chromium.launch({ args: ['--no-sandbox'] });
const pg = await b.newPage(a.mobile
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: a.zoom ? 2 : 1 });
const errs = [];
pg.on('pageerror', e => errs.push('PAGEERROR ' + e));
pg.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(`${m.type()}: ${m.text()}`); });
const tag = a.mobile ? 'm_' : '';
const go = async (h, name) => {
  await pg.evaluate(h => { location.hash = h; }, h);
  await pg.waitForTimeout(1800);
  if (a.zoom) {
    const [x, y] = (a.at || '620,450').split(',').map(Number);
    await pg.mouse.move(x, y);
    for (let i = 0; i < +a.zoom; i++) { await pg.mouse.wheel(0, -200); await pg.waitForTimeout(60); }
    await pg.waitForTimeout(300); name += '_z';
  }
  await pg.screenshot({ path: join(out, `${tag}${name}.png`) });
};

await pg.goto(url);
await pg.waitForTimeout(2800); // intro drop-in animation
await pg.screenshot({ path: join(out, `${tag}overview.png`) });
for (const h of a.hood ? [a.hood] : HOODS) await go(h, h);
if (a.place) await go(a.place, `card_${a.place}`);

const fps = await pg.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now();
  (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); })(); }));
const count = await pg.evaluate(() => document.querySelectorAll('#map *').length);
console.log(`screenshots -> ${out}`);
console.log(`~${fps.toFixed(0)} fps, ${count} SVG elements`);
console.log(errs.length ? 'errors:' : 'no console errors');
for (const e of errs) console.log('  ' + e);
await b.close();
server?.close();
