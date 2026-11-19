#!/usr/bin/env node
// Pull real building data for a neighborhood and write src/data/lots/<hood>.ts.
//
//   pnpm lots village
//
// Which streets (and house-number ranges) to fetch is configured per hood in tools/areas.mjs.
// NYC: NYC GeoSearch (pizzeria address → tax lot), PLUTO (floors, frontage, depth, building class,
//   year built, corner lot) for every lot on those streets, NYC Building Footprints (roof height).
// Hoboken: OpenStreetMap building footprints with addresses (frontage/depth measured from the
//   footprint along the street); OSM has no storey counts there, so floors are estimated.
// All APIs are public and keyless.
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLACES } from '../src/data/places.ts';
import { AREAS } from './areas.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hood = process.argv[2], area = AREAS[hood];
if (!area) { console.error(`usage: pnpm lots <hood>   (one of: ${Object.keys(AREAS).join(', ')})`); process.exit(1); }
const places = PLACES.filter(p => p.hood === hood);

async function get(url, init) {
  const r = await fetch(url, { ...init, headers: { accept: 'application/json', 'user-agent': 'slice-by-slice-map/1.0', ...init?.headers } });
  if (!r.ok) throw new Error(`${r.status} ${url.slice(0, 120)}`);
  return r.json();
}
const soda = (dataset, where, select) =>
  get(`https://data.cityofnewyork.us/resource/${dataset}.json?` + new URLSearchParams({ $where: where, ...(select && { $select: select }), $limit: '5000' }));
const num = v => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const houseNo = addr => { const m = /^(\d+)([A-Z]?)/i.exec(addr); return m ? Number(m[1]) + (m[2] ? (m[2].toUpperCase().charCodeAt(0) - 64) / 100 : 0) : NaN; };
const streetOf = addr => addr.replace(/^[\d-]+[A-Z]? /i, '');
const r1 = v => (v == null ? null : Math.round(v * 10) / 10);

const out = {};   // street → lots in house-number order
const placed = {}; // place id → [street, house number]

