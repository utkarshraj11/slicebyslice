/* Tile builder: local coords (0..T) → world, collecting ground SVG, depth-sorted objects and movers. */
import type { HoodId } from '../data/places';
import { type Axis, type Pt, INK, C_TILE, C_ROAD, C_LINE, C_GRASS, rnd, rr, iso, f1, poly, ln, box, circlePts, at } from './iso';
import {
  type BldOpts, type StorefrontOpts, type PersonOpts, type CarOpts,
  bld, houseSVG, treeSVG, lampSVG, benchSVG, hydrantSVG, personSVG, carSVG, storefront,
} from './parts';
import type { Face } from './iso';

/** Anything with a world-space footprint used for depth sorting. */
export interface AABB { x0: number; y0: number; x1: number; y1: number; above?: boolean; behindAll?: boolean; onTop?: boolean }
export interface Item extends AABB { svg: string; node?: Element }
export interface Mover extends AABB {
  kind: 'car' | 'walk'; axis: Axis; a: number; b: number; c: number; speed: number; svg: string;
  hw: number; hd: number; p: number; z?: number; phase?: number;
  node?: Element; idx?: number; len?: number; dir?: number;
}
export interface PizzaOpts extends StorefrontOpts {
  front?: 'L' | 'R' | 'LR'; u0?: number; u1?: number; faces?: (FL: Face, FR: Face) => string; b?: BldOpts;
}

export class Tile {
  gnd: string[] = [];
  items: Item[] = [];
  movers: Mover[] = [];
  /** place id → world [x, y, z] of its pin */
  pins: Record<string, [number, number, number]> = {};
  hood: HoodId | null; top: number; thick: number; slab: string;
  // filled in when mounted
  node?: SVGGElement; objs?: Element; sorted: Item[] = [];

  constructor(public id: string, public x0: number, public y0: number, public T: number,
    o: { hood?: HoodId; top?: number; thick?: number; slab?: string } = {}) {
    this.hood = o.hood || null; this.top = o.top || 6; this.thick = o.thick ?? 1.0; this.slab = o.slab || C_TILE;
  }
  X(x: number) { return this.x0 + x; }
  Y(y: number) { return this.y0 + y; }
  P(x: number, y: number, z = 0): Pt { return iso(this.x0 + x, this.y0 + y, z); }
  add(x0: number, y0: number, x1: number, y1: number, svg: string, ex: { above?: boolean } = {}) {
    this.items.push({ x0: this.X(x0), y0: this.Y(y0), x1: this.X(x1), y1: this.Y(y1), svg, ...ex });
  }

