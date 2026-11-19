/* Building styles: NYC building types drawn with their real facade vocabulary
   (window bays, lintels and sills, cornices, fire escapes, party walls, roof clutter),
   plus the mapping from real tax-lot data (src/data/lots.ts) to drawing parameters.

   Everything is keyed on compass sides, so a building looks right from all four view rotations:
   street facades (`fronts`) get windows, shops and cornices; other sides are party walls.
   Each facade's repeated parts are batched into a handful of <path>s, so a building costs
   about the same number of SVG elements however many windows it has. */
import type { Lot } from '../data/lots';
import { type Face, type Pt, type Dir, C_WIN, edge, rnd, iso, f1, poly, ln, dk, lt, mixc, box, face, viewSide, frect, ftext, gableRoof } from './iso';
import { type BldOpts, storefront, fireEscape, waterTower } from './parts';

export type Style = 'rowhouse' | 'tenement' | 'loft' | 'prewar' | 'modern' | 'frame';
export type Ground = 'shop' | 'stoop' | 'door' | 'custom' | 'none' | 'porch';
const DIRS: Dir[] = ['N', 'E', 'S', 'W'];

/** 'W', 'SW', 'NE'…; legacy 'L' = W, 'R' = S. */
export function dirsOf(s: string): Dir[] {
  const out: Dir[] = [];
  for (const ch of s) { const d = ch === 'L' ? 'W' : ch === 'R' ? 'S' : ch; if ('NESW'.includes(d) && !out.includes(d as Dir)) out.push(d as Dir); }
  return out.length ? out : ['W'];
}
/** For a facade facing `dir`: the sides at its left and right ends (as seen standing in front of it). */
const ENDS: Record<Dir, [Dir, Dir]> = { W: ['N', 'S'], E: ['S', 'N'], S: ['W', 'E'], N: ['E', 'W'] };
const OPP: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };
/** World point on the facade of box [x,x+w]×[y,y+d] facing `dir`: u along it (left→right), o outward. */
export function fpos(x: number, y: number, w: number, d: number, dir: Dir, u: number, o = 0): Pt {
  switch (dir) {
    case 'W': return [x + u, y + d + o];
    case 'E': return [x + w - u, y - o];
    case 'S': return [x + w + o, y + d - u];
    default: return [x - o, y + u];
  }
}
/** World AABB [x, y, w, d] spanning facade coordinates u0..u1, o0..o1. */
function fbox(x: number, y: number, w: number, d: number, dir: Dir, u0: number, u1: number, o0: number, o1: number): [number, number, number, number] {
  const a = fpos(x, y, w, d, dir, u0, o0), b = fpos(x, y, w, d, dir, u1, o1);
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])];
}

