/* Building kit for the pixel-diorama world. World units: x = east, z = south, y = up; one storey = 1 unit (~4 m).
   Everything is plain boxes, cylinders and prisms; the look comes from tiny canvas textures (4 px per unit,
   nearest-filtered) and the pixelated render pass in map.ts. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { HoodId } from '../data/places';
import type { Dir } from './compass';

export interface Bounds { x0: number; z0: number; x1: number; z1: number; y1: number }
export interface Pin { pos: THREE.Vector3; facing: Dir; hood: HoodId; box: Bounds }
export interface Mover { obj: THREE.Object3D; axis: 'x' | 'z'; a: number; b: number; speed: number }

/* seeded RNG: every build is identical */
let seed = 1;
export const reseed = (n = 20260718) => { seed = n; };
export const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
export const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
export const rr = (a: number, b: number) => a + rnd() * (b - a);

const pixel = <T extends THREE.Texture>(t: T) => { t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t; };
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
export const ROOFS = ['#c9c3b8', '#b9b3aa', '#d3cec4', '#a9a49c'];
const AWN: [string, string][] = [['#d9473a', '#fff6e6'], ['#2f6b4f', '#f4efe3'], ['#2f3a48', '#f2c230'], ['#7a2e2a', '#efe1c8']];

/** Facade texture: 4 px per unit, one storey per 4 px row; lit windows also go in an emissive mask. */
function facadeTex(len: number, floors: number, wall: string, o: { shop?: boolean; glass?: boolean }) {
  const w = Math.max(4, Math.round(len * 4)), h = Math.max(4, Math.round(floors * 4));
  const [c, g] = canvas(w, h), [e, ge] = canvas(w, h);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, w, h);
  g.fillStyle = wall; g.fillRect(0, 0, w, h);
  const win = (x: number, y: number, ww: number, hh: number) => {
    const on = rnd() < 0.22;
    g.fillStyle = on ? '#f6d77a' : o.glass ? '#dfeaf2' : '#9cc3d8'; g.fillRect(x, y, ww, hh);
    if (on) { ge.fillStyle = '#fff'; ge.fillRect(x, y, ww, hh); }
  };
  for (let j = 0; j < floors; j++) {
    const y = h - (j + 1) * 4;
    if (j === 0 && o.shop) {
      g.fillStyle = '#2f3a48'; g.fillRect(0, y + 1, w, 3);
      g.fillStyle = '#9cc3d8'; for (let x = 1; x < w - 1; x += 4) g.fillRect(x, y + 1, 2, 2);
      g.fillStyle = '#5b3d2e'; g.fillRect(Math.floor(w * 0.7), y + 1, 1, 3);
      ge.fillStyle = '#fff'; for (let x = 1; x < w - 1; x += 4) ge.fillRect(x, y + 1, 2, 2);
      continue;
    }
    if (o.glass) { for (let x = 0; x < w; x += 2) win(x, y + 1, 1, 2); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, y, w, 1); }
    else for (let x = 1; x < w - 1; x += 3) win(x, y + 1, 1, 2);
  }
  return [pixel(new THREE.CanvasTexture(c)), pixel(new THREE.CanvasTexture(e))] as const;
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

export interface BldOpts { fronts?: Dir[]; shop?: boolean; glass?: boolean; tank?: boolean; roof?: string; cornice?: string | null; y0?: number; dim?: boolean }