if (area.borough) {
  const bblOf = {};
  for (const p of places) {
    const g = (await get('https://geosearch.planninglabs.nyc/v2/search?' + new URLSearchParams({ text: p.address, size: '1' }))).features[0]?.properties;
    if (!g?.addendum?.pad?.bbl) throw new Error(`could not geocode ${p.address}`);
    bblOf[Number(g.addendum.pad.bbl)] = p.id;
  }
  const SEL = 'address,bbl,numfloors,lotfront,lotdepth,bldgfront,bldgdepth,bldgclass,yearbuilt,lottype';
  const all = [];
  for (const [street, [lo, hi]] of Object.entries(area.streets)) {
    const rows = await soda('64uk-42ks', `borough='${area.borough}' AND address like '% ${street}'`, SEL);
    const byAddr = new Map();
    for (const l of rows) {
      const n = houseNo(l.address);
      if (streetOf(l.address) !== street || !(n >= lo && n <= hi) || num(l.numfloors) == null) continue;
      const prev = byAddr.get(l.address); // condo sub-lots repeat an address: keep the building record
      if (!prev || num(l.numfloors) > num(prev.numfloors)) byAddr.set(l.address, l);
    }
    out[street] = [...byAddr.values()].sort((a, b) => houseNo(a.address) - houseNo(b.address));
    all.push(...out[street]);
    console.log(`${street}: ${out[street].length} lots`);
  }
  // make sure every pizzeria's own lot is there (its tax address can be on the cross street)
  for (const [bbl, id] of Object.entries(bblOf)) {
    let l = all.find(x => Math.round(x.bbl) === Number(bbl));
    if (!l) {
      [l] = await soda('64uk-42ks', `bbl=${bbl}`, SEL);
      const st = streetOf(l.address); (out[st] ||= []).push(l); out[st].sort((a, b) => houseNo(a.address) - houseNo(b.address)); all.push(l);
    }
    l.place = id;
  }
  // roof heights, batched
  const roof = {};
  const bbls = [...new Set(all.map(l => String(Math.round(l.bbl))))];
  for (let i = 0; i < bbls.length; i += 120) {
    const fp = await soda('5zhs-2jue', `mappluto_bbl in (${bbls.slice(i, i + 120).map(b => `'${b}'`).join(',')})`, 'mappluto_bbl,height_roof');
    for (const f of fp) roof[f.mappluto_bbl] = Math.max(roof[f.mappluto_bbl] ?? 0, Number(f.height_roof) || 0);
  }
  for (const [street, lots] of Object.entries(out)) {
    out[street] = lots.map(l => ({
      addr: l.address, num: houseNo(l.address),
      front: num(l.bldgfront) || num(l.lotfront), depth: num(l.bldgdepth) || num(l.lotdepth),
      floors: num(l.numfloors), roof: r1(roof[String(Math.round(l.bbl))]) || null,
      year: num(l.yearbuilt) || null, cls: l.bldgclass, corner: l.lottype === '3',
      ...(l.place && { place: l.place }),
    }));
    for (const l of out[street]) if (l.place) placed[l.place] = [street, l.num];
  }
} else {
  // Hoboken: OSM footprints. Measure each footprint along/across its street in Hoboken's grid.
  const [s, w, n, e] = area.osm.bbox, b = (area.osm.bearing * Math.PI) / 180;
  const q = `[out:json][timeout:60];way["building"]["addr:street"](${s},${w},${n},${e});out geom tags;`;
  const osm = await get('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  const lat0 = (s + n) / 2, mx = 111320 * Math.cos((lat0 * Math.PI) / 180), my = 110540;
  const NS = /^(Washington|Hudson|Monroe|Adams|Bloomfield|Garden|Willow|Clinton|Grand|Jefferson|Madison|Park|River|Court)/;
  for (const el of osm.elements) {
    const t = el.tags, street = t['addr:street'], range = area.streets[street], nmb = houseNo(t['addr:housenumber'] || '');
    if (!range || !(nmb >= range[0] && nmb <= range[1]) || !el.geometry) continue;
    const pts = el.geometry.map(p => { const ee = (p.lon - w) * mx, nn = (p.lat - s) * my; return [ee * Math.sin(b) + nn * Math.cos(b), ee * Math.cos(b) - nn * Math.sin(b)]; });
    const ext = i => Math.max(...pts.map(p => p[i])) - Math.min(...pts.map(p => p[i]));
    const along = ext(0) / 0.3048, across = ext(1) / 0.3048; // feet
    const ns = NS.test(street);
    const levels = num(t['building:levels']);
    (out[street] ||= []).push({
      addr: `${t['addr:housenumber']} ${street.toUpperCase()}`, num: nmb,
      front: Math.round(ns ? along : across), depth: Math.round(ns ? across : along),
      floors: levels, roof: null, year: num(t.start_date?.slice(0, 4)) || null,
      cls: street === 'Washington Street' ? 'S9' : 'C1', corner: false,
      ...(levels == null && { est: true }),
    });
  }
  for (const st of Object.keys(out)) {
    const seen = new Set();
    out[st] = out[st].sort((a, b) => a.num - b.num).filter(l => !seen.has(l.addr) && seen.add(l.addr));
    console.log(`${st}: ${out[st].length} lots`);
  }
  for (const p of places) {
    const m = /^(\d+) (.+?),/.exec(p.address), st = m && Object.keys(out).find(k => k === m[2].replace(/ St$/, ' Street'));
    const l = st && out[st].find(x => x.num === Number(m[1]));
    if (l) { l.place = p.id; placed[p.id] = [st, l.num]; }
  }
}

for (const p of places) if (!placed[p.id]) console.warn(`! ${p.id}: its lot is not in the fetched streets`);
const file = resolve(ROOT, `src/data/lots/${hood}.ts`);
await mkdir(dirname(file), { recursive: true });
const body = Object.entries(out).map(([st, lots]) =>
  `  ${JSON.stringify(st)}: [\n${lots.map(l => `    ${JSON.stringify(l).replace(/"([a-z]+)":/g, '$1: ').replace(/,(?=[a-z]+:)/g, ', ')},`).join('\n')}\n  ],`).join('\n');
await writeFile(file, `// Generated by \`pnpm lots ${hood}\` from ${area.borough ? 'NYC PLUTO + Building Footprints' : 'OpenStreetMap building footprints (floors estimated where OSM has none: est)'}. Do not edit by hand.
// Lots per street in house-number order (both sides; odd/even = side of the street). \`place\` marks a pizzeria's lot.
import type { Street } from '../lots';

export default {
${body}
} satisfies Record<string, Street>;
`);
console.log('wrote', file, placed);