interface Spec {
  /** target bay width; windows per facade = round(length / bay) */
  bay: number;
  ww: number; wh: number;
  lintel: 'flat' | 'hood' | 'arch' | 'none';
  cornice: 'simple' | 'bracketed' | 'heavy' | 'none';
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
    bay: 0.64, ww: 0.28, wh: 0.5, lintel: 'hood', cornice: 'bracketed', fh: 0.88,
    body: ['#b5654a', '#9c5643', '#c27a5c', '#8e5a47', '#d2b48c', '#c9a27e', '#a86b4f', '#ddc9a8'],
    trim: ['#ebe1cf', '#ddd0b8', '#f1ebe0'], corniceC: ['#4d433d', '#3f4b45', '#e6dccb', '#6b5446', '#8a8f86'],
  },
  // Cast-iron or brick loft / warehouse, 1850–1910: tall storeys, wide arched windows, pilasters, heavy cornice
  loft: {
    bay: 0.68, ww: 0.42, wh: 0.72, lintel: 'arch', cornice: 'heavy', fh: 1.2,
    body: ['#b8664f', '#9b5a48', '#e3dccd', '#c9c3b3', '#a99f8c'],
    trim: ['#efe8da', '#e2d9c6'], corniceC: ['#e8e0cf', '#5b4f45'],
  },
  // Prewar elevator building / office, 1900–1940: limestone base, buff brick shaft, paired windows, heavy cornice
  prewar: {
    bay: 0.6, ww: 0.26, wh: 0.46, lintel: 'flat', cornice: 'heavy', fh: 0.85,
    body: ['#d7c19b', '#cdb48c', '#c9a98a', '#b9876a', '#e0cfae', '#cfc6b6'],
    trim: ['#efe8da', '#e6dfd0'], corniceC: ['#e6dfd0', '#d8cfbd'],
  },
  // Postwar glass and steel: curtain wall, spandrel bands, no cornice
  modern: {
    bay: 0.42, ww: 0, wh: 0, lintel: 'none', cornice: 'none', fh: 0.8,
    body: ['#a9c3d6', '#b7c9d6', '#9fb4c4', '#c4d3dc', '#8fa8b8'],
    trim: ['#e4ecf0'], corniceC: ['#dfe7ec'],
  },
  // Detached frame house (Midwood): clapboard, shutters, porch, front-facing gable
  frame: {
    bay: 0.7, ww: 0.3, wh: 0.5, lintel: 'flat', cornice: 'none', fh: 0.95,
    body: ['#e9d6b8', '#cfe0d6', '#f0dcc8', '#e4e0d2', '#d8c7a6', '#c9d6dc', '#efe6cf'],
    trim: ['#fbf8f1'], corniceC: ['#fbf8f1'],
  },
};
const SHOP = ['#2f4a3a', '#7a2e2a', '#2f3a48', '#5b3d2e', '#c8423a', '#3f5a7a', '#e6dccb'];
const AWN: string[][] = [['#2f6b4f', '#f4efe3'], ['#c8423a', '#f6efe2'], ['#2f3a48', '#f2c230'], ['#5a6e7a', '#f4efe3'], ['#7a2e2a', '#efe1c8']];
const ROOFS = ['#b9583f', '#5a6e7a', '#8a4f3a', '#6b625a', '#7a5a4a'];
/** Flat roofs: tar, gravel, silver coat, pale membrane. */
const FLAT_ROOFS = ['#d3cec4', '#c4bdb2', '#aaa49c', '#dcd2c0', '#b9b3c0'];
/** Faded painted ads on exposed brick walls: generic trades, no brands. */
const GHOSTS = [['FIREPROOF', 'STORAGE'], ['PIANOS', '& ORGANS'], ['FURNITURE', 'WAREHOUSE'], ['TAILOR', 'ALTERATIONS'], ['BAKERY', 'EST. 1899']];

/* --- deterministic per-address choices, independent of the scene RNG --- */
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
export const pal = <T,>(a: T[], key: string, salt = 0) => a[(hash(key) + salt * 7919) % a.length];

/* =====================================================================
   Real lot → drawing parameters
   ===================================================================== */
/** World units per foot. A storey (~11 ft) is ~0.9 units. */
export const FT = 0.08;
/** Street frontage in units. Wide buildings are compressed (their bays just repeat) so a short
    tile still shows the real rhythm of narrow rowhouses next to big tenements. */
export const frontage = (ft: number) => (ft <= 30 ? ft * FT : 30 * FT + (ft - 30) * FT * 0.55);
/** Storeys actually drawn: towers above 12 floors are compressed so skyscrapers stay on the map. */
export const drawnFloors = (f: number) => (f <= 12 ? f : Math.round(12 + (f - 12) * 0.22));

export function styleOf(l: Lot): Style {
  const k = l.cls[0], f = l.floors ?? 3, y = l.year ?? 1900;
  if ('LEFG'.includes(k) && f >= 2) return 'loft';
  if (('DOHR'.includes(k) && f >= 8) || f >= 15) return y >= 1955 ? 'modern' : 'prewar';
  if ('AB'.includes(k) && f <= 3 && y >= 1890) return 'frame';
  if (f <= 4 && y < 1880) return 'rowhouse';
  return 'tenement';
}
/** PLUTO classes with ground-floor stores: S* (residence + store), K* (store), *7 (apartments + stores), O* (office). */
export const hasShop = (l: Lot) => 'SKO'.includes(l.cls[0]) || l.cls[1] === '7';

