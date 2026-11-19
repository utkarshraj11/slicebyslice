/* Assembly & depth sorting: builds every tile, sorts back-to-front and mounts the SVG DOM. */
import { PLACES, HOODS, HOOD_IDS, type HoodId, type Place } from '../data/places';
import { INK, reseed, rr, iso, poly, box, esc } from './iso';
import { boatSVG, cloudSVG } from './parts';
import { Tile, type AABB, type Mover } from './tile';
import { bridgeSVG, BRIDGE_BOUNDS } from './bridge';
import { waterSVG, WATER_BOUNDS } from './water';
import { buildMidtown } from './hoods/midtown';
import { buildVillage } from './hoods/village';
import { buildFidi } from './hoods/fidi';
import { buildDumbo } from './hoods/dumbo';
import { buildHoboken } from './hoods/hoboken';
import { buildMidwood } from './hoods/midwood';
import { buildLiberty } from './hoods/liberty';

const NS = 'http://www.w3.org/2000/svg';
export function el(tag: string, attrs: Record<string, string> = {}, html?: string) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (html != null) e.innerHTML = html;
  return e;
}

const EPS = 1e-6;
/** -1: a behind b, 1: b behind a, 0: no constraint */
function rel(a: AABB, b: AABB) {
  const aB = a.x1 <= b.x0 + EPS || a.y1 <= b.y0 + EPS, bB = b.x1 <= a.x0 + EPS || b.y1 <= a.y0 + EPS;
  if (aB && !bB) return -1; if (bB && !aB) return 1;
  if (!aB && !bB) { if (a.above && !b.above) return 1; if (b.above && !a.above) return -1; }
  return 0;
}
export function topo<T extends AABB>(items: T[]): T[] {
  const n = items.length, adj: number[][] = Array.from({ length: n }, () => []), indeg = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const r = rel(items[i], items[j]);
    if (r < 0) { adj[i].push(j); indeg[j]++; } else if (r > 0) { adj[j].push(i); indeg[i]++; }
  }
  const key = (i: number) => (items[i].x0 + items[i].x1 + items[i].y0 + items[i].y1) / 2;
  const done = new Array<boolean>(n).fill(false), out: T[] = [];
  for (let k = 0; k < n; k++) {
    let best = -1;
    for (let i = 0; i < n; i++) if (!done[i] && indeg[i] === 0 && (best < 0 || key(i) < key(best))) best = i;
    if (best < 0) for (let i = 0; i < n; i++) if (!done[i] && (best < 0 || key(i) < key(best))) best = i;
    done[best] = true; out.push(items[best]); for (const j of adj[best]) indeg[j]--;
  }
  return out;
}
/** Index in a sorted list before which mover m should be inserted. */
export function moverIndex(m: AABB, list: (AABB & { node?: Element })[]) {
  let idx = 0;
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.behindAll) { idx = i + 1; continue; }
    const sB = s.x1 <= m.x0 + EPS || s.y1 <= m.y0 + EPS, mB = m.x1 <= s.x0 + EPS || m.y1 <= s.y0 + EPS;
    if (sB && !mB) { idx = i + 1; continue; }
    if (!sB && !mB) {
      if (s.above) continue;
      if (m.onTop) { idx = i + 1; continue; }
      if (s.x0 + s.x1 + s.y0 + s.y1 < m.x0 + m.x1 + m.y0 + m.y1) idx = i + 1;
    }
  }
  return idx;
}

export interface TopItem extends AABB { node: Element }
export interface PinObj { p: Place; node: SVGGElement; g: SVGGElement; sx: number; sy: number; wy: number }
export interface LabelObj { id: HoodId; node: SVGGElement; sx: number; sy: number; w: number }
export interface Cloud { n: Element; x: number; y: number; ph: number }

export interface Scene {
  tiles: Tile[]; tileById: Record<string, Tile>; topSorted: TopItem[];
  boats: Mover[]; clouds: Cloud[]; pinObjs: PinObj[]; labelObjs: LabelObj[];
}
export interface SceneLayers { scene: Element; sky: Element; labels: Element; pins: Element }

/** Which corner each neighborhood label hangs from. */
const LABEL_AT: Record<HoodId, 'left' | 'top' | 'bottom'> = { hoboken: 'bottom', midtown: 'top', village: 'left', fidi: 'left', dumbo: 'top', midwood: 'bottom' };

