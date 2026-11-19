/* Fog of war, as in GTA's map or Pixel Chennai: the neighbourhoods we've been to (and the bridge between
   them) are lit; everything else fades into the paper, in soft steps. Under the fog, a dim street grid
   stands in for the rest of the city so the faded land reads as "not explored", not as empty. */
import { iso, f1 } from './iso';
import { ISLAND, WATER } from './water';
import { BRIDGE_BOUNDS } from './bridge';
import type { Tile } from './tile';

type P = [number, number];
type Box = { x0: number; y0: number; x1: number; y1: number; z0: number; z1: number };

const inPoly = (x: number, y: number, poly: P[]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
/** Convex hull (monotone chain) of screen points. */
function hull(pts: P[]): P[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: P[] = [], hi: P[] = [];
  for (const q of p) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (hi.length > 1 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
/** Screen outline of a world box grown by r (and its top by r too), in the current view. */
function outline(b: Box, r: number) {
  const pts: P[] = [];
  for (const x of [b.x0 - r, b.x1 + r]) for (const y of [b.y0 - r, b.y1 + r]) for (const z of [b.z0, b.z1 + r * 0.6]) pts.push(iso(x, y, z));
  return 'M' + hull(pts).map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
}

/** Areas kept out of the fog as a whole (world coords): Lower Manhattan from the Village down to the Battery,
 *  the harbour out to the Statue of Liberty, the East River and Brooklyn from DUMBO to Midwood. */
const LIT_AREAS: Box[] = [{ x0: 86, y0: -48, x1: 136, y1: 44, z0: -0.45, z1: 1 }];

/** World boxes that stay lit: every neighbourhood tile (up to its tallest building), the Statue of Liberty,
 *  the Brooklyn Bridge and LIT_AREAS. */
const litBoxes = (tiles: Tile[]): Box[] => [
  ...LIT_AREAS,
  ...tiles.filter(t => t.hood || t.id === 'liberty').map(t => ({ x0: t.x0, y0: t.y0, x1: t.x0 + t.W, y1: t.y0 + t.D, z0: -t.thick, z1: t.top })),
  { x0: BRIDGE_BOUNDS.x0, y0: BRIDGE_BOUNDS.y0, x1: BRIDGE_BOUNDS.x1, y1: BRIDGE_BOUNDS.y1, z0: 0, z1: 10 },
];

/** Flat city blocks on the dry land outside the tiles (drawn on the plate, under the fog). One path. */
export function contextSVG(tiles: Tile[]) {
  const taken = tiles.map(t => [t.x0 - 0.8, t.y0 - 0.8, t.x0 + t.W + 0.8, t.y0 + t.D + 0.8]);
  const dry = (x: number, y: number) => inPoly(x, y, ISLAND) && !inPoly(x, y, WATER);
  let d = '';
  for (let x = -7.4; x < 136; x += 3.6) for (let y = -47.4; y < 97; y += 2.6) {
    const [x1, y1] = [x + 2.8, y + 1.9];
    if (![[x, y], [x1, y], [x1, y1], [x, y1]].every(([a, b]) => dry(a, b))) continue;
    if (taken.some(t => x < t[2] && x1 > t[0] && y < t[3] && y1 > t[1])) continue;
    d += 'M' + [iso(x, y, -0.44), iso(x1, y, -0.44), iso(x1, y1, -0.44), iso(x, y1, -0.44)].map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
  }
  return `<path d="${d}" fill="#ddd2bd" stroke="none"/>`;
}

/** The fog layer: a paper-coloured sheet over everything, with stepped soft holes over the lit areas. */
export function fogSVG(tiles: Tile[]) {
  const boxes = litBoxes(tiles);
  const corners = ISLAND.map(([x, y]) => iso(x, y, 0));
  const X0 = Math.min(...corners.map(p => p[0])) - 4000, Y0 = Math.min(...corners.map(p => p[1])) - 4000;
  const big = `x="${f1(X0)}" y="${f1(Y0)}" width="${f1(Math.max(...corners.map(p => p[0])) - X0 + 4000)}" height="${f1(Math.max(...corners.map(p => p[1])) - Y0 + 4000)}"`;
  // mask luminance = fog strength: wide grey rings, then darker, then clear over the tiles themselves
  const ring = (r: number, c: string) => `<path d="${boxes.map(b => outline(b, r)).join('')}" fill="${c}" stroke="none"/>`;
  return `<mask id="fogm" maskUnits="userSpaceOnUse" ${big}><rect ${big} fill="#fff" stroke="none"/>` +
    ring(7, '#9a9a9a') + ring(4, '#5c5c5c') + ring(1.8, '#262626') + ring(0.4, '#000') +
    `</mask><rect class="fog" ${big} mask="url(#fogm)" stroke="none"/>`;
}
