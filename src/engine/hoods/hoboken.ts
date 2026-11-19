import { Tile } from '../tile';
import { box, face, frect, ln, iso, f1, poly, INK, C_WIN, type Dir } from '../iso';
import { windowsSVG, storefront } from '../parts';
import { side, lot, type Lot } from '../../data/lots';
import Hb from '../../data/lots/hoboken';

/* Hoboken, schematic but true to the street map (OpenStreetMap, Nov 2026).
   Frame: x runs south along Washington St (Hoboken's grid, 13° east of true north), y runs west.
   Real order east→west: Hudson River · Sinatra Dr · Hudson St · Washington St · Bloomfield St ·
   (Garden … Jefferson, shortened to one block) · Monroe St. North→south: 8th · 7th · 6th · (5th) · 4th ·
   (3rd, 2nd) · 1st · Newark.
     Benny Tudino's  622 Washington, WEST side, a quarter of the way from 6th to 7th St, faces east; across
                     Washington and Hudson St is the Stevens campus on Castle Point, then the riverfront.
     Basile's        89–91 Washington, EAST side, ~50 m south of 1st St, faces west (Pier A Park behind it).
     Panello         Monroe Center (720 Monroe, an old factory), west side of Monroe at 8th St, faces east.
   OSM has footprints and addresses here but no storey counts or dates, so floors are estimated (3–5, the
   Washington St norm) and addresses missing from OSM are filled with typical 20 ft brownstones. */
const WA = Hb['Washington Street'], HU = Hb['Hudson Street'], AD = Hb['Adams Street'];

/** OSM gives no storeys or year in Hoboken: estimate 3–5 storeys (mostly 4), built ~1885. */
function est(l: Lot, i = 0): Lot {
  const h = (Math.round(l.num) * 7 + i) % 6;
  return { ...l, floors: l.floors ?? (h === 0 ? 3 : h === 5 ? 5 : 4), year: l.year ?? 1885 };
}
/** A typical brownstone for an address missing from OSM. */
const brown = (street: string, num: number, front = 20, cls = 'S9'): Lot =>
  est({ addr: `${num} ${street}`, num, front, depth: 60, floors: null, roof: null, year: null, cls, corner: false, est: true });
const run = (street: string, from: number, n: number, cls = 'S9') => Array.from({ length: n }, (_, i) => brown(street, from + i * 2, 20 + ((from + i) % 3) * 2, cls));
const real = (lots: Lot[]) => lots.map((l, i) => est(l, i));
const stoops = (from: number, n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [from + i * 2, { ground: 'stoop' as const }]));

