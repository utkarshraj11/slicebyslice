/* Building styles: NYC building types drawn with their real facade vocabulary
   (window bays, lintels and sills, cornices, fire escapes, party walls, roof clutter),
   plus the mapping from real tax-lot data (src/data/lots.ts) to drawing parameters.

   Each facade's repeated parts are batched into a handful of <path>s, so a building costs
   about the same number of SVG elements however many windows it has. */
import type { Lot } from '../data/lots';
import { type Face, type Pt, C_WIN, rnd, iso, f1, poly, ln, dk, lt, mixc, box, faceL, faceR, frect, ftext } from './iso';
import { type BldOpts, storefront, fireEscape, waterTower } from './parts';

export type Style = 'rowhouse' | 'tenement' | 'loft' | 'prewar';
export type Ground = 'shop' | 'stoop' | 'door' | 'custom';

interface Spec {
  /** target bay width; windows per facade = round(length / bay) */
  bay: number;
  ww: number; wh: number;
  lintel: 'flat' | 'hood' | 'arch';
  cornice: 'simple' | 'bracketed' | 'heavy';
  /** default storey height when there's no roof-height data */
  fh: number;
  body: string[]; trim: string[]; corniceC: string[];
}
const SPECS: Record<Style, Spec> = {
  // Federal / Greek Revival rowhouse, 1820–1880: brick, 3 bays, plain stone lintels, modest dentilled cornice
  rowhouse: {
    bay: 0.62, ww: 0.28, wh: 0.52, lintel: 'flat', cornice: 'simple', fh: 0.92,
    body: ['#a9563f', '#9d4b38', '#b4644a', '#8f4635', '#c98e70', '#d9c6a8', '#b8b0a2', '#e2cfc2'],
    trim: ['#efe7d8', '#e6dccb'], corniceC: ['#efe7d8', '#e3d8c4', '#5d4a3e'],
  },
  // Walk-up tenement, 1880–1920: brick, tight bays, hooded lintels, pressed-metal bracketed cornice, fire escape
  tenement: {
    bay: 0.5, ww: 0.26, wh: 0.5, lintel: 'hood', cornice: 'bracketed', fh: 0.88,
    body: ['#b5654a', '#9c5643', '#c27a5c', '#8e5a47', '#d2b48c', '#c9a27e', '#a86b4f', '#ddc9a8'],
    trim: ['#ebe1cf', '#ddd0b8', '#f1ebe0'], corniceC: ['#4d433d', '#3f4b45', '#e6dccb', '#6b5446', '#8a8f86'],
  },
  // Cast-iron or brick loft / warehouse, 1850–1910: tall storeys, wide arched windows, pilasters, heavy cornice
  loft: {
    bay: 0.68, ww: 0.42, wh: 0.72, lintel: 'arch', cornice: 'heavy', fh: 1.2,
    body: ['#b8664f', '#9b5a48', '#e3dccd', '#c9c3b3', '#a99f8c'],
    trim: ['#efe8da', '#e2d9c6'], corniceC: ['#e8e0cf', '#5b4f45'],
  },
  // Prewar elevator building, 1900–1940: limestone base, buff brick shaft, paired windows, heavy cornice
  prewar: {
    bay: 0.46, ww: 0.24, wh: 0.46, lintel: 'flat', cornice: 'heavy', fh: 0.85,
    body: ['#d7c19b', '#cdb48c', '#c9a98a', '#b9876a', '#e0cfae'],
    trim: ['#efe8da', '#e6dfd0'], corniceC: ['#e6dfd0', '#d8cfbd'],
  },
};
const SHOP = ['#2f4a3a', '#7a2e2a', '#2f3a48', '#5b3d2e', '#c8423a', '#3f5a7a', '#e6dccb'];
const AWN: string[][] = [['#2f6b4f', '#f4efe3'], ['#c8423a', '#f6efe2'], ['#2f3a48', '#f2c230'], ['#5a6e7a', '#f4efe3'], ['#7a2e2a', '#efe1c8']];
const ROOF = '#d3cec4';
/** Faded painted ads on exposed brick walls: generic trades, no brands. */
const GHOSTS = [['FIREPROOF', 'STORAGE'], ['PIANOS', '& ORGANS'], ['FURNITURE', 'WAREHOUSE'], ['TAILOR', 'ALTERATIONS'], ['BAKERY', 'EST. 1899']];

