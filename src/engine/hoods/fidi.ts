import { Tile } from '../tile';
import { box, face, frect, ln, iso, f1, poly, INK, type Dir, type Face } from '../iso';
import { side, lot } from '../../data/lots';
import { anchorage } from '../bridge';
import F from '../../data/lots/fidi';

/* Financial District along Wall Street, schematic but true to the street map (OpenStreetMap, Nov 2026).
   Frame: Manhattan grid (x south, y west); Wall St runs east–west from Broad/Nassau St to the East River.
   Cross streets in real order west→east: Broad/Nassau · William · Pearl (Hanover) · Water · South St.
     Upside Pizza  65 Wall St (in 63 Wall, a 1929 tower), SOUTH side between William and Pearl, faces north
                   across Wall St to 60 Wall's tower; Hanover Square's garden is behind the block.
   NYSE faces Broad St just south of Wall; Federal Hall faces Wall St at Nassau. The Brooklyn Bridge's
   Manhattan anchorage (really ~600 m north, by City Hall) sits at the tile's north-east corner. */
const WS = F['WALL STREET'];

export function buildFidi(): Tile {
  const W = 24, D = 35;
  const t = new Tile('fidi', 88, 4, [W, D], { hood: 'fidi', top: 14 });

  /* ---------- streets ---------- */
  t.plaza(0, 0, W, 1.2, '#e7ddc9');
  t.add(0, -0.05, W, 0.15, t.rail(0.0, 0.12, W, 0.12), { small: true });
  t.road(0, 1.2, W, 1.2, 'x', { line: false, name: 'South St', nameAt: 0.7 });
  t.road(12.0, 2.4, 1.2, D - 2.4, 'y', { line: false, name: 'Wall St', nameAt: 0.55, fill: '#d9d2c6' });
  for (const [y, name, w] of [[5.6, 'Water St', 1.2], [12.6, 'Pearl St', 1.0], [20.8, 'William St', 1.0], [30.0, 'Broad St', 1.4]] as const)
    t.road(name === 'Broad St' || name === 'Pearl St' ? 4.0 : 0, y, name === 'Broad St' || name === 'Pearl St' ? W - 4.0 : W, w, 'x', { line: false, name: name === 'Broad St' ? 'Broad St · Nassau St' : name, nameAt: 0.82 });
  t.road(18.4, 2.4, 1.0, 27.6, 'y', { line: false, name: 'Beaver St', nameAt: 0.5 });
  t.road(4.0, 10.2, 1.0, 19.8, 'y', { line: false, name: 'Pine St', nameAt: 0.5 });
  t.xwalk(11.4, 20.8, 0.5, 1.0); t.xwalk(13.3, 20.8, 0.5, 1.0); t.xwalk(11.4, 12.6, 0.5, 1.0); t.xwalk(13.3, 12.6, 0.5, 1.0); t.xwalk(12.0, 29.4, 1.2, 0.5);

  /* ---------- Wall Street, north side (facing south) ---------- */
  federalHall(t, 5.6, 26.2, 5.8, 3.4);
  t.face([lot(WS, 30), lot(WS, 40)], 'S', 11.4, 26.0, 21.8, { depth: 5.8, fit: true });
  t.face([lot(WS, 60)], 'S', 11.4, 20.2, 13.6, { depth: 5.8, fit: true });
  t.face([lot(WS, 72), lot(WS, 82)], 'S', 11.4, 12.0, 6.8, { depth: 5.8, fit: true });
  t.face([lot(WS, 100)], 'S', 11.4, 5.0, 2.6, { depth: 4.0, fit: true });
  t.face([lot(WS, 14)], 'S', 11.4, 34.8, 32.0, { depth: 5.8, fit: true, corners: { 14: 'E' } });

  /* ---------- Wall Street, south side (facing north) ---------- */
  // 55 Wall (1842): the old Merchants' Exchange, two tiers of columns along Wall St
  t.face([lot(WS, 37), lot(WS, 45), lot(WS, 55)], 'N', 13.8, 29.4, 21.8, { depth: 4.0, fit: true,
    over: { 55: { style: 'prewar', faces: (_L, _R, Fd) => portico(Fd('N'), 0.15, Fd('N').L - 0.15, 0.6, 2.7, 7, false) + portico(Fd('N'), 0.15, Fd('N').L - 0.15, 3.1, 5.0, 7, false) } } });
  t.face([lot(WS, 63), lot(WS, 67)], 'N', 13.8, 20.2, 13.6, { depth: 4.0, fit: true, corners: { 67: 'E' },
    pizzas: { upside: { u0: 0.15, u1: 2.7, sign: 'UPSIDE PIZZA', awn: ['#e06c9f', '#2f3a48'], signBg: '#2f3a48', signFg: '#f7a8c8', base: '#2f3a48' } } });
  t.face([lot(WS, 75)], 'N', 13.8, 12.0, 6.8, { depth: 4.0, fit: true });
  t.face([lot(WS, 95), lot(WS, 99)], 'N', 13.8, 5.0, 2.6, { depth: 4.0, fit: true });
  nyse(t, 13.8, 31.4, 5.2, 3.4);

  /* ---------- south of Beaver St: Hanover Square, Delmonico's ---------- */
  t.plaza(20.0, 13.6, 3.8, 6.6, '#e5dccb');
  t.grass(20.4, 14.0, 3.0, 2.6); t.grass(20.4, 17.4, 3.0, 2.4);
  t.tree(21.2, 15.0, 0.9); t.tree(22.6, 16.2, 0.85); t.tree(21.4, 18.6, 0.9); t.bench(22.8, 18.8, 'y');
  t.b(20.0, 21.8, 3.6, 2.6, 1.3 + 7 * 0.92 + 0.12, '#c48a5a', { style: 'prewar', floors: 8, g0: 1.3, fh: 0.92, fronts: 'NW', ground: 'shop', key: "DELMONICO'S" });
  t.face(side(F['BEAVER STREET'], 2, 30), 'N', 20.0, 24.6, 29.6, { depth: 3.0, fit: true });
  t.face(side(F['BEAVER STREET'], 1, 31), 'S', 17.8, 24.6, 29.6, { depth: 3.0, fit: true });
  t.b(20.0, 2.6, 3.8, 9.8, 1.3 + 15 * 0.8 + 0.12, '#a9c3d6', { style: 'modern', floors: 16, g0: 1.3, fh: 0.8, key: 'WATER ST TOWER' });

  /* ---------- north of Pine St, the bridge ---------- */
  anchorage(t, 'manhattan');
  t.b(0.4, 12.0, 3.4, 8.0, 1.3 + 17 * 0.85 + 0.12, '#cfc6b6', { style: 'prewar', floors: 18, g0: 1.3, fh: 0.85, fronts: 'SW', ground: 'door', key: 'PINE ST 1' });
  t.b(0.4, 21.0, 3.4, 6.4, 1.3 + 11 * 0.85 + 0.12, '#b7c9d6', { style: 'modern', floors: 12, g0: 1.3, fh: 0.85, key: 'PINE ST 2' });
  t.b(0.4, 28.2, 3.4, 6.4, 1.3 + 20 * 0.85 + 0.12, '#d7c19b', { style: 'prewar', floors: 30, g0: 1.3, fh: 0.85, fronts: 'SW', ground: 'door', key: 'PINE ST 3' });

  /* ---------- life ---------- */
  t.queue(13.0, 16.2, 'y', 4, 0.45);   // Upside, on the Wall St sidewalk
  t.crowd(12.2, 22.8, 0.9, 5.6, 9);    // Wall St is a pedestrian street outside the Exchange
  t.crowd(11.0, 30.2, 1.0, 1.0, 3);
  t.cart(13.0, 23.4, ['#f2c230', '#d9473a']);
  t.lamp(11.6, 21.6); t.lamp(13.6, 12.4); t.hydrant(13.6, 5.4);
  t.car('x', W, 0, 1.6, 1.2, '#f4c430', { taxi: true }); t.car('x', 0, W, 2.0, 1.1, '#2f3a48');
  t.car('x', W, 4.8, 13.1, 1.0, '#e8e4dc'); t.car('x', 4.8, W, 30.5, 1.1, '#f4c430', { taxi: true });
  t.walker('y', 2.6, 25.9, 11.6, 0.4); t.walker('y', 2.6, D - 0.4, 13.6, 0.45); t.walker('x', 0.3, W - 0.3, 0.5, 0.5);
  return t;
}