export interface LotOpts {
  /** street facade side(s), compass letters (legacy 'L'/'R' accepted) */
  front?: string;
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
  const real = l.floors ?? 4, floors = Math.max(1, drawnFloors(Math.floor(real)));
  const attic = real % 1 >= 0.5 && (style === 'rowhouse' || style === 'frame');
  const ground = o.ground ?? (style === 'frame' ? 'porch' : hasShop(l) ? 'shop' : style === 'rowhouse' ? 'stoop' : 'door');
  const g0 = o.g0 ?? (ground === 'shop' ? 2.2 : ground === 'stoop' ? 1.5 : ground === 'porch' ? 1.05 : 1.3);
  // storey height from the measured roof height (minus a ~14 ft ground floor), clamped to the style's range
  const fh = l.roof && real > 1 && real <= 12
    ? Math.min(sp.fh * 1.25, Math.max(sp.fh * 0.85, ((l.roof - 14) / (Math.floor(real) - 1)) * FT))
    : sp.fh;
  const fronts = dirsOf(o.front ?? 'W');
  return {
    h: g0 + (floors - 1) * fh + 0.12,
    c: pal(sp.body, l.addr),
    opts: {
      style, floors, ground, g0, fh, fronts: fronts.join(''), key: l.addr, ghost: o.ghost, attic,
      // old-law tenements (and most later walk-ups) wear their fire escape on the street
      fire: style === 'tenement' && floors >= 4 && (l.year ?? 1900) < 1920 ? fronts[0] : undefined,
      // NYC buildings taller than six storeys need a rooftop tank (glass towers hide theirs)
      tower: real > 6 && style !== 'modern',
    },
  };
}

/* =====================================================================
   Drawing
   ===================================================================== */
const P = (p: Pt) => f1(p[0]) + ' ' + f1(p[1]);
const quad = (F: Face, u0: number, v0: number, u1: number, v1: number) => `M${P(F.at(u0, v0))}L${P(F.at(u1, v0))}L${P(F.at(u1, v1))}L${P(F.at(u0, v1))}Z`;
const shape = (pts: Pt[]) => 'M' + pts.map(P).join('L') + 'Z';
const path = (d: string, fill: string, ex = '') => (d ? `<path d="${d}" fill="${fill}"${edge(fill, ex)}${ex ? ' ' + ex : ''}/>` : '');

/** Arched window outline (rectangle with a half-round top) on a face. */
function archPts(F: Face, uc: number, vb: number, ww: number, vt: number): Pt[] {
  const r = ww / 2, vs = vt - r * 0.8, pts: Pt[] = [F.at(uc - r, vb), F.at(uc + r, vb), F.at(uc + r, vs)];
  for (let i = 1; i < 8; i++) { const a = (i / 8) * Math.PI; pts.push(F.at(uc + r * Math.cos(a), vs + r * 0.8 * Math.sin(a))); }
  pts.push(F.at(uc - r, vs));
  return pts;
}

interface FacadeArgs { L: number; h: number; c: string; g0: number; fh: number; nf: number; trim: string; cc: string; key: string; ground: Ground; style: Style; street: boolean }