export function buildHoboken(): Tile {
  const W = 44, D = 38;
  const t = new Tile('hoboken', 40, 47, [W, D], { hood: 'hoboken', top: 7 });

  /* ---------- streets ---------- */
  t.plaza(0, 0, W, 1.4, '#e7ddc9');
  t.add(0, -0.05, W, 0.15, t.rail(0, 0.12, W, 0.12), { small: true });
  t.road(0, 1.4, W, 1.2, 'x', { line: false, name: 'Sinatra Dr', nameAt: 0.3 });
  t.road(0, 8.4, W, 1.0, 'x', { line: false, name: 'Hudson St', nameAt: 0.45 });
  t.road(0, 16.6, W, 1.4, 'x', { name: 'Washington St', nameAt: 0.56 });
  t.road(0, 25.6, W - 4.4, 1.0, 'x', { line: false, name: 'Bloomfield St', nameAt: 0.45 });
  t.road(0, 31.0, W - 4.4, 1.0, 'x', { line: false, name: 'Monroe St', nameAt: 0.5 });
  for (const [x, name] of [[1.6, '8th St'], [8.6, '7th St'], [20.0, '6th St'], [25.6, '4th St'], [30.0, '1st St'], [39.0, 'Newark St']] as const)
    t.road(x, 2.6, 1.2, (name === 'Newark St' ? 32.0 : D - 2.6), 'y', { line: false, name, nameAt: 0.16 });
  t.streetName('· Garden · Park · Willow · Clinton · Grand · Adams · Jefferson ·', 2.2, 29.0, 'y', 0.9);
  t.xwalk(1.0, 16.6, 0.5, 1.4); t.xwalk(9.9, 16.6, 0.5, 1.4); t.xwalk(19.4, 16.6, 0.5, 1.4); t.xwalk(21.3, 16.6, 0.5, 1.4); t.xwalk(29.4, 16.6, 0.5, 1.4); t.xwalk(31.3, 16.6, 0.5, 1.4);

  /* ---------- riverfront ---------- */
  for (let x = 1.2; x < W - 1; x += 2.8) t.tree(x, 0.8, 0.85);
  t.bench(4.0, 0.55, 'x'); t.bench(13.0, 0.55, 'x'); t.bench(27.0, 0.55, 'x');
  t.crowd(0.5, 0.35, W - 1, 0.8, 7);

  /* ---------- north of 8th ---------- */
  t.face([brown('8TH STREET', 57, 30, 'C1'), brown('8TH STREET', 61), ...run('8TH STREET', 101, 9, 'C1')], 'S', 1.0, 3.2, D - 0.2, { depth: 0.9 });

  /* ---------- 8th → 7th: Monroe Center & Panello ---------- */
  t.face(run('WASHINGTON STREET', 700, 3), 'E', 18.6, 8.0, 3.4, { depth: 3.2, corners: { 700: 'S' } });
  t.face(run('WASHINGTON STREET', 701, 3), 'W', 16.0, 8.0, 3.4, { depth: 3.2 });
  t.face(run('HUDSON STREET', 700, 3, 'B1'), 'E', 9.9, 8.0, 3.4, { depth: 2.6, over: stoops(700, 3) });
  t.face(run('BLOOMFIELD STREET', 700, 3, 'B1'), 'W', 25.0, 8.0, 3.4, { depth: 2.4, over: stoops(700, 3) });
  t.face(real(side(AD, 703, 711)), 'E', 27.2, 8.0, 3.4, { depth: 1.4 }); // Adams St's real rowhouses stand in for the shortened blocks
  t.face(run('MONROE STREET', 701, 3, 'B1'), 'W', 30.4, 8.0, 3.4, { depth: 1.6 });
  monroeCenter(t, 3.4, 32.6, 4.6, 5.0);

  /* ---------- 7th → 6th: Benny Tudino's ---------- */
  // west side of Washington, from 6th St going north: 600 · (602–620, shortened) · Benny's 622 · 624 · 626 · 632 …
  t.face(real([lot(WA, 600), lot(WA, 622), lot(WA, 624), lot(WA, 626), lot(WA, 632), lot(WA, 638), lot(WA, 640), lot(WA, 642)]), 'E', 18.6, 19.4, 10.4,
    { depth: 3.4, corners: { 600: 'S' }, pizzas: { bennys: { sign: "BENNY TUDINO'S", signSize: 5.8, awn: ['#2f6fb0', '#fff6e8'], signBg: '#2f6fb0', signFg: '#fff6e8', base: '#e9dcc0' } } });
  // across Washington: 609 · 615 · 621 · 625 on the east side, Hudson St's west side behind them
  t.face(real([lot(WA, 609), lot(WA, 615), lot(WA, 621), lot(WA, 625), lot(WA, 627)]), 'W', 16.0, 19.4, 10.4, { depth: 3.2, corners: { 609: 'S' } });
  t.face(real(side(HU, 600, 638)), 'E', 9.9, 19.4, 10.4, { depth: 2.6, corners: { 600: 'S' } });
  t.face(run('BLOOMFIELD STREET', 600, 6, 'B1'), 'W', 25.0, 19.4, 10.4, { depth: 2.6, over: stoops(600, 6) });
  t.face(run('ADAMS STREET', 601, 6, 'B1'), 'E', 27.2, 19.4, 10.4, { depth: 1.4 });
  t.face(run('MONROE STREET', 601, 5, 'B1'), 'W', 30.4, 19.4, 10.4, { depth: 1.6 });
  t.face(run('MONROE STREET', 600, 5, 'B1'), 'E', 32.6, 19.4, 10.4, { depth: 2.6 });
  // Stevens campus on Castle Point, east of Hudson St
  t.grass(3.2, 2.9, 16.4, 4.8);
  stevens(t, 4.6, 3.6);
  for (const [x, y, s] of [[10.6, 4.4, 1], [13.4, 6.2, 0.9], [16.2, 3.8, 1.05], [18.6, 6.4, 0.85], [11.8, 3.4, 0.8]]) t.tree(x, y, s);
  t.crowd(11, 3.4, 6, 3.6, 4);

  /* ---------- 6th → 1st (shortened): Church Square Park, Hudson & Stevens Parks ---------- */
  t.face(run('WASHINGTON STREET', 500, 3), 'E', 18.6, 21.8, 25.0, { depth: 3.2, corners: { 500: 'N' } });
  t.face(run('WASHINGTON STREET', 501, 3), 'W', 16.0, 21.8, 25.0, { depth: 3.2 });
  t.face(run('HUDSON STREET', 500, 3, 'B1'), 'E', 9.9, 21.8, 25.0, { depth: 2.6, over: stoops(500, 3) });
  t.face(run('BLOOMFIELD STREET', 500, 3, 'B1'), 'W', 25.0, 21.8, 25.0, { depth: 2.6, over: stoops(500, 3) });
  t.face(run('WASHINGTON STREET', 300, 2), 'E', 18.6, 27.4, 29.4, { depth: 3.2 });
  t.face(run('WASHINGTON STREET', 301, 2), 'W', 16.0, 27.4, 29.4, { depth: 3.2 });
  t.face(run('HUDSON STREET', 300, 2, 'B1'), 'E', 9.9, 27.4, 29.4, { depth: 2.6, over: stoops(300, 2) });
  t.face(run('BLOOMFIELD STREET', 300, 2, 'B1'), 'W', 25.0, 27.4, 29.4, { depth: 2.6, over: stoops(300, 2) });
  // Church Square Park (4th–5th St, west of Bloomfield): basketball courts and lawns
  t.grass(21.8, 27.2, 3.2, 3.2);
  t.rect(22.2, 27.6, 1.4, 2.4, '#c96f4a'); t.rect(22.35, 27.75, 1.1, 2.1, '#3f7a5a');
  t.fence(22.2, 27.6, 23.6, 27.6, 0.8); t.fence(22.2, 30.0, 23.6, 30.0, 0.8); t.fence(22.2, 27.6, 22.2, 30.0, 0.8); t.fence(23.6, 27.6, 23.6, 30.0, 0.8);
  t.tree(24.4, 28.0, 0.9); t.tree(24.3, 29.8, 0.85); t.crowd(22.4, 27.9, 1.0, 1.8, 3);
  t.face(run('MONROE STREET', 501, 3, 'B1'), 'W', 30.4, 21.8, 25.0, { depth: 1.6 });
  // Hudson Park and Stevens Park, east of Hudson St
  t.grass(21.8, 2.9, 3.2, 4.8); t.rect(22.2, 3.4, 2.4, 2.4, '#e6c86e'); t.tree(24.6, 6.8, 0.9); t.crowd(22.4, 3.6, 2, 2, 3);
  t.grass(27.4, 2.9, 2.0, 4.8); t.tree(28.2, 4.0); t.tree(28.8, 6.4, 0.9);

  /* ---------- 1st → Newark: Basile's ---------- */
  // east side of Washington, from 1st St going south: 99 · 97 · Basile's (89–91; OSM tags the footprint 91) · 87
  t.face(real([lot(WA, 99), lot(WA, 97), { ...lot(WA, 91), place: 'basiles' }, brown('WASHINGTON STREET', 87)]), 'W', 16.0, 31.8, 38.4,
    { depth: 3.6, corners: { 99: 'N' }, pizzas: { basiles: { sign: "BASILE'S", awn: ['#c8423a', '#f6efe2'], signBg: '#c8423a', signFg: '#fff6e8', base: '#e6d6bc' } } });
  t.face(real([lot(WA, 94), lot(WA, 50)]), 'E', 18.6, 38.4, 31.8, { depth: 3.4, corners: { 94: 'N' } });
  t.face(real(side(HU, 86, 70)), 'E', 9.9, 31.8, 38.4, { depth: 2.6 });
  t.face(real([lot(HU, 79)]), 'W', 7.9, 31.8, 38.4, { depth: 2.4 });
  t.face(run('BLOOMFIELD STREET', 60, 4, 'B1'), 'W', 25.0, 31.8, 38.4, { depth: 2.6, over: stoops(60, 4) });
  // Pier A Park (by the river at 1st St)
  t.grass(31.8, 2.9, 3.6, 2.6); t.tree(32.8, 3.8, 0.9); t.tree(34.8, 4.4, 0.85); t.bench(33.9, 3.2, 'x');

  /* ---------- south of Newark: the Lackawanna terminal ---------- */
  t.plaza(40.8, 2.6, 3.2, 32.0, '#e5dccb');
  terminal(t, 40.8, 0.6);
  t.face(run('NEWARK STREET', 56, 6, 'C1'), 'N', 40.8, 8.0, 34.0, { depth: 2.6 });

  /* ---------- life ---------- */
  t.queue(16.0, 18.3, 'x', 4, 0.42);  // Benny's
  t.queue(35.6, 16.3, 'x', 4, 0.42);  // Basile's
  t.queue(3.8, 32.3, 'x', 4, 0.42);   // Panello
  t.lamp(19.3, 16.3); t.lamp(29.9, 18.3); t.lamp(9.9, 18.3); t.hydrant(20.6, 18.4); t.hydrant(31.4, 16.2);
  t.parked(13.4, 18.25, 'x', '#3f7fbf'); t.parked(37.6, 16.35, 'x', '#5aa469');
  t.car('x', 0, W, 16.95, 1.3, '#f08a4b'); t.car('x', W, 0, 17.65, 1.3, '#e8e4dc'); t.car('x', W, 0, 2.0, 1.2, '#5aa469');
  t.car('y', 2.6, D, 20.6, 1.0, '#2f3a48'); t.car('y', D, 2.6, 31.8, 1.0, '#d9473a');
  t.walker('x', 0.3, W - 0.3, 0.5, 0.5); t.walker('x', 0.3, W - 0.3, 1.1, 0.4); t.walker('x', 0.3, W - 0.3, 16.3, 0.45); t.walker('x', 0.3, W - 0.3, 18.3, 0.4); t.walker('y', 3, D - 1, 21.4, 0.4);
  return t;
}

