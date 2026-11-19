/* Brooklyn Bridge, in world coordinates. The deck runs along y (west = Manhattan, east = Brooklyn)
   at x = BR.x .. BR.x + 2. Three parts share these numbers: the Manhattan anchorage and ramp (FiDi tile),
   the river span with both towers (a top-level scene item), and the Brooklyn anchorage (DUMBO tile). */
import { INK, C_STONE, iso, pts, poly, ln, dk, box, face, frect } from './iso';
import type { Pt } from './iso';
import type { Tile } from './tile';

export const BR = {
  /** deck's north edge (world x) */
  x: 90.6,
  /** Brooklyn anchorage, Brooklyn tower, Manhattan tower, Manhattan anchorage (world y) */
  ya: -24.5, t1: -8.0, t2: 2.0, yb: 9.5,
  /** river edges (world y): Brooklyn shore, Manhattan shore */
  shoreB: -10.0, shoreM: 4.0,
};
const ZT = 9.0, ZM = 3.6, ZA = 2.9;

export function cableZ(y: number) {
  const { ya, t1, t2, yb } = BR;
  if (y <= t1) return ZA + (ZT - ZA) * Math.pow(Math.max(0, (y - ya) / (t1 - ya)), 1.35);
  if (y >= t2) return ZA + (ZT - ZA) * Math.pow(Math.max(0, (yb - y) / (yb - t2)), 1.35);
  const s = (y - t1) / (t2 - t1); return ZT - 4 * (ZT - ZM) * s * (1 - s);
}
export function deckSVG(x: number, y0: number, y1: number) {
  let s = box(x, y0, 1.9, 2.0, y1 - y0, 0.4, '#b9a98f', { top: '#8d8478' });
  s += poly([iso(x + 0.7, y0, 2.31), iso(x + 1.3, y0, 2.31), iso(x + 1.3, y1, 2.31), iso(x + 0.7, y1, 2.31)], '#e3d6bd', 'stroke-width=".6"');
  s += ln(iso(x, y0, 2.6), iso(x, y1, 2.6), INK, 0.8) + ln(iso(x + 2, y0, 2.6), iso(x + 2, y1, 2.6), INK, 0.8);
  return s;
}
/** Main cables between y0..y1 along both deck edges, with suspenders where the deck is (y ≥ ydeck). */
export function cablesSVG(y0: number, y1: number, ydeck: number) {
  let s = '';
  for (const cx of [BR.x + 0.2, BR.x + 1.8]) {
    const p: Pt[] = []; for (let y = y0; y <= y1 + 1e-6; y += 0.2) p.push(iso(cx, y, cableZ(y)));
    for (let y = Math.max(y0, ydeck) + 0.2; y < y1; y += 0.45) { const z = cableZ(y); if (z > 2.7) s += ln(iso(cx, y, 2.3), iso(cx, y, z), '#6b625a', 0.55); }
    s += `<polyline points="${pts(p)}" fill="none" stroke-width="1.7"/>`;
  }
  return s;
}
function towerSVG(yc: number) {
  const x = BR.x - 0.35, w = 2.7, d = 0.8, y = yc - d / 2, z0 = -0.5, h = 9.75;
  let s = box(BR.x - 0.55, y - 0.15, -0.65, 3.1, d + 0.3, 0.9, '#b7a487');
  s += box(x, y, z0, w, d, h, C_STONE, { top: '#d9c8ab' });
  // gothic arches on the faces along the roadway, stone courses on the ends
  for (const dir of ['W', 'E'] as const) {
    const F = face(x, y, z0, w, d, dir);
    if (F.hidden) continue;
    for (const [u0, u1] of [[0.4, 1.15], [1.55, 2.3]]) { const um = (u0 + u1) / 2; s += poly([F.at(u0, 2.8), F.at(u1, 2.8), F.at(u1, 6.7), F.at(um, 7.7), F.at(u0, 6.7)], '#dbe9f1'); }
    s += frect(F, 0.25, 8.0, w - 0.25, 8.5, dk(C_STONE, 0.08), 'stroke-width=".6"');
  }
  for (const dir of ['N', 'S'] as const) {
    const F = face(x, y, z0, w, d, dir);
    if (!F.hidden) for (let v = 1.2; v < h; v += 1.3) s += ln(F.at(0, v), F.at(d, v), dk(C_STONE, 0.15), 0.6);
  }
  s += box(x - 0.08, y - 0.08, z0 + h, w + 0.16, d + 0.16, 0.22, '#bfa98a');
  return s;
}
/** The river span: deck, both towers and cables between the shores. */
export function bridgeSVG() {
  const { t1, t2, shoreB, shoreM, x } = BR;
  return deckSVG(x, shoreB, t1 - 0.4) + cablesSVG(shoreB, t1, shoreB) + towerSVG(t1) +
    deckSVG(x, t1 + 0.4, t2 - 0.4) + cablesSVG(t1, t2, t1 + 0.3) + towerSVG(t2) +
    deckSVG(x, t2 + 0.4, shoreM) + cablesSVG(t2, shoreM, t2);
}
/** Scene AABB of the river span. */
export const BRIDGE_BOUNDS = { x0: BR.x - 0.55, x1: BR.x + 2.55, y0: BR.shoreB, y1: BR.shoreM, above: true };

/** Stone anchorage, the deck from the shore to it (with cables), and the ramp down to the street, drawn into a tile. */
export function anchorage(t: Tile, shore: 'brooklyn' | 'manhattan') {
  const x = BR.x, lx = x - t.x0, brooklyn = shore === 'brooklyn';
  const A = brooklyn ? BR.ya : BR.yb, edge = brooklyn ? BR.shoreB : BR.shoreM;
  const ay0 = A - 1.5, ay1 = A + 1.5;
  let s = box(x - 0.3, ay0, 0, 2.6, 3.0, 2.3, C_STONE);
  for (const d of ['N', 'S', 'E', 'W'] as const) { const F = face(x - 0.3, ay0, 0, 2.6, 3.0, d); s += frect(F, F.L * 0.25, 0.25, F.L * 0.75, 1.5, dk(C_STONE, 0.12), 'stroke-width=".6"'); }
  s += poly([iso(x, ay0, 2.31), iso(x + 2, ay0, 2.31), iso(x + 2, ay1, 2.31), iso(x, ay1, 2.31)], '#8d8478');
  t.add(lx - 0.3, ay0 - t.y0, lx + 2.3, ay1 - t.y0, s);
  // deck from the shore to the anchorage, raised over whatever is below
  const d0 = brooklyn ? ay1 : edge, d1 = brooklyn ? edge : ay0;
  t.add(lx, d0 - t.y0, lx + 2, d1 - t.y0, deckSVG(x, d0, d1) + cablesSVG(brooklyn ? A : edge, brooklyn ? edge : A, brooklyn ? A : edge), { above: true });
  // approach ramp down to street level on the landward side
  const top = brooklyn ? ay0 : ay1, foot = brooklyn ? ay0 - 3.2 : ay1 + 3.2;
  let r = poly([iso(x + 2, top, 2.3), iso(x + 2, top, 0), iso(x + 2, foot, 0)], dk(C_STONE, 0.12));
  r += poly([iso(x, top, 2.3), iso(x + 2, top, 2.3), iso(x + 2, foot, 0.02), iso(x, foot, 0.02)], '#8d8478');
  r += ln(iso(x + 1, top, 2.32), iso(x + 1, foot, 0.04), '#f6efe2', 1.2, 'stroke-dasharray="5 5"');
  t.add(lx, Math.min(top, foot) - t.y0, lx + 2, Math.max(top, foot) - t.y0, r);
}
