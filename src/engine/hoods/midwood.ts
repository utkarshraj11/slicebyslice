import { Tile } from '../tile';
import { box, face, frect, ln, iso, poly, viewSide, INK, type Dir, type Pt } from '../iso';
import { side, lot, type Lot } from '../../data/lots';
import { fromLot, frontage } from '../styles';
import Mw from '../../data/lots/midwood';

/* Midwood at Avenue J, schematic but true to the street map (OpenStreetMap, Nov 2026).
   Frame: Brooklyn's grid (x south, y west). Avenue J runs east–west; E 15th and E 16th St run north–south.
     Di Fara Pizza  1424 Avenue J, the south-west corner of Avenue J & E 15th St, faces north onto Avenue J.
   The Brighton Line (B/Q) runs in an open cut between E 15th and E 16th St, under Avenue J at the Avenue J
   station. Avenue J is one- to three-storey shops; the side streets are detached frame houses with lawns.
   North of Avenue J the houses are same-era houses from E 15th St two blocks north (not fetched closer). */
const AJ = Mw['AVENUE J'], E15 = Mw['EAST 15 STREET'];

export function buildMidwood(): Tile {
  const W = 16, D = 16;
  const t = new Tile('midwood', 118, -46, [W, D], { hood: 'midwood', top: 4 });

  /* ---------- streets ---------- */
  t.road(7.0, 0, 1.6, D, 'y', { name: 'Avenue J', nameAt: 0.78 });
  t.road(0, 9.6, 7.0, 1.0, 'x', { line: false, name: 'E 15th St', nameAt: 0.4 });
  t.road(8.6, 9.6, 7.4, 1.0, 'x', { line: false });
  t.road(0, 0.6, 7.0, 1.0, 'x', { line: false, name: 'E 16th St', nameAt: 0.4 });
  t.road(8.6, 0.6, 7.4, 1.0, 'x', { line: false });
  t.xwalk(6.4, 9.6, 0.5, 1.0); t.xwalk(8.7, 9.6, 0.5, 1.0); t.xwalk(7.0, 10.65, 1.6, 0.45);

  /* ---------- the Brighton Line in its open cut, Avenue J on a bridge over it ---------- */
  cut(t, 0, 2.4, 7.0, 3.4); cut(t, 8.6, 2.4, 7.4, 3.4);
  { // the Avenue J bridge deck: drawn over trains passing beneath
    const X = t.X(7.0), Y = t.Y(2.4);
    let s = box(X, Y, -0.25, 1.6, 3.4, 0.25, '#cfc8bb', { top: '#dcd6ca' });
    for (const dir of ['N', 'S'] as Dir[]) { const F = face(X, Y, 0, 1.6, 3.4, dir); if (!F.hidden) s += ln(F.at(0, 0.45), F.at(F.L, 0.45), INK, 1); }
    t.add(7.0, 2.4, 8.6, 5.8, s, { above: true });
  }
  // station entrance on the bridge, platforms below
  t.b(5.0, 5.95, 1.3, 1.1, 1.3, '#5a8f6e', { style: 'modern', floors: 1, g0: 1.2, fh: 1.0, key: 'AVE J STATION', roof: '#3f6b54' });
  t.movers.push({ kind: 'car', axis: 'x', a: -1, b: W + 1, c: 4.1, speed: 1.6, z: -1.05, hw: 1.4, hd: 0.4, p: 3, svg: trainSVG(), x0: 0, y0: 0, x1: 0, y1: 0 });

  /* ---------- Avenue J's shops ---------- */
  t.face([lot(AJ, 1424), ...side(AJ, 1422, 1408)], 'N', 9.2, 11.2, D - 0.2, { depth: 2.4, corners: { 1424: 'E' },
    pizzas: { difara: { sign: 'DI FARA PIZZA', signSize: 5.6, awn: ['#3d7a4f', '#f4efe3'], signBg: '#c8423a', signFg: '#fff8ea', base: '#e9dcc0' } } });
  t.face([lot(AJ, 1423), ...side(AJ, 1417, 1403)], 'S', 6.4, 11.2, D - 0.2, { depth: 2.2, corners: { 1423: 'E' } });
  t.face(side(AJ, 1501, 1505), 'S', 6.4, 9.0, 7.2, { depth: 2.2, corners: { 1501: 'W' } });
  t.face(side(AJ, 1502, 1508), 'N', 9.2, 9.0, 6.0, { depth: 2.2, corners: { 1502: 'W' } });

  /* ---------- frame houses with lawns on E 15th St ---------- */
  houses(t, side(E15, 1324, 1340), 'E', 11.2, 11.8, 16.0, 2.0);   // west side, south of Avenue J
  houses(t, side(E15, 1317, 1339), 'W', 9.0, 11.8, 16.0, 2.0);    // east side, south of Avenue J
  houses(t, side(E15, 1130, 1140), 'E', 11.2, 0.2, 3.9, 2.0);     // north of Avenue J (stand-ins)
  houses(t, side(E15, 1129, 1137), 'W', 9.0, 0.2, 3.9, 2.0);
  for (const [x, y, s] of [[13.2, 13.0, 0.9], [15.2, 15.4, 0.85], [1.4, 13.8, 0.9], [3.6, 15.2, 0.8], [14.4, 7.6, 0.85], [2.2, 6.8, 0.8]]) t.tree(x, y, s);

  /* ---------- life ---------- */
  t.queue(8.95, 11.5, 'y', 6, 0.42);  // Di Fara's line along Avenue J
  t.parked(3.0, 1.3, 'x', '#d9473a'); t.parked(12.0, 0.9, 'x', '#5a6e7a'); // E 16th St
  t.lamp(6.5, 9.4); t.lamp(9.1, 11.0); t.hydrant(9.1, 15.6);
  t.car('y', 0, D, 7.55, 1.0, '#3f7fbf'); t.car('y', D, 0, 8.05, 0.9, '#e8e4dc'); t.car('x', 0, W, 10.1, 0.8, '#f08a4b');
  t.walker('y', 0.3, D - 0.3, 6.65, 0.35); t.walker('y', 0.3, D - 0.3, 8.95, 0.4); t.walker('x', 0.3, W - 0.3, 9.35, 0.35);
  return t;
}

