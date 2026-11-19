import { Tile } from '../tile';
import { box, cyl, ln, iso, f1, face, frect, ftext, INK, C_GRASS, type Dir } from '../iso';
import { side, lot } from '../../data/lots';
import Mt from '../../data/lots/midtown';

/* Midtown West along 8th Avenue, schematic but true to the street map (OpenStreetMap, Nov 2026).
   Frame: Manhattan grid (x south, y west). 8th Ave runs the length of the tile; 7th Ave parallels it to the east.
   North→south: Central Park South / 59th (Columbus Circle) · 58th · 57th · (shortened: 42nd St, Times Square,
   the Port Authority) · 39th · 38th · 37th.
     Pop's Pizza     975 8th Ave, in the base of 301 W 57th (a 1987 tower) on the north-west corner of 57th,
                     faces east onto 8th Ave; the Hearst Tower is across 57th, Columbus Circle a block north.
     Lazzara's       221 W 38th (2nd floor), north side between 7th and 8th, ~a quarter of the way from 7th,
                     faces south; Garment District lofts all around. */
const W57 = Mt['WEST 57 STREET'], W58 = Mt['WEST 58 STREET'], W38 = Mt['WEST 38 STREET'], W39 = Mt['WEST 39 STREET'];

export function buildMidtown(): Tile {
  const W = 34, D = 30;
  const t = new Tile('midtown', 0, 4, [W, D], { hood: 'midtown', top: 14 });

  /* ---------- streets ---------- */
  t.road(0, 19.6, W, 2.0, 'x', { name: '8th Ave', nameAt: 0.5 });
  t.road(0, 4.2, W, 2.0, 'x', { name: '7th Ave', nameAt: 0.5 });
  t.road(2.4, 0, 1.4, 18.0, 'y', { name: 'Central Park South', nameAt: 0.5 });
  t.road(7.6, 0, 1.0, D, 'y', { line: false, name: 'W 58th St', nameAt: 0.75 });
  t.road(12.2, 0, 1.4, D, 'y', { name: 'W 57th St', nameAt: 0.75 });
  t.road(18.6, 0, 1.6, D, 'y', { name: 'W 42nd St · Times Square', nameAt: 0.72 });
  t.road(24.6, 0, 1.0, D, 'y', { line: false, name: 'W 39th St', nameAt: 0.72 });
  t.road(29.0, 0, 1.0, D, 'y', { line: false, name: 'W 38th St', nameAt: 0.72 });
  t.xwalk(11.6, 19.6, 0.5, 2.0); t.xwalk(13.7, 19.6, 0.5, 2.0); t.xwalk(28.4, 4.2, 0.5, 2.0); t.xwalk(30.1, 4.2, 0.5, 2.0);

  /* ---------- Columbus Circle, Central Park ---------- */
  t.circ(3.1, 20.6, 2.6, '#e4ddce'); t.circ(3.1, 20.6, 1.6, C_GRASS); t.circ(3.1, 20.6, 0.7, '#e4ddce');
  { const cx = t.X(3.1), cy = t.Y(20.6);
    let s = box(cx - 0.42, cy - 0.42, 0, 0.84, 0.84, 0.45, '#e8e2d5') + cyl(cx, cy, 0.45, 0.17, 4.3, '#f1ece2', '#e6e0d2');
    const top = iso(cx, cy, 4.75);
    s += `<path d="M${f1(top[0] - 2.4)} ${f1(top[1])}l1 -6h2.8l1 6z" fill="#8f9aa0"/><circle cx="${f1(top[0])}" cy="${f1(top[1] - 8)}" r="2" fill="#8f9aa0"/>`;
    t.add(2.7, 20.2, 3.5, 21.0, s); }
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.4; t.tree(3.1 + Math.cos(a) * 2.05, 20.6 + Math.sin(a) * 2.05, 0.75); }
  t.grass(0.2, 0.2, 2.0, 18.6);
  for (let y = 1.0; y < 18; y += 1.9) t.tree(0.9 + ((y * 3) % 2) * 0.6, y, 0.95);
  t.add(2.15, 0.2, 2.25, 18.6, t.rail(2.2, 0.2, 2.2, 18.6, 0.35), { small: true });
  t.crowd(0.6, 2, 1.2, 14, 5);
  // Time Warner Center: twin glass towers on the west side of the circle
  t.b(4.4, 23.8, 3.0, 6.0, 1.6 + 4 * 0.8 + 0.12, '#b7c9d6', { style: 'modern', floors: 5, g0: 1.6, fh: 0.8, key: 'TWC PODIUM' });
  t.b(4.6, 24.2, 1.5, 2.2, 1.6 + 20 * 0.8 + 0.12, '#a9c3d6', { style: 'modern', floors: 21, g0: 1.6, fh: 0.8, key: 'TWC NORTH' });
  t.b(4.6, 27.2, 1.5, 2.2, 1.6 + 20 * 0.8 + 0.12, '#a9c3d6', { style: 'modern', floors: 21, g0: 1.6, fh: 0.8, key: 'TWC SOUTH' });

  /* ---------- 58th → 57th: Pop's ---------- */
  // north side of 57th west of 8th: Pop's tower (301) on the corner, then 307 · 313 · 315
  t.face([lot(W57, 301), lot(W57, 307), lot(W57, 313)], 'S', 11.6, 22.2, D - 0.2, { depth: 3.4, corners: { 301: 'E' },
    pizzas: { pops: { front: 'E', sign: "POP'S PIZZA", awn: ['#d9473a', '#fff6e8'], signBg: '#d9473a', signFg: '#fff6e8', base: '#efe1c4' } } });
  t.face(side(W58, 308, 314), 'N', 9.2, 22.2, D - 0.2, { depth: 1.0, fit: true });
  // east of 8th Ave, 58th → 57th
  t.b(9.2, 14.0, 2.4, 5.0, 1.3 + 19 * 0.85 + 0.12, '#d7c19b', { style: 'prewar', floors: 26, g0: 1.3, fh: 0.85, fronts: 'WS', ground: 'shop', key: 'FISK BUILDING' });
  t.b(9.2, 7.4, 2.4, 6.2, 1.3 + 9 * 0.85 + 0.12, '#cfc6b6', { style: 'prewar', floors: 10, g0: 2.2, fh: 0.85, fronts: 'S', ground: 'shop', key: 'W57 EAST' });
  t.b(4.4, 7.0, 2.6, 12.4, 1.3 + 17 * 0.85 + 0.12, '#c9a98a', { style: 'prewar', floors: 18, g0: 2.2, fh: 0.85, fronts: 'NW', ground: 'shop', key: 'CPS 1' });

  /* ---------- 57th → 42nd (shortened): the Hearst Tower, Times Square, the Port Authority ---------- */
  hearst(t, 14.2, 22.2);
  t.b(14.2, 7.4, 3.8, 11.6, 1.3 + 13 * 0.85 + 0.12, '#cdb48c', { style: 'prewar', floors: 14, g0: 2.2, fh: 0.85, fronts: 'NW', ground: 'shop', key: 'W57 SOUTH' });
  t.b(14.2, 0.2, 3.8, 3.4, 1.3 + 11 * 0.85 + 0.12, '#d7c19b', { style: 'prewar', floors: 12, g0: 2.2, fh: 0.85, fronts: 'NW', ground: 'shop', key: 'W57 7AV' });
  timesSquare(t, 20.8, 0.2);
  t.b(20.8, 22.2, 3.2, 7.6, 1.3 + 3 * 1.0 + 0.12, '#c9c3b8', { style: 'modern', floors: 4, g0: 1.3, fh: 1.0, key: 'PORT AUTHORITY' });
  t.streetName('Port Authority', 22.4, 26.0, 'x', 0.9);

  /* ---------- 39th → 38th: Lazzara's ---------- */
  // north side of 38th from 7th Ave going west: 203 · 209 (a 120 ft loft, shortened) · Lazzara's 221 · 223 … to 8th Ave
  t.face([lot(W38, 203)], 'S', 28.4, 6.8, 19.0, { depth: 1.8 });
  t.face([lot(W38, 209)], 'S', 28.4, 8.56, 10.8, { depth: 1.8, fit: true });
  t.face([lot(W38, 221)], 'S', 28.4, 10.8, 19.0, { depth: 1.8,
    pizzas: { lazzaras: { awn: null, sign: null, base: '#c46a52',
      faces: (_L, _R, Fd) => { const Fs = Fd('S'); return frect(Fs, 0.12, 2.75, Fs.L - 0.12, 3.35, '#f6efe2', 'stroke-width=".8"') + ftext(Fs, Fs.L / 2, 3.05, "LAZZARA'S", 6.8, '#c0392b', { font: 'Fraunces, Georgia, serif', w: 800 }) + frect(Fs, 0.18, 1.5, Fs.L - 0.18, 1.95, '#2f3a48', 'stroke-width=".7"') + ftext(Fs, Fs.L / 2, 1.72, 'PIZZA CAFE ↑ 2nd fl', 4.6, '#f2c230'); } } } });
  t.face([lot(W38, 223), lot(W38, 247), lot(W38, 263)], 'S', 28.4, 12.48, 19.0, { depth: 1.8, fit: true });
  t.face(side(W39, 214, 260), 'N', 26.2, 6.8, 19.0, { depth: 2.0, fit: true });
  t.face(side(W38, 228, 262), 'N', 30.6, 6.8, 19.0, { depth: 2.4, fit: true });
  t.face(side(W39, 205, 269), 'S', 24.0, 6.8, 19.0, { depth: 2.4, fit: true });
  // west of 8th Ave
  t.b(26.2, 22.2, 2.2, 7.6, 1.3 + 15 * 0.85 + 0.12, '#cdbfac', { style: 'prewar', floors: 16, g0: 2.2, fh: 0.85, fronts: 'NE', ground: 'shop', key: '8AV 39' });
  t.b(30.6, 22.2, 3.2, 7.6, 1.3 + 22 * 0.85 + 0.12, '#cfc6b6', { style: 'prewar', floors: 25, g0: 2.2, fh: 0.85, fronts: 'NE', ground: 'shop', key: '8AV 37' });
  // the Empire State Building, off to the south-east (5th Ave & 34th)
  esb(t, 30.4, 0.3);

  /* ---------- life ---------- */
  t.queue(9.4, 21.9, 'x', 4, 0.5);      // Pop's, on the 8th Ave sidewalk
  t.queue(27.9, 11.0, 'y', 3, 0.45);    // Lazzara's door
  t.cart(14.0, 21.9); t.cart(31.4, 6.6, ['#d9473a', '#f6efe2']);
  t.subway(11.2, 18.8, 'x');
  t.lamp(11.8, 19.3); t.lamp(13.9, 22.0); t.lamp(28.6, 6.6); t.hydrant(30.5, 6.5);
  t.car('x', W, 0, 20.1, 1.7, '#f4c430', { taxi: true }); t.car('x', W, 0, 21.1, 1.5, '#f4c430', { taxi: true });
  t.car('x', 0, W, 4.7, 1.6, '#3f7fbf'); t.car('x', 0, W, 5.7, 1.4, '#e8e4dc', { bus: true, len: 2.6 });
  t.car('y', D, 0, 12.9, 1.3, '#f4c430', { taxi: true }); t.car('y', 0, D, 19.4, 1.2, '#d9473a'); t.car('y', D, 0, 29.5, 1.1, '#2f3a48');
  t.walker('x', 0.5, W - 0.5, 19.35, 0.45); t.walker('x', 0.5, W - 0.5, 21.9, 0.5); t.walker('x', 0.5, W - 0.5, 6.5, 0.4);
  t.walker('y', 0.4, D - 0.4, 11.9, 0.4); t.walker('y', 0.4, D - 0.4, 28.7, 0.4);
  return t;
}

