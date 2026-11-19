/* The whole map, hand-placed. Real geography, shortened: Hoboken across the Hudson on the west,
   Manhattan in the middle (Central Park and Columbus Circle at the north, Midtown, the West Village,
   the Financial District at the south tip), Brooklyn across the East River on the east (DUMBO opposite FiDi,
   joined by the Brooklyn Bridge; Midwood further south), the Statue of Liberty in the harbour.
   Each pizzeria is on its real street and side; streets between clusters are left out.
   World: x = east, z = south, 1 unit ≈ 4 m; blocks are ~6 units. */
import * as THREE from 'three';
import type { HoodId } from '../data/places';
import type { Dir } from './compass';
import { World, BRICK, BROWN, STONE, GLASS, lam, pick, rr, rnd, reseed, at } from './kit';

type R = [number, number, number, number]; // x0, z0, x1, z1

/** Rows of buildings along both long sides of a block, 0.8 back from the kerb, facing the streets. */
function fillBlock(W: World, x0: number, z0: number, x1: number, z1: number, o: { pal: string[]; floors: [number, number]; skip?: R[]; glass?: boolean; shop?: number }) {
  const X0 = x0 + 0.8, Z0 = z0 + 0.8, X1 = x1 - 0.8, Z1 = z1 - 0.8, w = X1 - X0, d = Z1 - Z0;
  if (w < 1.5 || d < 1.5) return;
  const alongX = w >= d, short = alongX ? d : w;
  const dep = short < 6 ? short : Math.min(4.5, short / 2 - 0.3);
  const rows: { front: Dir[]; off: number }[] = short < 6
    ? [{ front: alongX ? ['N', 'S'] : ['W', 'E'], off: 0 }]
    : [{ front: [alongX ? 'N' : 'W'], off: 0 }, { front: [alongX ? 'S' : 'E'], off: short - dep }];
  for (const r of rows) {
    let t = alongX ? X0 : Z0; const end = alongX ? X1 : Z1;
    while (end - t > 1.2) {
      let bw = rr(2.2, 3.6); if (end - t - bw < 2) bw = end - t;
      const bx = alongX ? t : X0 + r.off, bz = alongX ? Z0 + r.off : t, BW = alongX ? bw : dep, BD = alongX ? dep : bw;
      if (!(o.skip ?? []).some(s => bx < s[2] && bx + BW > s[0] && bz < s[3] && bz + BD > s[1])) {
        const fl = Math.round(rr(...o.floors));
        W.building(bx, bz, BW, BD, fl, pick(o.pal), { fronts: r.front, shop: rnd() < (o.shop ?? 0.3), glass: o.glass, tank: !o.glass && fl > 6 && rnd() < 0.5 });
      }
      t += bw;
    }
  }
  if (short >= 6 && short - 2 * dep > 0.6) alongX ? W.park(X0, Z0 + dep, w, short - 2 * dep) : W.park(X0 + dep, Z0, short - 2 * dep, d);
}
/** Blocks between consecutive street edges: cols/rows are [start, end] pairs. */
function grid(W: World, cols: [number, number][], rows: [number, number][], o: Parameters<typeof fillBlock>[5], skipBlocks: [number, number][] = []) {
  cols.forEach(([x0, x1], i) => rows.forEach(([z0, z1], j) => { if (!skipBlocks.some(([a, b]) => a === i && b === j)) fillBlock(W, x0, z0, x1, z1, o); }));
}
function trees(W: World, x0: number, z0: number, x1: number, z1: number, n: number) { for (let i = 0; i < n; i++) W.tree(rr(x0, x1), rr(z0, z1), rr(0.8, 1.3)); }
const glowMat = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.55 });
};
/** Blocky, brand-free billboard panel facing +z, rotated by ry, centred at (x, y, z). */
function billboard(W: World, x: number, y: number, z: number, w: number, h: number, ry: number) {
  const c = document.createElement('canvas'); c.width = Math.round(w * 4); c.height = Math.round(h * 4); const g = c.getContext('2d')!;
  g.fillStyle = pick(['#d9473a', '#3f7fbf', '#f2c230', '#8e6cc2', '#2f6b4f']); g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 6; i++) { g.fillStyle = pick(['#fff6e6', '#f2c230', '#58b5c9', '#e07aa0', '#2e2b29']); g.fillRect(Math.floor(rnd() * c.width), Math.floor(rnd() * c.height), 1 + Math.floor(rnd() * 4), 1 + Math.floor(rnd() * 2)); }
  const m = glowMat(c); W.glow.push(m);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.y = ry; W.add(p, false);
}
/** Classical temple front (columns, entablature, pediment) on one side of a box. */
function temple(W: World, x0: number, z0: number, w: number, d: number, floors: number, front: Dir) {
  W.building(x0, z0, w, d, floors, '#ece3d0', { cornice: '#d8cfbd', roof: '#cfc8bb' });
  const ns = front === 'N' || front === 'S', L = ns ? w : d, n = Math.max(4, Math.round(L / 0.9));
  const out = front === 'S' ? z0 + d + 0.5 : front === 'N' ? z0 - 0.5 : front === 'E' ? x0 + w + 0.5 : x0 - 0.5;
  for (let i = 0; i < n; i++) { const t = (ns ? x0 : z0) + 0.4 + ((L - 0.8) * i) / (n - 1); ns ? W.cyl(t, 0.3, out, 0.22, 0.2, floors - 0.9, '#f4efe3', 8) : W.cyl(out, 0.3, t, 0.22, 0.2, floors - 0.9, '#f4efe3', 8); }
  const px0 = front === 'E' ? x0 + w : front === 'W' ? x0 - 1 : x0, pz0 = front === 'S' ? z0 + d : front === 'N' ? z0 - 1 : z0;
  W.box(px0, 0, pz0, ns ? w : 1, 0.3, ns ? 1 : d, '#d8cfbd');
  W.box(px0, floors - 0.6, pz0, ns ? w : 1, 0.6, ns ? 1 : d, '#ece3d0');
  W.prism(px0, floors, pz0, ns ? w : 1, ns ? 1 : d, 1, ns ? 'x' : 'z', '#f4efe3');
}

