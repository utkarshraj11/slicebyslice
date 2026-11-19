import { Tile } from '../tile';
import { cyl, box, face as faceOf, frect, ln, iso, poly, INK, C_WIN, dk, type Dir } from '../iso';
import { storefront } from '../parts';
import { side, lot } from '../../data/lots';
import V from '../../data/lots/village';

/* West Village, schematic but true to the street map (measured from OpenStreetMap, Nov 2026).
   The tile runs west to the Hudson: West St, Hudson River Park and Pier 45 at the foot of Christopher St.
   Frame: x runs down Bleecker St from Christopher St (north-west) to Carmine St (south-east),
   y runs west. Cross streets meet Bleecker in their real order; buildings on the pizzerias'
   blocks are the real lots (src/data/lots/village.ts) in real order. The stretches between
   the clusters are shortened.
     Mama's Too   east side of Bleecker, 2nd lot south of Christopher, faces west
     L'Industrie  south side of Christopher, west end of 100–104, 4 lots west of Bleecker, faces north
     John's       west side of Bleecker, north end of 272–278 (the corner building at Morton), faces east
     Joe's        north side of Carmine, 3 lots east of Bleecker, faces south across to Father Demo Square;
                  6th Ave runs behind the block, with the West 4th St courts across it. */
const B = V['BLEECKER STREET'], C = V['CHRISTOPHER STREET'], CA = V['CARMINE STREET'], CO = V['CORNELIA STREET'];
const J = V['JONES STREET'], G = V['GROVE STREET'], A7 = V['7 AVENUE SOUTH'], MO = V['MORTON STREET'];

