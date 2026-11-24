#!/usr/bin/env node
// Real buildings around each pizzeria (after Pocket City's field notes): true footprints and roof heights, roof colours
// and faint surface markings sampled from an aerial photograph, and each building's address and storeys from the tax
// records, so the pizzeria and the buildings either side of it can be built as they stand (src/data/rows.ts).
//
//   node tools/fetch-real.mjs            all places      node tools/fetch-real.mjs joes basiles      only these
//   DEBUG=<dir> node tools/fetch-real.mjs joes    also writes <dir>/joes.png: footprints on the aerial (pizzeria red,
//                                                 its left neighbour green, its right one blue, street side yellow)
//
// Sources (credited in the app): NYC Building Footprints and PLUTO (NYC Open Data); OpenStreetMap contributors (ODbL)
// for New Jersey footprints and NJ MOD-IV tax parcels (NJGIN) for their addresses and storeys; NYS ITS 2022 and NJOGIS
// 2020 orthoimagery; geocoding by Nominatim (OpenStreetMap). Writes src/data/real.json and public/real/<id>.png (the
// roof texture). Run once, commit.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { inflateSync, deflateSync, crc32 } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UA = { 'User-Agent': 'slice-by-slice-map-build/1.0' };
const R = 45;      // metres around the pizzeria
const IMG = 200;   // aerial pixels across 2R (0.45 m/px: finer than the 8 px/unit facades)
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** Where geocoding fails. 65 Wall St isn't a tax lot of its own: it sits between 63 and 67 Wall St (NYC PLUTO). */
const AT = { upside: [40.70559, -74.00859] };

/* ---------- places from src/data/places.ts ---------- */
const src = await readFile(resolve(ROOT, 'src/data/places.ts'), 'utf8');
const places = [...src.matchAll(/id: '([a-z]+)', hood: '([a-z]+)', name: (?:"([^"]+)"|'([^']+)'), address: '([^']+)'/g)]
  .map(m => ({ id: m[1], hood: m[2], name: m[3] ?? m[4], address: m[5].replace(/\s*\(.*?\)/, '') }));
const only = process.argv.slice(2);
const outFile = resolve(ROOT, 'src/data/real.json');
const out = JSON.parse(await readFile(outFile, 'utf8').catch(() => '{}'));

/* ---------- http ---------- */
async function get(url, opt = {}, tries = 5) {
  for (let i = 0; ; i++) {
    const r = await fetch(url, { ...opt, headers: { ...UA, ...opt.headers }, signal: AbortSignal.timeout(30000) }).catch(e => ({ ok: false, status: String(e) }));
    if (r.ok) return r;
    if (i >= tries) throw new Error(`${r.status} for ${url.slice(0, 120)}`);
    await sleep(2000 * 2 ** i);
  }
}
/** OpenStreetMap ways within m metres of a point, as [lon, lat] lines, from the editing API's map call (one small box;
    the Overpass mirrors this used before were often down). */
async function osmWays(lat, lon, m) {
  const dLat = m / 110540, dLon = m / (Math.cos((lat * Math.PI) / 180) * 111320);
  const el = (await (await get(`https://api.openstreetmap.org/api/0.6/map.json?bbox=${lon - dLon},${lat - dLat},${lon + dLon},${lat + dLat}`)).json()).elements;
  const nodes = new Map(el.filter(e => e.type === 'node').map(e => [e.id, [e.lon, e.lat]]));
  return el.filter(e => e.type === 'way' && e.nodes.every(n => nodes.has(n))).map(e => ({ tags: e.tags ?? {}, line: e.nodes.map(n => nodes.get(n)) }));
}

/* ---------- minimal PNG (8-bit RGB/RGBA, not interlaced) ---------- */
function decodePNG(buf) {
  let p = 8, w = 0, h = 0, ct = 0, idat = [], pal = null, trns = null;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12]) throw new Error('unsupported PNG'); }
    if (type === 'PLTE') pal = d; if (type === 'tRNS') trns = d;
    if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : ct === 3 ? 1 : 0; if (!bpp) throw new Error('PNG colour type ' + ct);
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, px = Buffer.alloc(w * h * bpp);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, b = y ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      const pr = a + b - c, pa = Math.abs(pr - a), pb = Math.abs(pr - b), pc = Math.abs(pr - c);
      px[y * stride + x] = (row[x] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
  }
  const rgb = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    if (bpp === 1) { const k = px[i]; rgb[i * 3] = pal[k * 3]; rgb[i * 3 + 1] = pal[k * 3 + 1]; rgb[i * 3 + 2] = pal[k * 3 + 2]; }
    else for (let c = 0; c < 3; c++) rgb[i * 3 + c] = px[i * bpp + c];
  }
  return { w, h, rgb };
}
function encodePNG(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4, 'ascii'); d.copy(b, 8); b.writeUInt32BE(crc32(Buffer.concat([Buffer.from(t), d])), 8 + d.length); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- geometry (local metres: e = east, n = north) ---------- */
const area = p => p.reduce((s, [x, y], i) => { const [X, Y] = p[(i + 1) % p.length]; return s + x * Y - X * y; }, 0) / 2;
const centroid = p => { const n = p.length; return [p.reduce((s, q) => s + q[0], 0) / n, p.reduce((s, q) => s + q[1], 0) / n]; };
const inside = ([x, y], p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
/** The part of polygon p where dot(q, d) >= t (Sutherland-Hodgman against one half-plane). */
const clipHalf = (p, d, t) => { const o = []; p.forEach((q, i) => { const r = p[(i + 1) % p.length], kq = dot(q, d) - t, kr = dot(r, d) - t;
  if (kq >= 0) o.push(q); if ((kq >= 0) !== (kr >= 0)) { const s = kq / (kq - kr); o.push([q[0] + (r[0] - q[0]) * s, q[1] + (r[1] - q[1]) * s]); } }); return o; };
/** Storeys from an NJ MOD-IV building description: "3B-2U-1C-H-BA" is a three-storey brick building, "2.5B-COM" two and a half. */
const njStoreys = d => { const m = /^(\d+(?:\.\d+)?)\s*[A-Z]/.exec(d ?? ''); return m ? +m[1] : 0; };
const title = s => s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/\b(\d+)(St|Nd|Rd|Th)\b/g, (_, n, x) => n + x.toLowerCase());