const sliceIcon = `<path d="M-5.2 -29.2 Q0 -31.6 5.2 -29.2 L0 -18.4 Z" fill="#f6c453" stroke-width="1"/><path d="M-5.4 -29.4 Q0 -32 5.4 -29.4" fill="none" stroke="#c9813c" stroke-width="2"/><circle cx="-1.4" cy="-26.4" r="1.25" fill="#d9473a" stroke="none"/><circle cx="1.6" cy="-24.6" r="1.1" fill="#d9473a" stroke="none"/><circle cx="-.2" cy="-22.2" r=".95" fill="#d9473a" stroke="none"/>`;
function pinHTML(p: Place) {
  const hasR = p.rating != null;
  const tw = Math.max(60, p.name.length * 6.4 + 18);
  return `<circle class="ring" cx="0" cy="-24" r="13" fill="none" stroke="#d9473a" stroke-width="2.5"/>
  <ellipse cx="0" cy="0" rx="7" ry="3" fill="rgba(0,0,0,.2)" stroke="none"/>
  <g class="pbody"><path d="M0 0C-4 -7 -13 -13 -13 -24A13 13 0 1 1 13 -24C13 -13 4 -7 0 0Z" fill="#d9473a" stroke-width="1.7"/>
  <circle cx="0" cy="-24" r="9.2" fill="#fff8ec" stroke-width="1.2"/>
  ${hasR ? `<text x="0" y="-23.6" font-size="${String(p.rating).length > 2 ? 8 : 10}" text-anchor="middle" dominant-baseline="central" font-family="Fraunces, Georgia, serif" font-weight="800" fill="${INK}" stroke="none">${esc(p.rating)}</text>` : sliceIcon}</g>
  <g class="tag" transform="translate(17,-34)"><rect x="0" y="0" width="${tw}" height="20" rx="10" fill="#fffaf1" stroke-width="1.3"/><text x="${tw / 2}" y="10.5" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="700" font-family="DM Sans, Arial, sans-serif" fill="${INK}" stroke="none">${esc(p.name)}</text></g>`;
}

