/* Water: East River (y 14–22), Hudson (y 38–46), Bay (x 56–70). */
import { C_WATER, rnd, rr, iso, f1, poly } from './iso';

export const WATER: [number, number][] = [[-4, 14], [70, 14], [70, 46], [-6, 46], [-6, 38], [56, 38], [56, 22], [-4, 22]];
/** Rectangles used to scatter wave marks. */
export const WATER_RECTS = [[-4, 14, 70, 22], [-6, 38, 70, 46], [56, 14, 70, 46]];
export const WATER_BOUNDS = { x0: -6, x1: 70, y0: 14, y1: 48, behindAll: true };

export function waterSVG() {
  const zt = -0.45, zb = -1.25; let s = '';
  // visible side faces (outward normal +x or +y)
  const n = WATER.length;
  for (let i = 0; i < n; i++) {
    const a = WATER[i], b = WATER[(i + 1) % n];
    const nx = b[1] - a[1], ny = -(b[0] - a[0]);
    if (nx > 0 || ny > 0) s += poly([iso(a[0], a[1], zt), iso(b[0], b[1], zt), iso(b[0], b[1], zb), iso(a[0], a[1], zb)], nx > 0 ? '#86b5d6' : '#95c2e2');
  }
  s += poly(WATER.map(p => iso(p[0], p[1], zt)), C_WATER);
  for (let i = 0; i < 190; i++) {
    const r = WATER_RECTS[i % 3]; const x = rr(r[0] + 0.5, r[2] - 0.5), y = rr(r[1] + 0.4, r[3] - 0.4);
    if (x > 39.6 && x < 56.4 && y > 21.6 && y < 38.4) continue;
    if (x > 59.5 && x < 66.5 && y > 35.5 && y < 42.5) continue;
    const p = iso(x, y, zt), w = rr(5, 9);
    s += `<path class="wave" style="animation-delay:${(-rnd() * 4).toFixed(2)}s" d="M${f1(p[0] - w)} ${f1(p[1])}q${f1(w / 2)} -3 ${f1(w)} 0t${f1(w)} 0" fill="none" stroke="#eef7fc" stroke-width="1.3"/>`;
  }
  return s;
}