/* --- deterministic per-address choices, independent of the scene RNG --- */
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
const pal = <T,>(a: T[], key: string, salt = 0) => a[(hash(key) + salt * 7919) % a.length];

/* =====================================================================
   Real lot → drawing parameters
   ===================================================================== */
/** World units per foot. A storey (~11 ft) is ~0.9 units. */
export const FT = 0.08;
/** Street frontage in units. Wide buildings are compressed (their bays just repeat) so a short
    tile still shows the real rhythm of narrow rowhouses next to big tenements. */
export const frontage = (ft: number) => (ft <= 30 ? ft * FT : 30 * FT + (ft - 30) * FT * 0.55);

export function styleOf(l: Lot): Style {
  const k = l.cls[0], f = l.floors ?? 3;
  if ('LEFG'.includes(k)) return 'loft';
  if ('DOHR'.includes(k) && f >= 8) return 'prewar';
  if (f <= 4 && (l.year ?? 1900) < 1880) return 'rowhouse';
  return 'tenement';
}
/** PLUTO classes with ground-floor stores: S* (residence + store), K* (store), *7 (apartments + stores), O* (office). */
export const hasShop = (l: Lot) => 'SKO'.includes(l.cls[0]) || l.cls[1] === '7';

export interface LotOpts {
  /** street facades */
  front?: 'L' | 'R' | 'LR';
  style?: Style;
  ground?: Ground;
  g0?: number;
  /** paint a faded ad on the exposed side wall (for row ends left open by the tile edge) */
  ghost?: boolean;
}
export interface Built { h: number; c: string; opts: BldOpts }

/** Height, colour and style options for a real building. */
export function fromLot(l: Lot, o: LotOpts = {}): Built {
  const style = o.style ?? styleOf(l), sp = SPECS[style];
  const floors = Math.max(1, Math.floor(l.floors ?? 3));
  const ground = o.ground ?? (hasShop(l) ? 'shop' : style === 'rowhouse' ? 'stoop' : 'door');
  const g0 = o.g0 ?? (ground === 'shop' ? 2.2 : ground === 'stoop' ? 1.5 : 1.3);
  // storey height from the measured roof height (minus a ~14 ft ground floor), clamped to the style's range
  const fh = l.roof && floors > 1
    ? Math.min(sp.fh * 1.25, Math.max(sp.fh * 0.85, ((l.roof - 14) / (floors - 1)) * FT))
    : sp.fh;
  const front = o.front ?? 'L';
  return {
    h: g0 + (floors - 1) * fh + 0.12,
    c: pal(sp.body, l.addr),
    opts: {
      style, floors, ground, g0, fh, fronts: front, key: l.addr, ghost: o.ghost,
      // old-law tenements (and most later walk-ups) wear their fire escape on the street
      fire: style === 'tenement' && floors >= 4 && (l.year ?? 1900) < 1920 ? (front === 'R' ? 'R' : 'L') : undefined,
      // NYC buildings taller than six storeys need a rooftop tank
      tower: floors > 6,
    },
  };
}

/* =====================================================================
   Drawing
   ===================================================================== */
const P = (p: Pt) => f1(p[0]) + ' ' + f1(p[1]);
const quad = (F: Face, u0: number, v0: number, u1: number, v1: number) => `M${P(F.at(u0, v0))}L${P(F.at(u1, v0))}L${P(F.at(u1, v1))}L${P(F.at(u0, v1))}Z`;
const shape = (pts: Pt[]) => 'M' + pts.map(P).join('L') + 'Z';
const path = (d: string, fill: string, ex = '') => (d ? `<path d="${d}" fill="${fill}"${ex ? ' ' + ex : ''}/>` : '');