export class World {
  root = new THREE.Group();
  /** window materials: emissive switched on at dusk / night */
  windows: THREE.MeshLambertMaterial[] = [];
  /** always-glowing things (billboards, torch, lamps) */
  glow: THREE.MeshLambertMaterial[] = [];
  pins: Record<string, Pin> = {};
  hoods: Partial<Record<HoodId, Bounds>> = {};
  movers: Mover[] = [];
  /** all land (for picking) */
  ground: THREE.Object3D[] = [];
  private filler: THREE.BufferGeometry[] = [];
  private crowns: [number, number, number, number, THREE.Color][] = [];
  private trunks: [number, number, number, number][] = [];
  hood: HoodId | null = null;

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
    const m = this.box(x0, -5, z0, w, 5, d, [lam('#b98f5f'), lam('#b98f5f'), lam('#a3cf78'), lam('#8a6a45'), lam('#c9a272'), lam('#c9a272')], false);
    this.ground.push(m); return m;
  }
  slab(x0: number, z0: number, w: number, d: number, c: string, top = 0.06) { return this.box(x0, 0, z0, w, top, d, c, false); }
  pave(x0: number, z0: number, w: number, d: number) { return this.slab(x0, z0, w, d, '#e3dccf', 0.05); }
  park(x0: number, z0: number, w: number, d: number) { return this.slab(x0, z0, w, d, '#93c66c', 0.08); }
  /** Roadway with a dashed centre line when it's wide enough. */
  road(x0: number, z0: number, w: number, d: number) {
    this.slab(x0, z0, w, d, '#5b6068', 0.1);
    const along = w > d ? 'x' : 'z', L = Math.max(w, d), W = Math.min(w, d);
    if (W >= 2.6) for (let t = 0.6; t < L - 0.6; t += 2) along === 'x' ? this.box(x0 + t, 0.1, z0 + d / 2 - 0.06, 0.9, 0.02, 0.12, '#e8bb4f', false) : this.box(x0 + w / 2 - 0.06, 0.1, z0 + t, 0.12, 0.02, 0.9, '#e8bb4f', false);
  }

  /* ---------- buildings ---------- */
  building(x0: number, z0: number, w: number, d: number, floors: number, wall: string, o: BldOpts = {}): number {
    // tall masonry buildings often step back near the top
    if (!o.glass && floors >= 10 && o.y0 === undefined && w > 2.4 && d > 2.4 && rnd() < 0.6) {
      const cf = floors >= 14 ? 3 : 2, inset = Math.min(w, d) * 0.18;
      const t1 = this.building(x0, z0, w, d, floors - cf, wall, { ...o, tank: false, y0: 0 });
      return this.building(x0 + inset, z0 + inset, w - 2 * inset, d - 2 * inset, cf, wall, { ...o, fronts: [], shop: false, y0: t1 });
    }
    const y0 = o.y0 ?? 0, fr = o.fronts ?? [];
    const side = (f: Dir) => {
      const [map, emissiveMap] = facadeTex(f === 'E' || f === 'W' ? d : w, floors, wall, { shop: o.shop && fr.includes(f), glass: o.glass });
      const m = new THREE.MeshLambertMaterial({ map, emissiveMap, emissive: '#ffcf6a', emissiveIntensity: 0 });
      this.windows.push(m); return m;
    };
    const roof = lam(o.roof ?? (o.glass ? '#dfe8ee' : pick(ROOFS)));
    const [E, W, S, N] = FACES.map(side);
    this.box(x0, y0, z0, w, floors, d, [E, W, roof, roof, S, N]);
    let top = y0 + floors;
    if (o.cornice !== null && !o.glass) { const c = lam(o.cornice ?? '#5b4f45'); this.box(x0 - 0.15, top, z0 - 0.15, w + 0.3, 0.3, d + 0.3, [c, c, roof, c, c, c]); top += 0.3; }
    if (o.tank && w > 2 && d > 2) {
      const tx = x0 + w * 0.7, tz = z0 + d * 0.3;
      for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) this.box(tx + dx - 0.05, top, tz + dz - 0.05, 0.1, 0.6, 0.1, '#4a4542');
      this.cyl(tx, top + 0.6, tz, 0.7, 0.7, 1.3, '#a8743f', 8); this.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.6, 8), lam('#7d5432')), tx, top + 2.2, tz));
    } else if (!o.glass && o.cornice !== null && floors >= 4 && floors <= 9 && w > 2.6 && d > 2.6 && rnd() < 0.18) {
      // a roof garden: planted deck and a couple of small trees
      this.box(x0 + 0.35, top, z0 + 0.35, w - 0.7, 0.12, d - 0.7, '#9fcf74', false);
      this.tree(x0 + w * 0.32, z0 + d * 0.35, 0.45, top + 0.12); if (rnd() < 0.6) this.tree(x0 + w * 0.68, z0 + d * 0.62, 0.38, top + 0.12);
    } else if (!o.glass && o.cornice !== null && w > 2 && d > 2 && rnd() < 0.45) {
      this.box(x0 + w * 0.15, top, z0 + d * 0.5, Math.min(1, w * 0.3), 0.75, Math.min(0.9, d * 0.3), '#c4bdb2'); // stair bulkhead / plant room
    }
    return top;
  }
  /** Gabled frame house (Midwood). */
  house(x0: number, z0: number, w: number, d: number, wall: string, roofC: string, front: Dir) {
    const top = this.building(x0, z0, w, d, 2, wall, { cornice: null, roof: roofC });
    this.prism(x0 - 0.1, top, z0 - 0.1, w + 0.2, d + 0.2, 1.2, front === 'N' || front === 'S' ? 'z' : 'x', roofC);
    const f = faceFrame(x0, z0, w, d, front);
    const porch = new THREE.Group(); porch.position.set(f.x, 0, f.z); porch.rotation.y = f.ry;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(f.L - 0.4, 0.2, 0.8), lam('#d8cbb3')); deck.position.set(0, 0.1, 0.4);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(f.L - 0.3, 0.12, 0.9), lam(roofC)); lid.position.set(0, 1.1, 0.45);
    porch.add(deck, lid); this.add(porch);
  }

  /** Awning (striped) and a name sign on one facade. */
  storefront(x0: number, z0: number, w: number, d: number, front: Dir, awn: [string, string], sign?: string, signBg = '#fff6e6', signFg = '#2e2b29') {
    const f = faceFrame(x0, z0, w, d, front), g = new THREE.Group();
    g.position.set(f.x, 0, f.z); g.rotation.y = f.ry;
    const n = Math.max(4, Math.round((f.L - 0.3) * 3));
    const [c, cx] = canvas(n, 1); for (let i = 0; i < n; i++) { cx.fillStyle = awn[i % 2]; cx.fillRect(i, 0, 1, 1); }
    const a = new THREE.Mesh(new THREE.BoxGeometry(f.L - 0.3, 0.1, 1), new THREE.MeshLambertMaterial({ map: pixel(new THREE.CanvasTexture(c)) }));
    a.position.set(0, 1.05, 0.45); a.rotation.x = 0.35; g.add(a);
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
    for (const c of this.root.children.slice(n0)) c.traverse(m => (m.userData.place = id));
    this.pins[id] = { pos: new THREE.Vector3(x0 + w / 2, top + 0.6, z0 + d / 2), facing: front, hood: this.hood!, box: { x0, z0, x1: x0 + w, z1: z0 + d, y1: top } };
  }

  /* ---------- small things ---------- */
  /** A rounded, soft tree: a cluster of smooth blobs on a trunk (all trees are instanced in finish()). */
  tree(x: number, z: number, s = 1, y0 = 0) {
    const top = y0 + 0.9 * s, base = new THREE.Color(pick(GREENS)), a = rnd() * 6.28;
    this.trunks.push([x, y0, z, 0.9 * s]);
    this.crowns.push([x, top + 0.75 * s, z, 0.95 * s, base]);
    this.crowns.push([x + Math.cos(a) * 0.6 * s, top + 0.45 * s, z + Math.sin(a) * 0.6 * s, 0.68 * s, base.clone().offsetHSL(0, 0, -0.04)]);
    this.crowns.push([x - Math.cos(a + 1) * 0.55 * s, top + 0.5 * s, z - Math.sin(a + 1) * 0.55 * s, 0.62 * s, base.clone().offsetHSL(0.01, 0, 0.03)]);
    this.crowns.push([x + 0.1 * s, top + 1.35 * s, z - 0.1 * s, 0.55 * s, base.clone().offsetHSL(0, 0, 0.07)]);
  }
  person(x: number, z: number) {
    this.box(x - 0.13, 0.1, z - 0.13, 0.26, 0.5, 0.26, pick(['#3f7fbf', '#d94a3a', '#f2c230', '#5aa469', '#8e6cc2', '#2f3a48']));
    this.box(x - 0.1, 0.6, z - 0.1, 0.2, 0.2, 0.2, pick(['#f3cfb1', '#c68b62', '#9a6544', '#e3b08c']));
  }
  lamp(x: number, z: number) {
    this.cyl(x, 0, z, 0.06, 0.06, 1.6, '#3b3836', 5);
    const m = new THREE.MeshLambertMaterial({ color: '#fff1b8', emissive: '#ffd27a', emissiveIntensity: 0 }); this.windows.push(m);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), m); b.position.set(x, 1.7, z); this.add(b);
  }
  /** Car looping from a to b along `axis` at the other coordinate c. */
  car(axis: 'x' | 'z', a: number, b: number, c: number, speed: number, color: string, o: { bus?: boolean; y?: number } = {}) {
    const L = o.bus ? 3.2 : 1.3, W = o.bus ? 0.7 : 0.6, g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, o.bus ? 0.9 : 0.4, W), lam(color)); body.position.y = o.bus ? 0.55 : 0.32;
    g.add(body);
    if (!o.bus) { const cab = new THREE.Mesh(new THREE.BoxGeometry(L * 0.55, 0.3, W * 0.9), lam('#bcd8ea')); cab.position.set(-0.05, 0.66, 0); g.add(cab); }
    if (axis === 'z') g.rotation.y = Math.PI / 2;
    g.position.set(axis === 'x' ? rr(a, b) : c, o.y ?? 0, axis === 'z' ? rr(a, b) : c);
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

  /**
   * Context city (outside the neighbourhoods): pale low blocks on a street grid, merged into one mesh.
   * shortcut: one shared window tile, so every context facade has the same pattern; fine for background.
   */
  context(x0: number, z0: number, x1: number, z1: number, floors: [number, number], skip: [number, number, number, number][] = []) {
    this.slab(x0, z0, x1 - x0, z1 - z0, '#8d8f93', 0.04);
    const cell = 7;
    for (let x = x0 + 1; x + 5 <= x1 - 0.5; x += cell) for (let z = z0 + 1; z + 5 <= z1 - 0.5; z += cell) {
      const bw = Math.min(5.5, x1 - 1 - x), bd = Math.min(5.5, z1 - 1 - z);
      if (skip.some(([a, b, c, d]) => x < c && x + bw > a && z < d && z + bd > b)) continue;
      this.fill(x, z, bw, 0.12, bd, '#e3dccf', '#e3dccf');
      const n = 1 + Math.floor(rnd() * 3), wall = pick(['#d9c2a8', '#cdb5a0', '#c9b8a6', '#d8cdbd', '#bfb3a6']);
      for (let i = 0; i < n; i++) {
        const sw = (bw - 0.6) / n;
        this.fill(x + 0.3 + i * sw, z + 0.3, sw - 0.15, Math.round(rr(floors[0], floors[1])), bd - 0.6, i % 2 ? wall : pick(['#d9c2a8', '#c9b8a6', '#cdb5a0']), '#cfc8bb', 0.12);
      }
    }
  }
  /** One merged context box: UVs scaled so the shared window tile repeats once per 3 units × 1 storey. */
  private fill(x0: number, z0: number, w: number, h: number, d: number, wall: string, roof: string, y0 = 0) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    const uv = g.getAttribute('uv') as THREE.BufferAttribute, n = uv.count, col = new Float32Array(n * 3);
    const cw = new THREE.Color(wall), cr = new THREE.Color(roof);
    for (let i = 0; i < n; i++) {
      const face = Math.floor(i / 6), top = face === 2 || face === 3, L = face < 2 ? d : w;
      uv.setXY(i, top ? 0.02 : (uv.getX(i) * L) / 3, top ? 0.02 : uv.getY(i) * h);
      (top ? cr : cw).toArray(col, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.translate(x0 + w / 2, y0 + h / 2, z0 + d / 2);
    this.filler.push(g);
  }
  /** Instance the trees and merge the context city into one mesh (call once, after building). */
  finish() {
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3();
    const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshLambertMaterial({ color: '#ffffff' }), this.crowns.length);
    this.crowns.forEach(([x, y, z, r, c], i) => { crowns.setMatrixAt(i, M.compose(P.set(x, y, z), Q, S.set(r, r * 0.92, r))); crowns.setColorAt(i, c); });
    const tg = new THREE.CylinderGeometry(0.11, 0.15, 1, 6); tg.translate(0, 0.5, 0);
    const trunks = new THREE.InstancedMesh(tg, lam('#7a5236'), this.trunks.length);
    this.trunks.forEach(([x, y, z, h], i) => trunks.setMatrixAt(i, M.compose(P.set(x, y, z), Q, S.set(1, h, 1))));
    this.add(crowns); this.add(trunks); this.crowns = []; this.trunks = [];
    if (!this.filler.length) return;
    const [c, g] = canvas(12, 4), [e, ge] = canvas(12, 4);
    g.fillStyle = '#fff'; g.fillRect(0, 0, 12, 4); ge.fillStyle = '#000'; ge.fillRect(0, 0, 12, 4);
    for (const x of [1, 4, 7, 10]) { g.fillStyle = x === 7 ? '#f6e3a8' : '#9fb7c8'; g.fillRect(x, 1, 1, 2); if (x === 7) { ge.fillStyle = '#fff'; ge.fillRect(x, 1, 1, 2); } }
    const map = pixel(new THREE.CanvasTexture(c)), em = pixel(new THREE.CanvasTexture(e));
    for (const t of [map, em]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const m = new THREE.MeshLambertMaterial({ map, emissiveMap: em, emissive: '#ffcf6a', emissiveIntensity: 0, vertexColors: true });
    this.windows.push(m);
    this.add(new THREE.Mesh(mergeGeometries(this.filler), m));
    this.filler = [];
  }
}
