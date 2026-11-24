/* Building kit for the pixel-diorama world. World units: x = east, z = south, y = up; one storey = 1 unit (~4 m).
   Everything is plain boxes, cylinders and prisms; the look comes from tiny canvas textures (4 px per unit,
   nearest-filtered) and the pixelated render pass in map.ts. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { HoodId } from '../data/places';
import type { Dir } from './compass';

export interface Bounds { x0: number; z0: number; x1: number; z1: number; y1: number }
/** A pizzeria's pin: where it floats, the street side, its building's box and (once realRow has run) its whole row's. */
export interface Pin { pos: THREE.Vector3; facing: Dir; box: Bounds; row?: Bounds }
/** Loops from a to b (or, with `bounce`, goes back and forth between them). */
export interface Mover { obj: THREE.Object3D; axis: 'x' | 'z'; a: number; b: number; speed: number; bounce?: boolean }

/* seeded RNG: every build is identical */
let seed = 1, tseed = 1;
export const reseed = (n = 20260718) => { seed = n; tseed = n ^ 0x5bd1e995; };
export const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
/** Detail RNG (facade texture, roof clutter, queues): its own stream, so adding detail never re-rolls the layout. */
const trnd = () => ((tseed = (tseed * 48271) % 2147483647) - 1) / 2147483646;
/** Read (or, given s, set) the detail RNG's state: the real rows and patches put it back, so the street life after them stays put. */
export const detailState = (s?: number) => (s === undefined ? tseed : (tseed = s));
const tpick = <T,>(a: readonly T[]): T => a[Math.floor(trnd() * a.length)];
export const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
export const rr = (a: number, b: number) => a + rnd() * (b - a);

// nearest when magnified (crisp pixels up close), mipmapped when minified (no shimmer in the overview)
const pixel = <T extends THREE.Texture>(t: T) => { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace; return t; };
/** Place an object at (x, y, z), turned ry about the vertical. */
export const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
const mats = new Map<string, THREE.MeshLambertMaterial>();
/** Shared flat-colour material. */
export const lam = (c: string) => { let m = mats.get(c); if (!m) mats.set(c, (m = new THREE.MeshLambertMaterial({ color: c }))); return m; };
const canvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')!] as const; };

export const BRICK = ['#a9563f', '#9d4b38', '#b4644a', '#8f4635', '#c27a5c', '#9c5643', '#b5654a'];
export const BROWN = ['#8a5a47', '#9b6a52', '#7d4f3e', '#a8765c', '#c9a27e', '#d2b48c'];
export const STONE = ['#d7c19b', '#cdb48c', '#e0cfae', '#cfc6b6', '#c9a98a'];
export const GLASS = ['#a9c3d6', '#9fb4c4', '#b7c9d6', '#8fa8b8'];
const GREENS = ['#8cc66a', '#9fd178', '#7cb85f', '#a8d27e', '#93c96d', '#86bf68'];
const FOREST = ['#6aa34f', '#5e9a48', '#77ad57', '#4f8a42', '#82b85e', '#689e4c', '#8fbf62'];
export const ROOFS = ['#c9c3b8', '#b9b3aa', '#d3cec4', '#a9a49c'];
const AWN: [string, string][] = [['#d9473a', '#fff6e6'], ['#2f6b4f', '#f4efe3'], ['#2f3a48', '#efe1c8'], ['#7a2e2a', '#efe1c8']];

/** Texture px per world unit; one storey is PPU rows. */
const PPU = 8;
export type Style = 'brick' | 'brown' | 'stone' | 'glass';
const shade = (hex: string, f: number) => '#' + new THREE.Color(hex).multiplyScalar(f).getHexString();
const SHOP_BANDS = ['#d9473a', '#2f6b4f', '#2f3a48', '#7a2e2a', '#3f7fbf', '#f2c230', '#5b3d2e', '#e8833a'];
const styleOf = (wall: string, glass?: boolean): Style =>
  glass ? 'glass' : BROWN.includes(wall) ? 'brown' : STONE.includes(wall) || new THREE.Color(wall).getHSL({ h: 0, s: 0, l: 0 }).l > 0.62 ? 'stone' : 'brick';

/** The window draws the old 4-px facades made from the layout RNG: burnt so the approved layout stays as it was. */
function burnLegacyDraws(len: number, floors: number, shop?: boolean, glass?: boolean) {
  const w = Math.max(4, Math.round(len * 4));
  const perFloor = glass ? Math.ceil(w / 2) : Math.max(0, Math.ceil((w - 2) / 3));
  for (let i = 0; i < perFloor * (Math.ceil(floors) - (shop ? 1 : 0)); i++) rnd();
}

/** Facade texture (PPU px per unit): windows with lintels and sills, brick speckle, fire escapes, limestone bands,
    curtain-wall mullions, a shopfront with a coloured sign band; lit windows also go in an emissive mask. */
function facadeTex(len: number, floors: number, wall: string, o: { shop?: boolean; style: Style; escape?: boolean }) {
  const w = Math.max(8, Math.round(len * PPU)), h = Math.max(8, Math.round(floors * PPU));
  const [c, g] = canvas(w, h), [e, ge] = canvas(w, h);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, w, h);
  const px = (x: number, y: number, col: string, ww = 1, hh = 1) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  const lit = (x: number, y: number, ww: number, hh: number) => { ge.fillStyle = '#fff'; ge.fillRect(x, y, ww, hh); };
  const glass = o.style === 'glass';
  // wall with a little material grain
  px(0, 0, wall, w, h);
  if (!glass) { const dk = shade(wall, 0.86), lt = shade(wall, 1.1); for (let i = 0; i < w * h * 0.07; i++) px(Math.floor(trnd() * w), Math.floor(trnd() * h), trnd() < 0.5 ? dk : lt); }
  else { // curtain wall: a sky reflection fading down the tower, one diagonal glint
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, shade(wall, 1.12)); grd.addColorStop(1, shade(wall, 0.8));
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.16)'; const gx = trnd() * w; for (let y = 0; y < h; y++) g.fillRect(Math.floor(gx + y * 0.6) % w, y, 3, 1);
  }
  const trim = o.style === 'brown' ? '#d9ccb4' : o.style === 'stone' ? shade(wall, 1.12) : '#e6dccb', recess = shade(wall, 0.62);
  const n = Math.max(1, Math.floor((w - 2) / 4)), x0 = Math.floor((w - n * 4) / 2) + 1;
  for (let j = 0; j < floors; j++) {
    const y = h - (j + 1) * PPU;
    if (j === 0 && o.shop) {
      const band = tpick(SHOP_BANDS);
      px(0, y, recess, w, 1); px(0, y + 1, band, w, 2);               // sign band
      px(0, y + 3, '#2f3a48', w, 5);                                    // shop frame
      for (let x = 1; x < w - 1; x += 4) { px(x, y + 4, '#9cc3d8', 3, 3); px(x, y + 4, '#cfe3ee', 1, 1); lit(x, y + 4, 3, 3); }
      const door = Math.floor(w * 0.7); px(door, y + 4, '#5b3d2e', 2, 4);
      continue;
    }
    if (glass) {
      for (let x = 0; x < w; x += 3) { px(x, y, shade(wall, 0.7), 1, PPU); if (trnd() < 0.1) { px(x + 1, y + 1, '#f6d77a', 2, 5); lit(x + 1, y + 1, 2, 5); } }
      px(0, y + 7, shade(wall, 0.55), w, 1);                           // spandrel
      continue;
    }
    if (o.style === 'stone') px(0, y + 7, trim, w, 1);                  // limestone string course
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 4, on = trnd() < 0.12, top = o.style === 'brown' ? y + 1 : y + 2, wh = o.style === 'brown' ? 5 : 4;
      px(x, top - 1, o.style === 'brick' ? recess : trim, 2, 1);        // lintel
      px(x, top, on ? '#f6d77a' : '#5d7385', 2, wh);                     // glass
      if (!on) px(x, top, '#8fb2c8', 1, 1);                              // a glint
      px(x, top + wh, trim, 2, 1);                                       // sill
      if (on) lit(x, top, 2, wh);
    }
  }
  // fire escapes on brick walk-ups: landings, railings and the zig-zag ladders between them
  if (o.escape && w >= 16) {
    const ex0 = Math.floor(w / 2) - 5, ew = 10, iron = '#2b2724';
    for (let j = 1; j < floors; j++) {
      const y = h - (j + 1) * PPU;
      px(ex0, y + 7, iron, ew, 1); for (let x = ex0; x < ex0 + ew; x += 2) px(x, y + 5, iron); px(ex0, y + 5, iron, ew, 1);
      if (j > 1) for (let k = 0; k < 7; k++) px(j % 2 ? ex0 + 1 + k : ex0 + ew - 2 - k, y + 8 + k, iron);
    }
  }
  return [c, e] as const;
}