/** Hearst Tower: the 1928 six-storey stone base with the 2006 glass tower rising out of it. */
function hearst(t: Tile, x: number, y: number) {
  const w = 4.0, d = 4.6;
  t.b(x, y, w, d, 1.3 + 5 * 0.95 + 0.12, '#d9c9a8', { style: 'prewar', floors: 6, g0: 1.3, fh: 0.95, fronts: 'NE', ground: 'shop', key: 'HEARST BASE' });
  const X = t.X(x + 0.5), Y = t.Y(y + 0.5), h0 = 6.2, h = 11.0;
  let s = box(X, Y, h0, w - 1.0, d - 1.0, h, '#a9c3d6', { top: '#d9e4ea' });
  for (const dir of ['N', 'E', 'S', 'W'] as Dir[]) {
    const F = face(X, Y, h0, w - 1.0, d - 1.0, dir);
    if (F.hidden) continue;
    for (let v = 0; v < h - 0.4; v += 1.6) for (let u = 0; u < F.L - 0.4; u += 0.9) s += ln(F.at(u, v), F.at(u + 0.45, v + 0.8), '#6f8aa0', 0.6) + ln(F.at(u + 0.9, v), F.at(u + 0.45, v + 0.8), '#6f8aa0', 0.6) + ln(F.at(u + 0.45, v + 0.8), F.at(u, v + 1.6), '#6f8aa0', 0.6) + ln(F.at(u + 0.45, v + 0.8), F.at(u + 0.9, v + 1.6), '#6f8aa0', 0.6);
  }
  t.add(x + 0.5, y + 0.5, x + w - 0.5, y + d - 0.5, s);
}

