/* Isometric math + SVG-string primitives.
   World: +x = south, +y = west, +z = up (Manhattan-grid compass).
   The view can be rotated in 90° steps (setRot). Everything is drawn from world coordinates and
   passes through rot() before projection, so builders never need to know the view direction:
   they ask for a building's face by compass side and get `hidden` back when it faces away. */
export type Pt = [number, number];
export type Axis = 'x' | 'y';
/** Compass side of a box. S = +x, N = −x, W = +y, E = −y. */
export type Dir = 'N' | 'E' | 'S' | 'W';

export const S = 22, CX = Math.cos(Math.PI / 6), HY = 0.5;
export const INK = '#2e2b29';
export const C_TILE = '#f1ece2', C_ROAD = '#bfb8ad', C_LINE = '#e8bb4f', C_GRASS = '#a3d07a', C_WATER = '#94d0cd', C_WIN = '#cfe2ee', C_STONE = '#cdb99a';
export const TREES = ['#8fc36a', '#a5cf6c', '#7fb862', '#b3d575', '#98c96f'];
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

/* ---------- view rotation ---------- */
let ROT = 0;
/** Turn the view: k quarter turns (0 = looking from the south-west, 1 = from the north-west, …). */
export const setRot = (k: number) => { ROT = ((k % 4) + 4) % 4; };
export const getRot = () => ROT;
/** World → view coordinates (a rotation about the world origin). */
export function rot(x: number, y: number): Pt {
  switch (ROT) {
    case 1: return [y, -x];
    case 2: return [-x, -y];
    case 3: return [-y, x];
    default: return [x, y];
  }
}
/** World box → view-space box [x, y, w, d]. */
export function rotBox(x: number, y: number, w: number, d: number): [number, number, number, number] {
  const [a, b] = rot(x, y), [c, e] = rot(x + w, y + d);
  return [Math.min(a, c), Math.min(b, e), Math.abs(c - a), Math.abs(e - b)];
}
/** World AABB → view AABB (for depth sorting). */
export function rotAABB<T extends { x0: number; y0: number; x1: number; y1: number }>(b: T): T {
  const [x, y, w, d] = rotBox(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  return { ...b, x0: x, y0: y, x1: x + w, y1: y + d };
}
const NORMAL: Record<Dir, Pt> = { S: [1, 0], N: [-1, 0], W: [0, 1], E: [0, -1] };
/** Which view side ('L' = facing view +y, 'R' = facing view +x) a compass side lands on, or null if it faces away. */
export function viewSide(dir: Dir): 'L' | 'R' | null {
  const [a, b] = rot(...NORMAL[dir]);
  return b > 0.5 ? 'L' : a > 0.5 ? 'R' : null;
}
export const visible = (dir: Dir) => viewSide(dir) !== null;
/** Whether a compass side faces the viewer at rotation k. */
export function visibleAt(dir: Dir, k: number) { const prev = ROT; ROT = ((k % 4) + 4) % 4; const v = visible(dir); ROT = prev; return v; }
/** Rotation (closest to `from`) that shows a compass side. */
export function rotShowing(dir: Dir, from: number) {
  const prev = ROT; let best = from, bestD = 9;
  for (let k = 0; k < 4; k++) { ROT = k; if (visible(dir)) { const d = Math.min((k - from + 4) % 4, (from - k + 4) % 4); if (d < bestD) { bestD = d; best = k; } } }
  ROT = prev; return best;
}

/** Projection of view coordinates. */
export const iso0 = (x: number, y: number, z = 0): Pt => [(x - y) * CX * S, (x + y) * HY * S - z * S];
/** Projection of world coordinates. */
export const iso = (x: number, y: number, z = 0): Pt => { const [a, b] = rot(x, y); return iso0(a, b, z); };

export const f1 = (n: number) => Math.round(n * 10) / 10;
export const pts = (a: Pt[]) => a.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');
/** Stroke in a deep shade of the fill (soft, coloured outlines) unless `ex` sets its own. */
export const edge = (fill: string, ex = '') => (ex.includes('stroke=') || fill[0] !== '#' ? '' : ` stroke="${dk(fill, 0.45)}"`);
export const poly = (a: Pt[], fill: string, ex = '') => `<polygon points="${pts(a)}" fill="${fill}"${edge(fill, ex)}${ex ? ' ' + ex : ''}/>`;
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
/** Box [x,x+w]×[y,y+d]×[z,z+h] in world coords. Draws the two faces the view can see + the top;
    `L`/`R` colours are screen-relative (lower-left / lower-right face), so lighting stays consistent. */
export function box(x: number, y: number, z: number, w: number, d: number, h: number, c: string, o: BoxOpts = {}) {
  [x, y, w, d] = rotBox(x, y, w, d);
  const top = o.top || lt(c, 0.18), L = o.L || c, R = o.R || dk(c, 0.13), ex = o.ex || '';
  const a = iso0(x, y, z + h), b = iso0(x + w, y, z + h), cc = iso0(x + w, y + d, z + h), dd = iso0(x, y + d, z + h);
  const b0 = iso0(x + w, y, z), c0 = iso0(x + w, y + d, z), d0 = iso0(x, y + d, z);
  let s = '';
  if (!o.noL) s += poly([dd, cc, c0, d0], L, ex);
  if (!o.noR) s += poly([cc, b, b0, c0], R, ex);
  if (!o.noTop) s += poly([a, b, cc, dd], top, ex);
  return s;
}

/** A face of a box: u along the face (screen left→right), v up, o outward. `hidden` faces draw nothing. */
export interface Face { L: number; at: (u: number, v: number, o?: number) => Pt; m: [number, number]; dir: Dir; side: 'L' | 'R' | null; hidden: boolean }
const viewL = (x: number, y: number, z: number, w: number, d: number, dir: Dir): Face =>
  ({ L: w, at: (u, v, o = 0) => iso0(x + u, y + d + o, z + v), m: [CX, HY], dir, side: 'L', hidden: false });
const viewR = (x: number, y: number, z: number, w: number, d: number, dir: Dir): Face =>
  ({ L: d, at: (u, v, o = 0) => iso0(x + w + o, y + d - u, z + v), m: [CX, -HY], dir, side: 'R', hidden: false });
/** The compass-side face of world box [x,x+w]×[y,y+d], seen from the current view. */
export function face(x: number, y: number, z: number, w: number, d: number, dir: Dir): Face {
  const side = viewSide(dir);
  const [vx, vy, vw, vd] = rotBox(x, y, w, d);
  if (side === 'L') return viewL(vx, vy, z, vw, vd, dir);
  if (side === 'R') return viewR(vx, vy, z, vw, vd, dir);
  // facing away: keep a usable geometry (length, points) but mark it hidden
  const len = dir === 'N' || dir === 'S' ? d : w;
  return { ...viewL(vx, vy, z, vw, vd, dir), L: len, side: null, hidden: true };
}
/** Legacy names: the west and south faces (what the default view sees). */
export const faceL = (x: number, y: number, z: number, w: number, d: number) => face(x, y, z, w, d, 'W');
export const faceR = (x: number, y: number, z: number, w: number, d: number) => face(x, y, z, w, d, 'S');
/** All four faces of a box, visible ones only. */
export const visibleFaces = (x: number, y: number, z: number, w: number, d: number) =>
  (['N', 'E', 'S', 'W'] as Dir[]).map(dir => face(x, y, z, w, d, dir)).filter(F => !F.hidden);

export const frect = (F: Face, u0: number, v0: number, u1: number, v1: number, fill: string, ex = '') =>
  F.hidden ? '' : poly([F.at(u0, v0), F.at(u1, v0), F.at(u1, v1), F.at(u0, v1)], fill, ex);

export interface TextOpts { w?: number; font?: string; ls?: number }
export function ftext(F: Face, u: number, v: number, str: string, size: number, fill: string, o: TextOpts = {}) {
  if (F.hidden) return '';
  const p = F.at(u, v, 0.02);
  return `<text transform="matrix(${F.m[0].toFixed(4)},${F.m[1].toFixed(4)},0,1,${f1(p[0])},${f1(p[1])})" font-size="${size}" fill="${fill}" text-anchor="middle" dominant-baseline="central" stroke="none" font-weight="${o.w || 700}" font-family="${o.font || 'DM Sans, Arial, sans-serif'}" letter-spacing="${o.ls || 0.2}">${esc(str)}</text>`;
}
/** Text lying flat on the ground along a world axis, reading left-to-right in any view. */
export function gtext(x: number, y: number, axis: Axis, str: string, size: number, fill: string, o: TextOpts & { z?: number } = {}) {
  const o0 = iso(0, 0), ex = iso(1, 0), ey = iso(0, 1);
  let u: Pt = axis === 'x' ? [(ex[0] - o0[0]) / S, (ex[1] - o0[1]) / S] : [(ey[0] - o0[0]) / S, (ey[1] - o0[1]) / S];
  let v: Pt = axis === 'x' ? [(ey[0] - o0[0]) / S, (ey[1] - o0[1]) / S] : [(ex[0] - o0[0]) / S, (ex[1] - o0[1]) / S];
  if (u[0] < 0) u = [-u[0], -u[1]];
  if (u[0] * v[1] - u[1] * v[0] < 0) v = [-v[0], -v[1]];
  const p = iso(x, y, o.z ?? 0.03);
  return `<text transform="matrix(${u[0].toFixed(4)},${u[1].toFixed(4)},${v[0].toFixed(4)},${v[1].toFixed(4)},${f1(p[0])},${f1(p[1])})" font-size="${size}" fill="${fill}" text-anchor="middle" dominant-baseline="central" stroke="none" font-weight="${o.w || 700}" font-family="${o.font || 'DM Sans, Arial, sans-serif'}" letter-spacing="${o.ls ?? 1.5}">${esc(str)}</text>`;
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

/** Gable roof over world box [x,x+w]×[y,y+d] at eave height h, ridge along `ridge` (world axis), rising `rise`.
    Draws the far slope, near slope and visible gable ends for the current view. */
export function gableRoof(x: number, y: number, w: number, d: number, h: number, rise: number, ridge: Axis, roofC: string, wallC: string, ov = 0.1) {
  // work in view space: the ridge axis swaps on odd rotations
  const [vx, vy, vw, vd] = rotBox(x, y, w, d);
  const vr: Axis = (ridge === 'x') === (ROT % 2 === 0) ? 'x' : 'y';
  let s = '';
  if (vr === 'x') {
    const ym = vy + vd / 2;
    const A = iso0(vx - ov, vy - ov, h), B = iso0(vx + vw + ov, vy - ov, h), C = iso0(vx + vw + ov, vy + vd + ov, h), D = iso0(vx - ov, vy + vd + ov, h);
    const R0 = iso0(vx - ov, ym, h + rise), R1 = iso0(vx + vw + ov, ym, h + rise);
    s += poly([A, B, R1, R0], dk(roofC, 0.12));                                              // far slope
    s += poly([iso0(vx + vw, vy, h), iso0(vx + vw, ym, h + rise), iso0(vx + vw, vy + vd, h)], dk(wallC, 0.13)); // gable on the R side
    s += poly([R0, R1, C, D], roofC);                                                         // near slope
  } else {
    const xm = vx + vw / 2;
    const A = iso0(vx - ov, vy - ov, h), B = iso0(vx + vw + ov, vy - ov, h), C = iso0(vx + vw + ov, vy + vd + ov, h), D = iso0(vx - ov, vy + vd + ov, h);
    const R0 = iso0(xm, vy - ov, h + rise), R1 = iso0(xm, vy + vd + ov, h + rise);
    s += poly([A, R0, R1, D], dk(roofC, 0.12));                                              // far slope
    s += poly([iso0(vx, vy + vd, h), iso0(xm, vy + vd, h + rise), iso0(vx + vw, vy + vd, h)], wallC); // gable on the L side
    s += poly([R0, B, C, R1], roofC);                                                         // near slope
  }
  return s;
}