/** Arched window outline (rectangle with a half-round top) on a face. */
function archPts(F: Face, uc: number, vb: number, ww: number, vt: number): Pt[] {
  const r = ww / 2, vs = vt - r * 0.8, pts: Pt[] = [F.at(uc - r, vb), F.at(uc + r, vb), F.at(uc + r, vs)];
  for (let i = 1; i < 8; i++) { const a = (i / 8) * Math.PI; pts.push(F.at(uc + r * Math.cos(a), vs + r * 0.8 * Math.sin(a))); }
  pts.push(F.at(uc - r, vs));
  return pts;
}

interface FacadeArgs { L: number; h: number; c: string; g0: number; fh: number; nf: number; trim: string; cc: string; key: string; ground: Ground; style: Style }

/** One street facade: windows with sills and lintels, belt course, generic ground floor, cornice frieze. */
function facade(F: Face, sp: Spec, a: FacadeArgs) {
  const { L, h, g0, fh, nf, trim, cc, key, style } = a;
  let glass = '', lit = '', tr = '', sash = '', shut = '', dark = '';
  const cols = Math.max(1, Math.round(L / sp.bay)), bw = L / cols;
  const ww = Math.min(sp.ww, bw * 0.62), wh = Math.min(sp.wh, fh * 0.68);
  const shutters = style === 'rowhouse' && hash(key) % 3 === 0 && bw > ww + 0.22;
  const win = (uc: number, vb: number, w: number, hh: number) => {
    const vt = vb + hh, isLit = rnd() < 0.13;
    if (sp.lintel === 'arch') {
      const d = shape(archPts(F, uc, vb, w, vt));
      if (isLit) lit += d; else glass += d;
      tr += quad(F, uc - 0.04, vt - 0.02, uc + 0.04, vt + 0.07); // keystone
    } else {
      const d = quad(F, uc - w / 2, vb, uc + w / 2, vt);
      if (isLit) lit += d; else glass += d;
      tr += quad(F, uc - w / 2 - 0.04, vt, uc + w / 2 + 0.04, vt + 0.08); // lintel
      if (sp.lintel === 'hood') tr += quad(F, uc - w / 2 - 0.07, vt + 0.08, uc + w / 2 + 0.07, vt + 0.115);
    }
    sash += `M${P(F.at(uc - w / 2, vb + hh * 0.48))}L${P(F.at(uc + w / 2, vb + hh * 0.48))}`;
    tr += quad(F, uc - w / 2 - 0.03, vb - 0.05, uc + w / 2 + 0.03, vb); // sill
    if (shutters) shut += quad(F, uc - w / 2 - 0.1, vb, uc - w / 2 - 0.025, vt) + quad(F, uc + w / 2 + 0.025, vb, uc + w / 2 + 0.1, vt);
  };

  // upper floors
  for (let j = 0; j < nf; j++) {
    const v0 = g0 + j * fh, vb = v0 + (fh - wh) * 0.42;
    for (let i = 0; i < cols; i++) {
      let uc = (i + 0.5) * bw;
      if (style === 'prewar' && cols > 1) uc += (i % 2 ? -1 : 1) * bw * 0.12; // paired windows
      win(uc, vb, ww, wh);
    }
  }

  let s = '';
  // style bands
  if (style === 'loft') {
    for (let i = 0; i <= cols; i++) tr += quad(F, Math.max(0, i * bw - 0.05), g0, Math.min(L, i * bw + 0.05), h - 0.05); // pilasters
    for (let j = 1; j < nf; j++) tr += quad(F, 0, g0 + j * fh - 0.04, L, g0 + j * fh + 0.03); // spandrels
  }
  if (style === 'prewar') {
    s += frect(F, 0, 0, L, Math.min(h, g0 + fh), lt(trim, 0.02), 'stroke-width=".5"'); // limestone base
    for (let v = 0.35; v < g0 + fh - 0.1; v += 0.3) dark += `M${P(F.at(0.02, v))}L${P(F.at(L - 0.02, v))}`;    // rustication
    tr += quad(F, 0, h - fh - 0.12, L, h - fh - 0.05);                                                              // top belt
  }
  if (a.ground === 'shop' || a.ground === 'custom') tr += quad(F, 0, g0 - 0.1, L, g0); // storefront cornice
  if (sp.cornice !== 'simple') tr += quad(F, 0, h - 0.34, L, h - 0.1);                     // frieze

  s += path(shut, '#2f3d36', 'stroke-width=".35"');
  s += path(tr, trim, 'stroke-width=".4"');
  s += path(glass, C_WIN, 'stroke-width=".5"');
  s += path(lit, '#f6e2a0', 'stroke-width=".5"');
  s += sash ? `<path d="${sash}" fill="none" stroke-width=".35"/>` : '';
  s += dark ? `<path d="${dark}" fill="none" stroke="${dk(trim, 0.12)}" stroke-width=".5"/>` : '';

  // ground floor
  if (a.ground === 'shop') {
    const n = Math.max(1, Math.round(L / 2.1)), span = L / n;
    for (let i = 0; i < n; i++) {
      const awn = hash(key + i) % 3 ? pal(AWN, key, i) : null;
      s += storefront(F, i * span + 0.06, (i + 1) * span - 0.06, { h: 1.2, wall: a.c, base: pal(SHOP, key, i), awn });
      if (!awn) s += frect(F, i * span + 0.1, 1.45, (i + 1) * span - 0.1, 1.85, pal(SHOP, key, i + 3), 'stroke-width=".6"'); // sign band
    }
  } else if (a.ground === 'stoop' || a.ground === 'door') {
    const du = L * 0.3;
    s += frect(F, du - 0.2, a.ground === 'stoop' ? 0.55 : 0, du + 0.2, a.ground === 'stoop' ? 1.4 : 0.95, '#4a3428', 'stroke-width=".6"');
    for (let i = 0; i < cols; i++) { const uc = (i + 0.5) * bw; if (Math.abs(uc - du) > 0.35) s += frect(F, uc - ww / 2, 0.12, uc + ww / 2, 0.42, C_WIN, 'stroke-width=".5"'); }
    if (style === 'loft') for (let i = 0; i < cols; i++) { const uc = (i + 0.5) * bw; if (Math.abs(uc - du) > 0.45) s += path(shape(archPts(F, uc, 0.2, ww, g0 - 0.25)), C_WIN, 'stroke-width=".5"'); }
  }

  // cornice brackets + dentils (the cornice slab itself is a box drawn by the caller)
  if (sp.cornice === 'bracketed' || sp.cornice === 'heavy') {
    let br = '';
    for (let i = 0; i <= cols; i++) { const u = Math.min(L - 0.05, Math.max(0.05, i * bw)); br += quad(F, u - 0.04, h - 0.32, u + 0.04, h - 0.05); }
    s += path(br, cc, 'stroke-width=".4"');
  } else {
    s += ln(F.at(0.02, h - 0.12), F.at(L - 0.02, h - 0.12), dk(trim, 0.25), 1.4, 'stroke-dasharray="1 1.3" stroke-linecap="butt"');
  }
  return s;
}

