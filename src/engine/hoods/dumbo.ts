import { Tile } from '../tile';
import { box, cyl, ln, iso, f1, S, visibleFaces, INK } from '../iso';
import { side, lot } from '../../data/lots';
import { anchorage } from '../bridge';
import Db from '../../data/lots/dumbo';

/* DUMBO at the Fulton Ferry end, schematic but true to the street map (OpenStreetMap, Nov 2026).
   Frame: true north/west snapped to the grid (x south, y west). The river is north and west.
     Ignazio's   4 Water St, the north-west corner of the block (Water St & Old Fulton St), faces north
                 across Water St to Brooklyn Bridge Park.
     Grimaldi's  in 27 Old Fulton St (1 Front St), the south-west corner of the same block, faces west onto
                 Old Fulton St; the 1894 Eagle Warehouse is across the street. Between them on Old Fulton:
                 1830s rowhouses.
   The bridge comes ashore north of the block and lands on its Brooklyn anchorage (really it crosses over
   Water and Front Streets just east of the block; a straight deck along y can't, so it runs alongside). */
const WAT = Db['WATER STREET'], FR = Db['FRONT STREET'], OF = Db['OLD FULTON STREET'];

export function buildDumbo(): Tile {
  const W = 22, D = 20;
  const t = new Tile('dumbo', 88, -30, [W, D], { hood: 'dumbo', top: 9 });

  /* ---------- streets ---------- */
  t.cobble(6.0, 0, 1.2, 16.6); t.streetName('Water St', 6.6, 9.0, 'y', 1.2);
  t.road(17.0, 0, 1.2, 16.6, 'y', { line: false, name: 'Front St', nameAt: 0.45 });
  t.road(0, 16.6, W, 1.2, 'x', { line: false, name: 'Old Fulton St', nameAt: 0.62 });
  t.xwalk(6.0, 15.9, 1.2, 0.5); t.xwalk(17.0, 15.9, 1.2, 0.5);

  /* ---------- Brooklyn Bridge Park, the bridge ---------- */
  t.grass(0.3, 0.3, 5.4, 16.0);
  t.rect(5.3, 0.3, 0.4, 16.0, '#e2d3b7');
  anchorage(t, 'brooklyn');
  carousel(t, 0.6, 8.4);
  for (const [x, y, s] of [[1.2, 13.4, 1], [4.4, 14.6, 0.9], [1.4, 1.4, 0.95], [4.8, 3.0, 0.85], [4.6, 11.6, 0.9], [0.9, 5.6, 0.8]]) t.tree(x, y, s);
  t.bench(5.0, 10.4, 'y'); t.bench(5.0, 13.2, 'y'); t.crowd(0.8, 11.4, 3.6, 3.6, 6); t.crowd(1.0, 0.8, 1.6, 3, 2);
  // Fulton Ferry landing, west of Old Fulton by the water
  t.plaza(0.3, 18.2, 7.2, 1.6, '#e5dccb'); t.add(0.3, 19.75, 7.5, 19.85, t.rail(0.3, 19.8, 7.5, 19.8), { small: true });

  /* ---------- the block: Ignazio's · Old Fulton rowhouses · Grimaldi's ---------- */
  t.face([lot(WAT, 4)], 'N', 7.8, 16.0, 11.6, { depth: 2.6, corners: { 4: 'W' },
    pizzas: { ignazios: { sign: "IGNAZIO'S", awn: ['#2f6b4f', '#f4efe3'], signBg: '#2f6b4f', signFg: '#f4efe3', base: '#2f6b4f' } } });
  t.face([lot(OF, 27), lot(OF, 19), lot(OF, 17), lot(OF, 15)], 'W', 16.0, 16.4, 10.4, { depth: 3.0, corners: { 27: 'S' },
    pizzas: { grimaldis: { sign: "GRIMALDI'S", awn: ['#f4efe3', '#2c5a3e'], signBg: '#f4efe3', signFg: '#2c5a3e', base: '#7a2e2a' } } });
  t.b(7.8, 4.0, 3.6, 7.4, 1.2 + 4 * 1.15 + 0.12, '#b8664f', { style: 'loft', floors: 5, g0: 1.2, fh: 1.15, fronts: 'NS', ground: 'door', key: 'WATER ST LOFT', tower: true, tu: 0.5, tv: 0.6 });
  t.face([lot(FR, 5), lot(FR, 11)], 'S', 16.4, 12.8, 0.4, { depth: 3.6 });
  t.grass(11.6, 4.2, 1.2, 8.4); t.tree(12.2, 6.0, 0.8); t.tree(12.2, 9.6, 0.85);

  /* ---------- across Old Fulton: the Eagle Warehouse; Front St's new towers ---------- */
  t.face([lot(OF, 28)], 'E', 17.8, 21.6, 13.4, { depth: 2.2, corners: { 28: 'N' } });
  t.face(side(OF, 8, 14), 'E', 17.8, 13.2, 7.8, { depth: 2.0 });
  t.face([lot(FR, 29), lot(FR, 30)], 'N', 18.8, 15.8, 0.4, { depth: 3.0, fit: true });

  /* ---------- life ---------- */
  for (let i = 0; i < 9; i++) t.person(14.0 - i * 0.45, 16.35);      // Grimaldi's line up Old Fulton St
  t.queue(7.5, 12.4, 'y', 4, 0.45);                                  // Ignazio's
  t.lamp(5.6, 12.0); t.lamp(7.6, 8.0); t.lamp(16.4, 12.6); t.hydrant(7.6, 15.6);
  t.parked(17.6, 9.4, 'y', '#5aa469');
  t.car('y', 0, 16.6, 17.6, 1.1, '#f4c430', { taxi: true }); t.car('x', W, 0, 17.2, 1.0, '#d9473a');
  t.walker('y', 0.4, 16.2, 5.5, 0.4); t.walker('y', 0.4, 16.2, 5.5, 0.5); t.walker('x', 0.4, 16.4, 16.3, 0.45); t.walker('y', 0.4, 16, 7.5, 0.4);
  return t;
}

