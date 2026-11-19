/* Isometric math + SVG-string primitives.
   World: +x = south (down-right), +y = west (down-left), +z = up. */
export type Pt = [number, number];
export type Axis = 'x' | 'y';

export const S = 22, CX = Math.cos(Math.PI / 6), HY = 0.5;
export const INK = '#2e2b29';
export const C_TILE = '#f1ece2', C_ROAD = '#dcd6ca', C_LINE = '#e8bb4f', C_GRASS = '#b6d98f', C_WATER = '#a7d0ec', C_WIN = '#cfe2ee', C_STONE = '#cdb99a';
export const TREES = ['#86b96a', '#7aae5f', '#93c374', '#8fbf6a'];
export const SHIRTS = ['#d94a3a', '#3f7fbf', '#f2c230', '#5aa469', '#8e6cc2', '#f08a4b', '#2f3a48', '#ece4d5', '#e07aa0', '#58b5c9', '#c0392b', '#ffffff'];
export const PANTS = ['#2f3a48', '#3d4f7a', '#5a4636', '#6b6f78', '#22303c', '#7a8a9a'];
export const SKIN = ['#f3cfb1', '#e3b08c', '#c68b62', '#9a6544', '#6e4630', '#f1d4c0'];
export const HAIR = ['#2b2420', '#5a3a22', '#c9a066', '#1c1c1c', '#8a5a3a', '#d9d2c5', '#b5532f'];

/* Seeded RNG. Call reseed() before building the scene so every build is identical. */
export const SEED = 20260718;
let seed = SEED;
export const reseed = (n = SEED) => { seed = n; };
export const rnd = () => ((seed = (seed * 16807) % 2147483647), (seed - 1) / 2147483646);
export const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
export const rr = (a: number, b: number) => a + rnd() * (b - a);

export const iso = (x: number, y: number, z = 0): Pt => [(x - y) * CX * S, (x + y) * HY * S - z * S];
export const f1 = (n: number) => Math.round(n * 10) / 10;
export const pts = (a: Pt[]) => a.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');
export const poly = (a: Pt[], fill: string, ex = '') => `<polygon points="${pts(a)}" fill="${fill}"${ex ? ' ' + ex : ''}/>`;
export const ln = (a: Pt, b: Pt, stroke = INK, w = 0.8, ex = '') =>
  `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${stroke}" stroke-width="${w}"${ex ? ' ' + ex : ''}/>`;
export const esc = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function hx(c: string): number[] {
  c = c.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16));
}
const toHex = (a: number[]) => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export function mixc(a: string, b: string, t: number) { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); }
export const lt = (c: string, t = 0.14) => mixc(c, '#ffffff', t);
export const dk = (c: string, t = 0.14) => mixc(c, '#1d1a2a', t);

export interface BoxOpts { top?: string; L?: string; R?: string; ex?: string; noL?: boolean; noR?: boolean; noTop?: boolean }
/* box: [x,x+w]×[y,y+d]×[z,z+h]; visible faces: L (y+d, faces +y), R (x+w, faces +x), top */
export function box(x: number, y: number, z: number, w: number, d: number, h: number, c: string, o: BoxOpts = {}) {
  const top = o.top || lt(c, 0.18), L = o.L || c, R = o.R || dk(c, 0.13), ex = o.ex || '';
  const a = iso(x, y, z + h), b = iso(x + w, y, z + h), cc = iso(x + w, y + d, z + h), dd = iso(x, y + d, z + h);
  const b0 = iso(x + w, y, z), c0 = iso(x + w, y + d, z), d0 = iso(x, y + d, z);
  let s = '';
  if (!o.noL) s += poly([dd, cc, c0, d0], L, ex);
  if (!o.noR) s += poly([cc, b, b0, c0], R, ex);
  if (!o.noTop) s += poly([a, b, cc, dd], top, ex);
  return s;
}

/* A visible face: u along the face (screen left→right), v up, o outward. */
export interface Face { L: number; at: (u: number, v: number, o?: number) => Pt; m: [number, number] }
export const faceL = (x: number, y: number, z: number, w: number, d: number): Face =>
  ({ L: w, at: (u, v, o = 0) => iso(x + u, y + d + o, z + v), m: [CX, HY] });
export const faceR = (x: number, y: number, z: number, w: number, d: number): Face =>
  ({ L: d, at: (u, v, o = 0) => iso(x + w + o, y + d - u, z + v), m: [CX, -HY] });
export const frect = (F: Face, u0: number, v0: number, u1: number, v1: number, fill: string, ex = '') =>
  poly([F.at(u0, v0), F.at(u1, v0), F.at(u1, v1), F.at(u0, v1)], fill, ex);

export interface TextOpts { w?: number; font?: string; ls?: number }
export function ftext(F: Face, u: number, v: number, str: string, size: number, fill: string, o: TextOpts = {}) {
  const p = F.at(u, v, 0.02);
  return `<text transform="matrix(${F.m[0].toFixed(4)},${F.m[1].toFixed(4)},0,1,${f1(p[0])},${f1(p[1])})" font-size="${size}" fill="${fill}" text-anchor="middle" dominant-baseline="central" stroke="none" font-weight="${o.w || 700}" font-family="${o.font || 'DM Sans, Arial, sans-serif'}" letter-spacing="${o.ls || 0.2}">${esc(str)}</text>`;
}
export function cyl(x: number, y: number, z: number, r: number, h: number, fill: string, top?: string, ex = '') {
  const b = iso(x, y, z), t = iso(x, y, z + h), rx = 1.2247 * r * S, ry = 0.7071 * r * S;
  return `<path d="M${f1(b[0] - rx)} ${f1(t[1])}L${f1(b[0] - rx)} ${f1(b[1])}A${f1(rx)} ${f1(ry)} 0 0 0 ${f1(b[0] + rx)} ${f1(b[1])}L${f1(b[0] + rx)} ${f1(t[1])}" fill="${fill}"${ex ? ' ' + ex : ''}/>` +
    `<ellipse cx="${f1(t[0])}" cy="${f1(t[1])}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${top || lt(fill, 0.2)}"${ex ? ' ' + ex : ''}/>`;
}
export function cone(x: number, y: number, z: number, r: number, h: number, fill: string) {
  const b = iso(x, y, z), rx = 1.2247 * r * S, ry = 0.7071 * r * S;
  return `<path d="M${f1(b[0] - rx)} ${f1(b[1])}L${f1(b[0])} ${f1(b[1] - h * S)}L${f1(b[0] + rx)} ${f1(b[1])}A${f1(rx)} ${f1(ry)} 0 0 1 ${f1(b[0] - rx)} ${f1(b[1])}Z" fill="${fill}"/>`;
}
export function circlePts(cx: number, cy: number, r: number, z = 0.03, n = 32): Pt[] {
  const a: Pt[] = [];
  for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; a.push(iso(cx + Math.cos(t) * r, cy + Math.sin(t) * r, z)); }
  return a;
}
/** Wrap inner SVG in a translate to world point (x,y,z). */
export const at = (x: number, y: number, z: number, inner: string) => { const p = iso(x, y, z); return `<g transform="translate(${f1(p[0])},${f1(p[1])})">${inner}</g>`; };
