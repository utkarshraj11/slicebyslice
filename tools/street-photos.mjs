#!/usr/bin/env node
// Street photos of a pizzeria's row, to read its facades from (src/data/rows.ts): Mapillary views of the pizzeria and of
// the buildings either side (360° photos flattened toward each facade) and Wikimedia Commons photos taken nearby, newest
// first, on one contact sheet: shots/photos/<id>.jpg.
//
//   node tools/street-photos.mjs <id> [since]        e.g. node tools/street-photos.mjs joes 2020
//
// Needs src/data/real.json (tools/fetch-real.mjs) and a Mapillary client token in ~/.mapillary-token (mapillary.com >
// Dashboard > Developers > Register application, read only; never commit it). The photos are CC BY-SA: read facts off
// them (storeys, colours, windows, shopfronts); don't copy them into the map.
import { readFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UA = { 'User-Agent': 'slice-by-slice-map-build/1.0' };
const [id, since = ''] = process.argv.slice(2);
const r = JSON.parse(await readFile(resolve(ROOT, 'src/data/real.json'), 'utf8'))[id];
if (!r?.lat) throw new Error(`no ${id} in src/data/real.json (or it predates lat/lon): run node tools/fetch-real.mjs ${id}`);
const T = (await readFile(resolve(homedir(), '.mapillary-token'), 'utf8')).trim();
const kx = Math.cos((r.lat * Math.PI) / 180) * 111320, ky = 110540, dot = (a, b) => a[0] * b[0] + a[1] * b[1], f = r.front;
// the middle of each facade: the pizzeria's, then its neighbours' (metres east/north of the pizzeria)
const targets = [['pizzeria', b => b.self], ['left', b => b.side === 'L'], ['right', b => b.side === 'R']].map(([k, is]) => {
  const b = r.buildings.find(is); if (!b) return null;
  const fm = Math.max(...b.p.map(q => dot(q, f))), fr = b.p.filter(q => dot(q, f) > fm - 2);
  return { k: `${k}: ${b.addr || '?'}`, at: [0, 1].map(i => fr.reduce((s, q) => s + q[i], 0) / fr.length) };
}).filter(Boolean);

const box = [r.lon - 60 / kx, r.lat - 60 / ky, r.lon + 60 / kx, r.lat + 60 / ky].map(v => v.toFixed(6)).join(',');
const imgs = (await (await fetch(`https://graph.mapillary.com/images?access_token=${encodeURIComponent(T)}&bbox=${box}&limit=2000&fields=id,captured_at,compass_angle,computed_compass_angle,geometry,computed_geometry,is_pano,computed_altitude`)).json()).data ?? [];
const alts = imgs.map(m => m.computed_altitude).filter(a => a != null).sort((a, b) => a - b), ground = alts[alts.length >> 2] ?? 0; // (not the bridge decks)
const views = [];
for (const t of targets) {
  const c = imgs.map(m => {
    const [lon, lat] = (m.computed_geometry ?? m.geometry).coordinates, v = [(lon - r.lon) * kx - t.at[0], (lat - r.lat) * ky - t.at[1]], d = Math.hypot(...v);
    const bear = ((Math.atan2(-v[0], -v[1]) * 180) / Math.PI + 360) % 360, head = m.computed_compass_angle ?? m.compass_angle;
    return { ...m, d, bear, head, yr: new Date(m.captured_at).toISOString().slice(0, 10), off: Math.abs(((bear - head + 540) % 360) - 180), front: dot(v, f) };
  }).filter(m => m.d > 6 && m.d < 35 && m.front > 2 && (m.is_pano || m.off < 35) && (m.computed_altitude ?? ground) < ground + 10 && m.yr >= since)
    .sort((a, b) => b.yr.slice(0, 4) - a.yr.slice(0, 4) || Math.abs(a.d - 15) - Math.abs(b.d - 15));
  views.push(...c.slice(0, 2).map(m => ({ ...m, k: t.k })));
}
const br = await chromium.launch(), pg = await br.newPage();
const tiles = [];
for (const m of views) {
  const u = (await (await fetch(`https://graph.mapillary.com/${m.id}?access_token=${encodeURIComponent(T)}&fields=thumb_original_url,thumb_2048_url`)).json());
  const jpg = Buffer.from(await (await fetch(m.is_pano ? u.thumb_original_url ?? u.thumb_2048_url : u.thumb_2048_url)).arrayBuffer());
  // a panorama, flattened: an 80° view toward the facade (its centre column looks along the compass angle)
  const data = await pg.evaluate(async ({ src, pano, yaw }) => {
    const img = new Image(); img.src = src; await img.decode(); if (!pano) return src;
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0);
    const s = c.getContext('2d').getImageData(0, 0, img.width, img.height).data, W = 960, H = 720, o = new OffscreenCanvas(W, H), og = o.getContext('2d'), out = og.createImageData(W, H);
    const fl = W / 2 / Math.tan((40 * Math.PI) / 180), Y = (yaw * Math.PI) / 180, P = (14 * Math.PI) / 180;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = i - W / 2, y = H / 2 - j, y2 = y * Math.cos(P) + fl * Math.sin(P), z2 = -y * Math.sin(P) + fl * Math.cos(P);
      const x3 = x * Math.cos(Y) + z2 * Math.sin(Y), z3 = -x * Math.sin(Y) + z2 * Math.cos(Y);
      const u = ((Math.atan2(x3, z3) / (2 * Math.PI) + 0.5) * img.width) | 0, v = Math.min(img.height - 1, ((0.5 - Math.atan2(y2, Math.hypot(x3, z3)) / Math.PI) * img.height) | 0);
      const a = (v * img.width + ((u % img.width) + img.width) % img.width) * 4, b = (j * W + i) * 4;
      out.data[b] = s[a]; out.data[b + 1] = s[a + 1]; out.data[b + 2] = s[a + 2]; out.data[b + 3] = 255;
    }
    og.putImageData(out, 0, 0); const blob = await o.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  }, { src: 'data:image/jpeg;base64,' + jpg.toString('base64'), pano: !!m.is_pano, yaw: ((m.bear - m.head + 540) % 360) - 180 });
  tiles.push({ data, cap: `${m.k} · Mapillary ${m.id}, ${m.yr}, ${m.d.toFixed(0)} m` });
}
const cm = await (await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${r.lat}%7C${r.lon}&ggsradius=60&ggsnamespace=6&ggslimit=50&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1280&format=json`, { headers: UA })).json();
const commons = Object.values(cm.query?.pages ?? {}).map(p => ({ t: p.title, i: p.imageinfo?.[0] })).filter(p => p.i?.thumburl && /\.jpe?g$/i.test(p.t))
  .map(p => ({ ...p, yr: (p.i.extmetadata?.DateTimeOriginal?.value ?? '').replace(/<[^>]+>/g, '').slice(0, 10) })).sort((a, b) => b.yr.localeCompare(a.yr)).slice(0, 4);
for (const p of commons) tiles.push({ data: 'data:image/jpeg;base64,' + Buffer.from(await (await fetch(p.i.thumburl, { headers: UA })).arrayBuffer()).toString('base64'), cap: `Commons: ${p.t.slice(5, 70)}, ${p.yr}` });
await pg.setViewportSize({ width: 1440, height: Math.max(1, Math.ceil(tiles.length / 2)) * 562 });
await pg.setContent(`<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(2,720px);font:13px sans-serif;color:#fff">${tiles.map(t => `<div><img src="${t.data}" style="width:720px;height:540px;object-fit:contain;display:block"><div style="height:22px;line-height:22px;padding:0 6px;white-space:nowrap;overflow:hidden">${t.cap}</div></div>`).join('')}</body>`);
await mkdir(resolve(ROOT, 'shots/photos'), { recursive: true });
await pg.waitForTimeout(300); await pg.screenshot({ path: resolve(ROOT, `shots/photos/${id}.jpg`), type: 'jpeg', quality: 82, fullPage: true });
await br.close();
console.log(`shots/photos/${id}.jpg: ${views.length} Mapillary, ${commons.length} Commons`);
