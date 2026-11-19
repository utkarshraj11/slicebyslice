/* The live map: a three.js scene rendered at low resolution through RenderPixelatedPass (chunky pixels,
   edge outlines from depth/normals), an orthographic camera that frames a place / neighbourhood / the whole map
   and swings smoothly between the four quarter-turn views, pointer/wheel/pinch input, and DOM pins and labels
   projected on top. UI state lives in store.ts; the map reads it through `getView` and reports taps via callbacks. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HOODS, HOOD_IDS, PLACES, type HoodId } from '../data/places';
import { type Dir, thetaOf } from './compass';
import { buildWorld } from './layout';
import { lam, type Bounds } from './kit';

export interface MapView { mode: 'overview' | 'hood'; curHood: HoodId | null; curPlace: string | null; panelOpen: boolean }
export interface MapCallbacks {
  getView(): MapView;
  onPin(id: string): void;
  onHood(id: HoodId): void;
  onBackground(): void;
  /** the user dragged the view round; k is the nearest quarter-turn view (for the store's rotation state) */
  onRotate(k: number): void;
  /** camera changed: a round scale-bar length, its width on screen, and zoom % */
  onScale(metres: number, px: number, pct: number): void;
}
export interface MapHandle {
  refit(dur?: number): void;
  setActivePin(id: string | null): void;
  setOverview(on: boolean): void;
  /** Swing the camera to view rotation k (quarter turns). Resolves when it gets there. */
  setRotation(k: number): Promise<void>;
  /** Compass side a pizzeria's storefront faces. */
  facing(id: string): Dir;
  zoomBy(f: number): void;
  /** 0 day, 1 dusk, 2 night */
  setTime(k: number): void;
  destroy(): void;
}