/** One facade: windows with sills and lintels, belt course, ground floor, cornice frieze. */
function facade(F: Face, sp: Spec, a: FacadeArgs) {
  const { L, h, g0, fh, nf, trim, cc, key, style } = a;
  if (style === 'modern') return curtainWall(F, a);
  let glass = '', lit = '', tr = '', sash = '', shut = '', dark = '';
  const cols = Math.max(1, Math.round(L / sp.bay)), bw = L / cols;
  const ww = Math.min(sp.ww, bw * 0.62), wh = Math.min(sp.wh, fh * 0.68);
  const shutters = (style === 'rowhouse' && hash(key) % 3 === 0 || style === 'frame') && bw > ww + 0.22;
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

  // upper floors (frame houses: the ground floor too, on every side but the porch)
  const rows = style === 'frame' ? nf + 1 : nf, base = style === 'frame' ? 0.15 : g0, rh = style === 'frame' ? Math.min(fh, g0) : fh;
  for (let j = 0; j < rows; j++) {
    const v0 = style === 'frame' ? (j === 0 ? base : g0 + (j - 1) * fh) : g0 + j * fh, vb = v0 + ((j === 0 && style === 'frame' ? rh : fh) - wh) * 0.42;
    for (let i = 0; i < cols; i++) {
      let uc = (i + 0.5) * bw;
      if (style === 'prewar' && cols > 1) uc += (i % 2 ? -1 : 1) * bw * 0.12; // paired windows
      if (style === 'frame' && j === 0 && a.street && Math.abs(uc - L * 0.3) < 0.4) continue; // the door
      win(uc, vb, ww, wh);
    }
  }

  let s = '';
  if (style === 'loft') {
    for (let i = 0; i <= cols; i++) tr += quad(F, Math.max(0, i * bw - 0.05), g0, Math.min(L, i * bw + 0.05), h - 0.05); // pilasters
    for (let j = 1; j < nf; j++) tr += quad(F, 0, g0 + j * fh - 0.04, L, g0 + j * fh + 0.03); // spandrels
  }
  if (style === 'prewar') {
    s += frect(F, 0, 0, L, Math.min(h, g0 + fh), lt(trim, 0.02), 'stroke-width=".5"'); // limestone base
    for (let v = 0.35; v < g0 + fh - 0.1; v += 0.3) dark += `M${P(F.at(0.02, v))}L${P(F.at(L - 0.02, v))}`;    // rustication
    tr += quad(F, 0, h - fh - 0.12, L, h - fh - 0.05);                                                              // top belt
  }
  if (style === 'frame') for (let v = 0.3; v < h - 0.1; v += 0.22) dark += `M${P(F.at(0.02, v))}L${P(F.at(L - 0.02, v))}`; // clapboard
  if (a.street && (a.ground === 'shop' || a.ground === 'custom')) tr += quad(F, 0, g0 - 0.1, L, g0); // storefront cornice
  if (sp.cornice === 'bracketed' || sp.cornice === 'heavy') tr += quad(F, 0, h - 0.34, L, h - 0.1);   // frieze

  s += path(shut, style === 'frame' ? pal(['#2f3d36', '#3f5a7a', '#7a2e2a'], key) : '#2f3d36', 'stroke-width=".35"');
  s += path(tr, trim, 'stroke-width=".4"');
  s += path(glass, C_WIN, 'stroke="none"'); // windows read as flat panes: outlining every one turned facades into hatching
  s += path(lit, '#f6e2a0', 'stroke="none"');
  s += dark ? `<path d="${dark}" fill="none" stroke="${dk(style === 'frame' ? a.c : trim, 0.1)}" stroke-width=".45"/>` : '';

  // ground floor on the street side
  if (a.street && a.ground === 'shop') {
    const n = Math.max(1, Math.round(L / 2.1)), span = L / n;
    for (let i = 0; i < n; i++) {
      const awn = hash(key + i) % 3 ? pal(AWN, key, i) : null;
      s += storefront(F, i * span + 0.06, (i + 1) * span - 0.06, { h: 1.2, wall: a.c, base: pal(SHOP, key, i), awn });
      if (!awn) s += frect(F, i * span + 0.1, 1.45, (i + 1) * span - 0.1, 1.85, pal(SHOP, key, i + 3), 'stroke-width=".6"'); // sign band
    }
  } else if (a.street && (a.ground === 'stoop' || a.ground === 'door')) {
    const du = L * 0.3;
    s += frect(F, du - 0.2, a.ground === 'stoop' ? 0.55 : 0, du + 0.2, a.ground === 'stoop' ? 1.4 : 0.95, '#4a3428', 'stroke-width=".6"');
    if (style !== 'loft') for (let i = 0; i < cols; i++) { const uc = (i + 0.5) * bw; if (Math.abs(uc - du) > 0.35) s += frect(F, uc - ww / 2, 0.12, uc + ww / 2, 0.42, C_WIN, 'stroke-width=".5"'); }
    else for (let i = 0; i < cols; i++) { const uc = (i + 0.5) * bw; if (Math.abs(uc - du) > 0.45) s += path(shape(archPts(F, uc, 0.2, ww, g0 - 0.25)), C_WIN, 'stroke-width=".5"'); }
  } else if (a.street && a.ground === 'porch') {
    s += frect(F, L * 0.3 - 0.2, 0.3, L * 0.3 + 0.2, 1.0, '#6b4a36', 'stroke-width=".6"');
  }

  // cornice brackets / dentils (the cornice slab itself is a box drawn by the caller)
  if (sp.cornice === 'bracketed' || sp.cornice === 'heavy') {
    let br = '';
    for (let i = 0; i <= cols; i++) { const u = Math.min(L - 0.05, Math.max(0.05, i * bw)); br += quad(F, u - 0.04, h - 0.32, u + 0.04, h - 0.05); }
    s += path(br, cc, 'stroke-width=".4"');
  } else if (sp.cornice === 'simple') {
    s += ln(F.at(0.02, h - 0.12), F.at(L - 0.02, h - 0.12), dk(trim, 0.25), 1.4, 'stroke-dasharray="1 1.3" stroke-linecap="butt"');
  }
  return s;
}