/** Monroe Center: a four-storey brick factory turned arts building; Panello in its corner at 8th St. */
function monroeCenter(t: Tile, x: number, y: number, w: number, d: number) {
  const X = t.X(x), Y = t.Y(y);
  const E = () => face(X, Y, 0, w, d, 'E');
  const item = t.b(x, y, w, d, 1.2 + 3 * 1.1 + 0.12, '#a9553f', {
    style: 'loft', floors: 4, g0: 1.2, fh: 1.1, fronts: 'EN', ground: 'door', key: 'MONROE CENTER', tower: true, tu: 0.3, tv: 0.6,
    extraFaces: () => {
      // Panello's storefront at the 8th St end of the Monroe St front (u counts from the south end)
      let s = storefront(E(), w - 3.0, w - 0.15, { sign: 'PANELLO', awn: ['#3f5a4c', '#f3ead8'], signBg: '#f3ead8', signFg: '#3f5a4c', base: '#3f5a4c' });
      const F = face(X, Y, 0, w, d, 'N');
      if (!F.hidden) {
        const p = F.at(F.L / 2, 4.22);
        s += frect(F, F.L * 0.15, 4.0, F.L * 0.85, 4.45, '#f3e6d0', 'stroke-width=".6"') +
          `<text transform="matrix(${F.m[0].toFixed(4)},${F.m[1].toFixed(4)},0,1,${f1(p[0])},${f1(p[1])})" font-size="6.5" fill="#7a2e2a" text-anchor="middle" dominant-baseline="central" stroke="none" font-weight="800" font-family="DM Sans, Arial" letter-spacing="1.2">MONROE CENTER</text>`;
      }
      return s;
    },
  });
  const F = E(), q = [F.at(w - 3, 0), F.at(w, 0), F.at(w - 3, 3.2), F.at(w, 3.2)];
  t.pins.panello = {
    at: [t.X(x + 1.2), t.Y(y + d / 2), 4.8 + 1.7], facing: 'E', item,
    focus: F.hidden ? undefined : { x0: Math.min(...q.map(p => p[0])), x1: Math.max(...q.map(p => p[0])), y0: Math.min(...q.map(p => p[1])), y1: Math.max(...q.map(p => p[1])) },
  };
}