/** A faded painted ad across the upper part of an exposed party wall. */
function ghostSign(F: Face, h: number, wall: string, key: string) {
  const [a, b] = pal(GHOSTS, key + ' ghost'), L = F.L, v1 = h - 0.45, v0 = Math.max(1.2, h - 2.6), vm = (v0 + v1) / 2;
  const size = Math.min(15, (L * 19 * 0.82) / (a.length * 0.66));
  return frect(F, 0.3, v0, L - 0.3, v1, mixc(wall, '#f3efe5', 0.18), 'stroke="none"') +
    `<g opacity=".72">${ftext(F, L / 2, vm + 0.25, a, size, '#f4ecdc', { font: 'Fraunces, Georgia, serif', w: 800 })}` +
    `${ftext(F, L / 2, vm - 0.45, b, Math.min(8, size * 0.55), '#f4ecdc', { ls: 1.5 })}</g>`;
}

/** A building in one of the named styles. Same footprint/height contract as bld(). */
export function styledBld(x: number, y: number, w: number, d: number, h: number, c: string, o: BldOpts & { style: Style }) {
  const sp = SPECS[o.style], key = o.key ?? `${x},${y}`;
  const fronts = o.fronts ?? 'L';
  const g0 = o.g0 ?? 1.3, fh = o.fh ?? sp.fh;
  const nf = Math.max(0, (o.floors ?? Math.max(1, Math.round((h - g0) / fh) + 1)) - 1);
  const trim = o.trim ?? pal(sp.trim, key), cc = o.corniceC ?? (o.style === 'rowhouse' ? trim : pal(sp.corniceC, key, 1));
  const party = dk(c, 0.07);
  const isL = fronts.includes('L'), isR = fronts.includes('R');
  // street facades in brick colour; exposed party walls slightly darker and blank
  let s = box(x, y, 0, w, d, h, c, { top: o.roof || ROOF, L: isL ? c : party, R: dk(isR ? c : party, 0.13) });
  const FL = faceL(x, y, 0, w, d), FR = faceR(x, y, 0, w, d);
  const args = { h, c, g0, fh, nf, trim, cc, key, ground: o.ground ?? 'door', style: o.style };
  if (isL) s += facade(FL, sp, { ...args, L: w });
  if (isR) s += facade(FR, sp, { ...args, L: d, key: key + 'R' });
  if (o.extraFaces) s += o.extraFaces(FL, FR);
  if (o.ghost && fronts !== 'LR') s += ghostSign(isL ? FR : FL, h, party, key);

  // fire escapes over the middle bays, one per ~3.5 units of facade
  if (o.fire && nf > 0) {
    const F = o.fire === 'L' ? FL : FR, L = F.L, n = Math.max(1, Math.round(L / 3.5));
    for (let i = 0; i < n; i++) {
      const c0 = (L * (i + 0.5)) / n, half = Math.min(0.75, L / n / 2 - 0.15);
      s += fireEscape(F, c0 - half, c0 + half, g0 + 0.02, fh, nf);
    }
  }

  // cornice slab along each street facade
  const ov = sp.cornice === 'simple' ? 0.08 : sp.cornice === 'bracketed' ? 0.13 : 0.16;
  const ch = sp.cornice === 'simple' ? 0.12 : sp.cornice === 'bracketed' ? 0.2 : 0.28;
  if (isL) s += box(x, y + d - 0.05, h - 0.02, w + (isR ? ov : 0), 0.05 + ov, ch, cc, { top: lt(cc, 0.12) });
  if (isR) s += box(x + w - 0.05, y, h - 0.02, 0.05 + ov, d + (isL ? ov : 0), ch, cc, { top: lt(cc, 0.12) });

  // roof clutter, kept toward the back (away from the street)
  const bx = isR ? x + 0.2 : x + w * 0.62, by = isL ? y + 0.2 : y + d * 0.62;
  if (nf >= 2 && w > 1.3 && d > 1.3) {
    s += box(bx, by, h, 0.6, 0.55, 0.5, dk(c, 0.04), { top: '#bdb7ab' }); // stair bulkhead
    s += frect(faceL(bx, by, h, 0.6, 0.55), 0.18, 0, 0.42, 0.4, '#5b3d2e', 'stroke-width=".5"');
  }
  if (o.style !== 'rowhouse' && w > 1.6 && d > 1.6) {
    const sx = isR ? x + w * 0.55 : x + w * 0.25, sy = isL ? y + d * 0.55 : y + d * 0.25;
    s += poly([iso(sx, sy, h + 0.01), iso(sx + 0.5, sy, h + 0.01), iso(sx + 0.5, sy + 0.4, h + 0.01), iso(sx, sy + 0.4, h + 0.01)], '#bcd6e4', 'stroke-width=".5"'); // skylight
  }
  if (o.style === 'rowhouse' || o.style === 'tenement') { // chimneys on the party walls
    const cs = isL && !isR ? [[x + 0.04, y + d * 0.45], [x + w - 0.34, y + d * 0.45]] : isR && !isL ? [[x + w * 0.45, y + 0.04], [x + w * 0.45, y + d - 0.34]] : [[x + 0.04, y + 0.04]];
    for (const [cx, cy] of cs) s += box(cx, cy, h, 0.3, 0.3, 0.45, dk(c, 0.1), { top: '#6b625a' });
  }
  if (o.tower) s += waterTower(x + w * (o.tu ?? 0.3), y + d * (o.tv ?? 0.3), h + 0.15);
  return s;
}