  /* ground layer (flat, not depth-sorted) */
  flat(lp: [number, number][], fill: string, ex = '') { this.gnd.push(poly(lp.map(([x, y]) => this.P(x, y, 0.02)), fill, ex)); }
  rect(x: number, y: number, w: number, d: number, fill: string, ex = '') { this.flat([[x, y], [x + w, y], [x + w, y + d], [x, y + d]], fill, ex); }
  road(x: number, y: number, w: number, d: number, axis: Axis, o: { line?: boolean; fill?: string } = {}) {
    this.rect(x, y, w, d, o.fill || C_ROAD);
    if (o.line !== false) {
      if (axis === 'x') { const yc = y + d / 2; this.gnd.push(ln(this.P(x, yc, 0.03), this.P(x + w, yc, 0.03), C_LINE, 1.6, 'stroke-dasharray="8 8" stroke-linecap="butt"')); }
      else { const xc = x + w / 2; this.gnd.push(ln(this.P(xc, y, 0.03), this.P(xc, y + d, 0.03), C_LINE, 1.6, 'stroke-dasharray="8 8" stroke-linecap="butt"')); }
    }
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

  /* objects (depth-sorted) */
  b(x: number, y: number, w: number, d: number, h: number, c: string, o: BldOpts = {}) { this.add(x, y, x + w, y + d, bld(this.X(x), this.Y(y), w, d, h, c, o)); }
  house(x: number, y: number, w: number, d: number, h: number, c: string, rc: string) { this.add(x, y, x + w, y + d, houseSVG(this.X(x), this.Y(y), w, d, h, c, rc)); }
  tree(x: number, y: number, s = 1) { this.add(x - 0.15, y - 0.15, x + 0.15, y + 0.15, treeSVG(this.X(x), this.Y(y), s)); }
  lamp(x: number, y: number) { this.add(x - 0.05, y - 0.05, x + 0.05, y + 0.05, lampSVG(this.X(x), this.Y(y))); }
  bench(x: number, y: number, a: Axis = 'x') { this.add(x - 0.35, y - 0.35, x + 0.35, y + 0.35, benchSVG(this.X(x), this.Y(y), a)); }
  hydrant(x: number, y: number) { this.add(x - 0.07, y - 0.07, x + 0.07, y + 0.07, hydrantSVG(this.X(x), this.Y(y))); }
  person(x: number, y: number, o?: PersonOpts) { this.add(x - 0.14, y - 0.14, x + 0.14, y + 0.14, at(this.X(x), this.Y(y), 0, personSVG(o))); }
  crowd(x: number, y: number, w: number, d: number, n: number) { for (let i = 0; i < n; i++) this.person(x + rr(0, w), y + rr(0, d)); }
  queue(x: number, y: number, axis: Axis, n: number, gap = 0.42) {
    for (let i = 0; i < n; i++) this.person(axis === 'x' ? x + i * gap + rr(-0.05, 0.05) : x + rr(-0.06, 0.06), axis === 'y' ? y + i * gap + rr(-0.05, 0.05) : y + rr(-0.06, 0.06));
  }
  parked(x: number, y: number, axis: Axis, color: string, o: CarOpts = {}) {
    const hw = axis === 'x' ? 0.75 : 0.39, hd = axis === 'x' ? 0.39 : 0.75;
    this.add(x - hw, y - hd, x + hw, y + hd, at(this.X(x), this.Y(y), 0, carSVG(axis, color, o)));
  }
  cart(x: number, y: number, umb = ['#3f7fbf', '#f2c230']) {
    const X = this.X(x), Y = this.Y(y); let s = box(X - 0.3, Y - 0.2, 0.15, 0.6, 0.4, 0.5, '#d9d4cb', { L: '#e9e4da' });
    s += ln(iso(X, Y, 0.65), iso(X, Y, 1.45), INK, 1);
    const t = iso(X, Y, 1.45), rx = 15;
    s += `<path d="M${f1(t[0] - rx)} ${f1(t[1] + 2)}Q${f1(t[0])} ${f1(t[1] - 12)} ${f1(t[0] + rx)} ${f1(t[1] + 2)}Z" fill="${umb[0]}"/>`;
    s += `<path d="M${f1(t[0] - 5)} ${f1(t[1] - 3.5)}Q${f1(t[0])} ${f1(t[1] - 9)} ${f1(t[0] + 5)} ${f1(t[1] - 3.5)}L${f1(t[0] + 7)} ${f1(t[1] + 2)}L${f1(t[0] - 7)} ${f1(t[1] + 2)}Z" fill="${umb[1]}" stroke-width=".6"/>`;
    this.add(x - 0.3, y - 0.2, x + 0.3, y + 0.2, s);
  }
  subway(x: number, y: number, axis: Axis = 'x') {
    const X = this.X(x), Y = this.Y(y); const w = axis === 'x' ? 1.0 : 0.55, d = axis === 'x' ? 0.55 : 1.0;
    let s = box(X, Y, 0, w, d, 0.06, '#3b3836', { top: '#4a4542' });
    s += box(X, Y, 0.06, w, 0.06, 0.32, '#3f8f5a', { top: '#58a873' }) + box(X, Y + d - 0.06, 0.06, w, 0.06, 0.32, '#3f8f5a', { top: '#58a873' });
    for (const [gx, gy] of [[X + 0.05, Y + 0.05], [X + 0.05, Y + d - 0.05]]) {
      const b = iso(gx, gy, 0.38), t = iso(gx, gy, 0.95);
      s += ln(b, t, '#3f8f5a', 1.3) + `<circle cx="${f1(t[0])}" cy="${f1(t[1])}" r="2.4" fill="#7fd09a" stroke-width=".7"/>`;
    }
    this.add(x, y, x + w, y + d, s);
  }
  flagpole(x: number, y: number, h: number, stripes: string[]) {
    const b = this.P(x, y, 0), t = this.P(x, y, h); let s = ln(b, t, '#6b625a', 1.1);
    const fw = 11, fh = 7.2, sh = fh / stripes.length;
    stripes.forEach((c, i) => { s += `<rect x="${f1(t[0])}" y="${f1(t[1] + i * sh)}" width="${fw}" height="${f1(sh)}" fill="${c}" stroke="none"/>`; });
    s += `<rect x="${f1(t[0])}" y="${f1(t[1])}" width="${fw}" height="${fh}" fill="none" stroke-width=".7"/>`;
    this.add(x - 0.05, y - 0.05, x + 0.05, y + 0.05, s);
  }
  /** Pizzeria storefront building. Registers the pin for PLACES[id]. */
  pizza(id: string, x: number, y: number, w: number, d: number, h: number, c: string, o: PizzaOpts = {}) {
    const X = this.X(x), Y = this.Y(y);
    const fronts = o.front || 'L';
    const sf = (F: Face, len: number) => storefront(F, o.u0 ?? 0.12, o.u1 ?? len - 0.12, { wall: c, ...o });
    const s = bld(X, Y, w, d, h, c, {
      g0: 2.75, noWinL: fronts.includes('L') && h < 4, noWinR: fronts.includes('R') && h < 4,
      extraFaces: (FL, FR) => (fronts.includes('L') ? sf(FL, w) : '') + (fronts.includes('R') ? sf(FR, d) : '') + (o.faces ? o.faces(FL, FR) : ''),
      ...o.b,
    });
    this.add(x, y, x + w, y + d, s);
    this.pins[id] = [X + w / 2, Y + d / 2, h + (o.b?.tower ? 1.7 : 0.35)];
  }

  /* movers */
  car(axis: Axis, a: number, b: number, c: number, speed: number, color: string, o: CarOpts = {}) {
    this.movers.push({ kind: 'car', axis, a, b, c, speed, svg: carSVG(axis, color, o), hw: axis === 'x' ? 0.75 : 0.39, hd: axis === 'x' ? 0.39 : 0.75, p: rr(0, Math.abs(b - a)), z: o.z || 0, onTop: o.onTop, x0: 0, y0: 0, x1: 0, y1: 0 });
  }
  walker(axis: Axis, a: number, b: number, c: number, speed: number, o: PersonOpts & { svg?: string } = {}) {
    this.movers.push({ kind: 'walk', axis, a, b, c, speed, svg: o.svg || personSVG(o), hw: 0.14, hd: 0.14, p: rr(0, Math.abs(b - a) * 2), phase: rnd() * 6, x0: 0, y0: 0, x1: 0, y1: 0 });
  }
}