/** A facade as it stands, read off street photos (src/data/rows.ts). */
export interface Look {
  /** brick: lintels and sills; brown: pale trims; stone: string courses; glass: curtain wall */
  style?: Style;
  /** windows across each upper storey */
  bays?: number;
  /** storeys of windows, when they're taller than a unit each (lofts, cast-iron palazzi); default one per unit */
  rows?: number;
  /** lintels, sills and string courses */
  trim?: string;
  /** shopfront sign band(s), one per shop across the ground floor */
  band?: string | string[];
  /** shopfront frame */
  frame?: string;
  /** fire escape, in its iron's colour */
  escape?: string;
  /** a little awning over each upper window */
  winAwn?: string;
}
/** Facade texture for a Look (PPU px per unit): `bays` windows on each storey, its own trims, shops and fire escape;
    `blank` draws a windowless party wall. Detail RNG only (lit windows, grain). */
function lookTex(len: number, floors: number, wall: string, lk: Look, shop: boolean, blank: boolean) {
  const w = Math.max(8, Math.round(len * PPU)), h = Math.max(8, Math.round(floors * PPU));
  const [c, g] = canvas(w, h), [e, ge] = canvas(w, h);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, w, h);
  const px = (x: number, y: number, col: string, ww = 1, hh = 1) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  const lit = (x: number, y: number, ww: number, hh: number) => { ge.fillStyle = '#fff'; ge.fillRect(x, y, ww, hh); };
  const style = lk.style ?? 'brick', glass = style === 'glass';
  px(0, 0, wall, w, h);
  if (!glass) { const dk = shade(wall, 0.86), lt = shade(wall, 1.1); for (let i = 0; i < w * h * 0.07; i++) px(Math.floor(trnd() * w), Math.floor(trnd() * h), trnd() < 0.5 ? dk : lt); }
  else { const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, shade(wall, 1.12)); grd.addColorStop(1, shade(wall, 0.8)); g.fillStyle = grd; g.fillRect(0, 0, w, h); }
  if (blank) return [c, e] as const;
  const rows = Math.max(1, lk.rows ?? Math.round(floors)), fh = h / rows;
  const trim = lk.trim ?? (style === 'brown' ? '#d9ccb4' : style === 'stone' ? shade(wall, 1.12) : '#e6dccb'), recess = shade(wall, 0.62);
  const n = Math.max(1, lk.bays ?? Math.floor((w - 2) / 4)), pitch = w / n, ww = pitch >= 7 ? 3 : 2;
  for (let j = 0; j < rows; j++) {
    const y = Math.round(h - (j + 1) * fh), fy = Math.round(h - j * fh) - y; // this storey's top row and height in px
    if (j === 0 && shop) {
      const bands = [lk.band ?? '#2f3a48'].flat(), u = w / bands.length;
      bands.forEach((band, k) => {
        const x0 = Math.round(k * u), x1 = Math.round((k + 1) * u), bh = Math.max(2, Math.round(fy * 0.25));
        px(x0, y, recess, x1 - x0, 1); px(x0, y + 1, band, x1 - x0, bh);                       // sign band
        px(x0, y + 1 + bh, lk.frame ?? '#2f3a48', x1 - x0, fy - 1 - bh);                         // shop frame
        for (let x = x0 + 1; x < x1 - 1; x += 4) { const gh = Math.max(2, fy - 3 - bh); px(x, y + 2 + bh, '#9cc3d8', 3, gh); px(x, y + 2 + bh, '#cfe3ee', 1, 1); lit(x, y + 2 + bh, 3, gh); }
        px(x0 + Math.floor((x1 - x0) * 0.7), y + 2 + bh, '#5b3d2e', 2, fy - 2 - bh);           // door
      });
      continue;
    }
    if (glass) {
      for (let x = 0; x < w; x += 3) { px(x, y, lk.trim ?? shade(wall, 0.7), 1, fy); if (trnd() < 0.1) { px(x + 1, y + 1, '#f6d77a', 2, fy - 3); lit(x + 1, y + 1, 2, fy - 3); } }
      px(0, y + fy - 1, shade(wall, 0.55), w, 1);                                                 // spandrel
      continue;
    }
    if (style === 'stone') px(0, y + fy - 1, trim, w, 1);                                         // string course
    const top = y + Math.max(1, Math.round(fy * (style === 'brown' ? 0.15 : 0.25))), wh = Math.max(2, Math.round(fy * (style === 'brown' ? 0.6 : 0.5)));
    for (let i = 0; i < n; i++) {
      const x = Math.round(pitch * (i + 0.5) - ww / 2), on = trnd() < 0.12;
      if (lk.winAwn) px(x - 1, top - 1, lk.winAwn, ww + 2, 2); else px(x, top - 1, style === 'brick' ? recess : trim, ww, 1); // awning or lintel
      px(x, top, on ? '#f6d77a' : '#5d7385', ww, wh);                                             // glass
      if (!on) px(x, top, '#8fb2c8', 1, 1);                                                       // a glint
      px(x, top + wh, trim, ww, 1);                                                               // sill
      if (on) lit(x, top, ww, wh);
    }
  }
  if (lk.escape && w >= 12) { // landings, railings and the zig-zag ladders between them, centred
    const ex0 = Math.floor(w / 2) - 5, ew = Math.min(10, w - 2), iron = lk.escape;
    for (let j = 1; j < rows; j++) {
      const y = Math.round(h - (j + 1) * fh), fy = Math.round(h - j * fh) - y;
      px(ex0, y + fy - 1, iron, ew, 1); for (let x = ex0; x < ex0 + ew; x += 2) px(x, y + fy - 3, iron); px(ex0, y + fy - 3, iron, ew, 1);
      if (j > 1) for (let k = 0; k < fy - 1; k++) px(j % 2 ? ex0 + 1 + Math.round((k * (ew - 3)) / fy) : ex0 + ew - 2 - Math.round((k * (ew - 3)) / fy), y + fy + k, iron);
    }
  }
  return [c, e] as const;
}

/** Roof surface: gravel speckle and a few tar seams, one shared texture per roof colour. */
const roofCanvases = new Map<string, HTMLCanvasElement>();
function roofCanvas(col: string) {
  let r = roofCanvases.get(col); if (r) return r;
  const [c, g] = canvas(32, 32); g.fillStyle = col; g.fillRect(0, 0, 32, 32);
  const dk = shade(col, 0.88), lt = shade(col, 1.08);
  for (let i = 0; i < 180; i++) { g.fillStyle = trnd() < 0.5 ? dk : lt; g.fillRect(Math.floor(trnd() * 32), Math.floor(trnd() * 32), 1, 1); }
  g.fillStyle = shade(col, 0.78); g.fillRect(0, 11, 32, 1); g.fillRect(0, 23, 32, 1); g.fillRect(20, 0, 1, 11);
  roofCanvases.set(col, c); return c;
}

/** One place in src/data/real.json (metres east/north of the pizzeria; `front` points at its street; `side` marks the
    buildings either side of it, L and R as seen from the street). */