const M_PER_UNIT = 4;
/** Size of one art pixel in CSS px: lower is sharper (1 ≈ full resolution, 3 = chunky). */
const PIXEL_CSS = 1.5;
/** Radians of turn per px of horizontal drag. */
const TURN = 0.008;
const ELEV = Math.atan(1 / Math.SQRT2); // true isometric tilt
const UP = new THREE.Vector3(0, 1, 0);
const WORLD: Bounds = { x0: -76, z0: -74, x1: 68, z1: 76, y1: 12 };
const WORLD_PHONE: Bounds = { x0: -30, z0: -62, x1: 68, z1: 76, y1: 12 }; // Manhattan and Brooklyn
const TIMES = [
  { bg: '#f3efe5', hemi: ['#dfefff', 1.15], sun: ['#fff1d6', 2.1, [40, 80, 25]], win: 0, glow: 0.55, water: '#6fb7c4' },
  { bg: '#f1c9a5', hemi: ['#b9a0d8', 0.8], sun: ['#ff9a5a', 1.7, [70, 25, -20]], win: 0.7, glow: 0.9, water: '#7f8fb8' },
  { bg: '#1f2340', hemi: ['#4a5590', 0.45], sun: ['#9fb0ff', 0.35, [-40, 80, 20]], win: 1.4, glow: 1.2, water: '#2c3f66' },
] as const;
const PIN_SVG = `<svg viewBox="-15 -42 30 44" width="30" height="44" aria-hidden="true"><ellipse cx="0" cy="0" rx="6" ry="2.4" fill="rgba(0,0,0,.25)"/><g class="pb"><path d="M0 0C-4 -7 -13 -13 -13 -24A13 13 0 1 1 13 -24C13 -13 4 -7 0 0Z" fill="#d9473a" stroke="#2e2b29" stroke-width="1.7"/><circle cx="0" cy="-24" r="8.6" fill="#fff8ec" stroke="#2e2b29" stroke-width="1.2"/><path d="M-5 -28Q0 -30.2 5 -28L0 -18Z" fill="#f6c453" stroke="#c9813c" stroke-width="1"/><circle cx="-1.2" cy="-25.6" r="1.1" fill="#d9473a"/><circle cx="1.4" cy="-23.6" r="1" fill="#d9473a"/></g></svg>`;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function createMap(host: HTMLDivElement, overlay: HTMLDivElement, cb: MapCallbacks, initialRot = 0): MapHandle {
  const W = buildWorld();
  const scene = new THREE.Scene(); scene.add(W.root);
  const water = lam('#6fb7c4');
  const hemi = new THREE.HemisphereLight('#dfefff', '#8a7f74', 1.15); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d6', 2.1); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 1, far: 400 });
  sun.shadow.bias = -0.0005; scene.add(sun, sun.target);

  let Wpx = innerWidth, Hpx = innerHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  const dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr); renderer.setSize(Wpx, Hpx); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.BasicShadowMap;
  host.appendChild(renderer.domElement);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1200);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPixelatedPass(Math.max(1, Math.round(PIXEL_CSS * dpr)), scene, cam, { normalEdgeStrength: 0.35, depthEdgeStrength: 0.5 }));
  composer.addPass(new OutputPass());
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setTime(k: number) {
    const t = TIMES[k] ?? TIMES[0];
    scene.background = new THREE.Color(t.bg); document.documentElement.style.setProperty('--map-bg', t.bg);
    hemi.color.set(t.hemi[0]); hemi.intensity = t.hemi[1];
    sun.color.set(t.sun[0]); sun.intensity = t.sun[1]; const [sx, sy, sz] = t.sun[2]; sun.position.set(sx, sy, sz);
    W.windows.forEach(m => (m.emissiveIntensity = t.win)); W.glow.forEach(m => (m.emissiveIntensity = t.glow));
    water.color.set(t.water);
    overlay.classList.toggle('night', k === 2);
  }
  setTime(0);

  /* ---------- camera: target on the ground, azimuth theta, visible height viewH (world units) ---------- */
  let rotK = initialRot, theta = thetaOf(rotK), viewH = 200;
  const target = new THREE.Vector3();
  const dirOf = (th: number) => new THREE.Vector3(Math.sin(th) * Math.cos(ELEV), Math.sin(ELEV), Math.cos(th) * Math.cos(ELEV));
  const basis = (th: number) => { const f = dirOf(th).negate(), r = new THREE.Vector3().crossVectors(f, UP).normalize(); return { f, r, u: new THREE.Vector3().crossVectors(r, f).normalize() }; };
  /** Slide a point along the view direction onto the ground plane. */
  const ground = (p: THREE.Vector3, th: number) => { const { f } = basis(th); return p.addScaledVector(f, -p.y / f.y); };
  const px = () => Hpx / viewH; // screen px per world unit
  let lastScale = '', lastNorth = NaN;
  function apply() {
    cam.position.copy(target).addScaledVector(dirOf(theta), 500); cam.up.copy(UP); cam.lookAt(target);
    const a = Wpx / Hpx; Object.assign(cam, { top: viewH / 2, bottom: -viewH / 2, left: (-viewH * a) / 2, right: (viewH * a) / 2 });
    cam.updateProjectionMatrix();
    const ppm = px() / M_PER_UNIT, m = [5, 10, 20, 50, 100, 200, 500, 1000, 2000].find(v => v * ppm >= 60) ?? 2000;
    const key = m + ':' + Math.round(viewH);
    if (key !== lastScale) { lastScale = key; cb.onScale(m, m * ppm, Math.round((100 * 200) / viewH)); }
    // compass needle: screen angle of world north (−z), 0° = up
    const { r, u } = basis(theta), deg = Math.round((Math.atan2(-r.z, -u.z) * 180) / Math.PI);
    if (deg !== lastNorth) { lastNorth = deg; document.documentElement.style.setProperty('--north', deg + 'deg'); }
  }

  /** Screen area not covered by the header, panel, hood bar. */
  function avail(v: MapView) {
    const phone = Wpx < 760;
    let x0 = 20, y0 = v.mode === 'overview' ? 150 : 90, x1 = Wpx - 20, y1 = Hpx - (v.mode === 'overview' ? 50 : 90);
    if (v.panelOpen) { if (phone) y1 = Math.min(y1, Hpx * 0.42); else x1 = Wpx - 450; }
    if (phone) { y0 = 70; y1 = Math.min(y1, Hpx - 150); }
    return { x0, y0, x1, y1 };
  }
  function boundsFor(v: MapView): Bounds {
    if (v.curPlace && W.pins[v.curPlace]) { const p = W.pins[v.curPlace].pos; return { x0: p.x - 11, x1: p.x + 11, z0: p.z - 11, z1: p.z + 11, y1: p.y }; }
    if (v.mode === 'hood' && v.curHood) return W.hoods[v.curHood]!;
    return Wpx < 760 ? WORLD_PHONE : WORLD;
  }
  function fit(b: Bounds, th: number) {
    const { r, u } = basis(th), a = avail(cb.getView());
    let r0 = Infinity, r1 = -Infinity, u0 = Infinity, u1 = -Infinity;
    for (const x of [b.x0, b.x1]) for (const y of [0, b.y1]) for (const z of [b.z0, b.z1]) {
      const p = new THREE.Vector3(x, y, z), pr = p.dot(r), pu = p.dot(u);
      r0 = Math.min(r0, pr); r1 = Math.max(r1, pr); u0 = Math.min(u0, pu); u1 = Math.max(u1, pu);
    }
    const s = Math.min((a.x1 - a.x0) / (r1 - r0), (a.y1 - a.y0) / (u1 - u0));
    const offx = (a.x0 + a.x1) / 2 - Wpx / 2, offy = Hpx / 2 - (a.y0 + a.y1) / 2;
    const c = r.clone().multiplyScalar((r0 + r1) / 2 - offx / s).addScaledVector(u, (u0 + u1) / 2 - offy / s);
    return { target: ground(c, th), viewH: Hpx / s };
  }

  let anim: { t0: number; dur: number; from: [THREE.Vector3, number, number]; to: [THREE.Vector3, number, number]; done?: () => void } | null = null;
  function flyTo(tg: THREE.Vector3, vh: number, th: number, dur: number, done?: () => void) {
    if (still || dur <= 0) { target.copy(tg); viewH = vh; theta = th; anim = null; apply(); done?.(); return; }
    anim?.done?.();
    anim = { t0: performance.now(), dur, from: [target.clone(), viewH, theta], to: [tg, vh, th], done };
  }
  /** Goal azimuth for rotation k, the short way round from where we are. */
  const goalTheta = () => { const g = thetaOf(rotK); return theta + (((g - theta) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; };
  /** After a free drag-turn, framing keeps the user's angle until a quarter turn is asked for. */
  let keepTheta = false;
  function refit(dur = 1100, done?: () => void) { const th = keepTheta ? theta : goalTheta(), f = fit(boundsFor(cb.getView()), th); flyTo(f.target, f.viewH, th, dur, done); }
  const clampH = (h: number) => Math.min(320, Math.max(10, h));

  /* ---------- pins and labels (DOM, projected each frame) ---------- */
  const pinEls: Record<string, HTMLButtonElement> = {};
  for (const p of PLACES) {
    if (!W.pins[p.id]) throw new Error(`No pizza(...) call registers a pin for place "${p.id}"`);
    const b = document.createElement('button');
    b.className = 'pin3'; b.dataset.id = p.id; b.setAttribute('aria-label', `${p.name}, open review`);
    b.innerHTML = PIN_SVG + `<span class="tag">${p.name.replace(/</g, '&lt;')}</span>`;
    b.onclick = () => cb.onPin(p.id);
    overlay.appendChild(b); pinEls[p.id] = b;
  }
  const labelEls: Partial<Record<HoodId, HTMLButtonElement>> = {};
  for (const h of HOOD_IDS) {
    const n = PLACES.filter(p => p.hood === h).length, b = document.createElement('button');
    b.className = 'hlabel'; b.innerHTML = `<i style="background:${HOODS[h].color}"></i><b>${HOODS[h].name}</b><small>${HOODS[h].sub} · ${n} spot${n > 1 ? 's' : ''}</small>`;
    b.onclick = () => cb.onHood(h);
    overlay.appendChild(b); labelEls[h] = b;
  }
  const v3 = new THREE.Vector3();
  const toScreen = (x: number, y: number, z: number) => { v3.set(x, y, z).project(cam); return [((v3.x + 1) / 2) * Wpx, ((1 - v3.y) / 2) * Hpx] as const; };
  function placeOverlay() {
    for (const id in pinEls) { const p = W.pins[id].pos, [x, y] = toScreen(p.x, p.y, p.z); pinEls[id].style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; }
    for (const h of HOOD_IDS) {
      // hang the label where a line from the neighbourhood's centre toward the camera leaves it: one point, moving smoothly as the view turns
      const b = W.hoods[h]!, hw = (b.x1 - b.x0) / 2, hd = (b.z1 - b.z0) / 2, dx = Math.sin(theta), dz = Math.cos(theta);
      const t = Math.min(hw / Math.max(1e-6, Math.abs(dx)), hd / Math.max(1e-6, Math.abs(dz)));
      const [x, y] = toScreen(b.x0 + hw + dx * t, 0, b.z0 + hd + dz * t);
      labelEls[h]!.style.transform = `translate(${x.toFixed(1)}px,${(y + 8).toFixed(1)}px)`;
    }
    overlay.classList.toggle('near', viewH < 70);
  }

  /* ---------- cutaway: hide whatever stands between the camera and the open storefront ---------- */
  let activeId: string | null = null, cutDirty = false;
  const hidden: THREE.Object3D[] = [], boxes = new Map<THREE.Object3D, THREE.Box3>();
  const solids: THREE.Mesh[] = [];
  W.root.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && m.castShadow && m.parent === W.root) solids.push(m); });
  function rectOf(b: THREE.Box3) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
      const [sx, sy] = toScreen(x, y, z); x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return { x0, y0, x1, y1 };
  }
  function cutaway() {
    hidden.forEach(o => (o.visible = true)); hidden.length = 0;
    if (!activeId) return;
    const pb = W.pins[activeId].box, own = new THREE.Box3(new THREE.Vector3(pb.x0, 0, pb.z0), new THREE.Vector3(pb.x1, pb.y1, pb.z1));
    const f = basis(theta).f, depth = (b: THREE.Box3) => b.getCenter(v3).dot(f);
    const r = rectOf(own), d0 = depth(own);
    for (const m of solids) {
      let b = boxes.get(m); if (!b) boxes.set(m, (b = new THREE.Box3().setFromObject(m)));
      if (b.max.y < 0.5 || b.intersectsBox(own) || depth(b) >= d0 - 0.5) continue;
      const q = rectOf(b);
      if (q.x0 < r.x1 && q.x1 > r.x0 && q.y0 < r.y1 && q.y1 > r.y0) { m.visible = false; hidden.push(m); }
    }
  }

  /* ---------- input ---------- */
  const el = renderer.domElement;
  const pts = new Map<number, { x: number; y: number }>();
  let drag: { x: number; y: number; moved: boolean; pan: boolean } | null = null, pinch = 0, mid: [number, number] | null = null;
  const panBy = (dx: number, dy: number) => { const { r, u } = basis(theta), s = px(); target.addScaledVector(r, -dx / s).addScaledVector(u, dy / s); ground(target, theta); };
  function zoomAt(f: number, cx: number, cy: number) {
    const { r, u } = basis(theta), s = px(), ox = cx - Wpx / 2, oy = cy - Hpx / 2;
    const P = target.clone().addScaledVector(r, ox / s).addScaledVector(u, -oy / s);
    viewH = clampH(viewH * f); const s2 = px();
    target.copy(P).addScaledVector(r, -ox / s2).addScaledVector(u, oy / s2); ground(target, theta);
  }
  const ray = new THREE.Raycaster();
  function tap(cx: number, cy: number) {
    // a pizzeria's outline on screen wins even when a nearer building hides it: its pin is always drawn on top
    const f = basis(theta).f, onScreen = Object.keys(W.pins).map(id => {
      const b = W.pins[id].box, box = new THREE.Box3(new THREE.Vector3(b.x0, 0, b.z0), new THREE.Vector3(b.x1, b.y1, b.z1)), r = rectOf(box);
      return { id, inside: cx >= r.x0 && cx <= r.x1 && cy >= r.y0 && cy <= r.y1, depth: box.getCenter(new THREE.Vector3()).dot(f) };
    }).filter(x => x.inside).sort((a, b) => a.depth - b.depth)[0];
    if (onScreen) return cb.onPin(onScreen.id);
    ray.setFromCamera(new THREE.Vector2((cx / Wpx) * 2 - 1, -(cy / Hpx) * 2 + 1), cam);
    // first hit that's actually drawn (raycasting ignores .visible, and the cutaway hides buildings)
    const shown = (o: THREE.Object3D | null): boolean => !o || (o.visible && shown(o.parent));
    const hit = ray.intersectObjects(W.root.children, true).find(x => (x.object as THREE.Mesh).isMesh && shown(x.object)), v = cb.getView();
    // a pizzeria's walls, awning, sign, or the pavement right in front of it open its review
    const place = (hit?.object.userData.place as string | undefined) ?? (hit && Object.keys(W.pins).find(id => {
      const b = W.pins[id].box; return hit.point.x > b.x0 - 1.2 && hit.point.x < b.x1 + 1.2 && hit.point.z > b.z0 - 1.2 && hit.point.z < b.z1 + 1.2 && hit.point.y < 1;
    }));
    if (place) return cb.onPin(place);
    const h = hit && HOOD_IDS.find(id => { const b = W.hoods[id]!; return hit.point.x >= b.x0 && hit.point.x <= b.x1 && hit.point.z >= b.z0 && hit.point.z <= b.z1; });
    if (h && (v.mode === 'overview' || v.curHood !== h)) cb.onHood(h); else cb.onBackground();
  }
  const onDown = (e: PointerEvent) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); drag = null; return; }
    drag = { x: e.clientX, y: e.clientY, moved: false, pan: e.button === 2 || e.shiftKey };
    anim = null;
  };
  const onMove = (e: PointerEvent) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId)!; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), c: [number, number] = [(a.x + b.x) / 2, (a.y + b.y) / 2];
      if (pinch) { zoomAt(pinch / d, c[0], c[1]); if (mid) panBy(c[0] - mid[0], c[1] - mid[1]); apply(); cutDirty = true; }
      pinch = d; mid = c; return;
    }
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) { drag.moved = true; el.setPointerCapture(e.pointerId); host.classList.add('dragging'); }
    if (!drag.moved) return;
    if (drag.pan) panBy(e.clientX - prev.x, e.clientY - prev.y);
    else { theta -= (e.clientX - prev.x) * TURN; keepTheta = true; } // turn about the screen centre, content follows the cursor
    apply();
  };
  const onUp = (e: PointerEvent) => {
    pts.delete(e.pointerId); if (pts.size < 2) { pinch = 0; mid = null; }
    if (drag?.moved && !drag.pan) cb.onRotate(Math.round((-Math.PI / 4 - theta) / (Math.PI / 2)));
    if (drag && !drag.moved && e.button !== 2) tap(e.clientX, e.clientY);
    if (drag?.moved) cutDirty = true;
    drag = null; host.classList.remove('dragging');
  };
  const onWheel = (e: WheelEvent) => { e.preventDefault(); anim = null; zoomAt(Math.exp(e.deltaY * 0.0015), e.clientX, e.clientY); apply(); cutDirty = true; };
  const onCtx = (e: Event) => e.preventDefault();
  const onResize = () => { Wpx = innerWidth; Hpx = innerHeight; renderer.setSize(Wpx, Hpx); composer.setSize(Wpx, Hpx); refit(0); };
  el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
  el.addEventListener('wheel', onWheel, { passive: false }); el.addEventListener('contextmenu', onCtx);
  addEventListener('resize', onResize);

  /* ---------- loop ---------- */
  let last = performance.now();
  renderer.setAnimationLoop(now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (anim) {
      const k = Math.min(1, (now - anim.t0) / anim.dur), e = ease(k);
      target.lerpVectors(anim.from[0], anim.to[0], e);
      viewH = Math.exp(Math.log(anim.from[1]) + (Math.log(anim.to[1]) - Math.log(anim.from[1])) * e) * (1 + 0.12 * Math.sin(Math.PI * e)); // slight zoom-out bump
      theta = anim.from[2] + (anim.to[2] - anim.from[2]) * e;
      if (k >= 1) { const d = anim.done; anim = null; cutDirty = true; d?.(); }
    }
    if (!still) for (const m of W.movers) {
      const p = m.axis === 'x' ? 'x' : 'z', lo = Math.min(m.a, m.b), hi = Math.max(m.a, m.b);
      m.obj.position[p] += m.speed * dt;
      if (m.obj.position[p] > hi) m.obj.position[p] = lo; else if (m.obj.position[p] < lo) m.obj.position[p] = hi;
    }
    apply();
    if (cutDirty && !anim) { cutDirty = false; cutaway(); }
    composer.render(); placeOverlay();
  });
  refit(0);

  return {
    refit: (dur = 1100) => refit(dur),
    setActivePin: id => { activeId = id; cutDirty = true; if (!id) cutaway(); for (const k in pinEls) pinEls[k].classList.toggle('active', k === id); },
    setOverview: on => overlay.classList.toggle('ov', on),
    setRotation: k => new Promise<void>(res => { rotK = ((k % 4) + 4) % 4; keepTheta = false; refit(900, res); }),
    facing: id => W.pins[id].facing,
    zoomBy: f => { flyTo(target.clone(), clampH(viewH * f), theta, 350); },
    setTime,
    destroy: () => {
      renderer.setAnimationLoop(null);
      el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel); el.removeEventListener('contextmenu', onCtx);
      removeEventListener('resize', onResize);
      composer.dispose(); renderer.dispose(); el.remove(); overlay.innerHTML = '';
    },
  };
}
