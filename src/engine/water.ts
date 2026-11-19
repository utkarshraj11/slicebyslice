/* Water: East River (y 14–22), Hudson (y 38–46), Bay (x 56–70). Boat routes run along it. */
import type { Axis } from './iso';
import { C_WATER, rnd, rr, iso, rot, f1, poly } from './iso';

export const WATER: [number, number][] = [[-6, -10], [112, -10], [112, -24], [132, -24], [132, 49], [112, 49], [112, 47], [-6, 47], [-6, 40.5], [112, 40.5], [112, 4], [-6, 4]];
/** Rectangles used to scatter wave marks. */
export const WATER_RECTS = [[-6, -10, 112, 4], [-6, 40.5, 112, 47], [112, -24, 132, 49]];
/** Land areas (tiles) to keep wave marks off: [x0, y0, x1, y1]. */
const DRY = [[115.5, 35.5, 122.5, 42.5]];
export const WATER_BOUNDS = { x0: -6, x1: 132, y0: -24, y1: 49, behindAll: true };

export interface BoatRoute { kind: 'ferry' | 'tour' | 'tug'; axis: Axis; a: number; b: number; c: number; speed: number; hw: number; hd: number }
export const BOATS: BoatRoute[] = [
  { kind: 'tour', axis: 'x', a: -6, b: 128, c: 43.8, speed: 1.5, hw: 1.4, hd: 0.5 },
  { kind: 'tug', axis: 'x', a: 110, b: -6, c: -6.0, speed: 1.2, hw: 0.8, hd: 0.4 },
  { kind: 'tour', axis: 'x', a: -4, b: 128, c: -2.0, speed: 1.3, hw: 1.4, hd: 0.5 },
  { kind: 'ferry', axis: 'y', a: -20, b: 30, c: 126, speed: 1.1, hw: 0.65, hd: 1.8 },
];

export function waterSVG() {
  const zt = -0.45, zb = -1.25; let s = '';
  // side walls of the water slab that face the viewer (outward normal toward view +x or +y)
  const n = WATER.length;
  for (let i = 0; i < n; i++) {
    const a = WATER[i], b = WATER[(i + 1) % n];
    const [ax, ay] = rot(a[0], a[1]), [bx, by] = rot(b[0], b[1]);
    const nx = by - ay, ny = -(bx - ax);
    if (nx > 0 || ny > 0) s += poly([iso(a[0], a[1], zt), iso(b[0], b[1], zt), iso(b[0], b[1], zb), iso(a[0], a[1], zb)], nx > 0 ? '#86b5d6' : '#95c2e2');
  }
  s += poly(WATER.map(p => iso(p[0], p[1], zt)), C_WATER);
  for (let i = 0; i < 190; i++) {
    const r = WATER_RECTS[i % WATER_RECTS.length]; const x = rr(r[0] + 0.5, r[2] - 0.5), y = rr(r[1] + 0.4, r[3] - 0.4);
    if (DRY.some(d => x > d[0] && x < d[2] && y > d[1] && y < d[3])) continue;
    const p = iso(x, y, zt), w = rr(5, 9);
    s += `<path class="wave" style="animation-delay:${(-rnd() * 4).toFixed(2)}s" d="M${f1(p[0] - w)} ${f1(p[1])}q${f1(w / 2)} -3 ${f1(w)} 0t${f1(w)} 0" fill="none" stroke="#eef7fc" stroke-width="1.3"/>`;
  }
  return s;
}