/** Stevens Institute on Castle Point: the tower on the bluff and a stone hall. */
function stevens(t: Tile, x: number, y: number) {
  t.b(x, y, 3.0, 2.6, 9.2, '#d8d2c6', { style: 'modern', floors: 12, g0: 1.0, fh: 0.68, key: 'STEVENS HOWE CENTER' });
  t.b(x + 4.4, y + 0.4, 3.6, 2.4, 3.4, '#b9a48c', { style: 'prewar', floors: 3, g0: 1.2, fh: 0.95, fronts: 'NESW', ground: 'door', key: 'STEVENS HALL' });
}

/** The Lackawanna terminal's copper-green clock tower and train shed. */
function terminal(t: Tile, x: number, y: number) {
  const X = t.X(x), Y = t.Y(y);
  let s = box(X, Y + 1.7, 0, 2.8, 4.6, 2.2, '#e3d6bd', { top: '#5f9e8a' });
  s += box(X + 0.6, Y, 0, 1.5, 1.5, 5.4, '#e8dcc3');
  for (const dir of ['N', 'E', 'S', 'W'] as Dir[]) {
    const F = face(X + 0.6, Y, 0, 1.5, 1.5, dir);
    if (F.hidden) continue;
    s += windowsSVG(F, 2, 3, 0.6, 3.6, 0.3, 0.55, C_WIN);
    const p = F.at(0.75, 4.5, 0.02);
    s += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="6.5" fill="#fffaf0" stroke-width="1"/>` + ln(p, [p[0], p[1] - 4.5], INK, 1) + ln(p, [p[0] + 3, p[1] + 1], INK, 1);
  }
  s += box(X + 0.52, Y - 0.08, 5.4, 1.66, 1.66, 0.18, '#5f9e8a') + box(X + 0.85, Y + 0.25, 5.58, 1.0, 1.0, 0.9, '#6fae98');
  const top = iso(X + 1.35, Y + 0.75, 6.48);
  s += poly([[top[0] - 13.5, top[1] + 2], [top[0], top[1] - 22], [top[0] + 13.5, top[1] + 2]], '#5f9e8a');
  t.add(x, y, x + 2.8, y + 6.3, s);
}