/** Jane's Carousel: a 1922 carousel in a glass pavilion by the river. */
function carousel(t: Tile, x: number, y: number) {
  const X = t.X(x), Y = t.Y(y), w = 3.0, d = 2.2;
  let s = box(X, Y, 0, w, d, 0.18, '#e6ddc9');
  const cx = X + w / 2, cy = Y + d / 2;
  s += cyl(cx, cy, 0.18, 0.85, 0.18, '#f2d9a6', '#f7e7c4');
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const px = cx + Math.cos(a) * 0.62, py = cy + Math.sin(a) * 0.62; s += ln(iso(px, py, 0.36), iso(px, py, 1.25), '#d4a23a', 1); }
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; const p = iso(cx + Math.cos(a) * 0.62, cy + Math.sin(a) * 0.62, 0.62); s += `<ellipse cx="${f1(p[0])}" cy="${f1(p[1])}" rx="3.6" ry="2.2" fill="${['#f7f3ea', '#e8b04f', '#e07aa0', '#7fb2d9', '#f7f3ea'][i]}" stroke-width=".6"/>`; }
  const b = iso(cx, cy, 1.25), rx = 1.2247 * 0.95 * S, ry = 0.7071 * 0.95 * S;
  s += `<path d="M${f1(b[0] - rx)} ${f1(b[1])}L${f1(b[0])} ${f1(b[1] - 14)}L${f1(b[0] + rx)} ${f1(b[1])}A${f1(rx)} ${f1(ry)} 0 0 1 ${f1(b[0] - rx)} ${f1(b[1])}Z" fill="#d9473a"/>`;
  for (let i = 0; i < 4; i++) { const xa = b[0] - rx + (i * rx) / 2 + rx * 0.15; s += `<path d="M${f1(xa)} ${f1(b[1] + ry * 0.6)}L${f1(b[0])} ${f1(b[1] - 14)}L${f1(xa + rx * 0.22)} ${f1(b[1] + ry * 0.75)}Z" fill="#fff4e4" stroke="none"/>`; }
  s += box(X, Y, 0.18, w, d, 1.85, '#d6ebf5', { top: '#e2f1f8', ex: 'fill-opacity=".38"' });
  for (const F of visibleFaces(X, Y, 0.18, w, d)) for (let u = 0.5; u < F.L; u += 0.5) s += ln(F.at(u, 0), F.at(u, 1.85), INK, 0.6);
  t.add(x, y, x + w, y + d, s);
}
