/* Tile builder: local coords → world, collecting ground SVG, depth-sorted objects and movers.
   Everything is placed in world coordinates (x = south, y = west); depth-sort boxes are stored in
   view space so the scene can be rebuilt for any view rotation. */
import type { HoodId } from '../data/places';
import {
  type Axis, type Pt, type Dir, type Face, INK, C_TILE, C_ROAD, C_LINE, C_GRASS,
  rnd, rr, iso, f1, poly, ln, box, circlePts, at, face, rotAABB, gtext,
} from './iso';
import {
  type BldOpts, type StorefrontOpts, type PersonOpts, type CarOpts,
  bld, houseSVG, treeSVG, lampSVG, benchSVG, hydrantSVG, personSVG, carSVG, carLen, carWidth, storefront,
} from './parts';
import type { Lot } from '../data/lots';
import { type LotOpts, styledBld, fromLot, frontage, dirsOf } from './styles';

/** bld() or, when opts.style is set, the styled renderer. */
const build = (x: number, y: number, w: number, d: number, h: number, c: string, o: BldOpts) =>
  o.style ? styledBld(x, y, w, d, h, c, { ...o, style: o.style }) : bld(x, y, w, d, h, c, o);

/** A footprint used for depth sorting (view space once added to a tile). */
export interface AABB { x0: number; y0: number; x1: number; y1: number; above?: boolean; behindAll?: boolean; onTop?: boolean }
export interface Item extends AABB { svg: string; node?: Element; small?: boolean }
export interface Mover extends AABB {
  kind: 'car' | 'walk'; axis: Axis; a: number; b: number; c: number; speed: number; svg: string;
  /** half extents along world x / y */
  hw: number; hd: number; p: number; z?: number; phase?: number; st?: boolean;
  node?: Element; idx?: number; len?: number; dir?: number;
}
type FacesFn = (FL: Face, FR: Face, F: (d: Dir) => Face) => string;
export interface PizzaOpts extends StorefrontOpts {
  /** storefront side(s): compass letters ('W', 'S', 'NE', …); legacy 'L' = W, 'R' = S */
  front?: string; u0?: number; u1?: number; faces?: FacesFn; b?: BldOpts;
}
/** What the map needs to know about each pizzeria. */
export interface PinInfo {
  /** world position of the pin */
  at: [number, number, number];
  /** compass side of the storefront */
  facing: Dir;
  /** screen rectangle of the storefront in the current view (for x-ray), if visible */
  focus?: { x0: number; y0: number; x1: number; y1: number };
  item: Item;
}
/** One real building in a row(). */
export interface RowItem extends LotOpts {
  lot: Lot;
  /** make this lot a pizzeria storefront */
  pizza?: PizzaOpts & { id: string };
  /** extra drawing on the building's faces (signs, painted ads…) */
  faces?: FacesFn;
  depth?: number;
  /** override the frontage-derived width */
  width?: number;
}
/** Options for face(): one side of a street, laid out from real lots. */
export interface FaceOpts {
  /** maximum building depth (lots are as deep as their real depth, compressed) */
  depth: number;
  /** storefront options for pizzerias on this face, by place id */
  pizzas?: Record<string, PizzaOpts>;
  /** extra street sides for corner lots, by house number, e.g. { 327: 'N' } */
  corners?: Record<number, string>;
  /** per-lot overrides, by house number */
  over?: Record<number, Partial<RowItem>>;
  /** scale all frontages so the face exactly fills from..to (default: real widths, last lot cut at `to`) */
  fit?: boolean;
}
/** Where a row() put each building (local coords). */
export interface Placed { x: number; y: number; w: number; d: number; h: number; lot: Lot }

/** Half extents (x, y) of a car's footprint, for depth sorting. */
const carHalf = (axis: Axis, o: CarOpts): [number, number] => { const l = carLen(o) / 2, w = carWidth(o) / 2; return axis === 'x' ? [l, w] : [w, l]; };

export class Tile {
  gnd: string[] = [];
  items: Item[] = [];
  movers: Mover[] = [];
  pins: Record<string, PinInfo> = {};
  /** roads and every object footprint in local coords, for streetscape() */
  roads: { x: number; y: number; w: number; d: number; axis: Axis }[] = [];
  boxes: [number, number, number, number, boolean][] = [];
  parkedAt: [number, number, number, number][] = [];
  shops: [number, number, number, number][] = [];
  hood: HoodId | null; top: number; thick: number; slab: string;
  /** extents along world x and y */
  W: number; D: number;
  // filled in when mounted
  node?: SVGGElement; objs?: Element; sorted: Item[] = [];