/** Glass curtain wall: mullions, spandrel bands, a few lit panes. */
function curtainWall(F: Face, a: FacadeArgs) {
  const { L, h, fh, c } = a;
  let mull = '', band = '', lit = '';
  const n = Math.max(2, Math.round(L / 0.42));
  for (let i = 1; i < n; i++) { const u = (L * i) / n; mull += `M${P(F.at(u, 0.15))}L${P(F.at(u, h - 0.1))}`; }
  for (let v = 0.9; v < h - 0.2; v += fh) {
    band += quad(F, 0, v, L, v + 0.12);
    for (let i = 0; i < n; i++) if (rnd() < 0.06) lit += quad(F, (L * i) / n + 0.04, v + 0.16, (L * (i + 1)) / n - 0.04, v + fh - 0.08);
  }
  return path(lit, '#f3e7b8', 'stroke="none" opacity=".8"') + path(band, lt(c, 0.38), 'stroke="none"') +
    `<path d="${mull}" fill="none" stroke="${dk(c, 0.2)}" stroke-width=".55"/>` + frect(F, 0, 0, L, 1.0, dk(c, 0.15), 'stroke-width=".6"');
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
export function styledBld(x: number, y: number, w: number, d: number, h: number, c: string, o: BldOpts & { style: Style }): string {
  const sp = SPECS[o.style], key = o.key ?? `${x},${y}`, z0 = o.z0 ?? 0;
  const fronts = dirsOf(o.fronts ?? 'W'), street = fronts[0];
  const isFront = (dd: Dir) => fronts.includes(dd) || o.style === 'modern' || o.style === 'frame';
  // the back of a row building faces its yard: windows, but no shopfront or cornice
  const rear = fronts.length === 1 && !isFront(OPP[street]) ? OPP[street] : null;
  const windowed = (dd: Dir) => isFront(dd) || dd === rear;
  const g0 = o.g0 ?? 1.3, fh = o.fh ?? sp.fh;
  const nf = Math.max(0, (o.floors ?? Math.max(1, Math.round((h - g0) / fh) + 1)) - 1);

  // tall prewar towers: podium + set-back tower
  if (o.style === 'prewar' && nf >= 16 && !o.z0) {
    const pf = 10, hp = g0 + (pf - 1) * fh + 0.12, inset = Math.min(w, d) * 0.17;
    return styledBld(x, y, w, d, hp, c, { ...o, floors: pf, tower: false }) +
      styledBld(x + inset, y + inset, w - 2 * inset, d - 2 * inset, h - hp, c, { ...o, z0: hp, floors: nf + 1 - pf, g0: 0.1, ground: 'none', fronts: 'NESW', tower: false }) +
      box(x + w / 2 - 0.3, y + d / 2 - 0.3, h, 0.6, 0.6, 0.9, lt(c, 0.1), { top: '#8f9aa0' }) +
      `<polygon points="${[iso(x + w / 2 - 0.3, y + d / 2 + 0.3, h + 0.9), iso(x + w / 2, y + d / 2, h + 2.0), iso(x + w / 2 + 0.3, y + d / 2 - 0.3, h + 0.9)].map(p => f1(p[0]) + ',' + f1(p[1])).join(' ')}" fill="#7d8a8a"/>`;
  }

  // frame houses: porch strip on the street side, inside the footprint
  let [bx, by, bw, bd] = [x, y, w, d];
  const porch = o.style === 'frame' && o.ground === 'porch' ? Math.min(0.7, (street === 'W' || street === 'E' ? d : w) * 0.25) : 0;
  if (porch) {
    if (street === 'W') bd -= porch; else if (street === 'E') { by += porch; bd -= porch; }
    else if (street === 'S') bw -= porch; else { bx += porch; bw -= porch; }
  }
  const hb = o.attic || o.style === 'frame' ? h - 0.12 : h; // pitched roofs sit on the wall top

  const trim = o.trim ?? pal(sp.trim, key), cc = o.corniceC ?? (o.style === 'rowhouse' ? trim : pal(sp.corniceC, key, 1));
  const party = dk(c, 0.07);
  const Ld = DIRS.find(dd => viewSide(dd) === 'L')!, Rd = DIRS.find(dd => viewSide(dd) === 'R')!;
  let s = box(bx, by, z0, bw, bd, hb, c, { top: o.roof || (o.style === 'modern' ? lt(c, 0.3) : pal(FLAT_ROOFS, key)), L: windowed(Ld) ? c : party, R: dk(windowed(Rd) ? c : party, 0.13) });
  const F = (dd: Dir) => face(bx, by, z0, bw, bd, dd);
  const args = { h: hb, c, g0, fh, nf, trim, cc, ground: o.ground ?? 'door', style: o.style };
  for (const dd of DIRS) {
    const Fd = F(dd);
    if (Fd.hidden || !windowed(dd)) continue;
    if (dd === rear) { s += facade(Fd, { ...sp, cornice: 'none' }, { ...args, L: Fd.L, key: key + dd, street: false, ground: 'none' }); continue; }
    s += facade(Fd, sp, { ...args, L: Fd.L, key: key + dd, street: dd === street || fronts.includes(dd) && o.style !== 'frame' });
  }
  if (o.extraFaces) s += o.extraFaces(F('W'), F('S'));
  if (o.ghost) { const g = DIRS.map(F).find(Fd => !Fd.hidden && !windowed(Fd.dir)); if (g) s += ghostSign(g, hb, party, key); }

  // fire escapes over the middle bays, one per ~3.5 units of facade
  const fire = o.fire === 'L' ? 'W' : o.fire === 'R' ? 'S' : o.fire;
  if (fire && nf > 0) {
    const Fe = F(fire), L = Fe.L, n = Math.max(1, Math.round(L / 3.5));
    for (let i = 0; i < n; i++) {
      const c0 = (L * (i + 0.5)) / n, half = Math.min(0.75, L / n / 2 - 0.15);
      s += fireEscape(Fe, c0 - half, c0 + half, g0 + 0.02, fh, nf);
    }
  }

  // cornice slab along each street facade
  if (sp.cornice !== 'none' && !o.attic) {
    const ov = sp.cornice === 'simple' ? 0.08 : sp.cornice === 'bracketed' ? 0.13 : 0.16;
    const ch = sp.cornice === 'simple' ? 0.12 : sp.cornice === 'bracketed' ? 0.2 : 0.28;
    for (const dd of fronts) {
      const L = dd === 'W' || dd === 'E' ? bw : bd, [l, r] = ENDS[dd];
      const [cx, cy, cw, cd] = fbox(bx, by, bw, bd, dd, fronts.includes(l) ? -ov : 0, L + (fronts.includes(r) ? ov : 0), -0.05, ov);
      s += box(cx, cy, z0 + h - 0.02, cw, cd, ch, cc, { top: lt(cc, 0.12) });
    }
  }

  // porch: deck, posts, roof
  if (porch) {
    const L = street === 'W' || street === 'E' ? bw : bd;
    const [px, py, pw, pd] = fbox(bx, by, bw, bd, street, 0.1, L - 0.1, 0, porch);
    s += box(px, py, 0, pw, pd, 0.25, '#d8cbb3', { top: '#e8dcc4' });
    for (const u of [0.15, L / 2, L - 0.15]) { const [qx, qy] = fpos(bx, by, bw, bd, street, u, porch - 0.08); s += ln(iso(qx, qy, 0.25), iso(qx, qy, 1.05), '#fbf8f1', 1.6) + ln(iso(qx, qy, 0.25), iso(qx, qy, 1.05), '#6b625a', 0.5); }
    s += box(px, py, 1.05, pw, pd, 0.12, trim, { top: dk(pal(ROOFS, key), 0.05) });
  }

  // roofs
  const backX = fronts.includes('S') ? 0.2 : fronts.includes('N') ? 0.8 : 0.62, backY = fronts.includes('W') ? 0.2 : fronts.includes('E') ? 0.8 : 0.62;
  if (o.style === 'frame' || o.attic) {
    // frame houses: gable to the street; Federal attics: ridge along the street, dormers on the street slope
    const along = street === 'W' || street === 'E' ? 'x' : 'y', ridge = o.style === 'frame' ? (along === 'x' ? 'y' : 'x') : along;
    const rc = o.style === 'frame' ? pal(ROOFS, key) : '#6b5a52', rise = Math.min(1.1, (ridge === 'x' ? bd : bw) * 0.32);
    s += gableRoof(bx, by, bw, bd, hb, rise, ridge, rc, c);
    const Fs = F(street);
    if (o.style === 'frame' && !Fs.hidden) s += frect(Fs, Fs.L / 2 - 0.15, hb + 0.12, Fs.L / 2 + 0.15, hb + Math.min(0.5, rise - 0.15), C_WIN, 'stroke-width=".5"');
    if (o.attic && !Fs.hidden) {
      const L = Fs.L, half = (along === 'x' ? bd : bw) / 2;
      for (const u of [L * 0.3, L * 0.7]) {
        const zb = hb + rise * (0.35 / half);
        const [dx, dy, dw, dd2] = fbox(bx, by, bw, bd, street, u - 0.22, u + 0.22, -0.85, -0.35);
        s += box(dx, dy, zb, dw, dd2, 0.5, trim, { top: '#6b5a52' });
        s += frect(face(dx, dy, zb, dw, dd2, street), 0.08, 0.06, 0.36, 0.42, C_WIN, 'stroke-width=".5"');
      }
    }
  } else if (o.style !== 'modern') {
    const bxx = bx + bw * backX - (backX > 0.5 ? 0.6 : 0), byy = by + bd * backY - (backY > 0.5 ? 0.55 : 0);
    if (nf >= 4 && bw > 1.3 && bd > 1.3) {
      s += box(bxx, byy, z0 + h, 0.6, 0.55, 0.5, dk(c, 0.04), { top: '#bdb7ab' }); // stair bulkhead
      s += frect(face(bxx, byy, z0 + h, 0.6, 0.55, fronts[0]), 0.18, 0, 0.42, 0.4, '#5b3d2e', 'stroke-width=".5"');
    }
    if (o.style !== 'rowhouse' && bw > 1.6 && bd > 1.6 && hash(key) % 2) {
      const sx = bx + bw * (1 - backX) - 0.25, sy = by + bd * (1 - backY) - 0.2;
      s += poly([iso(sx, sy, z0 + h + 0.01), iso(sx + 0.5, sy, z0 + h + 0.01), iso(sx + 0.5, sy + 0.4, z0 + h + 0.01), iso(sx, sy + 0.4, z0 + h + 0.01)], '#bcd6e4', 'stroke-width=".5"'); // skylight
    }
    if (bw > 2 && bd > 2 && hash(key + 'g') % 6 === 0) { // the odd roof garden
      const gx = bx + bw * 0.15, gy = by + bd * 0.15, gw = bw * 0.45, gd = bd * 0.45, z = z0 + h + 0.02;
      s += poly([iso(gx, gy, z), iso(gx + gw, gy, z), iso(gx + gw, gy + gd, z), iso(gx, gy + gd, z)], '#9fc874');
    }
    if (o.style === 'rowhouse' || o.style === 'tenement') { // chimneys on the party walls
      const alongX = street === 'W' || street === 'E';
      const cs = fronts.length > 1 ? [[bx + (backX < 0.5 ? 0.04 : bw - 0.34), by + (backY < 0.5 ? 0.04 : bd - 0.34)]]
        : alongX ? [[hash(key) % 2 ? bx + 0.04 : bx + bw - 0.34, by + bd * 0.4]] : [[bx + bw * 0.4, hash(key) % 2 ? by + 0.04 : by + bd - 0.34]];
      for (const [cx, cy] of cs) s += box(cx, cy, z0 + h, 0.3, 0.3, 0.45, dk(c, 0.1), { top: '#6b625a' });
    }
  }
  if (o.tower) s += waterTower(bx + bw * (o.tu ?? (backX < 0.5 ? 0.3 : 0.7)), by + bd * (o.tv ?? (backY < 0.5 ? 0.3 : 0.7)), z0 + h + 0.15);
  return s;
}