/** Build and mount the whole scene. Deterministic: reseeds the RNG first. */
export function mountScene(L: SceneLayers): Scene {
  reseed();
  const tiles = [buildMidtown(), buildVillage(), buildFidi(), buildDumbo(), buildHoboken(), buildMidwood(), buildLiberty()];
  const tileById: Record<string, Tile> = {}; tiles.forEach(t => (tileById[t.id] = t));
  const PIN: Record<string, [number, number, number]> = {}; tiles.forEach(t => Object.assign(PIN, t.pins));
  for (const p of PLACES) if (!PIN[p.id]) throw new Error(`No pizza(...) call registers a pin for place "${p.id}"`);

  // top-level statics
  const TOPL: TopItem[] = [{ node: el('g', { class: 'water' }, waterSVG()), ...WATER_BOUNDS }];
  tiles.forEach((t, i) => {
    const g = el('g', { class: 'tile' + (t.hood ? ' hood' : ''), 'data-hood': t.hood || '' }) as SVGGElement;
    const lift = el('g', { class: 'lift' }) as SVGGElement;
    lift.style.animationDelay = (0.15 + i * 0.13).toFixed(2) + 's';
    const sorted = topo(t.items);
    const X0 = t.x0, Y0 = t.y0, T = t.T, th = t.thick;
    const sh = [iso(X0, Y0, -th), iso(X0 + T, Y0, -th), iso(X0 + T, Y0 + T, -th), iso(X0, Y0 + T, -th)].map(p => [p[0], p[1] + 9] as [number, number]);
    let html = poly(sh, 'rgba(70,55,30,.08)', 'stroke="none"');
    html += box(X0, Y0, -th, T, T, th, t.slab, { top: t.slab, L: '#e8dfcd', R: '#d8ccb4' });
    html += t.gnd.join('');
    html += '<g class="objs">' + sorted.map(it => '<g>' + it.svg + '</g>').join('') + '</g>';
    lift.innerHTML = html; g.appendChild(lift);
    const objs = lift.querySelector('.objs')!;
    t.objs = objs; sorted.forEach((it, k) => (it.node = objs.children[k])); t.sorted = sorted;
    t.movers.forEach(m => { m.node = el('g', {}, m.svg); m.idx = -1; objs.appendChild(m.node); m.len = Math.abs(m.b - m.a); m.dir = Math.sign(m.b - m.a) || 1; });
    t.node = g;
    TOPL.push({ node: g, x0: X0, x1: X0 + T, y0: Y0, y1: Y0 + T });
  });
  TOPL.push({ node: el('g', { class: 'bridge' }, bridgeSVG()), ...BRIDGE_BOUNDS });
  const topSorted = [TOPL[0], ...topo(TOPL.slice(1))];
  topSorted.forEach(o => L.scene.appendChild(o.node));

  // boats (top-level movers)
  const boats: Mover[] = ([
    { svg: boatSVG('tour'), axis: 'x', a: -6, b: 68, c: 43.2, speed: 1.5, hw: 1.4, hd: 0.5 },
    { svg: boatSVG('tug'), axis: 'x', a: 55, b: -6, c: 39.4, speed: 1.2, hw: 0.8, hd: 0.4 },
    { svg: boatSVG('tour'), axis: 'x', a: -4, b: 68, c: 18.2, speed: 1.3, hw: 1.4, hd: 0.5 },
    { svg: boatSVG('ferry'), axis: 'y', a: 15.5, b: 34, c: 62, speed: 1.1, hw: 0.65, hd: 1.8 },
  ] as const).map(b => {
    const len = Math.abs(b.b - b.a);
    const m: Mover = { ...b, kind: 'car', node: el('g', {}, b.svg), idx: -1, len, dir: Math.sign(b.b - b.a), p: rr(0, len), z: 0, x0: 0, y0: 0, x1: 0, y1: 0 };
    L.scene.appendChild(m.node!);
    return m;
  });

  // clouds
  const clouds: Cloud[] = ([[iso(-10, 24, 13), 120], [iso(30, 6, 15), 130], [iso(78, -14, 9), 95]] as const).map(([p, w], i) => {
    const n = el('g', {}, cloudSVG(w)); L.sky.appendChild(n); return { n, x: p[0], y: p[1], ph: i * 1.7 };
  });

  // pins
  const pinObjs: PinObj[] = PLACES.map((p, i) => {
    const w = PIN[p.id]; const s = iso(w[0], w[1], w[2]);
    const outer = el('g') as SVGGElement;
    const g = el('g', { class: 'pin', 'data-id': p.id, tabindex: '0', role: 'button', 'aria-label': `${p.name}, ${HOODS[p.hood].name}` }, pinHTML(p)) as SVGGElement;
    const inner = el('g', { class: 'pins-in' }) as SVGGElement; inner.style.animationDelay = (1.2 + i * 0.07).toFixed(2) + 's';
    inner.appendChild(g); outer.appendChild(inner);
    return { p, node: outer, g, sx: s[0], sy: s[1], wy: w[0] + w[1] };
  }).sort((a, b) => a.wy - b.wy);
  pinObjs.forEach(o => L.pins.appendChild(o.node));

  // neighborhood labels
  const labelObjs: LabelObj[] = HOOD_IDS.map(id => {
    const t = tileById[id], h = HOODS[id], n = PLACES.filter(p => p.hood === id).length, where = LABEL_AT[id];
    const c = where === 'left' ? iso(t.x0, t.y0 + t.T, -0.4) : where === 'top' ? iso(t.x0, t.y0, t.top * 0.72) : iso(t.x0 + t.T, t.y0 + t.T, -t.thick);
    const w = Math.max(h.name.length * 9.2 + 30, (h.sub.length + 10) * 6.2 + 30);
    const off = where === 'left' ? `${-w - 16},-19` : where === 'top' ? `${-w / 2},-60` : `${-w / 2},20`;
    const lead = where === 'left' ? 'M-16 0H-3' : where === 'top' ? 'M0 -20V-3' : 'M0 3V20';
    const g = el('g', { class: 'tlabel', 'data-hood': id }, `<g transform="translate(${off})">
    <rect class="lb" x="0" y="0" width="${w}" height="40" rx="20" fill="#fffaf1" stroke-width="1.6"/>
    <circle cx="18" cy="20" r="6" fill="${h.color}" stroke-width="1.2"/>
    <text x="32" y="15" font-family="Fraunces, Georgia, serif" font-weight="800" font-size="14.5" fill="${INK}" stroke="none" dominant-baseline="central">${esc(h.name)}</text>
    <text x="32" y="29" font-family="DM Sans, Arial, sans-serif" font-weight="500" font-size="10" fill="#7a7066" stroke="none" dominant-baseline="central">${esc(h.sub)} · ${n} spot${n > 1 ? 's' : ''}</text></g>
    <path d="${lead}" stroke-width="1.3" stroke-dasharray="2 2.5"/><circle cx="0" cy="0" r="2.6" fill="${INK}" stroke="none"/>`) as SVGGElement;
    L.labels.appendChild(g);
    return { id, node: g, sx: c[0], sy: c[1], w };
  });

  return { tiles, tileById, topSorted, boats, clouds, pinObjs, labelObjs };
}