export function buildVillage(): Tile {
  const t = new Tile('village', 40, 4, [46, 40], { hood: 'village', top: 9 });

  /* ---------- streets ---------- */
  t.road(0, 19.35, 46, 1.3, 'x', { name: 'Bleecker St', nameAt: 0.16 });
  t.road(3.0, 0, 1.3, 36.4, 'y', { name: 'Christopher St', nameAt: 0.82 });
  t.road(10.0, 20.65, 1.0, 15.35, 'y', { line: false, name: 'Grove St', nameAt: 0.7 });
  t.road(14.6, 0, 2.0, 36, 'y', { name: '7th Ave South', nameAt: 0.22 });
  t.road(27.2, 0, 1.0, 19.35, 'y', { line: false, name: 'Jones St', nameAt: 0.3 });
  t.road(27.2, 20.65, 1.0, 15.75, 'y', { line: false, name: 'Morton St', nameAt: 0.7 });
  t.road(32.0, 7.6, 1.0, 11.75, 'y', { line: false, name: 'Cornelia St', nameAt: 0.45 });
  t.road(39.2, 7.6, 1.3, 28.4, 'y', { name: 'Carmine St', nameAt: 0.78 });
  t.road(26.0, 5.6, 20.0, 2.0, 'x', { name: '6th Ave', nameAt: 0.25 });
  t.road(38.0, 0, 1.0, 5.6, 'y', { line: false, name: 'W 3rd St', nameAt: 0.45 });
  t.xwalk(2.4, 19.35, 0.5, 1.3); t.xwalk(4.4, 19.35, 0.5, 1.3); t.xwalk(14.0, 19.35, 0.5, 1.3); t.xwalk(16.7, 19.35, 0.5, 1.3);
  t.xwalk(38.6, 19.35, 0.5, 1.3); t.xwalk(40.6, 19.35, 0.5, 1.3); t.xwalk(39.2, 8.1, 1.3, 0.45); t.xwalk(39.2, 18.8, 1.3, 0.45);

  const pz = {
    mamas: { sign: "MAMA'S TOO!", awn: ['#c8423a', '#f6efe2'], signBg: '#f6efe2', signFg: '#c8423a', base: '#efe3cc' },
    lindustrie: { u0: 1.76, u1: 4.04, sign: "L'INDUSTRIE", awn: ['#f3ead8', '#3f5a4c'], signBg: '#f3ead8', signFg: '#3f5a4c', base: '#3f5a4c',
      faces: (_L: unknown, _R: unknown, F: (d: Dir) => ReturnType<typeof faceOf>) => storefront(F('N'), 0.12, 1.6, { h: 1.2, base: '#5b3d2e', awn: ['#7a2e2a', '#efe1c8'] }) },
    johns: { u0: 1.8, u1: 4.13, sign: "JOHN'S of Bleecker St", signSize: 6, awn: ['#2f4a3a', '#f3ead8'], signBg: '#2f4a3a', signFg: '#f6d77a', base: '#7a2e2a',
      faces: (_L: unknown, _R: unknown, F: (d: Dir) => ReturnType<typeof faceOf>) => storefront(F('E'), 0.12, 1.65, { h: 1.2, base: '#2f3a48', awn: ['#2f3a48', '#f2c230'] }) + storefront(F('S'), 0.12, F('S').L - 0.12, { h: 1.2, base: '#2f3a48' }) },
    joes: { sign: "JOE'S PIZZA", awn: ['#d6403a', '#f8f2e6'], signBg: '#f8f2e6', signFg: '#d6403a', base: '#efe6d6' },
  };

  /* ---------- north of Christopher ---------- */
  t.face([lot(B, 329), ...side(C, 91, 77)], 'S', 2.4, 18.75, 0.2, { depth: 2.2, corners: { 329: 'W' } });
  t.face([lot(B, 330), ...side(C, 105, 121)], 'S', 2.4, 21.25, 35.8, { depth: 2.2, corners: { 330: 'E' } });

  /* ---------- Christopher → 7th Ave S ---------- */
  // east side of Bleecker: 327 on the corner, Mama's Too, 317 (the face runs on toward 7th Ave S)
  t.face(side(B, 327, 301), 'W', 18.75, 4.9, 14.0, { depth: 4.6, corners: { 327: 'N' }, pizzas: pz });
  t.face(side(C, 86, 74), 'N', 4.9, 14.1, 6.4, { depth: 3.2 });
  t.face(side(A7, 101, 91), 'S', 14.0, 14.1, 7.0, { depth: 2.6 });
  t.grass(8.4, 7.0, 2.8, 6.8); t.tree(9.6, 8.6, 0.8); t.tree(9.8, 11.8, 0.85); // rear yards
  // Christopher Park, a block east between Christopher and Grove (the Stonewall flag)
  t.grass(5.4, 0.5, 3.8, 5.6);
  t.fence(5.4, 0.5, 9.2, 0.5, 0.35); t.fence(5.4, 0.5, 5.4, 6.1, 0.35);
  t.tree(6.2, 1.4); t.tree(8.2, 2.2, 0.9); t.tree(6.4, 4.8, 0.95); t.tree(8.5, 5.2, 0.8);
  t.bench(7.2, 3.3, 'y'); t.flagpole(8.6, 3.6, 2.4, ['#e24b3b', '#f39a3b', '#f6d24a', '#4fa65a', '#3f7fbf', '#8b5fb8']);
  t.crowd(6.0, 2.4, 2.4, 2.6, 4);

  // west side: 328 on the corner, 326, 324 to Grove St; L'Industrie's run west along Christopher
  t.face(side(B, 328, 324), 'E', 21.25, 4.9, 9.4, { depth: 4.0, corners: { 328: 'N' } });
  t.face(side(C, 94, 106), 'N', 4.9, 25.3, 35.9, { depth: 2.3, pizzas: pz, over: { 106: { ghost: true } } });
  t.face(side(G, 17, 29), 'S', 9.4, 25.3, 35.9, { depth: 2.0 });
  // Grove St's Federal houses (2½ storeys with dormers) and 318 Bleecker to 7th Ave S
  t.face(side(B, 318, 312), 'E', 21.25, 11.6, 14.0, { depth: 2.4, corners: { 318: 'S' } });
  t.face(side(G, 4, 16), 'N', 11.6, 23.7, 35.9, { depth: 2.4 });

  /* ---------- 7th Ave S → Jones / Morton ---------- */
  // west: John's of Bleecker in the 1904 corner building at Morton, then 280, 282 and the 1832 Federal house at 284
  t.face(side(B, 272, 284), 'E', 21.25, 26.6, 17.2, { depth: 3.4, corners: { 272: 'S' }, pizzas: pz });
  t.face(side(A7, 74, 54), 'N', 17.2, 24.7, 35.9, { depth: 2.2 });
  t.face(side(MO, 6, 16), 'S', 26.6, 24.7, 35.9, { depth: 2.2 });
  t.grass(19.5, 24.8, 4.8, 11.0); t.tree(21.2, 27.2, 0.9); t.tree(22.6, 31.4, 0.8); t.tree(20.6, 34.0, 0.85);
  // east: 289–281 to Jones St
  t.face(side(B, 289, 281), 'W', 18.75, 17.2, 26.6, { depth: 3.6, corners: { 281: 'S' } });
  t.face(side(A7, 73, 71), 'N', 17.2, 15.0, 9.0, { depth: 2.4 });
  t.face(side(J, 29, 15), 'S', 26.6, 15.0, 6.5, { depth: 2.4 });
  t.grass(17.6, 0.8, 8.2, 4.4); t.tree(19.0, 2.6); t.tree(22.4, 1.8, 0.9); t.tree(24.8, 3.4, 0.85);

  /* ---------- Jones / Morton → Carmine ---------- */
  // east: 277–265 to Cornelia
  t.face(side(B, 277, 265), 'W', 18.75, 28.8, 31.4, { depth: 3.4, corners: { 277: 'N' } });
  t.face(side(J, 28, 14), 'N', 28.8, 15.2, 8.2, { depth: 1.2 });
  t.face(side(CO, 35, 5), 'S', 31.4, 15.2, 8.2, { depth: 1.2 });
  // Joe's block: Bleecker corner, then Carmine's north side 13 · 11 · Joe's (7) · 5C · 5B, 6th Ave behind
  t.face(side(CO, 32, 20), 'N', 33.6, 15.2, 8.2, { depth: 1.6 });
  t.face(side(B, 257, 253), 'W', 18.75, 33.6, 36.0, { depth: 3.4 });
  t.face([lot(B, 233), ...side(CA, 13, 5.01)], 'S', 38.6, 18.75, 8.2, { depth: 2.6, corners: { 233: 'W' }, pizzas: pz });
  // west: Morton → Carmine, with Our Lady of Pompeii on the corner
  t.face(side(B, 270, 262), 'E', 21.25, 28.8, 35.0, { depth: 3.0, corners: { 270: 'N' } });
  t.grass(29.0, 24.5, 6.0, 11.3); t.tree(30.4, 27.0, 0.85); t.tree(33.2, 30.2, 0.9); t.tree(31.0, 33.8, 0.8);
  pompeii(t, 35.3, 21.4);
  t.face(side(CA, 27, 33), 'S', 38.6, 26.0, 35.9, { depth: 2.4 });

  /* ---------- across 6th Ave: the West 4th Street Courts, Minetta Playground ---------- */
  courts(t, 28.4, 0.4, 9.0, 4.6);
  t.plaza(39.6, 0.4, 6.0, 4.6, '#efd9a6');
  slide(t, 40.6, 1.4); slide(t, 43.2, 3.2);
  t.tree(44.8, 1.2, 0.85); t.crowd(40.2, 0.8, 4.6, 3.6, 4);
  t.grass(26.2, 0.4, 1.8, 4.6); t.tree(27.0, 2.6, 0.9);

  /* ---------- south of Carmine ---------- */
  // Father Demo Square across Carmine from Joe's (fountain, plane trees)
  t.plaza(41.1, 8.2, 4.7, 10.5);
  { const X = t.X(43.2), Y = t.Y(13.2); t.add(42.7, 12.7, 43.7, 13.7, cyl(X, Y, 0, 0.45, 0.16, '#d8d0c0', '#a7d0ec') + cyl(X, Y, 0.16, 0.07, 0.4, '#d8d0c0', '#e6f3fb')); }
  t.tree(41.9, 9.4); t.tree(44.8, 10.6, 0.9); t.tree(42.0, 16.6, 0.9); t.tree(44.9, 17.6); t.bench(43.3, 15.4, 'x'); t.crowd(41.6, 11.4, 3.6, 4.4, 4);
  // Downing Street Playground beyond Pompeii
  t.grass(41.7, 21.4, 4.0, 4.8); t.tree(42.6, 22.4, 0.9); t.tree(44.8, 25.2, 0.85); slide(t, 43.4, 23.2);
  t.face(side(CA, 26, 30), 'N', 41.1, 26.4, 35.9, { depth: 2.6 });

  /* ---------- the Hudson edge: West St, Hudson River Park, Pier 45 at the foot of Christopher ---------- */
  t.road(0, 36.4, 46, 1.8, 'x', { name: 'West St', nameAt: 0.62 });
  t.plaza(0, 38.2, 46, 0.5, '#d9d2c4');                  // greenway (bike path)
  t.grass(0, 38.7, 46, 0.8);
  t.plaza(0, 39.5, 46, 0.5, '#e7ddc9');                  // esplanade
  t.add(0, 39.9, 46, 40.05, t.rail(0, 39.97, 1.6, 39.97) + t.rail(5.4, 39.97, 46, 39.97), { small: true });
  for (let x = 2.2; x < 46; x += 2.6) if (x < 1.4 || x > 5.6) t.tree(x, 39.1, 0.8);
  { const X = t.X(1.6), Y = t.Y(40); t.add(1.6, 40, 5.4, 43.2, box(X, Y, -0.45, 3.8, 3.2, 0.45, '#e7ddc9', { L: '#cfc3ab', R: '#bfb39a' })); }
  t.add(1.6, 43.1, 5.4, 43.25, t.rail(1.6, 43.18, 5.4, 43.18), { small: true });
  t.bench(3.4, 41.4, 'x'); t.crowd(2.0, 40.4, 3.0, 2.4, 5);
  t.car('x', 0, 46, 36.9, 1.5, '#e8e4dc'); t.car('x', 46, 0, 37.7, 1.4, '#f4c430', { taxi: true }); t.car('x', 0, 46, 37.2, 1.2, '#3f7fbf');
  t.walker('x', 0.3, 45.7, 39.7, 0.4); t.walker('x', 45.7, 0.3, 38.45, 0.9, { shirt: '#2f6fb0' });

  /* ---------- life ---------- */
  t.queue(6.7, 19.05, 'x', 6, 0.45);                     // Mama's
  t.queue(4.6, 32.0, 'y', 6, 0.45);                      // L'Industrie, along Christopher
  t.queue(22.6, 20.95, 'x', 5, 0.45);                    // John's
  t.queue(38.9, 9.9, 'y', 6, 0.45);                      // Joe's, along Carmine
  t.lamp(2.5, 18.9); t.lamp(4.8, 21.6); t.lamp(16.8, 18.8); t.lamp(38.8, 21.6); t.lamp(40.8, 18.6);
  t.hydrant(14.1, 18.8); t.hydrant(26.7, 21.5); t.hydrant(38.7, 8.4);
  t.parked(9.0, 20.38, 'x', '#8e6cc2'); t.parked(35.0, 20.38, 'x', '#3f7fbf'); // Bleecker: one-way south-east, parking on the west kerb
  t.car('x', 0, 46, 19.75, 1.3, '#d9473a'); t.car('x', 0, 46, 19.75, 1.25, '#f4c430', { taxi: true });
  t.car('y', 0, 36, 3.65, 1.0, '#e8e4dc'); t.car('y', 36, 0, 15.1, 1.4, '#f4c430', { taxi: true }); t.car('y', 0, 36, 16.1, 1.3, '#2f3a48');
  t.car('x', 46, 28.2, 6.1, 1.4, '#f4c430', { taxi: true }); t.car('x', 28.2, 46, 7.0, 1.2, '#e8e4dc', { bus: true });
  t.walker('x', 0.3, 45.7, 18.95, 0.45); t.walker('x', 0.3, 45.7, 21.05, 0.4); t.walker('y', 0.3, 35.7, 2.6, 0.4); t.walker('y', 0.3, 35.7, 4.7, 0.35);
  t.walker('y', 7.8, 35.7, 38.9, 0.4); t.walker('x', 26.8, 45.8, 8.0, 0.4); t.walker('y', 0.3, 18.8, 14.2, 0.45);
  return t;
}