/** A Times Square corner: billboards stacked on the buildings at 42nd St & 7th Ave. */
function timesSquare(t: Tile, x: number, y: number) {
  t.b(x, y, 3.2, 3.4, 1.3 + 11 * 0.85 + 0.12, '#d9d4cb', { style: 'prewar', floors: 12, g0: 2.2, fh: 0.85, fronts: 'NW', ground: 'shop', key: 'TIMES SQ 1',
    extraFaces: () => {
      const X = t.X(x), Y = t.Y(y);
      const Fw = face(X, Y, 0, 3.2, 3.4, 'W'), Fn = face(X, Y, 0, 3.2, 3.4, 'N');
      return frect(Fw, 0.2, 4.0, 3.0, 7.6, '#d9473a', 'stroke-width="1"') + ftext(Fw, 1.6, 6.4, 'EAT A SLICE', 10, '#fff6e8', { font: 'Fraunces, Georgia, serif', w: 800 }) + ftext(Fw, 1.6, 5.0, 'it’s 3am somewhere', 5.5, '#ffe3a8') +
        frect(Fw, 0.2, 8.0, 3.0, 10.4, '#2f3a48', 'stroke-width="1"') + ftext(Fw, 1.6, 9.2, 'BROADWAY', 9, '#f2c230', { ls: 2 }) +
        frect(Fn, 0.2, 4.0, 3.2, 7.6, '#3f7fbf', 'stroke-width="1"') + ftext(Fn, 1.7, 6.4, 'NYC', 14, '#ffffff', { font: 'Fraunces, Georgia, serif', w: 800 }) + ftext(Fn, 1.7, 4.9, 'never sleeps', 6, '#f2c230') +
        frect(Fn, 0.2, 8.0, 3.2, 10.4, '#f2c230', 'stroke-width="1"') + ftext(Fn, 1.7, 9.2, 'TAXI!', 11, INK, { w: 800 });
    } });
  t.b(x, y + 6.6, 3.2, 3.0, 1.3 + 7 * 0.85 + 0.12, '#cfc6b6', { style: 'prewar', floors: 8, g0: 2.2, fh: 0.85, fronts: 'NE', ground: 'shop', key: 'TIMES SQ 2',
    extraFaces: () => { const Fe = face(t.X(x), t.Y(y + 6.6), 0, 3.2, 3.0, 'E'); return frect(Fe, 0.2, 3.4, 2.8, 6.4, '#e07aa0', 'stroke-width="1"') + ftext(Fe, 1.5, 4.9, 'SHOW TONIGHT', 6, '#fff6e8', { w: 800 }); } });
  t.crowd(x - 0.2, y + 3.6, 3.4, 2.8, 8);
}