export interface RealPlace { front: number[]; half: number; buildings: { p: number[][]; h: number; y: number; roof?: string; self?: boolean; side?: 'L' | 'R' }[] }
/** One building of a real row (src/data/rows.ts): frontage and depth in metres, storeys, wall colour, and its Look. */
export interface Piece {
  addr: string; w: number; d: number; storeys: number; wall: string; look?: Look;
  /** height in units, when its storeys are taller than usual (cast iron, lofts); else from `storeys` */
  h?: number;
  cornice?: string | null; roof?: string; tank?: boolean; hip?: string;
  /** awning stripes over its shopfronts (none if absent) */
  awn?: [string, string] | null;
  /** ground-floor shops (default: when its look has a sign band) */
  shop?: boolean;
}
/** A pizzeria and the buildings either side of it, as seen from the street (nearest first on each side). */
export interface Row {
  left: Piece[];
  self: Piece & { sign: string; awn: [string, string] | null; signBg?: string; signFg?: string; /** the pizzeria's own shopfront, metres from the building's left end */ shopAt?: [number, number] };
  right: Piece[];
  /** a cross street directly beyond the row on that side: the row is pushed against the block's end there */
  corner?: 'left' | 'right';
  /** deepest the buildings may go, in units, where no road behind them limits it */
  maxD?: number;
}
/** Map height of a real building: a unit a storey, towers compressed like the rest of the skyline (the Hearst Tower is 18). */
const unitsOf = (storeys: number) => (storeys <= 12 ? storeys : 12 + (storeys - 12) * 0.2);
const DIRS: Record<Dir, [number, number]> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
const dirOf = (x: number, z: number): Dir => (Math.abs(x) > Math.abs(z) ? (x > 0 ? 'E' : 'W') : z > 0 ? 'S' : 'N');
/** Wall colour for a real building from its age and height: brownstone and brick walk-ups, prewar limestone, modern glass. */
function realWall(year: number, h: number) {
  if (h > 45 && (year > 1960 || !year)) return tpick(GLASS);
  if (year && year < 1900) return tpick([...BRICK, ...BROWN]);
  if (h > 25) return tpick(STONE);
  return tpick([...BRICK, ...BRICK, ...STONE]);
}
/** Repeating window tile for real-data walls: one bay per unit, one storey per tile; vertex colours tint it. */
let realMat: THREE.MeshLambertMaterial | null = null;
function realWallMat() {
  if (realMat) return realMat;
  const [c, g] = canvas(8, 8); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 8, 8);
  g.fillStyle = '#c9c4bc'; g.fillRect(3, 1, 2, 1); g.fillStyle = '#4b5a68'; g.fillRect(3, 2, 2, 4); g.fillStyle = '#e8e4dc'; g.fillRect(3, 6, 2, 1);
  const t = pixel(new THREE.CanvasTexture(c)); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (realMat = new THREE.MeshLambertMaterial({ map: t, vertexColors: true }));
}
/** One material for merged flat-colour pieces: each vertex carries its piece's colour. */
const flatMat = new THREE.MeshLambertMaterial({ vertexColors: true });
/** Merge flat-colour meshes (shared `lam` materials) into one vertex-coloured mesh; `space` gives each piece's matrix. */
function mergeFlat(list: THREE.Mesh[], space: (m: THREE.Mesh) => THREE.Matrix4) {
  const geo = mergeGeometries(list.map(m => {
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(space(m)); g.deleteAttribute('uv');
    const c = (m.material as THREE.MeshLambertMaterial).color, n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
  }));
  list.forEach(m => m.geometry.dispose());
  return new THREE.Mesh(geo, flatMat);
}
const isFlat = (o: THREE.Object3D) => { const m = o as THREE.Mesh; return !!m.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh && !m.children.length && !Array.isArray(m.material) && [...mats.values()].includes(m.material as THREE.MeshLambertMaterial); };

type Rect = [number, number, number, number];
/** Point a BoxGeometry's six faces (E, W, top, bottom, S, N) at rectangles of one atlas canvas (aw × ah px). */
function mapBoxFaces(g: THREE.BufferGeometry, rects: Rect[], aw: number, ah: number) {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  rects.forEach(([rx, ry, rw, rh], k) => { for (let v = 4 * k; v < 4 * k + 4; v++) uv.setXY(v, (rx + uv.getX(v) * rw) / aw, 1 - (ry + (1 - uv.getY(v)) * rh) / ah); });
  return g;
}

const FACES: Dir[] = ['E', 'W', 'S', 'N'];
/** Face centre, outward rotation (local +z points out) and length, for a box [x0,x0+w]×[z0,z0+d]. */
function faceFrame(x0: number, z0: number, w: number, d: number, f: Dir) {
  switch (f) {
    case 'S': return { x: x0 + w / 2, z: z0 + d, ry: 0, L: w };
    case 'N': return { x: x0 + w / 2, z: z0, ry: Math.PI, L: w };
    case 'E': return { x: x0 + w, z: z0 + d / 2, ry: Math.PI / 2, L: d };
    default: return { x: x0, z: z0 + d / 2, ry: -Math.PI / 2, L: d };
  }
}

/** `look` builds the facade as it stands (no random step-backs, gardens or fire escapes), with windowless party
    walls on the `blank` sides and a `hip` roof of that colour (a copper or slate pyramid) if given. */
export interface BldOpts { fronts?: Dir[]; shop?: boolean; glass?: boolean; tank?: boolean; roof?: string; cornice?: string | null; y0?: number; look?: Look; blank?: Dir[]; hip?: string }

export class World {
  root = new THREE.Group();
  /** window materials: emissive switched on at dusk / night */
  windows: THREE.MeshLambertMaterial[] = [];
  /** always-glowing things (billboards, torch, lamps) */
  glow: THREE.MeshLambertMaterial[] = [];
  pins: Record<string, Pin> = {};
  hoods: Partial<Record<HoodId, Bounds>> = {};
  movers: Mover[] = [];
  /** shown only in the Sketch style (real-data buildings) / only in Pixel (the hand-placed buildings they replace) */
  sketchOnly: THREE.Object3D[] = [];
  pixelOnly: THREE.Object3D[] = [];
  private crowns: [number, number, number, number, THREE.Color, boolean][] = []; // ..., low detail (forests)
  private trunks: [number, number, number, number][] = [];
  private people: [number, number, THREE.Color, THREE.Color, string?][] = []; // ..., the pizzeria whose queue it is
  private roads: [number, number, number, number][] = [];