export function buildWorld(): World {
  reseed();
  const W = new World();
  const hood = (id: HoodId, x0: number, z0: number, x1: number, z1: number, y1: number) => { W.hood = id; W.hoods[id] = { x0, z0, x1, z1, y1 }; W.pave(x0, z0, x1 - x0, z1 - z0); };

  /* ---------- the plate: harbour water on a diorama base, then the three landmasses ---------- */
  // the plate is exactly the land's bounding rectangle (inset a hair so the land's cut faces win), so the rivers run off its edges
  W.box(-75.98, -5, -73.98, 143.96, 4, 149.96, [lam('#8a6a45'), lam('#8a6a45'), lam('#6fb7c4'), lam('#6b5236'), lam('#a07a52'), lam('#a07a52')], false);
  W.land(-76, -74, 38, 150);                                   // New Jersey, the whole west edge (Weehawken, Hoboken, Jersey City); the Hudson runs x -38..-30
  W.land(-30, -74, 42, 88); W.land(-26, 14, 38, 26); W.land(-20, 40, 24, 6); // Manhattan, narrowing to the Battery
  W.land(22, -74, 46, 150);                                     // Brooklyn (and Greenpoint / Long Island City to the north), the whole east edge; the East River runs x 12..22
  W.land(-24, 56, 10, 10);                                      // Liberty Island

  /* ---------- Hoboken: Washington St north-south, Monroe St to the west, the Terminal at the south-east ---------- */
  hood('hoboken', -72, -8, -39, 28, 14);
  for (const [x0, x1] of [[-71, -68.6], [-62.6, -60.2], [-54, -50.8]]) W.road(x0, -8, x1 - x0, 36);
  W.road(-45, -8, 2.4, 27.6);                                   // Hudson St
  for (const [z0, z1] of [[0, 2.4], [9, 11.4], [19.6, 22]]) W.road(-72, z0, 29.4, z1 - z0);
  W.park(-42.6, -8, 3.6, 27.6); trees(W, -42.2, -7, -39.6, 18, 7);
  const hobSkip: R[] = [[-50.2, -5.2, -46.4, -1.2], [-58.4, 13.8, -54.6, 17.6], [-68, 3.2, -63.2, 8]];
  grid(W, [[-68.6, -62.6], [-60.2, -54], [-50.8, -45]], [[-8, 0], [2.4, 9], [11.4, 19.6], [22, 28]], { pal: BROWN, floors: [3, 5], skip: hobSkip, shop: 0.25 }, [[2, 3]]);
  W.pizza('bennys', -50, -5, 3.4, 3.6, 4, '#8a5a47', 'W', { sign: "BENNY TUDINO'S" });
  W.pizza('basiles', -58.2, 14, 3.4, 3.4, 4, '#b4644a', 'E', { sign: "BASILE'S", awn: ['#2f6b4f', '#f4efe3'] });
  W.pizza('panello', -67.8, 3.4, 4.4, 4.4, 5, '#9d4b38', 'W', { sign: 'PANELLO', awn: ['#2f3a48', '#f2c230'] });
  // Hoboken Terminal: long copper-roofed shed and its clock tower, ferry slips into the river
  W.building(-50, 23, 10.4, 4.6, 2, '#e6dccb', { cornice: null, roof: '#7fb7a3', fronts: ['S'] });
  W.building(-42.4, 23.6, 1.8, 1.8, 7, '#efe8da', { cornice: '#7fb7a3', y0: 2 });
  W.add(at(new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.4, 4), lam('#6fb3a0')), -41.5, 10.6, 24.5, Math.PI / 4));
  W.box(-41.6, 7.4, 25.4, 0.4, 0.4, 0.06, '#fff8ec');
  for (const z of [23.4, 25.6]) W.box(-39.4, -1, z, 3, 1.1, 1.2, '#c9a77c');
  W.car('z', -8, 28, -53.1, 2.2, '#f2c230'); W.car('z', 28, -8, -51.7, 2, '#3f7fbf'); W.car('x', -72, -43, 1.2, 2, '#ece4d5');
  for (let i = 0; i < 4; i++) W.person(-50.6 + (i % 2) * 0.3, -4.6 + i * 0.5);
  trees(W, -75, -8, -73, 27, 5);

  /* ---------- the Weehawken cliffs: the Palisades rise behind the Jersey waterfront north of Hoboken ---------- */
  W.hood = null;
  const ROCK = ['#7d6f63', '#8a7b6d', '#6e6258', '#94867a'], rock = () => lam(pick(ROCK)), cliffTop = lam('#a3cf78');
  const CH = 5.5; // cliff height
  W.box(-76, 0, -74, 20, CH, 58, [rock(), rock(), cliffTop, rock(), rock(), rock()]);            // the plateau (Weehawken / Union City)
  for (let z = -74; z < -16; z += rr(0.9, 1.5)) {                                                    // its broken east face: basalt columns
    const w = rr(0.9, 1.6), out = rr(0.6, 3.2), h = CH * rr(0.62, 1.0);
    W.box(-56, 0, z, out, h, w, rock());
    if (rnd() < 0.35) W.box(-56 + out + rr(0.2, 1.2), 0, z + rr(0, w), rr(0.4, 0.9), rr(0.3, 0.7), rr(0.4, 0.9), rock()); // fallen rock
  }
  for (const [z0, h] of [[-16, 4.2], [-14, 2.8], [-12.5, 1.4]] as const) W.box(-76, 0, z0, 22, h, 1.6, rock()); // bare rock, stepping down to Hoboken
  for (let z = -74; z < -16.5; z += rr(1.2, 2.2)) W.box(-57.4 + rr(-0.6, 0.4), CH, z, rr(0.8, 1.6), rr(0.25, 0.8), rr(0.8, 1.6), rock()); // ragged rock along the cliff edge
  for (let x = -75.5; x < -55; x += rr(1.4, 2.4)) W.box(x, CH, -17.4 + rr(-0.4, 0.3), rr(0.9, 1.6), rr(0.25, 0.7), rr(0.8, 1.4), rock()); // and its south end
  // Boulevard East along the top: road, houses looking at the Manhattan skyline, trees on the edge
  W.box(-62, CH, -74, 2.6, 0.1, 58, '#5b6068', false);
  for (let z = -73; z < -18; z += rr(2.6, 3.6)) {
    if (rnd() < 0.8) W.building(-67.6, z, 3.2, rr(2.2, 3), Math.round(rr(2, 5)), pick([...BROWN, '#d8c7a6', '#c9b8a6']), { fronts: ['E'], y0: CH, tank: false });
    if (rnd() < 0.7) W.tree(rr(-58.6, -57), z + 1, rr(0.7, 1), CH);
  }
  for (let i = 0; i < 18; i++) W.tree(rr(-75.5, -69), rr(-73, -18), rr(0.8, 1.2), CH);
  W.car('z', -74, -16, -61.4, 1.8, '#3f7fbf', { y: CH }); W.car('z', -16, -74, -60, 2, '#ece4d5', { y: CH });
  // below the cliff: River Road, the riverside walkway, and the Port Imperial ferry terminal
  W.road(-50, -74, 2.6, 66); W.park(-47.4, -74, 9.4, 64); trees(W, -46.8, -73, -42, -12, 14);
  W.slab(-41.6, -74, 1.2, 64, '#e3dccf', 0.1);                                                       // the walkway along the river
  W.building(-45, -45, 5, 3, 1, '#cfe2ee', { glass: true, fronts: ['E'] });                          // ferry terminal
  W.box(-40.4, -1, -44.2, 4.2, 1.1, 1.6, '#c9a77c'); W.box(-37.4, -1, -45.4, 1.2, 1.15, 4, '#c9a77c'); // ferry pier
  W.car('z', -74, -8, -49.4, 2.2, '#f2c230'); W.car('z', -8, -74, -48, 2, '#5aa469');

  /* ---------- the Lackawanna rail yards: tracks fanning west from Hoboken Terminal, under the long train-shed canopies ---------- */
  const YZ = 29, TRACKS = 10, PITCH = 1.6, YX0 = -76, YX1 = -42;
  W.slab(YX0, YZ - 0.6, YX1 - YX0 + 1.4, TRACKS * PITCH + 1, '#8f857c', 0.08);                     // ballast
  const trackZ = (i: number) => YZ + 0.4 + i * PITCH;
  for (let i = 0; i < TRACKS; i++) {
    const z = trackZ(i);
    for (const dz of [-0.36, 0.28]) W.box(YX0, 0.08, z + dz, YX1 - YX0, 0.07, 0.08, '#4a4542', false);
    W.box(YX1, 0, z - 0.45, 0.4, 0.5, 0.9, '#d9473a');                                               // buffer stop at the Terminal end
  }
  for (let i = 0; i < TRACKS; i += 2) {                                                              // platforms between track pairs, under canopies
    const z = trackZ(i) + PITCH / 2 - 0.35;
    W.box(-63, 0, z, 21, 0.45, 0.7, '#cfc6b6');
    W.box(-63, 2.3, z - 0.35, 21, 0.14, 1.4, '#4f6b5a');
    for (let x = -62.5; x < -42; x += 5) W.box(x, 0.45, z + 0.3, 0.12, 1.85, 0.12, '#3b3836');
  }
  for (const x of [-66, -70]) { W.box(x, 0, YZ - 0.4, 0.25, 3.4, 0.25, '#3b3836'); W.box(x, 0, YZ + TRACKS * PITCH - 0.2, 0.25, 3.4, 0.25, '#3b3836'); W.box(x, 3.2, YZ - 0.4, 0.25, 0.25, TRACKS * PITCH + 0.05, '#3b3836'); } // signal gantries
  /** A train of `cars` cars on track i, its east end at x; a moving one shunts between the yard throat and the buffers. */
  const train = (i: number, x: number, cars: number, speed = 0) => {
    const g = new THREE.Group(), L = 4.2;
    for (let c = 0; c < cars; c++) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(L - 0.2, 1, 0.86), lam('#c9cdd2')); body.position.set(-c * L - L / 2, 0.66, 0);
      const s1 = new THREE.Mesh(new THREE.BoxGeometry(L - 0.2, 0.1, 0.88), lam('#e8833a')); s1.position.set(-c * L - L / 2, 0.55, 0);
      const s2 = new THREE.Mesh(new THREE.BoxGeometry(L - 0.2, 0.08, 0.88), lam('#3f5a9a')); s2.position.set(-c * L - L / 2, 0.42, 0);
      const win = new THREE.Mesh(new THREE.BoxGeometry(L - 0.6, 0.22, 0.9), lam('#4a5560')); win.position.set(-c * L - L / 2, 0.86, 0);
      g.add(body, s1, s2, win);
    }
    g.position.set(x, 0.1, trackZ(i)); W.add(g);
    if (speed) W.movers.push({ obj: g, axis: 'x', a: YX0 + cars * L + 0.5, b: YX1 - 0.5, speed, bounce: true }); // stays on the plate
  };
  train(1, -42.6, 5); train(2, -42.6, 3); train(4, -44, 6); train(6, -42.6, 4); train(7, -50, 2); train(9, -42.6, 5);
  train(3, -55, 3, 2.2); train(8, -48, 3, -1.8);

  /* ---------- Central Park & Columbus Circle ---------- */
  W.hood = null;
  W.park(-30, -74, 42, 12); W.slab(-12, -71, 9, 4, '#7fc3cf', 0.1); trees(W, -29, -73, 11, -62.5, 34);
  W.road(-30, -62, 42, 2);

  /* ---------- Midtown West: 8th Ave north-south; Pop's by Columbus Circle, Lazzara's on W 38th, the Empire State Building ---------- */
  hood('midtown', -30, -60, 12, -24, 36);
  W.road(-24, -60, 3, 36); W.road(-12.4, -60, 4, 36); W.road(0, -60, 3.4, 36);
  for (const [z0, z1] of [[-56, -53.6], [-48.6, -46.2], [-41, -38], [-33, -30.8]]) W.road(-30, z0, 42, z1 - z0);
  W.cyl(-10.4, 0.1, -61, 2.6, 2.6, 0.1, '#e3dccf', 16); W.cyl(-10.4, 0.2, -61, 0.25, 0.22, 7, '#efe8da', 8); W.box(-10.7, 7.2, -61.3, 0.6, 0.8, 0.6, '#9a8f80');
  const midSkip: R[] = [[-17, -60, -12.4, -55.6], [-8.4, -60, 0, -55], [-21, -38, -12.4, -33], [-6.4, -38, -2.6, -33], [3.4, -46.2, 12, -41], [3.4, -30.8, 12, -24]];
  grid(W, [[-30, -24], [-21, -12.4], [-8.4, 0], [3.4, 12]], [[-60, -56], [-53.6, -48.6], [-46.2, -41], [-38, -33], [-30.8, -24]], { pal: [...STONE, ...BRICK], floors: [6, 14], skip: midSkip, shop: 0.5 });
  W.pizza('pops', -16.6, -59.2, 3.4, 3, 5, '#c27a5c', 'E', { sign: "POP'S PIZZA" });
  W.building(-7.6, -59.2, 5, 3.6, 18, pick(GLASS), { glass: true });            // Hearst Tower
  W.building(-20.2, -37.2, 7, 3.4, 4, '#9aa3a8', { fronts: ['E'], shop: true });  // Port Authority
  W.pizza('lazzaras', -6, -37.2, 3, 3.4, 5, '#b5654a', 'S', { sign: "LAZZARA'S", awn: ['#2f3a48', '#f2c230'] });
  W.building(-2.6, -37.2, 1.8, 3.4, 9, pick(BRICK), { fronts: ['S'], tank: true });
  for (const [x0, w, fl] of [[4.2, 3.6, 13], [8, 3.4, 11]] as const) { // Times Square: towers wrapped in billboards
    W.building(x0, -45.4, w, 3.6, fl, pick(STONE), { fronts: ['W', 'S'], shop: true });
    for (const y of [3, 6.5]) { billboard(W, x0 + w / 2, y, -41.75, w - 0.4, 2.6, 0); billboard(W, x0 - 0.05, y, -43.6, 3.2, 2.6, -Math.PI / 2); }
  }
  // the Empire State Building: setback tiers and a mast
  W.building(3.8, -30, 6, 5.6, 5, '#e0cfae', { cornice: null, roof: '#ece3d0' });
  W.building(4.8, -29, 4, 3.6, 16, '#e0cfae', { cornice: null, roof: '#ece3d0', y0: 5 });
  W.building(5.5, -28.4, 2.6, 2.4, 6, '#e0cfae', { cornice: null, roof: '#ece3d0', y0: 21 });
  W.cyl(6.8, 27, -27.2, 0.6, 0.4, 3, '#d8cfbd', 8); W.cyl(6.8, 30, -27.2, 0.12, 0.06, 5, '#8a7f74', 6);
  W.car('z', -60, -24, -11.6, 2.6, '#f2c230'); W.car('z', -24, -60, -9.2, 2.4, '#f2c230'); W.car('z', -55, -26, -11.6, 2.4, '#ece4d5');
  W.car('x', -30, 12, -40, 1.8, '#d9473a', { bus: true }); W.car('x', 12, -30, -38.9, 2.6, '#f2c230');

  /* ---------- West Village: Bleecker St north-south from Christopher to Carmine, 6th Ave and Washington Square to the east ---------- */
  W.hood = null; W.road(-30, -24, 42, 2);                         // W 23rd St
  hood('village', -30, -22, 12, 12, 12);
  W.park(-30, -22, 4, 34); trees(W, -29.6, -21, -26.6, 11, 9);  // Hudson River Park
  W.box(-37, -1, -15, 7, 1.1, 3, '#c9a77c');                     // Pier 45
  W.road(-26, -22, 4, 34); W.road(-10, -22, 2.4, 34); W.road(0, -22, 3.6, 34);
  for (const [z0, z1] of [[-16.4, -14.2], [-6, -3.8], [4, 6.2]]) W.road(-26, z0, 38, z1 - z0);
  const vilSkip: R[] = [[-14.4, -13.6, -10.6, -9.8], [-14.6, -9.6, -10.6, -5.8], [-7, -3, -3.2, 1], [-3.8, -0.2, -0.6, 3.4]];
  grid(W, [[-22, -10], [-7.6, 0], [3.6, 12]], [[-22, -16.4], [-14.2, -6], [-3.8, 4], [6.2, 12]], { pal: [...BRICK, ...BROWN], floors: [3, 6], skip: vilSkip, shop: 0.35 }, [[2, 1], [1, 3]]);
  W.pizza('lindustrie', -13.8, -13.4, 2.8, 3.2, 4, '#9d4b38', 'N', { sign: "L'INDUSTRIE", awn: ['#2f3a48', '#f4efe3'] });
  W.pizza('mamas', -14.2, -9.2, 3.4, 3, 4, '#c27a5c', 'E', { sign: "MAMA'S TOO" });
  W.pizza('johns', -6.8, -2.6, 3.4, 3.2, 4, '#8f4635', 'W', { sign: "JOHN'S", awn: ['#7a2e2a', '#efe1c8'] });
  W.pizza('joes', -3.6, 0, 2.8, 3.2, 4, '#b4644a', 'S', { sign: "JOE'S PIZZA" });
  // West 4th St courts, across Carmine from Joe's
  W.slab(-6.8, 7, 6.2, 4.4, '#c8553d', 0.1);
  W.box(-4.2, 0.1, 7.2, 0.08, 0.02, 4, '#fff6e6', false); W.box(-6.6, 0.1, 9.15, 5.8, 0.02, 0.08, '#fff6e6', false);
  for (const x of [-6.4, -1.0]) { W.box(x, 0, 9, 0.1, 1.8, 0.1, '#3b3836'); W.box(x - 0.05, 1.5, 8.7, 0.2, 0.5, 0.7, '#fff6e6'); }
  W.person(-4.8, 8.5); W.person(-2.6, 10); W.person(-3.4, 9.2);
  // Washington Square: park, fountain, the arch at the foot of Fifth Ave
  W.park(4.4, -13.4, 6.8, 6.6); trees(W, 4.8, -13, 10.8, -7.2, 6);
  W.cyl(7.8, 0, -10, 1.3, 1.3, 0.35, '#d8cfbd', 14); W.cyl(7.8, 0.3, -10, 1, 1, 0.08, '#9fd4e0', 14);
  W.box(6.2, 0, -13.2, 0.9, 3.4, 0.9, '#efe8da'); W.box(8.6, 0, -13.2, 0.9, 3.4, 0.9, '#efe8da'); W.box(6.2, 3.4, -13.2, 3.3, 1.3, 0.9, '#f4efe3');
  W.car('z', -22, 12, -24.8, 2.6, '#ece4d5'); W.car('z', 12, -22, -23, 2.4, '#3f7fbf'); W.car('z', -22, 12, 1, 2.2, '#f2c230'); W.car('z', 12, -22, 2.6, 2, '#5aa469');
  for (let i = 0; i < 5; i++) W.person(-3.2 + i * 0.45, 3.9);

  /* ---------- Financial District: Wall St east-west from Broadway to the river ---------- */
  W.hood = null; W.road(-26, 12, 38, 2.4);                        // Canal St
  hood('fidi', -26, 14.4, 12, 40, 26);
  W.road(-22, 14.4, 3, 25.6); W.road(-13, 14.4, 2.2, 25.6); W.road(-4, 14.4, 2.2, 25.6);
  W.road(-26, 28, 38, 2.4); W.road(-26, 21, 24.2, 2.2); W.road(-22, 35, 34, 2);
  const fidiSkip: R[] = [[-19, 30.4, -13, 35.6], [-10.8, 23.2, -6, 27.4], [-1.8, 19.4, 12, 28]];
  grid(W, [[-26, -22], [-19, -13], [-10.8, -4], [-1.8, 12]], [[14.4, 21], [23.2, 28], [30.4, 35], [37, 40]], { pal: [...STONE, ...GLASS], floors: [10, 22], skip: fidiSkip, shop: 0.3 });
  W.pizza('upside', 0, 24, 3.2, 3.2, 14, pick(STONE), 'S', { sign: 'UPSIDE', tank: true });
  W.building(3.4, 24.2, 4, 3, 18, pick(GLASS), { glass: true });
  temple(W, -18.6, 31.2, 4.4, 3.8, 5, 'E');                         // the Stock Exchange, facing Broad St
  temple(W, -10, 24, 3.6, 2.6, 3, 'S');                             // Federal Hall, on Wall St
  W.park(-20, 40, 24, 6); trees(W, -19, 41, 3, 45.5, 9); W.cyl(-12, 0, 43, 1.6, 1.6, 1.2, '#c9b38f', 16); // the Battery, Castle Clinton
  W.car('x', -26, 12, 28.6, 2, '#f2c230'); W.car('x', 12, -26, 29.8, 2.2, '#ece4d5'); W.car('z', 14.4, 40, -21.2, 2.4, '#3f7fbf');

  /* ---------- the Brooklyn Bridge: stone towers in the river, deck and cables from FiDi to DUMBO ---------- */
  W.hood = null;
  const ST = '#cdb99a';
  W.box(2, 0, 19.6, 6, 5, 4.4, ST); W.box(30, 0, 19.6, 5, 5, 4.4, ST);           // anchorages
  W.box(5, 4.5, 20.6, 28, 0.5, 2.4, '#8a7f74');                                    // deck
  W.box(5, 5, 20.6, 28, 0.05, 2.4, '#c9bfae', false);
  for (const x of [13.2, 19.2]) {
    W.box(x, -1, 19.6, 1.6, 5.5, 4.4, ST);
    W.box(x, 4.5, 19.6, 1.6, 8, 1, ST); W.box(x, 4.5, 23, 1.6, 8, 1, ST); W.box(x, 4.5, 21.6, 1.6, 8, 0.4, ST);
    W.box(x, 10.5, 19.6, 1.6, 2.5, 4.4, ST); W.box(x - 0.15, 13, 19.45, 1.9, 0.4, 4.7, '#a89070');
  }
  const cable = new THREE.LineBasicMaterial({ color: '#3b3836' });
  const cy = (x: number) => (x < 14 ? 5 + ((x - 5) / 9) * 8 : x > 20 ? 13 - ((x - 20) / 12) * 8 : 6.5 + 6.5 * ((x - 17) / 3) ** 2);
  for (const z of [20.8, 22.8]) {
    const pts: THREE.Vector3[] = []; for (let x = 5; x <= 32; x += 0.5) pts.push(new THREE.Vector3(x, cy(x), z));
    W.root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cable));
    const sus: THREE.Vector3[] = []; for (let x = 6; x <= 31; x += 1) if (Math.abs(x - 14) > 0.9 && Math.abs(x - 20) > 0.9) sus.push(new THREE.Vector3(x, 5, z), new THREE.Vector3(x, cy(x), z));
    W.root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(sus), cable));
  }
  W.car('x', 5, 33, 21.3, 2.6, '#f2c230', { y: 5 }); W.car('x', 33, 5, 22.4, 2.4, '#ece4d5', { y: 5 });

  /* ---------- DUMBO: Water and Front Sts east-west, Old Fulton north-south, Brooklyn Bridge Park on the water ---------- */
  hood('dumbo', 22, 8, 46, 32, 14);
  W.park(22, 8, 4.6, 24); trees(W, 22.4, 16, 26.2, 31.5, 6);
  // the carousel in its glass pavilion
  W.cyl(24.3, 0, 12, 1.9, 1.9, 0.2, '#e3dccf', 16);
  W.add(at(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 1.6, 16), new THREE.MeshLambertMaterial({ color: '#cfe2ee', transparent: true, opacity: 0.8 })), 24.3, 1, 12));
  W.cyl(24.3, 0.2, 12, 1.2, 1.2, 1.1, '#e8bb4f', 12);
  W.add(at(new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.9, 16), lam('#d9473a')), 24.3, 2.25, 12));
  W.road(26.6, 8, 2.8, 24); W.road(35.4, 8, 2, 24); W.road(42, 8, 2.4, 24);
  W.road(26.6, 14.6, 19.4, 2.2); W.road(26.6, 25, 19.4, 2.4);
  const dumSkip: R[] = [[29.4, 19.4, 35.4, 24.4], [30, 28, 34, 31.6], [38, 17.4, 41.4, 20.8], [38, 8.6, 42, 14]];
  grid(W, [[29.4, 35.4], [37.4, 42], [44.4, 46]], [[8, 14.6], [16.8, 25], [27.4, 32]], { pal: BRICK, floors: [5, 9], skip: dumSkip, shop: 0.3 });
  W.pizza('grimaldis', 30.2, 28.2, 3.6, 3.2, 3, '#a9563f', 'N', { sign: "GRIMALDI'S" });
  W.pizza('ignazios', 38.2, 17.6, 3, 3, 2, '#e3dccd', 'N', { sign: "IGNAZIO'S", awn: ['#2f6b4f', '#f4efe3'] });
  const ct = W.building(38.2, 8.8, 3.8, 5, 12, '#b4644a', { fronts: ['S'], tank: false }); // the clock tower building
  W.building(39.1, 10.2, 2, 2, 3, '#c27a5c', { y0: ct, cornice: '#5b4f45' }); W.box(39.6, ct + 1.2, 12.2, 1, 1, 0.06, '#fff8ec');
  for (let i = 0; i < 6; i++) W.person(30.6 + i * 0.5, 27.8 - (i % 2) * 0.2);
  W.car('z', 8, 32, 27.4, 2, '#f2c230'); W.car('x', 26.6, 46, 15.2, 2, '#3f7fbf'); W.car('x', 46, 26.6, 26.2, 1.8, '#ece4d5');
  W.boat('z', -74, 70, 17, 1.6); W.boat('z', 70, -60, -34, 1.4, '#ece4d5'); W.boat('x', -36, 20, 52, 1.2);

  /* ---------- context Brooklyn (and Prospect Park) between DUMBO and Midwood ---------- */
  W.hood = null;
  W.context(22, 32, 68, 50, [2, 5], [[32, 38, 46, 50]]); W.park(32.4, 38.4, 13, 11.4); trees(W, 33, 39, 45, 49.4, 16);
  W.context(46, 6, 68, 32, [3, 6]);

  /* ---------- the Greenpoint / North Williamsburg waterfront, north of DUMBO along the East River ---------- */
  // piers stop at x 18, clear of the East River ferry lane (x 17)
  const WATER = lam('#6fb7c4'); // the shared water material, so the creek follows the time of day
  // Newtown Creek along the top edge, with the wastewater plant's silver "digester eggs" beside it
  W.box(22, 0, -73.6, 26, 0.04, 3.4, WATER, false);
  for (const z of [-73.8, -70.1]) W.box(22, 0, z, 26, 0.22, 0.25, '#b9b3aa');                       // bulkheads
  W.slab(33, -68.6, 12, 7.4, '#cfc8bb', 0.1);
  const eggs: [number, number][] = [[35.4, -66.4], [38.6, -66.4], [41.8, -66.4], [44.6, -66.4]];
  for (const [x, z] of eggs) {
    W.cyl(x, 0.1, z, 1.1, 1.1, 0.6, '#9aa3a8', 12);
    W.add(at(new THREE.Mesh(new THREE.SphereGeometry(1.25, 18, 14), lam('#d4d9de')), x, 2.6, z)).scale.set(1, 1.75, 1);
    W.cyl(x, 2.4, z, 1.3, 1.3, 0.12, '#8a9096', 16);                                                 // steel collar
  }
  W.box(35.2, 4.7, -66.6, 9.6, 0.18, 0.4, '#6b6f78');                                                 // the catwalk across the tops
  W.building(36, -63.4, 6, 2, 2, '#c9b8a6', { fronts: ['S'], cornice: '#6b6f78' });                   // plant building
  // Greenpoint Landing: new glass towers at the creek mouth
  W.building(24.6, -67.6, 4, 4, 16, pick(GLASS), { glass: true }); W.building(29.2, -66.8, 3.4, 3.4, 12, pick(GLASS), { glass: true });
  // the waterfront: lawn and a walkway along the river, Kent Ave behind
  W.park(22, -62, 4.4, 66); W.slab(22.4, -62, 0.9, 66, '#e3dccf', 0.1); trees(W, 23.6, -61, 26, 3, 16);
  W.road(26.4, -74, 2.6, 78); W.road(28.9, -40, 15, 2.2); W.road(28.9, -18, 15, 2.2);
  W.car('z', -74, 4, 27.1, 2.2, '#f2c230'); W.car('z', 4, -74, 28.3, 2, '#3f7fbf');
  // four piers into the river
  const pier = (zc: number) => { W.box(18, -1, zc - 1.1, 4.2, 1.12, 2.2, '#c9a77c'); for (const x of [18.3, 21.6]) for (const dz of [-0.95, 0.95]) W.box(x, 0.12, zc + dz - 0.04, 0.08, 0.6, 0.08, '#4a4542'); };
  pier(-56); W.lamp(19, -56.6); W.person(20.4, -55.6); W.person(19.6, -55.4);                          // Transmitter Park pier
  W.box(36.4, 0, -59.2, 1.2, 0.08, 1.2, '#93c66c'); W.box(36.8, 0, -58.8, 0.3, 6, 0.3, '#b9583f');     // the old radio mast, in the park
  pier(-44); W.box(18.4, 0.12, -44.9, 3.4, 1.4, 1.8, [lam('#9aa3a8'), lam('#9aa3a8'), lam('#6b6f78'), lam('#6b6f78'), lam('#9aa3a8'), lam('#9aa3a8')]); // pier shed
  pier(-30); W.building(20.2, -30.8, 1.6, 1.6, 1, '#cfe2ee', { glass: true });                        // NYC Ferry stop
  W.boat('x', 20, 20.01, -32, 0.001, '#f4efe3');                                                      // a ferry, moored alongside
  pier(-14); for (const z of [-14.6, -13.4]) W.box(19.4, 0.12, z, 1.2, 0.35, 0.3, '#8a6a45');          // benches on the last one
  W.person(20.8, -14.2); W.person(21.2, -13.7);
  // behind Kent Ave: lofts and rowhouses, Bushwick Inlet Park, the old Domino sugar refinery
  for (const [z, fl, c] of [[-61, 5, '#a9563f'], [-57.6, 4, '#9c5643'], [-54.4, 6, '#b5654a'], [-50.8, 5, '#8f4635'], [-47.4, 4, '#c27a5c']] as const)
    W.building(29.6, z, 4.6, 3.2, fl, c, { fronts: ['W'], shop: rnd() < 0.5, tank: fl > 5 });
  for (let z = -61; z < -44; z += 2.6) W.building(35.4, z, 2.4, 3, 3, pick(BROWN), { fronts: ['E'] });  // rowhouses on the next street
  W.park(29.2, -37.6, 13, 18); W.slab(31, -35, 8, 5, '#7fb862', 0.1);                                 // Bushwick Inlet Park and its pitch
  W.box(31.3, 0.1, -32.6, 7.4, 0.02, 0.08, '#fff6e6', false); W.box(34.96, 0.1, -34.7, 0.08, 0.02, 4.4, '#fff6e6', false);
  trees(W, 30, -27, 41.5, -20.5, 9);
  const dom = W.building(30, -14.6, 6.6, 5.6, 9, '#9d4b38', { fronts: ['W', 'S'], cornice: '#5b4f45' }); // the refinery
  W.building(31.2, -13.4, 2.6, 2.6, 3, '#9d4b38', { y0: dom, cornice: '#5b4f45' });
  W.cyl(35.6, 0, -12.6, 0.6, 0.45, 14, '#8f4635', 10);                                                // its smokestack
  W.park(29.2, -8.2, 8.6, 11.6); trees(W, 30, -7.6, 37, 2.6, 6);                                       // Domino Park
  W.building(38.6, -14.6, 4, 4, 14, pick(GLASS), { glass: true });                                    // a new tower behind it
  W.context(22, 50, 44, 76, [2, 4]);

  /* ---------- Midwood: Avenue J east-west, the B/Q in its cut, Di Fara at E 15th St ---------- */
  hood('midwood', 44, 50, 68, 76, 8);
  W.slab(45.4, 50, 3.2, 26, '#6b625a', 0.04);
  for (const x of [45.3, 48.5]) W.box(x, 0, 50, 0.2, 0.5, 26, '#bdb6aa');
  for (const x of [46.2, 47.6]) W.box(x, 0.04, 50, 0.08, 0.06, 26, '#4a4542', false);
  W.road(44, 59, 24, 3); W.road(52, 50, 2.2, 26); W.road(60, 50, 2.2, 26);
  W.building(45, 57.6, 4, 1.4, 2, '#d9cdb8', { fronts: ['N', 'S'], cornice: '#3f8f5a', y0: 0 });  // station house over the cut
  W.pizza('difara', 55, 62.8, 3, 3.4, 2, '#d8c7a6', 'N', { sign: 'DI FARA', awn: ['#7a2e2a', '#efe1c8'] });
  for (const [x0, x1] of [[48.6, 52], [54.2, 60], [62.2, 68]]) {
    for (let x = x0 + 0.5; x + 2.4 <= x1 - 0.3; x += 2.6) {
      if (!(x < 58 && x + 2.4 > 55)) W.building(x, 62.8, 2.4, 2.6, rnd() < 0.5 ? 1 : 2, pick(['#d8c7a6', '#c9b8a6', '#e3dccd', '#b4644a']), { fronts: ['N'], shop: true });
      W.building(x, 55.6, 2.4, 2.6, rnd() < 0.5 ? 1 : 2, pick(['#d8c7a6', '#c9b8a6', '#e3dccd', '#b4644a']), { fronts: ['S'], shop: true });
      W.house(x, 51, 2.4, 3, pick(['#e9d6b8', '#cfe0d6', '#f0dcc8', '#c9d6dc']), pick(['#b9583f', '#5a6e7a', '#8a4f3a']), 'S');
      W.house(x, 67, 2.4, 3, pick(['#e9d6b8', '#cfe0d6', '#f0dcc8', '#c9d6dc']), pick(['#b9583f', '#5a6e7a', '#8a4f3a']), 'N');
      W.tree(x + 1.2, 70.8, 0.9);
    }
  }
  W.car('z', 50, 76, 46.9, 3.2, '#c9cdd2', { bus: true }); W.car('x', 44, 68, 60, 1.8, '#5aa469'); W.car('x', 68, 44, 61.2, 2, '#f2c230');
  for (let i = 0; i < 3; i++) W.person(55.6 + i * 0.5, 62.4);

  /* ---------- Liberty Island ---------- */
  W.hood = null;
  W.cyl(-19, 0, 61, 3.4, 3.4, 1, '#d9cdb8', 8); W.box(-20, 1, 60, 2, 3, 2, '#cfc3ad');
  W.cyl(-19, 4, 61, 0.75, 0.45, 3.2, '#7fbfa8', 8); W.cyl(-19, 7.2, 61, 0.4, 0.35, 0.7, '#7fbfa8', 8);
  W.box(-18.7, 6.4, 60.8, 0.25, 2, 0.25, '#7fbfa8');
  const torch = new THREE.MeshLambertMaterial({ color: '#f2c230', emissive: '#f2c230', emissiveIntensity: 0.5 }); W.glow.push(torch);
  W.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), torch), -18.6, 8.6, 60.9));
  trees(W, -23.5, 56.5, -14.5, 65.5, 6);

  W.finish();
  return W;
}