/** The Empire State Building (1931), set back in three stages with its mast. */
function esb(t: Tile, x: number, y: number) {
  const X = t.X(x), Y = t.Y(y), c = '#e2dccf';
  let s = box(X, Y, 0, 3.4, 3.4, 3.0, c, { top: '#ebe6dc' });
  s += box(X + 0.5, Y + 0.5, 3.0, 2.4, 2.4, 9.0, c, { top: '#ebe6dc' });
  for (const dir of ['N', 'E', 'S', 'W'] as Dir[]) {
    const F = face(X + 0.5, Y + 0.5, 3.0, 2.4, 2.4, dir);
    if (!F.hidden) for (let u = 0.2; u < 2.4; u += 0.22) s += frect(F, u - 0.04, 0.2, u + 0.04, 8.8, '#bfb6a4', 'stroke="none"');
  }
  s += box(X + 0.9, Y + 0.9, 12.0, 1.6, 1.6, 2.4, c, { top: '#ebe6dc' });
  s += box(X + 1.2, Y + 1.2, 14.4, 1.0, 1.0, 1.0, '#d8d0c0');
  s += cyl(X + 1.7, Y + 1.7, 15.4, 0.26, 1.2, '#cfc7b6');
  s += ln(iso(X + 1.7, Y + 1.7, 16.6), iso(X + 1.7, Y + 1.7, 19.4), INK, 1.4);
  t.add(x, y, x + 3.4, y + 3.4, s);
}