  add<T extends THREE.Object3D>(o: T, shadow = true): T {
    o.traverse(m => { if ((m as THREE.Mesh).isMesh) { m.castShadow = shadow; m.receiveShadow = true; } });
    this.root.add(o); return o;
  }
  /** Box with its min corner at (x0, y0, z0). `m` may be a material array in BoxGeometry order (E, W, top, bottom, S, N). */
  box(x0: number, y0: number, z0: number, w: number, h: number, d: number, m: THREE.Material | THREE.Material[] | string, shadow = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? lam(m) : m);
    mesh.position.set(x0 + w / 2, y0 + h / 2, z0 + d / 2);
    return this.add(mesh, shadow);
  }
  cyl(x: number, y0: number, z: number, r0: number, r1: number, h: number, c: string, seg = 10) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, seg), lam(c)); m.position.set(x, y0 + h / 2, z); return this.add(m);
  }
  /** Triangular prism (gable roof): base [x0,x0+w]×[z0,z0+d] at y0, ridge along `along`. */
  prism(x0: number, y0: number, z0: number, w: number, d: number, rise: number, along: 'x' | 'z', c: string) {
    const span = along === 'x' ? d : w, len = along === 'x' ? w : d;
    const sh = new THREE.Shape([new THREE.Vector2(-span / 2, 0), new THREE.Vector2(span / 2, 0), new THREE.Vector2(0, rise)]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false });
    const m = new THREE.Mesh(g, lam(c));
    if (along === 'x') { m.rotation.y = Math.PI / 2; m.position.set(x0, y0, z0 + d / 2); }
    else m.position.set(x0 + w / 2, y0, z0);
    return this.add(m);
  }

  /* ---------- ground ---------- */
  land(x0: number, z0: number, w: number, d: number) {
    return this.box(x0, -5, z0, w, 5, d, [lam('#b98f5f'), lam('#b98f5f'), lam('#a3cf78'), lam('#8a6a45'), lam('#c9a272'), lam('#c9a272')], false);
  }
  slab(x0: number, z0: number, w: number, d: number, c: string, top = 0.06) { return this.box(x0, 0, z0, w, top, d, c, false); }
  pave(x0: number, z0: number, w: number, d: number) { return this.slab(x0, z0, w, d, '#e3dccf', 0.05); }
  park(x0: number, z0: number, w: number, d: number) { return this.slab(x0, z0, w, d, '#93c66c', 0.08); }
  /** Roadway with a dashed centre line when it's wide enough. */
  road(x0: number, z0: number, w: number, d: number) {
    this.slab(x0, z0, w, d, '#5b6068', 0.1); this.roads.push([x0, z0, w, d]);
    const along = w > d ? 'x' : 'z', L = Math.max(w, d), W = Math.min(w, d);
    if (W >= 2.6) for (let t = 0.6; t < L - 0.6; t += 2) along === 'x' ? this.box(x0 + t, 0.1, z0 + d / 2 - 0.06, 0.9, 0.02, 0.12, '#e8bb4f', false) : this.box(x0 + w / 2 - 0.06, 0.1, z0 + t, 0.12, 0.02, 0.9, '#e8bb4f', false);
  }

  /* ---------- buildings ---------- */
  building(x0: number, z0: number, w: number, d: number, floors: number, wall: string, o: BldOpts = {}): number {
    // tall masonry buildings often step back near the top
    if (!o.look && !o.glass && floors >= 10 && o.y0 === undefined && w > 2.4 && d > 2.4 && rnd() < 0.6) {
      const cf = floors >= 14 ? 3 : 2, inset = Math.min(w, d) * 0.18;
      const t1 = this.building(x0, z0, w, d, floors - cf, wall, { ...o, tank: false, y0: 0 });
      return this.building(x0 + inset, z0 + inset, w - 2 * inset, d - 2 * inset, cf, wall, { ...o, fronts: [], shop: false, y0: t1 });
    }
    const y0 = o.y0 ?? 0, fr = o.fronts ?? [], style = o.look?.style ?? styleOf(wall, o.glass);
    const escape = !o.look && style === 'brick' && floors >= 4 && floors <= 9 && o.y0 === undefined && trnd() < 0.55;
    const roofC = roofCanvas(o.roof ?? (o.glass ? '#dfe8ee' : pick(ROOFS)));
    const sides = FACES.map(f => {
      const len = f === 'E' || f === 'W' ? d : w, shop = o.shop && fr.includes(f);
      if (o.look) return lookTex(len, floors, wall, o.look, !!shop, !!o.blank?.includes(f));
      burnLegacyDraws(len, floors, shop, o.glass);
      return facadeTex(len, floors, wall, { shop, style, escape: escape && fr.includes(f) && !shop });
    });
    // one atlas per building (facades, roof, cornice colour) so the whole building is one draw call
    const corn = o.cornice !== null && !o.glass ? o.cornice ?? '#5b4f45' : null;
    const AW = sides.reduce((a, [c]) => a + c.width, 0) + 34, AH = Math.max(sides[0][0].height, 32);
    const [a, ga] = canvas(AW, AH), [ae, gae] = canvas(AW, AH); gae.fillStyle = '#000'; gae.fillRect(0, 0, AW, AH);
    const r: Rect[] = []; let ax = 0;
    for (const [c, e] of sides) { ga.drawImage(c, ax, 0); gae.drawImage(e, ax, 0); r.push([ax, 0, c.width, c.height]); ax += c.width; }
    const roofR: Rect = [ax + 0.5, 0.5, 31, 31], cornR: Rect = [ax + 32.5, 0.5, 1, 1];
    ga.drawImage(roofC, ax, 0); if (corn) { ga.fillStyle = corn; ga.fillRect(ax + 32, 0, 2, 2); }
    const [E, W, S, N] = r;
    const parts = [mapBoxFaces(new THREE.BoxGeometry(w, floors, d), [E, W, roofR, roofR, S, N], AW, AH)];
    let top = y0 + floors;
    if (corn) { parts.push(mapBoxFaces(new THREE.BoxGeometry(w + 0.3, 0.3, d + 0.3), [cornR, cornR, roofR, cornR, cornR, cornR], AW, AH).translate(0, floors / 2 + 0.15, 0)); top += 0.3; }
    const geo = parts.length > 1 ? mergeGeometries(parts) : parts[0]; geo.clearGroups();
    const mat = new THREE.MeshLambertMaterial({ map: pixel(new THREE.CanvasTexture(a)), emissiveMap: pixel(new THREE.CanvasTexture(ae)), emissive: '#ffcf6a', emissiveIntensity: 0 });
    this.windows.push(mat);
    const body = this.add(at(new THREE.Mesh(geo, mat), x0 + w / 2, y0 + floors / 2, z0 + d / 2));
    const n0 = this.root.children.length;
    if (o.hip) { // a four-sided cone turned square to the walls, then stretched to the roof
      const rh = Math.min(w, d) * 0.35, p = at(new THREE.Mesh(new THREE.ConeGeometry(1, rh, 4).rotateY(Math.PI / 4), lam(o.hip)), x0 + w / 2, top + rh / 2, z0 + d / 2);
      p.scale.set(w / 2 / Math.SQRT1_2, 1, d / 2 / Math.SQRT1_2); this.add(p);
    }
    if (o.tank && w > 2 && d > 2) {
      const tx = x0 + w * 0.7, tz = z0 + d * 0.3;
      for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) this.box(tx + dx - 0.05, top, tz + dz - 0.05, 0.1, 0.6, 0.1, '#4a4542');
      this.cyl(tx, top + 0.6, tz, 0.7, 0.7, 1.3, '#a8743f', 8); this.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.6, 8), lam('#7d5432')), tx, top + 2.2, tz));
    } else if (!o.look && !o.glass && o.cornice !== null && floors >= 4 && floors <= 9 && w > 2.6 && d > 2.6 && rnd() < 0.18) {
      // a roof garden: planted deck and a couple of small trees
      this.box(x0 + 0.35, top, z0 + 0.35, w - 0.7, 0.12, d - 0.7, '#9fcf74', false);
      this.tree(x0 + w * 0.32, z0 + d * 0.35, 0.45, top + 0.12); if (rnd() < 0.6) this.tree(x0 + w * 0.68, z0 + d * 0.62, 0.38, top + 0.12);
    } else if (!o.hip && !o.glass && o.cornice !== null && w > 2 && d > 2 && rnd() < 0.45) {
      this.box(x0 + w * 0.15, top, z0 + d * 0.5, Math.min(1, w * 0.3), 0.75, Math.min(0.9, d * 0.3), '#c4bdb2'); // stair bulkhead / plant room
    }
    if (!o.hip) this.roofClutter(x0, z0, w, d, top, !!o.glass, floors);
    // rooftop things belong to the building: the cutaway hides them with it
    const kids = this.root.children.slice(n0);
    for (const c of kids) body.attach(c);
    // and they draw in one go
    const flat = kids.filter(isFlat) as THREE.Mesh[];
    if (flat.length > 1) { for (const m of flat) { m.updateMatrix(); body.remove(m); } const mm = mergeFlat(flat, m => m.matrix); mm.castShadow = mm.receiveShadow = true; body.add(mm); }
    return top;
  }
  /** Rooftop kit from the detail RNG: AC units and a skylight on walk-ups, a mechanical penthouse on tall glass. */
  private roofClutter(x0: number, z0: number, w: number, d: number, top: number, glass: boolean, floors: number) {
    if (w < 2.2 || d < 2.2) return;
    if (glass) { if (floors >= 12) this.box(x0 + w * 0.25, top, z0 + d * 0.25, w * 0.5, 0.9, d * 0.5, '#7d8a94'); return; }
    for (let i = 0, k = trnd() < 0.6 ? 1 + Math.floor(trnd() * 2) : 0; i < k; i++)
      this.box(x0 + 0.3 + trnd() * (w - 1.1), top, z0 + 0.3 + trnd() * (d - 0.9), 0.5, 0.32, 0.45, '#d9d6cf');
    if (trnd() < 0.3) this.box(x0 + w * 0.55, top, z0 + 0.4, Math.min(0.9, w * 0.3), 0.14, 0.6, '#9fc0d4', false);
  }

  /** Gabled frame house (Midwood). */
  house(x0: number, z0: number, w: number, d: number, wall: string, roofC: string, front: Dir) {
    const n0 = this.root.children.length;
    const top = this.building(x0, z0, w, d, 2, wall, { cornice: null, roof: roofC });
    this.prism(x0 - 0.1, top, z0 - 0.1, w + 0.2, d + 0.2, 1.2, front === 'N' || front === 'S' ? 'z' : 'x', roofC);
    const f = faceFrame(x0, z0, w, d, front);
    const porch = new THREE.Group(); porch.position.set(f.x, 0, f.z); porch.rotation.y = f.ry;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(f.L - 0.4, 0.2, 0.8), lam('#d8cbb3')); deck.position.set(0, 0.1, 0.4);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(f.L - 0.3, 0.12, 0.9), lam(roofC)); lid.position.set(0, 1.1, 0.45);
    porch.add(deck, lid); this.add(porch);
    const body = this.root.children[n0]; for (const c of this.root.children.slice(n0 + 1)) body.attach(c); // the cutaway hides them together
  }

  /** Awning (striped; none when `awn` is null) and a name sign on one facade. */
  storefront(x0: number, z0: number, w: number, d: number, front: Dir, awn: [string, string] | null, sign?: string, signBg = '#fff6e6', signFg = '#2e2b29') {
    const f = faceFrame(x0, z0, w, d, front), g = new THREE.Group();
    g.position.set(f.x, 0, f.z); g.rotation.y = f.ry;
    if (awn) {
      const n = Math.max(4, Math.round((f.L - 0.3) * 3));
      const [c, cx] = canvas(n, 1); for (let i = 0; i < n; i++) { cx.fillStyle = awn[i % 2]; cx.fillRect(i, 0, 1, 1); }
      const a = new THREE.Mesh(new THREE.BoxGeometry(f.L - 0.3, 0.1, 1), new THREE.MeshLambertMaterial({ map: pixel(new THREE.CanvasTexture(c)) }));
      a.position.set(0, 1.05, 0.45); a.rotation.x = 0.35; g.add(a);
    }
    if (sign) {
      const W = Math.round((f.L - 0.3) * 20), [s, sx] = canvas(W, 12);
      sx.fillStyle = signBg; sx.fillRect(0, 0, W, 12); sx.fillStyle = signFg; sx.font = 'bold 9px sans-serif'; sx.textAlign = 'center'; sx.textBaseline = 'middle'; sx.fillText(sign, W / 2, 6.5, W - 2);
      const tex = pixel(new THREE.CanvasTexture(s)); // glows with its own image at night, so the lettering stays readable
      const m = new THREE.MeshLambertMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0 });
      this.windows.push(m);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(f.L - 0.3, 0.6), m); p.position.set(0, 1.75, 0.03); g.add(p);
    }
    this.add(g);
  }
  /** A pizzeria: building + storefront + pin. Registers the pin under `id`. */
  pizza(id: string, x0: number, z0: number, w: number, d: number, floors: number, wall: string, front: Dir, o: { sign?: string; awn?: [string, string]; glass?: boolean; tank?: boolean } = {}) {
    const n0 = this.root.children.length;
    const top = this.building(x0, z0, w, d, floors, wall, { fronts: [front], shop: true, glass: o.glass, tank: o.tank });
    this.storefront(x0, z0, w, d, front, o.awn ?? pick(AWN), o.sign);
    // tag the building so a click on it (not just the pin) opens the review
    this.heroSign(x0, z0, w, d, front, top, o.sign);
    for (const c of this.root.children.slice(n0)) c.traverse(m => (m.userData.place = id));
    this.queue(id, x0, z0, w, d, front);
    this.pins[id] = { pos: new THREE.Vector3(x0 + w / 2, top + 0.6, z0 + d / 2), facing: front, box: { x0, z0, x1: x0 + w, z1: z0 + d, y1: top } };
  }
  /** A short queue out front of a storefront (detail RNG), marked as the pizzeria's so a real row can move it. */
  private queue(id: string, x0: number, z0: number, w: number, d: number, front: Dir) {
    const f = faceFrame(x0, z0, w, d, front), cs = Math.cos(f.ry), sn = Math.sin(f.ry), q = 2 + Math.floor(trnd() * 3);
    for (let i = 0; i < q; i++) { const lx = f.L * 0.38 - i * 0.42, lz = 1.25 + (trnd() - 0.5) * 0.15; this.person(f.x + lx * cs + lz * sn, f.z - lx * sn + lz * cs, true); this.people[this.people.length - 1][4] = id; }
  }

  /** A pizzeria's rooftop sign: a glowing, double-faced panel on two posts, slice icon and name, facing the street. */
  private heroSign(x0: number, z0: number, w: number, d: number, front: Dir, top: number, sign?: string, width?: number) {
    const f = faceFrame(x0, z0, w, d, front), L = width ?? Math.min(f.L - 0.2, 3.4), H = 0.95;
    const W = Math.round(L * 24), Hp = Math.round(H * 24), [c, g] = canvas(W, Hp);
    g.fillStyle = '#d9473a'; g.fillRect(0, 0, W, Hp); g.fillStyle = '#fff6e6'; g.fillRect(1, 1, W - 2, 1); g.fillRect(1, Hp - 2, W - 2, 1);
    // pixel slice: crust, cheese, two pepperoni
    const s0 = 3, sh = Hp - 8;
    for (let r = 0; r < sh; r++) { const half = Math.round((sh - r) * 0.42); g.fillStyle = r < 2 ? '#c9813c' : '#f6c453'; g.fillRect(s0 + 6 - half, 4 + r, half * 2 + 1, 1); }
    g.fillStyle = '#b8321f'; g.fillRect(s0 + 4, 8, 2, 2); g.fillRect(s0 + 7, 11, 2, 2);
    g.fillStyle = '#fff6e6'; g.font = `bold ${Math.round(Hp * 0.55)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(sign ?? 'PIZZA', (s0 + 14 + W) / 2, Hp / 2 + 1, W - s0 - 16);
    const tex = pixel(new THREE.CanvasTexture(c));
    const face = new THREE.MeshLambertMaterial({ map: tex, emissive: '#8c8c8c', emissiveMap: tex, emissiveIntensity: 0 }); // half-strength glow keeps the red red at night
    this.glow.push(face);
    const edge = lam('#2e2b29'), grp = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(L, H, 0.12), [edge, edge, edge, edge, face, face]); panel.position.set(0, top + 0.55 + H / 2, -0.5);
    grp.add(panel);
    for (const sx of [-L * 0.32, L * 0.32]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), edge); post.position.set(sx, top + 0.3, -0.5); grp.add(post); }
    grp.position.set(f.x, 0, f.z); grp.rotation.y = f.ry; this.add(grp);
  }

  /** The pizzeria `id` and the buildings either side of it as they stand (src/data/rows.ts): true widths, storeys and
      facades, built in place of the hand-made pizzeria, whose pin gives the street and the facing. Hand-placed buildings,
      trees and people in their way go. Run after the layout: it draws from the layout RNG freely. */
  realRow(id: string, row: Row) {
    const pin = this.pins[id], b = pin.box, M = 4, f = pin.facing, m = DIRS[f], R = [m[1], -m[0]]; // out of the facade; the viewer's right
    const F = (x: number, z: number) => x * m[0] + z * m[1], U = (x: number, z: number) => x * R[0] + z * R[1];
    const span = (rc: number[][], k: typeof F) => [Math.min(...rc.map(([x, z]) => k(x, z))), Math.max(...rc.map(([x, z]) => k(x, z)))];
    const corners = (x0: number, z0: number, x1: number, z1: number) => [[x0, z0], [x1, z0], [x0, z1], [x1, z1]];
    const [, ff] = span(corners(b.x0, b.z0, b.x1, b.z1), F), [bu0, bu1] = span(corners(b.x0, b.z0, b.x1, b.z1), U), uc = (bu0 + bu1) / 2;
    // the block: cross streets end it either side (0.8 of pavement short of their kerbs); the next road behind backs it
    let lo = uc - 14, hi = uc + 14, back = ff - (row.maxD ?? 9);
    for (const [x0, z0, w, d] of this.roads) {
      const rc = corners(x0, z0, x0 + w, z0 + d), [f0, f1] = span(rc, F), [u0, u1] = span(rc, U);
      if (f1 > ff - 1 && f0 < ff - 0.5) { if (u1 <= uc) lo = Math.max(lo, u1 + 0.8); else if (u0 >= uc) hi = Math.min(hi, u0 - 0.8); }
      else if (f1 <= ff - 0.5 && u1 > uc - 3 && u0 < uc + 3) back = Math.max(back, f1 + 0.8);
    }
    // no deeper than the map's own buildings (blocks are shorter than real ones), nor than half a block with buildings on both its streets
    const avail = ff - back, dmax = Math.min(row.maxD ?? 4.2, avail > 6.5 ? avail / 2 - 0.3 : avail);
    // left to right along the street at true widths, the pizzeria's shopfront where the hand-made one was
    const self = row.self, S = self.w / M, [s0, s1] = (self.shopAt ?? [0, self.w]).map(v => v / M);
    const total = [...row.left, self, ...row.right].reduce((t, p) => t + p.w / M, 0), lw = row.left.reduce((t, p) => t + p.w / M, 0);
    // a neighbour keeps at least this much of itself when the row is longer than the block (the pizzeria at least 2 units)
    let keepL = row.left.length ? Math.min(row.left[0].w / M, 1.2) : 0, keepR = row.right.length ? Math.min(row.right[0].w / M, 1.2) : 0;
    const room = Math.max(0, hi - lo - Math.min(S, 2)), squeeze = Math.min(1, room / (keepL + keepR || 1)); keepL *= squeeze; keepR *= squeeze;
    let u = uc - (s0 + s1) / 2; // the pizzeria building's left end
    if (total <= hi - lo) { // it all fits: slide it inside the block, or against the cross street at a corner
      u = Math.min(Math.max(u, lo + lw), hi - total + lw);
      if (row.corner === 'left') u = lo + lw; else if (row.corner === 'right') u = hi - total + lw;
    } else { // the map's blocks are shorter than real ones: keep the pizzeria whole and a slice of each neighbour, cropping their far ends
      if (row.corner === 'left' && !row.left.length) u = lo; else if (row.corner === 'right' && !row.right.length) u = hi - S;
      if (lo + keepL <= hi - keepR - S) u = Math.max(lo + keepL, Math.min(u, hi - keepR - S)); // whole, beside a slice of each neighbour
      else u = Math.max(lo + keepL - s0, Math.min(u, hi - keepR - s1)); // too wide for that: its far side runs past the block's end
      u = Math.max(lo - s0, Math.min(u, hi - s1)); // and the shopfront inside the block, whatever else gives
    }
    const sh0 = u + s0, sh1 = u + s1;
    // where even that won't fit, the pizzeria's building gives way too (never its shopfront), so each neighbour shows a slice
    const e0 = Math.min(Math.max(u, lo + keepL), sh0), e1 = Math.max(Math.min(u + S, hi - keepR), sh1);
    type P = { p: Piece; u0: number; u1: number; me?: boolean };
    const ps: P[] = [{ p: self, u0: e0, u1: e1, me: true }];
    for (const p of row.left) ps.unshift({ p, u0: ps[0].u0 - p.w / M, u1: ps[0].u0 });
    for (const p of row.right) ps.push({ p, u0: ps[ps.length - 1].u1, u1: ps[ps.length - 1].u1 + p.w / M });
    for (const q of ps) { q.u0 = Math.max(q.u0, lo); q.u1 = Math.min(q.u1, hi); }
    const live = ps.filter(q => q.u1 - q.u0 > 0.3);
    // (u, f) -> x/z box
    const box = (u0: number, u1: number, f0: number, f1: number) => {
      const pts = [[u0, f0], [u1, f0], [u0, f1], [u1, f1]].map(([u, g]) => [u * R[0] + g * m[0], u * R[1] + g * m[1]]);
      const x0 = Math.min(...pts.map(p => p[0])), z0 = Math.min(...pts.map(p => p[1]));
      return { x0, z0, w: Math.max(...pts.map(p => p[0])) - x0, d: Math.max(...pts.map(p => p[1])) - z0 };
    };
    const rects = live.map(q => ({ q, ...box(q.u0, q.u1, ff - Math.min(q.p.d / M, dmax), ff) }));
    // clear the ground: the hand-made pizzeria and its queue, and whatever hand-placed building, tree or person stands there
    const hit = (x0: number, z0: number, x1: number, z1: number) => rects.reduce((s, r) =>
      s + Math.max(0, Math.min(x1, r.x0 + r.w) - Math.max(x0, r.x0)) * Math.max(0, Math.min(z1, r.z0 + r.d) - Math.max(z0, r.z0)), 0);
    this.people = this.people.filter(([x, z, , , who]) => who !== id && !hit(x - 0.01, z - 0.01, x + 0.01, z + 0.01));
    const keep = this.trunks.map(([x, z]) => !hit(x - 0.3, z - 0.3, x + 0.3, z + 0.3)); // a tree is a trunk and its four crowns
    this.trunks = this.trunks.filter((_, i) => keep[i]); this.crowns = this.crowns.filter((_, i) => keep[i >> 2]);
    for (const o of [...this.root.children]) {
      if (o.userData.place === id) { this.drop(o); continue; }
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.castShadow || o.userData.place || (o as THREE.InstancedMesh).isInstancedMesh) continue;
      const bb = new THREE.Box3().setFromObject(o); if (bb.max.y < 1.2) continue;
      const own = (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z);
      if (hit(bb.min.x, bb.min.z, bb.max.x, bb.max.z) > Math.min(0.5, own * 0.15)) this.drop(o);
    }
    // build them: party walls blank, except where the row meets a cross street (that side gets the shopfront too)
    const lf = dirOf(-R[0], -R[1]), rf = dirOf(R[0], R[1]), all = { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity, y1: 0 };
    rects.forEach((r, i) => {
      const p = r.q.p, n0 = this.root.children.length, open: Dir[] = [];
      if (i === 0 && row.corner === 'left') open.push(lf); if (i === rects.length - 1 && row.corner === 'right') open.push(rf);
      const shop = p.shop ?? !!p.look?.band;
      const top = this.building(r.x0, r.z0, r.w, r.d, p.h ?? unitsOf(p.storeys), p.wall, {
        fronts: [f, ...open], shop, look: p.look ?? {}, blank: [lf, rf].filter(s => !open.includes(s)), roof: p.roof, cornice: p.cornice, tank: p.tank, hip: p.hip, y0: 0 });
      if (p.awn && !r.q.me) this.storefront(r.x0, r.z0, r.w, r.d, f, p.awn);
      for (const c of this.root.children.slice(n0)) c.userData.row = id; // flush with the storefront, so the cutaway leaves them be
      Object.assign(all, { x0: Math.min(all.x0, r.x0), z0: Math.min(all.z0, r.z0), x1: Math.max(all.x1, r.x0 + r.w), z1: Math.max(all.z1, r.z0 + r.d), y1: Math.max(all.y1, top) });
      if (!r.q.me) return;
      // the pizzeria: its awning, name and rooftop sign over its own shopfront, its queue, and its pin
      const fb = ff - r.d * Math.abs(m[1]) - r.w * Math.abs(m[0]), a0 = Math.max(sh0, r.q.u0), a1 = Math.min(sh1, r.q.u1), s = box(a0, a1, fb, ff);
      this.storefront(s.x0, s.z0, s.w, s.d, f, self.awn, self.sign, self.signBg, self.signFg);
      // the rooftop sign: wide enough to read, overhanging the neighbours only where they're no taller
      const L = Math.min(3.4, Math.max(2.6, a1 - a0 - 0.2)), hOf = (q?: P) => (q ? q.p.h ?? unitsOf(q.p.storeys) : 0), mine = hOf(r.q) + 0.05;
      const k = live.indexOf(r.q), min = hOf(live[k - 1]) > mine ? r.q.u0 + 0.1 : -Infinity, max = hOf(live[k + 1]) > mine ? r.q.u1 - 0.1 : Infinity;
      let g0 = (a0 + a1) / 2 - L / 2, g1 = g0 + L;
      if (g1 > max) { g0 -= g1 - max; g1 = max; } if (g0 < min) { g1 = Math.min(max, g1 + min - g0); g0 = min; }
      const sg = box(g0, g1, fb, ff);
      this.heroSign(sg.x0, sg.z0, sg.w, sg.d, f, top, self.sign, g1 - g0);
      for (const c of this.root.children.slice(n0)) c.traverse(o => (o.userData.place = id));
      this.queue(id, s.x0, s.z0, s.w, s.d, f);
      pin.pos.set(s.x0 + s.w / 2, top + 0.6, s.z0 + s.d / 2);
      pin.box = { x0: r.x0, z0: r.z0, x1: r.x0 + r.w, z1: r.z0 + r.d, y1: top };
    });
    pin.row = all;
  }
  /** Take an object out of the world for good: its geometry, materials and textures, and its night lighting. */
  private drop(o: THREE.Object3D) {
    o.traverse(c => {
      const mesh = c as THREE.Mesh; if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      for (const mt of [mesh.material].flat() as THREE.MeshLambertMaterial[]) {
        if ([...mats.values()].includes(mt)) continue; // shared flat colours stay
        mt.map?.dispose(); mt.emissiveMap?.dispose(); mt.dispose();
        this.windows = this.windows.filter(w => w !== mt); this.glow = this.glow.filter(w => w !== mt);
      }
    });
    o.removeFromParent();
  }

  /** Real buildings beside a pizzeria (Sketch style only): footprints and roof heights from city / OSM data, roofs
      textured from the aerial photograph (see tools/fetch-real.mjs). The footprints turn so the real street side faces
      the storefront's side, line up with its facade, and fill the pizzeria's map block around the hand-made pizzeria. */
  realPatch(id: string, r: RealPlace, imgUrl: string) {
    const pin = this.pins[id], b = pin.box, M = 4; // metres per unit
    const m = ({ N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] } as const)[pin.facing], a = [-m[1], m[0]]; // front and along-street, map x/z
    const fr = [r.front[0], -r.front[1]], phi = Math.atan2(m[1], m[0]) - Math.atan2(fr[1], fr[0]), cs = Math.cos(phi), sn = Math.sin(phi);
    const rot = ([e, n]: number[]) => { const x = e / M, z = -n / M; return [x * cs - z * sn, x * sn + z * cs]; };
    const F = (q: number[]) => q[0] * m[0] + q[1] * m[1], A = (q: number[]) => q[0] * a[0] + q[1] * a[1];
    // the map pizzeria: facade line, along-street span
    const corners = [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]];
    const mf = Math.max(...corners.map(F)), ma0 = Math.min(...corners.map(A)), ma1 = Math.max(...corners.map(A)), mdep = mf - Math.min(...corners.map(F));
    const self = r.buildings.find(x => x.self); if (!self) return;
    const sp = self.p.map(rot), sf = Math.max(...sp.map(F)), sa0 = Math.min(...sp.map(A)), sa1 = Math.max(...sp.map(A));
    // the pizzeria's map block: from its facade back to the next road behind, and sideways to the cross streets
    const rects = this.roads.map(([x0, z0, w, d]) => { const rc = [[x0, z0], [x0 + w, z0], [x0, z0 + d], [x0 + w, z0 + d]]; return { f0: Math.min(...rc.map(F)), f1: Math.max(...rc.map(F)), a0: Math.min(...rc.map(A)), a1: Math.max(...rc.map(A)) }; });
    const mback = mf - mdep, f1 = mf; let f0 = mf - 14, lo = ma0 - 12, hi = ma1 + 12;
    for (const q of rects) if (q.a1 > ma0 && q.a0 < ma1 && q.f1 <= mback) f0 = Math.max(f0, q.f1 + 0.8);
    for (const q of rects) if (q.f1 > f0 && q.f0 < f1) { if (q.a1 <= ma0 + 0.01) lo = Math.max(lo, q.a1 + 0.8); else if (q.a0 >= ma1 - 0.01) hi = Math.min(hi, q.a0 - 0.8); }
    // real -> map: turn, line the pizzeria's real facade and middle up with the map's
    const place = (q: number[]) => { const p = rot(q), fa = F(p) - sf + mf, al = A(p) - (sa0 + sa1) / 2 + (ma0 + ma1) / 2; return [m[0] * fa + a[0] * al, m[1] * fa + a[1] * al]; };
    type V = { p: number[]; q: number[] };
    /** Sutherland-Hodgman against half-planes keep(p) >= 0, carrying the real coordinates along for the roof texture. */
    const clip = (poly: V[], keeps: ((p: number[]) => number)[]) => keeps.reduce((pl, keep) => {
      const outp: V[] = [];
      pl.forEach((v, i) => { const u = pl[(i + 1) % pl.length], kv = keep(v.p), ku = keep(u.p);
        if (kv >= 0) outp.push(v);
        if ((kv >= 0) !== (ku >= 0)) { const t = kv / (kv - ku); outp.push({ p: [v.p[0] + (u.p[0] - v.p[0]) * t, v.p[1] + (u.p[1] - v.p[1]) * t], q: [v.q[0] + (u.q[0] - v.q[0]) * t, v.q[1] + (u.q[1] - v.q[1]) * t] }); } });
      return outp;
    }, poly);
    const inBlock = [(p: number[]) => F(p) - f0, (p: number[]) => f1 - F(p), (p: number[]) => A(p) - lo, (p: number[]) => hi - A(p)], g = 0.15;
    // the block minus the pizzeria's row (or the hand-made pizzeria): left of it, right of it, and behind it
    const rw = pin.row ?? b, rc = [[rw.x0, rw.z0], [rw.x1, rw.z0], [rw.x0, rw.z1], [rw.x1, rw.z1]];
    const ra0 = Math.min(...rc.map(A)), ra1 = Math.max(...rc.map(A)), rback = Math.min(...rc.map(F));
    const around = [[(p: number[]) => ra0 - g - A(p)], [(p: number[]) => A(p) - ra1 - g], [(p: number[]) => A(p) - ra0 + g, (p: number[]) => ra1 + g - A(p), (p: number[]) => rback - g - F(p)]];
    const walls: THREE.BufferGeometry[] = [], roofs: THREE.BufferGeometry[] = [], half = r.half, cover: V[][] = []; // each real piece, in map x/z
    for (const bd of r.buildings) {
      if (bd.self || (pin.row && bd.side)) continue; // the row builds these in both styles
      const col = new THREE.Color(realWall(bd.y, bd.h)), H = Math.max(1, bd.h / M);
      for (const cut of around) {
        let poly = clip(bd.p.map(q => ({ p: place(q), q })), [...inBlock, ...cut]);
        if (poly.length < 3) continue;
        let ar = 0; poly.forEach((v, i) => { const u = poly[(i + 1) % poly.length]; ar += v.p[0] * u.p[1] - u.p[0] * v.p[1]; });
        if (Math.abs(ar) / 2 < 0.6) continue;
        if (ar < 0) poly.reverse(); // counter-clockwise in x/z
        cover.push(poly);
        // walls: u runs along the wall, v up it (one window bay per unit and storey on the repeating tile)
        const pos: number[] = [], uv: number[] = [], cl: number[] = [], nrm: number[] = []; let run = 0;
        poly.forEach((v, i) => { const u = poly[(i + 1) % poly.length], L = Math.hypot(u.p[0] - v.p[0], u.p[1] - v.p[1]); if (L < 1e-3) return;
          const nx = (u.p[1] - v.p[1]) / L, nz = -(u.p[0] - v.p[0]) / L;
          // the polygon runs counter-clockwise in x/z, so (dz, -dx) points out; wind the quad to face that way
          for (const [x, y, z, tu, tv] of [[v.p[0], 0, v.p[1], run, 0], [u.p[0], H, u.p[1], run + L, H], [u.p[0], 0, u.p[1], run + L, 0], [v.p[0], 0, v.p[1], run, 0], [v.p[0], H, v.p[1], run, H], [u.p[0], H, u.p[1], run + L, H]]) {
            pos.push(x, y, z); uv.push(tu, tv); cl.push(col.r, col.g, col.b); nrm.push(nx, 0, nz); }
          run += L; });
        const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
        wg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); wg.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); walls.push(wg);
        // roof: the footprint at its height, textured from the photo (u east, v north across the 2*half square)
        const tris = THREE.ShapeUtils.triangulateShape(poly.map(v => new THREE.Vector2(v.p[0], v.p[1])), []), rp: number[] = [], ru: number[] = [], rn: number[] = [];
        for (const t0 of tris) {
          const [i, j, k] = t0, [P, Q, R] = [poly[i].p, poly[j].p, poly[k].p], up = (Q[1] - P[1]) * (R[0] - P[0]) - (Q[0] - P[0]) * (R[1] - P[1]); // y of (Q-P)x(R-P)
          for (const n of up > 0 ? [i, j, k] : [i, k, j]) { const v = poly[n]; rp.push(v.p[0], H, v.p[1]); ru.push((v.q[0] + half) / (2 * half), (v.q[1] + half) / (2 * half)); rn.push(0, 1, 0); } }
        const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setAttribute('normal', new THREE.Float32BufferAttribute(rn, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(ru, 2)); roofs.push(rg);
      }
    }
    if (!walls.length) return;
    const wallMesh = new THREE.Mesh(mergeGeometries(walls), realWallMat()), roofMesh = new THREE.Mesh(mergeGeometries(roofs), new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load(imgUrl, t => (t.colorSpace = THREE.SRGBColorSpace)) }));
    for (const o of [wallMesh, roofMesh]) { o.userData.merged = true; o.visible = false; this.add(o); this.sketchOnly.push(o); }
    // hand-placed buildings a real one stands on (a fifth of their footprint or more) are Pixel-only now; the rest stay
    for (const o of this.root.children) {
      if (!(o as THREE.Mesh).isMesh || o.userData.place || o.userData.merged || !(o as THREE.Mesh).castShadow) continue;
      const bb = new THREE.Box3().setFromObject(o); if (bb.max.y < 1.2) continue;
      const own = (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z);
      const area = (pl: V[]) => Math.abs(pl.reduce((s, v, i) => { const u = pl[(i + 1) % pl.length]; return s + v.p[0] * u.p[1] - u.p[0] * v.p[1]; }, 0)) / 2;
      const hit = cover.reduce((s, pl) => s + area(clip(pl, [p => p[0] - bb.min.x, p => bb.max.x - p[0], p => p[1] - bb.min.z, p => bb.max.z - p[1]])), 0);
      if (hit > own * 0.2) this.pixelOnly.push(o);
    }
  }

  /* ---------- small things ---------- */
  /** A rounded, soft tree: a cluster of smooth blobs on a trunk (all trees are instanced in finish()). */
  tree(x: number, z: number, s = 1, y0 = 0, forest = false) {
    // forest trees draw from the detail RNG (so a forest never re-rolls the layout) and use low-detail crowns
    const top = y0 + 0.9 * s, base = new THREE.Color(forest ? tpick(FOREST) : pick(GREENS)), a = (forest ? trnd() : rnd()) * 6.28;
    this.trunks.push([x, y0, z, 0.9 * s]);
    this.crowns.push([x, top + 0.75 * s, z, 0.95 * s, base, forest]);
    this.crowns.push([x + Math.cos(a) * 0.6 * s, top + 0.45 * s, z + Math.sin(a) * 0.6 * s, 0.68 * s, base.clone().offsetHSL(0, 0, -0.04), forest]);
    this.crowns.push([x - Math.cos(a + 1) * 0.55 * s, top + 0.5 * s, z - Math.sin(a + 1) * 0.55 * s, 0.62 * s, base.clone().offsetHSL(0.01, 0, 0.03), forest]);
    this.crowns.push([x + 0.1 * s, top + 1.35 * s, z - 0.1 * s, 0.55 * s, base.clone().offsetHSL(0, 0, 0.07), forest]);
  }
  /** A dense forest on a darker floor: trees on a jittered grid `step` apart, from the detail RNG. */
  forest(x0: number, z0: number, x1: number, z1: number, step = 2) {
    this.slab(x0, z0, x1 - x0, z1 - z0, '#7db35f', 0.03);
    for (let z = z0 + step / 2; z < z1; z += step) for (let x = x0 + step / 2; x < x1; x += step)
      this.tree(Math.min(x1 - 0.6, Math.max(x0 + 0.6, x + (trnd() - 0.5) * step * 0.8)), Math.min(z1 - 0.6, Math.max(z0 + 0.6, z + (trnd() - 0.5) * step * 0.8)), 1.05 + trnd() * 0.6, 0, true);
  }
  /** A blocky person (instanced in finish()); `detail` people draw colours from the detail RNG so they don't shift the layout. */
  person(x: number, z: number, detail = false) {
    const p = detail ? tpick : pick;
    this.people.push([x, z, new THREE.Color(p(['#3f7fbf', '#d94a3a', '#f2c230', '#5aa469', '#8e6cc2', '#2f3a48'])), new THREE.Color(p(['#f3cfb1', '#c68b62', '#9a6544', '#e3b08c']))]);
  }
  lamp(x: number, z: number) {
    this.cyl(x, 0, z, 0.06, 0.06, 1.6, '#3b3836', 5);
    const m = new THREE.MeshLambertMaterial({ color: '#fff1b8', emissive: '#ffd27a', emissiveIntensity: 0 }); this.windows.push(m);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), m); b.position.set(x, 1.7, z); this.add(b);
  }
  /** Car looping from a to b along `axis` at the other coordinate c. */
  car(axis: 'x' | 'z', a: number, b: number, c: number, speed: number, color: string, o: { bus?: boolean; y?: number; detail?: boolean } = {}) {
    const L = o.bus ? 3.2 : 1.3, W = o.bus ? 0.7 : 0.6, g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, o.bus ? 0.9 : 0.4, W), lam(color)); body.position.y = o.bus ? 0.55 : 0.32;
    g.add(body);
    if (!o.bus) { const cab = new THREE.Mesh(new THREE.BoxGeometry(L * 0.55, 0.3, W * 0.9), lam('#bcd8ea')); cab.position.set(-0.05, 0.66, 0); g.add(cab); }
    if (axis === 'z') g.rotation.y = Math.PI / 2;
    const t = o.detail ? a + trnd() * (b - a) : rr(a, b); // detail cars must not draw from the layout RNG
    g.position.set(axis === 'x' ? t : c, o.y ?? 0, axis === 'z' ? t : c);
    this.add(g); this.movers.push({ obj: g, axis, a, b, speed: speed * Math.sign(b - a) });
  }
  boat(axis: 'x' | 'z', a: number, b: number, c: number, speed: number, color = '#f4efe3') {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1.1), lam(color)); hull.position.y = -0.75;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.8), lam('#d9473a')); cab.position.set(-0.3, -0.2, 0);
    g.add(hull, cab); if (axis === 'z') g.rotation.y = Math.PI / 2;
    g.position.set(axis === 'x' ? rr(a, b) : c, 0, axis === 'z' ? rr(a, b) : c);
    this.add(g); this.movers.push({ obj: g, axis, a, b, speed: speed * Math.sign(b - a) });
  }

  /** Instance the trees (call once, after building). */
  finish() {
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3();
    for (const lowDetail of [false, true]) {
      const list = this.crowns.filter(c => c[5] === lowDetail); if (!list.length) continue;
      const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, lowDetail ? 1 : 2), new THREE.MeshLambertMaterial({ color: '#ffffff' }), list.length);
      list.forEach(([x, y, z, r, c], i) => { crowns.setMatrixAt(i, M.compose(P.set(x, y, z), Q, S.set(r, r * 0.92, r))); crowns.setColorAt(i, c); });
      this.add(crowns);
    }
    const tg = new THREE.CylinderGeometry(0.11, 0.15, 1, 6); tg.translate(0, 0.5, 0);
    const trunks = new THREE.InstancedMesh(tg, lam('#7a5236'), this.trunks.length);
    this.trunks.forEach(([x, y, z, h], i) => trunks.setMatrixAt(i, M.compose(P.set(x, y, z), Q, S.set(1, h, 1))));
    this.add(trunks); this.crowns = []; this.trunks = [];
    // street life in the neighbourhoods: people on the pavements, cabs and cars in the lanes (detail RNG, so the layout stays put)
    const inHood = (x: number, z: number) => Object.values(this.hoods).some(b => b && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1);
    for (const [x0, z0, w, d] of this.roads) {
      const alongX = w >= d, L = alongX ? w : d, W = alongX ? d : w;
      for (let i = 0, n = Math.round(L * 0.12); i < n; i++) {
        const t = 0.5 + trnd() * (L - 1), out = trnd() < 0.5 ? -0.4 : W + 0.4;
        const x = alongX ? x0 + t : x0 + out, z = alongX ? z0 + out : z0 + t;
        if (inHood(x, z)) this.person(x, z, true);
      }
      if (W < 2.4 || L < 10 || !inHood(x0 + w / 2, z0 + d / 2)) continue;
      const fwd = trnd() < 0.5, a = alongX ? x0 : z0, b = a + L, lane = (alongX ? z0 : x0) + W * (fwd ? 0.7 : 0.3);
      this.car(alongX ? 'x' : 'z', fwd ? a : b, fwd ? b : a, lane, 1.6 + trnd() * 1.2, trnd() < 0.55 ? '#f2c230' : tpick(['#ece4d5', '#3f7fbf', '#d9473a', '#5aa469', '#2f3a48']), { detail: true });
    }
    // people: bodies and heads
    const body = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.5, 0.26), new THREE.MeshLambertMaterial({ color: '#ffffff' }), this.people.length);
    const head = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshLambertMaterial({ color: '#ffffff' }), this.people.length);
    this.people.forEach(([x, z, b, h], i) => {
      body.setMatrixAt(i, M.compose(P.set(x, 0.35, z), Q, S.set(1, 1, 1))); body.setColorAt(i, b);
      head.setMatrixAt(i, M.compose(P.set(x, 0.7, z), Q, S.set(1, 1, 1))); head.setColorAt(i, h);
    });
    this.add(body); this.add(head); this.people = [];
    // zebra crossings on every arm of every crossing of two roads
    const bars: [number, number, number, number][] = [];
    const xs = this.roads.filter(([, , w, d]) => w > d && d >= 1.6), zs = this.roads.filter(([, , w, d]) => d > w && w >= 1.6);
    for (const [ax, az, aw, ad] of xs) for (const [bx, bz, bw, bd] of zs) {
      const ix0 = Math.max(ax, bx), ix1 = Math.min(ax + aw, bx + bw), iz0 = Math.max(az, bz), iz1 = Math.min(az + ad, bz + bd);
      if (ix1 - ix0 < 1.4 || iz1 - iz0 < 1.4) continue;
      const across = (u0: number, u1: number, at: number, alongX: boolean) => { for (let u = u0 + 0.25; u < u1 - 0.3; u += 0.4) bars.push(alongX ? [at, u, 0.7, 0.2] : [u, at, 0.2, 0.7]); };
      if (ax < ix0 - 1) across(iz0, iz1, ix0 - 0.85, true); if (ax + aw > ix1 + 1) across(iz0, iz1, ix1 + 0.15, true);
      if (bz < iz0 - 1) across(ix0, ix1, iz0 - 0.85, false); if (bz + bd > iz1 + 1) across(ix0, ix1, iz1 + 0.15, false);
    }
    const zebra = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.026, 1), lam('#ece7dc'), bars.length);
    bars.forEach(([x, z, w, d], i) => zebra.setMatrixAt(i, M.compose(P.set(x + w / 2, 0.113, z + d / 2), Q, S.set(w, 1, d))));
    this.add(zebra, false); this.roads = [];
    // low static scenery (roads, slabs, kerbs, piers, benches...) draws in two meshes; tall things stay separate for the cutaway
    this.root.updateMatrixWorld(true);
    const water = lam('#6fb7c4'), low = new Map<boolean, THREE.Mesh[]>([[true, []], [false, []]]);
    for (const o of this.root.children) {
      if (!isFlat(o) || o.userData.place || (o as THREE.Mesh).material === water) continue;
      const b = new THREE.Box3().setFromObject(o); if (b.max.y < 1.2) low.get(o.castShadow)!.push(o as THREE.Mesh);
    }
    for (const [shadow, list] of low) {
      if (list.length < 2) continue;
      for (const m of list) this.root.remove(m);
      const merged = mergeFlat(list, m => m.matrixWorld); merged.userData.merged = true; this.add(merged, shadow);
    }
  }
}