/** Our Lady of Pompeii (1928): Italian Romanesque church on the corner of Carmine and Bleecker, with its campanile. */
function pompeii(t: Tile, x: number, y: number) {
  const X = t.X(x), Y = t.Y(y), w = 3.0, d = 4.4, c = '#d9b48f';
  let s = box(X, Y, 0, w, d, 4.2, c, { top: '#b9583f' });
  for (const dir of ['E', 'S', 'W', 'N'] as Dir[]) {
    const F = faceOf(X, Y, 0, w, d, dir);
    for (let u = 0.6; u < F.L - 0.3; u += 0.9) s += frect(F, u - 0.18, 1.6, u + 0.18, 3.2, C_WIN, 'stroke-width=".5"');
    if (dir === 'S' || dir === 'E') s += frect(F, F.L / 2 - 0.35, 0, F.L / 2 + 0.35, 1.3, '#5b3d2e', 'stroke-width=".6"');
  }
  // gable over the Carmine front + campanile on the Bleecker corner
  s += poly([iso(X + w, Y + 0.1, 4.2), iso(X + w, Y + d / 2, 5.4), iso(X + w, Y + d - 0.1, 4.2)], dk(c, 0.1));
  const cx = X + w - 1.3, cy = Y + 0.1;
  s += box(cx, cy, 0, 1.2, 1.2, 8.4, c, { top: '#b9583f' });
  for (const dir of ['E', 'S', 'N', 'W'] as Dir[]) { const F = faceOf(cx, cy, 0, 1.2, 1.2, dir); s += frect(F, 0.35, 6.9, 0.85, 7.9, '#4a3a33', 'stroke-width=".5"'); }
  const apex = iso(cx + 0.6, cy + 0.6, 9.6);
  s += poly([iso(cx, cy + 1.2, 8.4), iso(cx + 1.2, cy + 1.2, 8.4), apex], '#a44f3a') + poly([iso(cx + 1.2, cy, 8.4), iso(cx + 1.2, cy + 1.2, 8.4), apex], '#9c4f3c');
  s += ln(apex, iso(cx + 0.6, cy + 0.6, 10.2), INK, 1.1);
  t.add(x, y, x + w, y + d, s);
}

