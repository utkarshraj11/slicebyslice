/* The island plate everything sits on, and the water painted on it: East River (y −10..4), Hudson (y 44.5..57,
   the wider of the two, as in life), the harbour (x 112..132). Boat routes run along the water. */
import type { Axis } from './iso';
import { C_WATER, rnd, rr, iso, rot, f1, poly, ln } from './iso';

/** Outline of the island plate (world coords, same winding as WATER): hugs every tile and the water. */
export const ISLAND: [number, number][] = [[-8, -12], [86, -12], [86, -32], [116, -32], [116, -48], [136, -48], [136, 59], [48, 59], [48, 97], [0, 97], [0, 59], [-8, 59]];
/** Top of the plate; tiles stand on it, water is painted on it. */
export const Z_PLATE = -0.45;

export const WATER: [number, number][] = [[-6, -10], [112, -10], [112, -24], [132, -24], [132, 57], [-6, 57], [-6, 44.5], [112, 44.5], [112, 4], [-6, 4]];
/** Rectangles used to scatter wave marks. */
export const WATER_RECTS = [[-6, -10, 112, 4], [-6, 44.5, 112, 57], [112, -24, 132, 57]];
/** Land areas (tiles) to keep wave marks off: [x0, y0, x1, y1]. */
const DRY = [[115.5, 35.5, 122.5, 42.5]];
export const WATER_BOUNDS = { x0: -8, x1: 136, y0: -48, y1: 97, behindAll: true };

export interface BoatRoute { kind: 'ferry' | 'tour' | 'tug'; axis: Axis; a: number; b: number; c: number; speed: number; hw: number; hd: number }
export const BOATS: BoatRoute[] = [
  { kind: 'tour', axis: 'x', a: -6, b: 128, c: 50.5, speed: 1.5, hw: 1.4, hd: 0.5 },
  { kind: 'tug', axis: 'x', a: 110, b: -6, c: -6.0, speed: 1.2, hw: 0.8, hd: 0.4 },
  { kind: 'tour', axis: 'x', a: -4, b: 128, c: -2.0, speed: 1.3, hw: 1.4, hd: 0.5 },
  { kind: 'ferry', axis: 'y', a: -20, b: 50, c: 126, speed: 1.1, hw: 0.65, hd: 1.8 },
];

/** Side walls of an extruded outline that face the viewer, far ones first (the outline may be concave). */
function walls(o: [number, number][], zt: number, zb: number, cA: string, cB: string) {
  const ws: [number, string][] = [];
  for (let i = 0; i < o.length; i++) {
    const a = o[i], b = o[(i + 1) % o.length];
    const [ax, ay] = rot(a[0], a[1]), [bx, by] = rot(b[0], b[1]);
    const nx = by - ay, ny = -(bx - ax);
    if (nx <= 0 && ny <= 0) continue;
    const zm = zt + (zb - zt) * 0.38; // a faint soil line
    ws.push([ax + bx + ay + by, poly([iso(a[0], a[1], zt), iso(b[0], b[1], zt), iso(b[0], b[1], zb), iso(a[0], a[1], zb)], nx > 0 ? cA : cB) +
      ln(iso(a[0], a[1], zm), iso(b[0], b[1], zm), 'rgba(90,70,40,.22)', 0.9)]);
  }
  return ws.sort((p, q) => p[0] - q[0]).map(w => w[1]).join('');
}

export function waterSVG() {
  const zt = Z_PLATE + 0.01;
  // the island: earth sides, then the plate
  let s = walls(ISLAND, Z_PLATE, -2.6, '#d4bf9b', '#e2d1b1') + poly(ISLAND.map(p => iso(p[0], p[1], Z_PLATE)), '#e9e1cf');
  // water: flat on the plate, darker toward the banks (wide strokes clipped to the water's own outline)
  const pts = WATER.map(p => iso(p[0], p[1], zt)), P = pts.map(p => p.map(f1).join(',')).join(' ');
  s += `<clipPath id="wclip"><polygon points="${P}"/></clipPath>` + poly(pts, C_WATER, 'stroke="none"') +
    `<g clip-path="url(#wclip)" fill="none" stroke="#3f9aa0"><polygon points="${P}" stroke-width="26" opacity=".18"/><polygon points="${P}" stroke-width="9" opacity=".22"/></g>` +
    poly(pts, 'none', 'stroke="#4f8f93" stroke-width="1.1"');
  for (let i = 0; i < 190; i++) {
    const r = WATER_RECTS[i % WATER_RECTS.length]; const x = rr(r[0] + 0.5, r[2] - 0.5), y = rr(r[1] + 0.4, r[3] - 0.4);
    if (DRY.some(d => x > d[0] && x < d[2] && y > d[1] && y < d[3])) continue;
    const p = iso(x, y, zt), w = rr(5, 9);
    s += `<path class="wave" style="animation-delay:${(-rnd() * 4).toFixed(2)}s" d="M${f1(p[0] - w)} ${f1(p[1])}q${f1(w / 2)} -3 ${f1(w)} 0t${f1(w)} 0" fill="none" stroke="#f1faf8" stroke-width="1.3"/>`;
  }
  return s;
}