/** Columns + entablature (+ pediment) across part of a face. */
function portico(Fc: Face, u0: number, u1: number, v0: number, v1: number, n: number, pediment: boolean, stone = '#f4f0e8') {
  if (Fc.hidden) return '';
  let s = frect(Fc, u0, v0, u1, v1, '#cfc8ba');
  for (let i = 0; i < n; i++) { const u = u0 + 0.25 + ((u1 - u0 - 0.5) * i) / (n - 1); s += frect(Fc, u - 0.13, v0, u + 0.13, v1, stone); }
  s += frect(Fc, u0 - 0.05, v1, u1 + 0.05, v1 + 0.32, '#ece6da');
  if (pediment) s += poly([Fc.at(u0 - 0.05, v1 + 0.32), Fc.at(u1 + 0.05, v1 + 0.32), Fc.at((u0 + u1) / 2, v1 + 1.0)], '#f4f0e8');
  return s;
}

/** Federal Hall (1842): Greek temple front on Wall St at Nassau, steps and a statue on a plinth. */
function federalHall(t: Tile, x: number, y: number, w: number, d: number) {
  const X = t.X(x), Y = t.Y(y), h = 3.9;
  let s = box(X, Y, 0, w, d, h, '#f1ede4', { top: '#e6e0d4' });
  s += portico(face(X, Y, 0, w, d, 'S'), 0.2, d - 0.2, 0.5, h - 1.0, 6, true);
  for (const dir of ['W', 'E'] as Dir[]) { const Fc = face(X, Y, 0, w, d, dir); for (let u = 0.6; u < Fc.L - 0.3; u += 0.9) s += frect(Fc, u - 0.15, 1.0, u + 0.15, 2.6, '#cfe2ee', 'stroke-width=".5"'); }
  for (let k = 0; k < 3; k++) s += box(X + w + 0.0, Y + 0.4, 0.17 * k, 0.75 - 0.25 * k, d - 0.8, 0.17, '#e3ddd0', { top: '#efe9de' });
  const p = iso(X + w + 0.45, Y + d / 2, 0.5);
  s += `<g transform="translate(${f1(p[0])},${f1(p[1])})"><rect x="-4" y="-4" width="8" height="5" fill="#e3ddd0"/><path d="M-2.4 -4l.4 -8h4l.4 8z" fill="#7d8a8a"/><circle cx="0" cy="-14" r="2.2" fill="#7d8a8a"/></g>`;
  t.add(x, y, x + w + 0.8, y + d, s);
}