  constructor(public id: string, public x0: number, public y0: number, size: number | [number, number],
    o: { hood?: HoodId; top?: number; thick?: number; slab?: string } = {}) {
    [this.W, this.D] = typeof size === 'number' ? [size, size] : size;
    this.hood = o.hood || null; this.top = o.top || 6; this.thick = o.thick ?? 0.45; this.slab = o.slab || C_TILE; // thick: plinth down to the island plate (Z_PLATE)
  }
  X(x: number) { return this.x0 + x; }
  Y(y: number) { return this.y0 + y; }
  P(x: number, y: number, z = 0): Pt { return iso(this.x0 + x, this.y0 + y, z); }
  add(x0: number, y0: number, x1: number, y1: number, svg: string, ex: { above?: boolean; small?: boolean } = {}) {
    const it = rotAABB({ x0: this.X(x0), y0: this.Y(y0), x1: this.X(x1), y1: this.Y(y1), svg, ...ex });
    this.boxes.push([Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1), !!ex.small]);
    this.items.push(it);
    return it;
  }

  /* ground layer (flat, not depth-sorted) */
  // ground has soft edges, not ink outlines
  flat(lp: [number, number][], fill: string, ex = '') { this.gnd.push(poly(lp.map(([x, y]) => this.P(x, y, 0.02)), fill, ex.includes('stroke=') ? ex : ex + ' stroke="rgba(80,66,50,.3)"')); }
  rect(x: number, y: number, w: number, d: number, fill: string, ex = '') { this.flat([[x, y], [x + w, y], [x + w, y + d], [x, y + d]], fill, ex); }
  road(x: number, y: number, w: number, d: number, axis: Axis, o: { line?: boolean; fill?: string; name?: string; nameAt?: number } = {}) {
    this.rect(x, y, w, d, o.fill || C_ROAD, 'stroke="none"'); // edges come from streetscape(): kerbs that break at crossings
    this.roads.push({ x, y, w, d, axis });
    if (o.line !== false) {
      if (axis === 'x') { const yc = y + d / 2; this.gnd.push(ln(this.P(x, yc, 0.03), this.P(x + w, yc, 0.03), C_LINE, 1.6, 'stroke-dasharray="8 8" stroke-linecap="butt"')); }
      else { const xc = x + w / 2; this.gnd.push(ln(this.P(xc, y, 0.03), this.P(xc, y + d, 0.03), C_LINE, 1.6, 'stroke-dasharray="8 8" stroke-linecap="butt"')); }
    }
    if (o.name) {
      const along = o.nameAt ?? 0.5, off = o.line === false ? 0 : 0.28;
      this.streetName(o.name, axis === 'x' ? x + w * along : x + w / 2 + off, axis === 'x' ? y + d / 2 + off : y + d * along, axis, axis === 'x' ? d : w);
    }
  }
  /** Street name painted on the roadway, reading left-to-right in any view. */
  streetName(name: string, x: number, y: number, axis: Axis, width = 1.2) {
    const size = Math.max(5, Math.min(8.5, width * 5));
    this.gnd.push(gtext(this.X(x), this.Y(y), axis, name.toUpperCase(), size, '#fbf8f1', { ls: 1.6 }));
  }
  cobble(x: number, y: number, w: number, d: number) { this.rect(x, y, w, d, 'url(#cobble)'); }
  plaza(x: number, y: number, w: number, d: number, fill = 'url(#pavers)') { this.rect(x, y, w, d, fill); }
  grass(x: number, y: number, w: number, d: number, o: { fill?: string } = {}) {
    this.rect(x, y, w, d, o.fill || C_GRASS);
    const n = Math.round(w * d * 1.1);
    for (let i = 0; i < n; i++) {
      const p = this.P(x + rr(0.15, w - 0.15), y + rr(0.15, d - 0.15), 0.02);
      this.gnd.push(`<path d="M${f1(p[0] - 2)} ${f1(p[1])}l1.6 -2.6 1 2.2 1.2 -2.8 .8 3.2" fill="none" stroke="#86b46a" stroke-width=".8"/>`);
    }
  }
  circ(cx: number, cy: number, r: number, fill: string) { this.gnd.push(poly(circlePts(this.X(cx), this.Y(cy), r), fill)); }
  xwalk(x: number, y: number, w: number, d: number) { // stripes repeat along the long side
    const along = d > w ? 'y' : 'x', L = along === 'y' ? d : w, n = Math.floor(L / 0.32);
    for (let i = 0; i < n; i++) {
      const a = (i * L) / n + 0.06, b = a + (L / n) * 0.55;
      if (along === 'y') this.flat([[x, y + a], [x + w, y + a], [x + w, y + b], [x, y + b]], '#f8f5ee', 'stroke="none"');
      else this.flat([[x + a, y], [x + b, y], [x + b, y + d], [x + a, y + d]], '#f8f5ee', 'stroke="none"');
    }
  }
  /** Returns railing SVG (caller adds it). */
  rail(x0: number, y0: number, x1: number, y1: number, z = 0.45) {
    let s = ln(this.P(x0, y0, z), this.P(x1, y1, z), INK, 1); const L = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(L / 0.8);
    for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n; s += ln(this.P(x, y, 0), this.P(x, y, z), INK, 0.8); }
    return s;
  }
  /** A straight railing as a depth-sorted object. */
  fence(x0: number, y0: number, x1: number, y1: number, z = 0.45) {
    this.add(Math.min(x0, x1) - 0.03, Math.min(y0, y1) - 0.03, Math.max(x0, x1) + 0.03, Math.max(y0, y1) + 0.03, this.rail(x0, y0, x1, y1, z), { small: true });
  }

  /* objects (depth-sorted) */
  b(x: number, y: number, w: number, d: number, h: number, c: string, o: BldOpts = {}) { return this.add(x, y, x + w, y + d, build(this.X(x), this.Y(y), w, d, h, c, o)); }
  house(x: number, y: number, w: number, d: number, h: number, c: string, rc: string) { this.add(x, y, x + w, y + d, houseSVG(this.X(x), this.Y(y), w, d, h, c, rc)); }
  tree(x: number, y: number, s = 1) { this.add(x - 0.15, y - 0.15, x + 0.15, y + 0.15, treeSVG(this.X(x), this.Y(y), s)); }
  lamp(x: number, y: number) { this.add(x - 0.05, y - 0.05, x + 0.05, y + 0.05, lampSVG(this.X(x), this.Y(y)), { small: true }); }
  bench(x: number, y: number, a: Axis = 'x') { this.add(x - 0.35, y - 0.35, x + 0.35, y + 0.35, benchSVG(this.X(x), this.Y(y), a), { small: true }); }
  hydrant(x: number, y: number) { this.add(x - 0.07, y - 0.07, x + 0.07, y + 0.07, hydrantSVG(this.X(x), this.Y(y)), { small: true }); }
  person(x: number, y: number, o?: PersonOpts) { this.add(x - 0.14, y - 0.14, x + 0.14, y + 0.14, at(this.X(x), this.Y(y), 0, personSVG(o)), { small: true }); }
  crowd(x: number, y: number, w: number, d: number, n: number) { for (let i = 0; i < n; i++) this.person(x + rr(0, w), y + rr(0, d)); }
  queue(x: number, y: number, axis: Axis, n: number, gap = 0.42) {
    for (let i = 0; i < n; i++) this.person(axis === 'x' ? x + i * gap + rr(-0.05, 0.05) : x + rr(-0.06, 0.06), axis === 'y' ? y + i * gap + rr(-0.05, 0.05) : y + rr(-0.06, 0.06));
  }
  parked(x: number, y: number, axis: Axis, color: string, o: CarOpts = {}) {
    const [hw, hd] = carHalf(axis, o);
    this.parkedAt.push([x - hw, y - hd, x + hw, y + hd]);
    this.add(x - hw, y - hd, x + hw, y + hd, at(this.X(x), this.Y(y), 0, carSVG(axis, color, o)), { small: true });
  }
  cart(x: number, y: number, umb = ['#3f7fbf', '#f2c230']) {
    const X = this.X(x), Y = this.Y(y); let s = box(X - 0.3, Y - 0.2, 0.15, 0.6, 0.4, 0.5, '#d9d4cb', { L: '#e9e4da' });
    s += ln(iso(X, Y, 0.65), iso(X, Y, 1.45), INK, 1);
    const t = iso(X, Y, 1.45), rx = 15;
    s += `<path d="M${f1(t[0] - rx)} ${f1(t[1] + 2)}Q${f1(t[0])} ${f1(t[1] - 12)} ${f1(t[0] + rx)} ${f1(t[1] + 2)}Z" fill="${umb[0]}"/>`;
    s += `<path d="M${f1(t[0] - 5)} ${f1(t[1] - 3.5)}Q${f1(t[0])} ${f1(t[1] - 9)} ${f1(t[0] + 5)} ${f1(t[1] - 3.5)}L${f1(t[0] + 7)} ${f1(t[1] + 2)}L${f1(t[0] - 7)} ${f1(t[1] + 2)}Z" fill="${umb[1]}" stroke-width=".6"/>`;
    this.add(x - 0.3, y - 0.2, x + 0.3, y + 0.2, s, { small: true });
  }
  subway(x: number, y: number, axis: Axis = 'x') {
    const X = this.X(x), Y = this.Y(y); const w = axis === 'x' ? 1.0 : 0.55, d = axis === 'x' ? 0.55 : 1.0;
    let s = box(X, Y, 0, w, d, 0.06, '#3b3836', { top: '#4a4542' });
    s += axis === 'x'
      ? box(X, Y, 0.06, w, 0.06, 0.32, '#3f8f5a', { top: '#58a873' }) + box(X, Y + d - 0.06, 0.06, w, 0.06, 0.32, '#3f8f5a', { top: '#58a873' })
      : box(X, Y, 0.06, 0.06, d, 0.32, '#3f8f5a', { top: '#58a873' }) + box(X + w - 0.06, Y, 0.06, 0.06, d, 0.32, '#3f8f5a', { top: '#58a873' });
    for (const [gx, gy] of axis === 'x' ? [[X + 0.05, Y + 0.05], [X + 0.05, Y + d - 0.05]] : [[X + 0.05, Y + 0.05], [X + w - 0.05, Y + 0.05]]) {
      const b = iso(gx, gy, 0.38), t = iso(gx, gy, 0.95);
      s += ln(b, t, '#3f8f5a', 1.3) + `<circle cx="${f1(t[0])}" cy="${f1(t[1])}" r="2.4" fill="#7fd09a" stroke-width=".7"/>`;
    }
    this.add(x, y, x + w, y + d, s, { small: true });
  }
  flagpole(x: number, y: number, h: number, stripes: string[]) {
    const b = this.P(x, y, 0), t = this.P(x, y, h); let s = ln(b, t, '#6b625a', 1.1);
    const fw = 11, fh = 7.2, sh = fh / stripes.length;
    stripes.forEach((c, i) => { s += `<rect x="${f1(t[0])}" y="${f1(t[1] + i * sh)}" width="${fw}" height="${f1(sh)}" fill="${c}" stroke="none"/>`; });
    s += `<rect x="${f1(t[0])}" y="${f1(t[1])}" width="${fw}" height="${fh}" fill="none" stroke-width=".7"/>`;
    this.add(x - 0.05, y - 0.05, x + 0.05, y + 0.05, s);
  }

  /** Pizzeria storefront building. Registers the pin (position, storefront side, x-ray rect) for PLACES[id]. */
  pizza(id: string, x: number, y: number, w: number, d: number, h: number, c: string, o: PizzaOpts = {}) {
    const X = this.X(x), Y = this.Y(y);
    const fronts = dirsOf(o.front || 'W');
    const F = (dir: Dir) => face(X, Y, 0, w, d, dir);
    const sf = (Fc: Face) => storefront(Fc, o.u0 ?? 0.12, o.u1 ?? Fc.L - 0.12, { wall: c, ...o });
    const s = build(X, Y, w, d, h, c, {
      g0: 2.75, noWinL: fronts.includes('W') && h < 4, noWinR: fronts.includes('S') && h < 4,
      extraFaces: (FL, FR) => fronts.map(dir => sf(F(dir))).join('') + (o.faces ? o.faces(FL, FR, F) : ''),
      ...o.b,
    });
    const item = this.add(x, y, x + w, y + d, s);
    this.shops.push([x, y, x + w, y + d]);
    // storefront rectangle on screen, for fading whatever stands in front of it
    const Fm = F(fronts[0]);
    const focus = Fm.hidden ? undefined : (() => {
      const q = [Fm.at(0, 0), Fm.at(Fm.L, 0), Fm.at(0, 3.2), Fm.at(Fm.L, 3.2)];
      return { x0: Math.min(...q.map(p => p[0])), x1: Math.max(...q.map(p => p[0])), y0: Math.min(...q.map(p => p[1])), y1: Math.max(...q.map(p => p[1])) };
    })();
    this.pins[id] = { at: [X + w / 2, Y + d / 2, h + (o.b?.tower ? 1.7 : 0.35)], facing: fronts[0], focus, item };
  }

  /**
   * Sidewalks, kerbs, street trees and traffic signals for every road, run once after the hood is built.
   * Kerbs break where another road crosses; trees and signals go only where nothing else stands, and
   * trees keep clear of intersections and of the pizzerias' storefronts.
   */
  streetscape() {
    const SW = 0.6, R = this.roads, W = this.W, D = this.D;
    const free = (x0: number, y0: number, x1: number, y1: number, pad = 0) =>
      x0 >= 0 && y0 >= 0 && x1 <= W && y1 <= D &&
      !this.boxes.some(b => b[0] < x1 + pad && b[2] > x0 - pad && b[1] < y1 + pad && b[3] > y0 - pad) &&
      !R.some(r => r.x < x1 && r.x + r.w > x0 && r.y < y1 && r.y + r.d > y0);
    /** [a0, a1] along the road's axis minus the stretches where crossing roads cut through at offset c. */
    const open = (r: typeof R[0], c: number) => {
      const along = r.axis === 'x', a0 = along ? r.x : r.y, a1 = along ? r.x + r.w : r.y + r.d;
      const cuts = R.filter(q => q !== r && q.axis !== r.axis && (along ? q.y <= c && q.y + q.d >= c : q.x <= c && q.x + q.w >= c))
        .map(q => (along ? [q.x, q.x + q.w] : [q.y, q.y + q.d])).sort((p, q) => p[0] - q[0]);
      const segs: [number, number][] = []; let s0 = a0;
      for (const [c0, c1] of cuts) { if (c0 > s0) segs.push([s0, Math.min(c0, a1)]); s0 = Math.max(s0, c1); }
      if (s0 < a1) segs.push([s0, a1]);
      return segs.filter(([p, q]) => q - p > 0.05);
    };
    const P = (along: boolean, a: number, c: number, z = 0.03) => (along ? this.P(a, c, z) : this.P(c, a, z));
    const walks: string[] = [], kerbs: string[] = [];
    for (const r of R) {
      const along = r.axis === 'x', lo = along ? r.y : r.x, hi = along ? r.y + r.d : r.x + r.w;
      for (const [edge, out] of [[lo, -1], [hi, 1]] as const) {
        const e2 = Math.max(0, Math.min(along ? D : W, edge + out * SW));
        for (const [a, b] of open(r, edge + out * 0.01)) {
          walks.push(poly([P(along, a, edge, 0.01), P(along, b, edge, 0.01), P(along, b, e2, 0.01), P(along, a, e2, 0.01)], '#e6e0d4', 'stroke="none"'));
          kerbs.push(ln(P(along, a, edge), P(along, b, edge), 'rgba(80,66,50,.4)', 0.8) +
            ln(P(along, a, edge + out * 0.05), P(along, b, edge + out * 0.05), '#fbf8f1', 1.4));
        }
      }
    }
    this.gnd.unshift(...walks); // under everything else on the ground
    this.gnd.push(...kerbs);
    this.checkTraffic();
    // street trees: every ~3.2 units (40 ft) along each sidewalk, not near crossings or storefronts
    const nearShop = (x: number, y: number) => this.shops.some(b => x > b[0] - 1.6 && x < b[2] + 1.6 && y > b[1] - 1.6 && y < b[3] + 1.6);
    for (const r of R) {
      const along = r.axis === 'x', lo = along ? r.y : r.x, hi = along ? r.y + r.d : r.x + r.w;
      for (const c of [lo - 0.3, hi + 0.3]) for (const [a, b] of open(r, c)) {
        for (let t = a + 1.4; t < b - 1.2; t += 3.2) {
          const [x, y] = along ? [t, c] : [c, t];
          if (rnd() < 0.3 || nearShop(x, y) || !free(x - 0.18, y - 0.18, x + 0.18, y + 0.18)) continue;
          this.tree(x, y, 0.62);
        }
      }
    }
    // traffic signals on two opposite corners of each crossing of a wide road (one with a centre line or ≥ 1.3 wide)
    for (const a of R) for (const b of R) {
      if (a.axis !== 'x' || b.axis !== 'y') continue;
      const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w), y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.d, b.y + b.d);
      if (x1 <= x0 || y1 <= y0 || Math.max(a.d, b.w) < 1.3) continue;
      for (const [x, y, f] of [[x0 - 0.25, y0 - 0.25, 'S'], [x1 + 0.25, y1 + 0.25, 'N']] as const)
        if (free(x - 0.06, y - 0.06, x + 0.06, y + 0.06, 0.05)) this.signal(x, y, f);
    }
  }
  /** Warn (dev console, and so `pnpm shots`) about any car, bus, walker or parked car whose path runs through a building. */
  checkTraffic() {
    const solid = this.boxes.map((b, i) => [...b, i] as const).filter(b => !b[4] && !this.items[b[5]].above);
    const hit = (r: number[]) => solid.find(b => b[0] < r[2] - 0.02 && b[2] > r[0] + 0.02 && b[1] < r[3] - 0.02 && b[3] > r[1] + 0.02);
    const paths = this.movers.filter(m => !m.z).map(m => {
      const a0 = Math.min(m.a, m.b), a1 = Math.max(m.a, m.b);
      return { what: `${m.kind} on ${m.axis} at ${m.c}`, r: m.axis === 'x' ? [a0, m.c - m.hd, a1, m.c + m.hd] : [m.c - m.hw, a0, m.c + m.hw, a1] };
    }).concat(this.parkedAt.map(r => ({ what: `parked car at ${((r[0] + r[2]) / 2).toFixed(2)},${((r[1] + r[3]) / 2).toFixed(2)}`, r })));
    // and cars must stay on the carriageway: sample along the path, both kerb-side corners inside some road
    const onRoad = (x: number, y: number) => this.roads.some(r => x >= r.x - 0.04 && x <= r.x + r.w + 0.04 && y >= r.y - 0.04 && y <= r.y + r.d + 0.04);
    for (const p of paths) if (!p.what.startsWith('walk')) {
      const [x0, y0, x1, y1] = p.r, n = Math.max(2, Math.ceil(Math.max(x1 - x0, y1 - y0) / 0.4));
      for (let i = 0; i <= n; i++) {
        const u = i / n, pts = x1 - x0 > y1 - y0 ? [[x0 + (x1 - x0) * u, y0], [x0 + (x1 - x0) * u, y1]] : [[x0, y0 + (y1 - y0) * u], [x1, y0 + (y1 - y0) * u]];
        const off = pts.find(([x, y]) => x > 0.05 && y > 0.05 && x < this.W - 0.05 && y < this.D - 0.05 && !onRoad(x, y));
        if (off) { console.warn(`[layout] ${this.id}: ${p.what} leaves the road at ${off.map(v => v.toFixed(2))}`); break; }
      }
    }
    for (const p of paths) { const b = hit(p.r); if (b) console.warn(`[layout] ${this.id}: ${p.what} runs into [${b.slice(0, 4).map(v => (+v).toFixed(2))}] ${this.items[b[5]]?.svg.slice(0, 70)}`); }
  }
  /** A traffic signal: dark pole, signal head with red / amber / green on its visible faces, a small walk light. */
  signal(x: number, y: number, _toward: Dir = 'S') {
    const X = this.X(x), Y = this.Y(y), hz = 1.05;
    let s = ln(iso(X, Y, 0), iso(X, Y, hz + 0.36), '#3a3f3c', 1.6);
    s += box(X - 0.07, Y - 0.07, hz, 0.14, 0.14, 0.36, '#2e3b33');
    for (const dir of ['N', 'E', 'S', 'W'] as Dir[]) {
      const F = face(X - 0.07, Y - 0.07, hz, 0.14, 0.14, dir); if (F.hidden) continue;
      ['#e2483d', '#f2b134', '#43c25c'].forEach((c, i) => { const p = F.at(0.07, 0.3 - i * 0.11, 0.005); s += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="1" fill="${i === 0 ? c : '#55605a'}" stroke="none"/>`; });
    }
    s += box(X - 0.05, Y - 0.05, 0.62, 0.1, 0.1, 0.12, '#2e3b33');
    this.add(x - 0.07, y - 0.07, x + 0.07, y + 0.07, s, { small: true });
  }

  /** A real building from tax-lot data, at an explicit footprint. Returns its height. */
  lot(l: Lot, x: number, y: number, w: number, d: number, o: LotOpts & { faces?: FacesFn } = {}) {
    const r = fromLot(l, o);
    const X = this.X(x), Y = this.Y(y), fx = o.faces;
    this.b(x, y, w, d, r.h, r.c, { ...r.opts, extraFaces: fx && ((FL, FR) => fx(FL, FR, dir => face(X, Y, 0, w, d, dir))) });
    return r.h;
  }
  /**
   * Real buildings side by side along a street, in the given order, each as wide as its (compressed)
   * frontage. `facing` is the compass side the facades face (toward the street); `at` is the facade line
   * (y for W/E, x for S/N). The row runs from `from` toward `to` and the last building is cut at `to`.
   */
  row(facing: Dir, at: number, from: number, to: number, items: RowItem[], maxDepth: number): Placed[] {
    const dir = Math.sign(to - from) || 1, out: Placed[] = [];
    let cur = from;
    for (const it of items) {
      const len = Math.min(it.width ?? frontage(it.lot.front ?? 25), Math.abs(to - cur));
      if (len < 0.3) break;
      const a0 = Math.min(cur, cur + dir * len), dep = it.depth ?? Math.min(maxDepth, frontage(it.lot.depth ?? 50));
      const [x, y, w, d] =
        facing === 'W' ? [a0, at - dep, len, dep] : facing === 'E' ? [a0, at, len, dep] :
        facing === 'S' ? [at - dep, a0, dep, len] : [at, a0, dep, len];
      const front = it.front ?? facing;
      let h: number;
      if (it.pizza) {
        const { id, ...po } = it.pizza;
        const r = fromLot(it.lot, { g0: 2.75, ground: 'custom', ...it, front });
        h = r.h;
        this.pizza(id, x, y, w, d, h, r.c, { front: facing, ...po, b: { ...r.opts, ...po.b } });
      } else h = this.lot(it.lot, x, y, w, d, { ...it, front });
      out.push({ x, y, w, d, h, lot: it.lot });
      cur += dir * len;
    }
    return out;
  }

  /** One side of a street from real lots (in walking order), facades facing `facing` on the line `at`. */
  face(lots: Lot[], facing: Dir, at: number, from: number, to: number, o: FaceOpts): Placed[] {
    const scale = o.fit ? Math.abs(to - from) / lots.reduce((s, l) => s + frontage(l.front ?? 25), 0) : 1;
    const items: RowItem[] = lots.map(l => ({
      lot: l,
      front: facing + (o.corners?.[l.num] ?? ''),
      ...(o.fit && { width: frontage(l.front ?? 25) * scale }),
      ...(l.place && o.pizzas?.[l.place] && { pizza: { id: l.place, ...o.pizzas[l.place] } }),
      ...o.over?.[l.num],
    }));
    return this.row(facing, at, from, to, items, o.depth);
  }

  /* movers (world coords; the map projects them through the current view rotation) */
  car(axis: Axis, a: number, b: number, c: number, speed: number, color: string, o: CarOpts = {}) {
    const [hw, hd] = carHalf(axis, o);
    this.movers.push({ kind: 'car', axis, a, b, c, speed, svg: carSVG(axis, color, o), hw, hd, p: rr(0, Math.abs(b - a)), z: o.z || 0, onTop: o.onTop, x0: 0, y0: 0, x1: 0, y1: 0 });
  }
  walker(axis: Axis, a: number, b: number, c: number, speed: number, o: PersonOpts & { svg?: string } = {}) {
    this.movers.push({ kind: 'walk', axis, a, b, c, speed, svg: o.svg || personSVG({ walking: true, ...o }), hw: 0.14, hd: 0.14, p: rr(0, Math.abs(b - a) * 2), phase: rnd() * 6, x0: 0, y0: 0, x1: 0, y1: 0 });
  }
}