/** The West 4th Street Courts ("the Cage"): two fenced basketball courts. */
function courts(t: Tile, x: number, y: number, w: number, d: number) {
  t.rect(x, y, w, d, '#c96f4a');
  t.rect(x + 0.3, y + 0.3, w / 2 - 0.45, d - 0.6, '#3f7a5a'); t.rect(x + w / 2 + 0.15, y + 0.3, w / 2 - 0.45, d - 0.6, '#3f7a5a');
  for (const cx of [x + w / 4, x + (3 * w) / 4]) t.circ(cx, y + d / 2, 0.6, '#3f7a5a');
  for (const [hx, hy] of [[x + 0.5, y + d / 2], [x + w / 2 - 0.35, y + d / 2], [x + w / 2 + 0.35, y + d / 2], [x + w - 0.5, y + d / 2]]) {
    const X = t.X(hx), Y = t.Y(hy);
    t.add(hx - 0.05, hy - 0.3, hx + 0.05, hy + 0.3, ln(iso(X, Y, 0), iso(X, Y, 1.4), '#6b625a', 1.3) + poly([iso(X, Y - 0.3, 1.25), iso(X, Y + 0.3, 1.25), iso(X, Y + 0.3, 1.7), iso(X, Y - 0.3, 1.7)], '#fbf8f1', 'stroke-width=".6"'), { small: true });
  }
  // chain-link fence, taller than a park railing
  t.fence(x, y, x + w, y, 1.1); t.fence(x, y, x, y + d, 1.1); t.fence(x + w, y, x + w, y + d, 1.1); t.fence(x, y + d, x + w, y + d, 1.1);
  t.crowd(x + 0.6, y + 0.6, w / 2 - 1.2, d - 1.2, 5); t.crowd(x + w / 2 + 0.6, y + 0.6, w / 2 - 1.2, d - 1.2, 5);
  t.crowd(x + 0.2, y + d + 0.15, w - 0.4, 0.35, 5); // watching from the 6th Ave sidewalk
}

/** A small playground slide. */
function slide(t: Tile, x: number, y: number) {
  const X = t.X(x), Y = t.Y(y);
  const s = box(X, Y, 0, 0.5, 0.5, 0.9, '#f2c230') + poly([iso(X + 0.5, Y, 0.9), iso(X + 0.5, Y + 0.5, 0.9), iso(X + 1.4, Y + 0.5, 0.1), iso(X + 1.4, Y, 0.1)], '#d9473a');
  t.add(x, y, x + 1.4, y + 0.5, s, { small: true });
}