/** Detached frame houses along one side of a street: real widths with side yards, a lawn in front. */
function houses(t: Tile, lots: Lot[], facing: 'E' | 'W', at: number, from: number, to: number, depth: number) {
  const lawn = 0.6;
  let x = from;
  for (const l of lots) {
    const w = frontage(l.front ?? 20) * 0.85;
    if (x + w > to) break;
    const [gy, hy] = facing === 'W' ? [at - lawn, at - depth] : [at, at + lawn];
    t.grass(x - 0.15, gy, w + 0.3, lawn);
    const r = fromLot(l, { front: facing, style: 'frame' });
    t.b(x, hy, w, depth - lawn, r.h, r.c, r.opts);
    x += w + 0.45;
  }
}

/** A sunken railway cut: gravel floor, retaining walls on the sides the viewer can see, rails. */
function cut(t: Tile, x: number, y: number, w: number, d: number) {
  const z = -1.15, P = (a: number, b: number, zz = z): Pt => t.P(a, b, zz);
  let s = poly([P(x, y), P(x + w, y), P(x + w, y + d), P(x, y + d)], '#8f8578');
  // the wall along y (east side) faces west; the one along y + d faces east: draw whichever faces the viewer
  if (viewSide('W')) s += poly([P(x, y, 0), P(x + w, y, 0), P(x + w, y), P(x, y)], '#b7ab98');
  if (viewSide('E')) s += poly([P(x, y + d, 0), P(x + w, y + d, 0), P(x + w, y + d), P(x, y + d)], '#a89c88');
  if (viewSide('S')) s += poly([P(x, y, 0), P(x, y + d, 0), P(x, y + d), P(x, y)], '#a89c88');
  if (viewSide('N')) s += poly([P(x + w, y, 0), P(x + w, y + d, 0), P(x + w, y + d), P(x + w, y)], '#b7ab98');
  for (const ry of [y + 0.9, y + 1.3, y + 2.1, y + 2.5]) s += ln(P(x, ry, z + 0.02), P(x + w, ry, z + 0.02), '#5a524a', 0.9);
  s += poly([P(x, y + 1.5, z + 0.35), P(x + w, y + 1.5, z + 0.35), P(x + w, y + 1.9, z + 0.35), P(x, y + 1.9, z + 0.35)], '#d8d0c0'); // island platform
  t.gnd.push(s);
  t.add(x, y - 0.02, x + w, y + 0.02, t.rail(x, y, x + w, y, 0.4), { small: true });
  t.add(x, y + d - 0.02, x + w, y + d + 0.02, t.rail(x, y + d, x + w, y + d, 0.4), { small: true });
}

/** A two-car B/Q train. */
function trainSVG() {
  let s = '';
  for (const k of [-1, 1]) {
    s += box(k * 0.72 - 0.68, -0.36, 0, 1.36, 0.72, 0.62, '#b9c2c8', { top: '#d6dce0' });
    for (const dir of ['W', 'E'] as Dir[]) {
      const F = face(k * 0.72 - 0.68, -0.36, 0, 1.36, 0.72, dir);
      for (let u = 0.15; u < 1.25; u += 0.3) s += frect(F, u, 0.28, u + 0.2, 0.5, '#2f3a48', 'stroke-width=".4"');
      s += frect(F, 0, 0.12, 1.36, 0.2, '#f2c230', 'stroke="none"');
    }
  }
  const p = iso(0.7, 0.36, 0.45);
  return s + `<circle cx="${(p[0] + 6).toFixed(1)}" cy="${(p[1] - 1).toFixed(1)}" r="3.2" fill="#f2c230" stroke-width=".6"/><text x="${(p[0] + 6).toFixed(1)}" y="${(p[1] + 0.2).toFixed(1)}" font-size="4.6" text-anchor="middle" dominant-baseline="central" stroke="none" fill="${INK}" font-weight="700" font-family="DM Sans, Arial">Q</text>`;
}