/** New York Stock Exchange (1903): columned temple front on Broad St, flag across the columns. */
function nyse(t: Tile, x: number, y: number, w: number, d: number) {
  const X = t.X(x), Y = t.Y(y), h = 5.2;
  let s = box(X, Y, 0, w, d, h, '#efebe2', { top: '#e7e1d4' });
  const Fc = face(X, Y, 0, w, d, 'E');
  if (!Fc.hidden) {
    s += frect(Fc, 0, 0, Fc.L, 0.55, '#e2dccf') + portico(Fc, 0.25, Fc.L - 0.25, 0.55, h - 1.1, 6, true);
    const fu0 = 0.6, fu1 = Fc.L - 0.6, fv0 = 1.2, fv1 = 3.4, n = 7;
    for (let i = 0; i < n; i++) { const v0 = fv0 + ((fv1 - fv0) * i) / n, v1 = fv0 + ((fv1 - fv0) * (i + 1)) / n; s += frect(Fc, fu0, v0, fu1, v1, i % 2 ? '#f7f3ea' : '#c8423a', 'stroke="none"'); }
    s += frect(Fc, fu0, fv0 + (fv1 - fv0) * 0.45, fu0 + (fu1 - fu0) * 0.42, fv1, '#2f4f86', 'stroke="none"');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const p = Fc.at(fu0 + 0.15 + i * 0.28, fv1 - 0.18 - j * 0.32); s += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r=".9" fill="#fff" stroke="none"/>`; }
    s += frect(Fc, fu0, fv0, fu1, fv1, 'none', 'stroke-width="1"');
  }
  for (const dir of ['N', 'S', 'W'] as Dir[]) { const Fs = face(X, Y, 0, w, d, dir); for (let u = 0.5; u < Fs.L - 0.3; u += 0.8) s += frect(Fs, u - 0.15, 1.0, u + 0.15, h - 1.2, '#cfe2ee', 'stroke-width=".5"'); }
  s += ln(iso(X + 0.6, Y + d / 2, h), iso(X + 0.6, Y + d / 2, h + 1.6), INK, 1);
  t.add(x, y, x + w, y + d, s);
}