for (const pl of places) {
  if (only.length && !only.includes(pl.id)) continue;
  const nj = pl.address.includes(', NJ');
  console.log(`${pl.id}: ${pl.address}`);

  // where: the shop itself by name first (a bare address can land in another borough), else the address
  const nom = async q => { const r = await (await get(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&${q}`)).json(); await sleep(1100); return r; }; // one request a second
  const city = nj ? 'Hoboken' : pl.address.includes('Brooklyn') ? 'Brooklyn' : 'Manhattan';
  let g = AT[pl.id] ? [{ lat: AT[pl.id][0], lon: AT[pl.id][1], display_name: 'fixed coordinates' }] : await nom(`limit=1&q=${encodeURIComponent(`${pl.name}, ${pl.address}`)}`);
  if (!g.length) g = await nom(`limit=1&q=${encodeURIComponent(`${pl.address.split(',')[0]}, ${city}`)}`);
  if (!g.length) { console.log('  not geocoded, skipped'); continue; }
  const lat0 = +g[0].lat, lon0 = +g[0].lon;
  const kx = Math.cos((lat0 * Math.PI) / 180) * 111320, ky = 110540;
  const local = ([lon, lat]) => [(lon - lon0) * kx, (lat - lat0) * ky];

  // footprints: [{ p: ring in metres, h: roof height m, y: year, blk: tax block, addr, fl: storeys }]
  let bl = [];
  if (!nj) {
    // every footprint touching the square (within_circle would keep only those wholly inside it, dropping big neighbours)
    const [w0, s0, e0, n0] = [lon0 - R / kx, lat0 - R / ky, lon0 + R / kx, lat0 + R / ky];
    const rows = await (await get(`https://data.cityofnewyork.us/resource/5zhs-2jue.json?$where=${encodeURIComponent(`intersects(the_geom,'POLYGON((${w0} ${s0},${e0} ${s0},${e0} ${n0},${w0} ${n0},${w0} ${s0}))')`)}&$limit=500`)).json();
    // the tax lot of each footprint (PLUTO): its address and number of floors
    const bbls = [...new Set(rows.map(r => r.base_bbl).filter(Boolean))], lots = {};
    for (let i = 0; i < bbls.length; i += 50)
      for (const l of await (await get(`https://data.cityofnewyork.us/resource/64uk-42ks.json?$select=bbl,address,numfloors&$where=${encodeURIComponent(`bbl in(${bbls.slice(i, i + 50).join(',')})`)}`)).json()) lots[String(Math.round(+l.bbl))] = l;
    for (const r of rows) for (const poly of r.the_geom.coordinates) {
      const lot = lots[r.base_bbl];
      bl.push({ p: poly[0].slice(0, -1).map(local), h: +r.height_roof * 0.3048 || 12, y: +r.construction_year || 0, blk: r.base_bbl?.slice(0, 6), addr: lot ? title(lot.address) : '', fl: +lot?.numfloors || 0 });
    }
  }
  const ways = await osmWays(lat0, lon0, R + 30);
  if (nj) {
    // NJ tax parcels (MOD-IV): address and storeys of the lot each footprint stands on
    const pj = await (await get(`https://services2.arcgis.com/XVOqAjTOJ5P6ngMu/arcgis/rest/services/Parcels_Composite_NJ_WM/FeatureServer/0/query?where=1%3D1&geometry=${lon0},${lat0}&geometryType=esriGeometryPoint&inSR=4326&outSR=4326&distance=${R + 30}&units=esriSRUnit_Meter&spatialRel=esriSpatialRelIntersects&outFields=PROP_LOC,BLDG_DESC,PCLBLOCK&returnGeometry=true&f=json`)).json();
    const parcels = (pj.features ?? []).filter(f => f.attributes.PROP_LOC && f.geometry?.rings).map(f => ({ ring: f.geometry.rings[0].map(local), a: f.attributes }));
    for (const wy of ways.filter(w => w.tags.building && w.line.some(q => Math.hypot(...local(q)) < R))) {
      const t = wy.tags, p = wy.line.slice(0, -1).map(local);
      // the parcel under its centre, else the one holding most of its corners (OSM and the parcels are drawn apart by a metre or two)
      const hold = parcels.map(q => ({ q, n: p.filter(v => inside(v, q.ring)).length })).sort((a, b) => b.n - a.n)[0];
      const lot = (parcels.find(q => inside(centroid(p), q.ring)) ?? (hold?.n ? hold.q : null))?.a, fl = parseFloat(t['building:levels']) || njStoreys(lot?.BLDG_DESC);
      bl.push({ p, h: parseFloat(t.height) || (fl ? fl * 3.4 + 1.5 : 12), y: +t.start_date || 0, blk: lot?.PCLBLOCK, addr: lot ? title(lot.PROP_LOC) : t['addr:housenumber'] ? `${t['addr:housenumber']} ${t['addr:street'] ?? ''}`.trim() : '', fl });
    }
  }
  bl = bl.filter(b => b.p.length >= 3 && Math.abs(area(b.p)) > 8);
  if (!bl.length) { console.log('  no footprints, skipped'); continue; }

  // the pizzeria's own footprint, and which side of it is the street: of the four directions along its edges, the
  // one with the least building in front of it (corner lots: the shorter, i.e. narrower, frontage wins ties)
  const self = bl.find(b => inside([0, 0], b.p)) ?? bl.slice().sort((a, b) => Math.hypot(...centroid(a.p)) - Math.hypot(...centroid(b.p)))[0];
  self.self = true;
  const sp = self.p; let best = 0, ang = 0;
  sp.forEach((q, i) => { const r = sp[(i + 1) % sp.length], L = Math.hypot(r[0] - q[0], r[1] - q[1]); if (L > best) { best = L; ang = Math.atan2(r[1] - q[1], r[0] - q[0]); } });
  const c0 = centroid(sp), dirs = [0, 1, 2, 3].map(k => [Math.cos(ang + (k * Math.PI) / 2), Math.sin(ang + (k * Math.PI) / 2)]);
  const extent = d => Math.max(...sp.map(q => dot([q[0] - c0[0], q[1] - c0[1]], d)));
  const score = d => {
    const perp = [-d[1], d[0]], e0 = extent(d); let s = 0;
    for (const b of bl) if (b !== self) for (const q of b.p) { const v = [q[0] - c0[0], q[1] - c0[1]], t = dot(v, d); if (t > e0 + 0.5 && t < e0 + 14 && Math.abs(dot(v, perp)) < 10) s++; }
    return s - extent([-d[1], d[0]]) * 0.01; // a tie goes to the narrower frontage
  };
  // the street named in the address, from OpenStreetMap: the frontage faces its nearest point
  const street = pl.address.split(',')[0].replace(/^\d+\s+/, '').replace(/^([NSEW]) /, (_, d) => ({ N: 'North ', S: 'South ', E: 'East ', W: 'West ' })[d])
    .replace(/\bSt$/, 'Street').replace(/\bAve$/, 'Avenue'); // the geocoder wants it spelled out
  // every stretch of it nearby (the geocoder returns only one stretch, which can be blocks away)
  let near = null, nd = Infinity;
  for (const wy of ways.filter(w => w.tags.highway && w.tags.name === street)) { const pts = wy.line.map(local);
    for (let i = 0; i + 1 < pts.length; i++) {
      const [a, b] = [pts[i], pts[i + 1]], ab = [b[0] - a[0], b[1] - a[1]], t = Math.max(0, Math.min(1, dot([c0[0] - a[0], c0[1] - a[1]], ab) / (dot(ab, ab) || 1)));
      const q = [a[0] + ab[0] * t, a[1] + ab[1] * t], d = Math.hypot(q[0] - c0[0], q[1] - c0[1]); if (d < nd) { nd = d; near = q; } } }
  const toward = near && nd < 40 ? [near[0] - c0[0], near[1] - c0[1]] : null;
  // snap to the nearest of the footprint's four edge directions (no street found: the emptiest side)
  const front = toward ? dirs.slice().sort((a, b) => dot(b, toward) - dot(a, toward))[0] : dirs.slice().sort((a, b) => score(a) - score(b))[0];
  if (!toward) console.log(`  ${street}: not found nearby, guessed the street side`);
  // keep buildings on the pizzeria's side of the street (and in its tax block, where the data says)
  const fl = extent(front) + dot(c0, front);
  bl = bl.filter(b => b === self || (dot(centroid(b.p), front) < fl - 1 && (!self.blk || !b.blk || b.blk === self.blk)));

  // the buildings either side, as seen from the street: facades within 4 m of the pizzeria's, the nearest one along the
  // street on each side (their front 3 m), unless a gap of more than 3 m (a cross street, an alley) comes first
  const left = [front[1], -front[0]]; // a viewer facing the storefront has this on their left
  const span = b => { const f0 = Math.max(...b.p.map(q => dot(q, front))), s = clipHalf(b.p, front, f0 - 3).map(q => dot(q, left)); return { f0, a0: Math.min(...s), a1: Math.max(...s) }; };
  const S = span(self);
  for (const [side, gap] of [['L', b => b.a0 - S.a1], ['R', b => S.a0 - b.a1]]) {
    const n = bl.filter(b => b !== self).map(b => ({ b, ...span(b) })).filter(x => Math.abs(x.f0 - S.f0) < 4 && gap(x) > -1.5 && gap(x) < 3 && (side === 'L' ? x.a1 > S.a1 + 1 : x.a0 < S.a0 - 1))
      .sort((x, y) => gap(x) - gap(y))[0];
    if (n) n.b.side = side;
  }

  // aerial photo: roof colours and the roof texture
  const dLon = R / kx, dLat = R / ky, bbox = [lon0 - dLon, lat0 - dLat, lon0 + dLon, lat0 + dLat].join(',');
  const svc = nj ? 'https://maps.nj.gov/arcgis/rest/services/Basemap/Orthos_Natural_2020_NJ_WM/MapServer' : 'https://orthos.its.ny.gov/arcgis/rest/services/wms/2022/MapServer';
  const png = Buffer.from(await (await get(`${svc}/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${IMG},${IMG}&format=png24&transparent=false&f=image`)).arrayBuffer());
  const { w, h, rgb } = decodePNG(png);
  const toPx = ([e, n]) => [((e + R) / (2 * R)) * w, ((R - n) / (2 * R)) * h];
  const tex = Buffer.from(rgb);
  for (const b of bl) {
    const ring = b.p.map(toPx), xs = ring.map(q => q[0]), ys = ring.map(q => q[1]), samples = [[], [], []], cover = [];
    for (let y = Math.max(0, Math.floor(Math.min(...ys))); y < Math.min(h, Math.ceil(Math.max(...ys))); y++)
      for (let x = Math.max(0, Math.floor(Math.min(...xs))); x < Math.min(w, Math.ceil(Math.max(...xs))); x++)
        if (inside([x + 0.5, y + 0.5], ring)) { cover.push(y * w + x); for (let c = 0; c < 3; c++) samples[c].push(rgb[(y * w + x) * 3 + c]); }
    const med = samples.map(s => (s.sort((a, b) => a - b), s[s.length >> 1] ?? 150));
    b.roof = '#' + med.map(v => v.toString(16).padStart(2, '0')).join('');
    // the texture keeps faint markings: 65 % the roof's own colour, 35 % the photograph
    for (const i of cover) for (let c = 0; c < 3; c++) tex[i * 3 + c] = Math.round(med[c] * 0.65 + rgb[i * 3 + c] * 0.35);
  }
  if (process.env.DEBUG) { // three times the size: footprints in white, the pizzeria red, left neighbour green, right blue; the street side yellow
    const K = 3, W3 = w * K, dbg = Buffer.alloc(W3 * h * K * 3);
    for (let y = 0; y < h * K; y++) for (let x = 0; x < W3; x++) rgb.copy(dbg, (y * W3 + x) * 3, ((((y / K) | 0) * w + ((x / K) | 0)) * 3), ((((y / K) | 0) * w + ((x / K) | 0)) * 3) + 3);
    const dotPx = (x, y, c) => { x = (x * K) | 0; y = (y * K) | 0; if (x >= 0 && y >= 0 && x < W3 && y < h * K) c.forEach((v, k) => (dbg[(y * W3 + x) * 3 + k] = v)); };
    for (const b of bl) b.p.forEach((q, i) => { const [x0, y0] = toPx(q), [x1, y1] = toPx(b.p[(i + 1) % b.p.length]); for (let t = 0; t <= 1; t += 0.005) dotPx(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, b.self ? [255, 0, 0] : b.side === 'L' ? [0, 230, 0] : b.side === 'R' ? [40, 120, 255] : [255, 255, 255]); });
    const [cx, cy] = toPx(c0); for (let t = 0; t < 30; t += 0.3) dotPx(cx + front[0] * t, cy - front[1] * t, [255, 230, 0]);
    await writeFile(resolve(process.env.DEBUG, `${pl.id}.png`), encodePNG(W3, h * K, dbg));
    console.log(`  geocoded ${lat0.toFixed(5)}, ${lon0.toFixed(5)} (${g[0].display_name.slice(0, 60)})`);
  }
  await mkdir(resolve(ROOT, 'public/real'), { recursive: true });
  await writeFile(resolve(ROOT, `public/real/${pl.id}.png`), encodePNG(w, h, tex));

  const r1 = v => Math.round(v * 10) / 10;
  out[pl.id] = {
    lat: +lat0.toFixed(7), lon: +lon0.toFixed(7), front: front.map(v => +v.toFixed(4)), half: R,
    buildings: bl.map(b => ({ p: b.p.map(q => q.map(r1)), h: r1(b.h), y: b.y, roof: b.roof, addr: b.addr, fl: b.fl, ...(b.self ? { self: true } : {}), ...(b.side ? { side: b.side } : {}) })),
  };
  const desc = b => b ? `${b.addr || '?'} (${b.fl || '?'} fl, ${r1(span(b).a1 - span(b).a0)} m wide)` : 'none';
  console.log(`  ${bl.length} buildings, street to the ${['E', 'N', 'W', 'S'][((Math.round(Math.atan2(front[1], front[0]) / (Math.PI / 2)) % 4) + 4) % 4]}`);
  console.log(`  left ${desc(bl.find(b => b.side === 'L'))} | self ${desc(self)} | right ${desc(bl.find(b => b.side === 'R'))}`);
}
await writeFile(outFile, JSON.stringify(out));
console.log('wrote src/data/real.json');
