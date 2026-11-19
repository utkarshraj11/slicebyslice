/* The live map: mounts the scene into an <svg>, runs the camera, pointer input and animation loop,
   rebuilds the scene when the view rotates, and x-rays whatever stands in front of the open pizzeria.
   UI state lives outside (store.ts); the map reads it through `getView` and reports taps via callbacks. */
import type { HoodId } from '../data/places';
import { type Dir, S, iso, iso0, rot, f1, setRot, getRot } from './iso';
import { mountScene, moverIndex, tileCorners, type Scene, type SceneLayers, type TopItem } from './scene';
import type { Tile, Mover, Item, AABB } from './tile';

export interface MapView { mode: 'overview' | 'hood'; curHood: HoodId | null; curPlace: string | null; panelOpen: boolean }
export interface MapCallbacks {
  getView(): MapView;
  onPin(id: string): void;
  onHood(id: HoodId): void;
  onBackground(): void;
  /** user dragged / zoomed / tapped: stop the tour */
  onUserMove(): void;
  /** mouse drag turned the view a quarter turn (+1 / -1) */
  onTurn(dir: number): void;
  /** camera changed: a round scale-bar length, its width on screen, and zoom (100% = 1 SVG unit per pixel) */
  onScale(metres: number, px: number, pct: number): void;
}
export interface MapHandle {
  refit(dur?: number): void;
  setActivePin(id: string | null): void;
  setOverview(on: boolean): void;
  /** Rebuild the scene for view rotation k (quarter turns). Resolves once the new view is in place. */
  setRotation(k: number): Promise<void>;
  /** Compass side a pizzeria's storefront faces. */
  facing(id: string): Dir;
  zoomBy(f: number): void;
  destroy(): void;
}
interface Cam { cx: number; cy: number; w: number }
/** One world unit is 12.5 ft (FT = 0.08). Approximate: wide lots and long stretches are compressed. */
const M_PER_UNIT = 3.81;
/** Opacity by distance band from the open pizzeria (see fadeLevel). */
const FADE_OP = [1, 0.85, 0.7, 0.45]; // movers can't take the CSS wash, so they only fade
interface Bounds { x0: number; x1: number; y0: number; y1: number }

export function createMap(svg: SVGSVGElement, layers: SceneLayers, cb: MapCallbacks, initialRot = 0): MapHandle {
  setRot(initialRot);
  let sc: Scene = mountScene(layers, true);
  let activeId: string | null = null, overview = true;

  /* ---------- camera ---------- */
  let W = innerWidth, H = innerHeight;
  const cam: Cam = { cx: 0, cy: 0, w: 2000 };
  let camAnim: { from: Cam; to: Cam; t0: number; dur: number } | null = null;
  const isMobile = () => W < 760;

  function tileBounds(t: Tile): Bounds {
    const lo = tileCorners(t, -t.thick), hi = tileCorners(t, t.top), mid = tileCorners(t, t.top * 0.6);
    const P = [lo.right, lo.front, lo.left, tileCorners(t, 0).back, hi.back, mid.right, mid.left];
    return { x0: Math.min(...P.map(p => p[0])), x1: Math.max(...P.map(p => p[0])), y0: Math.min(...P.map(p => p[1])), y1: Math.max(...P.map(p => p[1])) };
  }
  function overviewBounds(): Bounds {
    // On phones the whole-map view frames only Manhattan + Brooklyn; Hoboken and Midwood peek in.
    const bs = (isMobile() ? ['midtown', 'village', 'fidi', 'dumbo'].map(id => sc.tileById[id]) : sc.tiles).map(tileBounds);
    const b = { x0: Math.min(...bs.map(b => b.x0)), x1: Math.max(...bs.map(b => b.x1)), y0: Math.min(...bs.map(b => b.y0)), y1: Math.max(...bs.map(b => b.y1)) };
    if (isMobile()) { b.x0 -= 150; b.x1 += 10; b.y0 -= 60; return b; }
    b.x0 -= 60; b.y0 -= 150; b.y1 += 40; return b;
  }
  /** Screen areas covered by the header, panels and neighborhood bar. */
  function occlusion() {
    const v = cb.getView();
    if (isMobile()) return { top: v.mode === 'overview' ? 118 : 96, right: 0, bottom: v.panelOpen ? H * 0.62 : v.mode === 'hood' ? 118 : 70, left: 0 };
    // in the whole-map view, keep room on the left for neighborhood labels hanging off tile corners
    return { top: v.mode === 'overview' ? 150 : 84, right: v.panelOpen ? 440 : 0, bottom: v.mode === 'hood' ? 78 : 40, left: v.mode === 'overview' ? 170 : 0 };
  }
  function fit(b: Bounds, pad = 0.06): Cam {
    const o = occlusion(); const aw = Math.max(200, W - o.right - o.left), ah = Math.max(200, H - o.top - o.bottom);
    const bw = b.x1 - b.x0, bh = b.y1 - b.y0; const k = Math.max(bw / aw, bh / ah) * (1 + pad);
    const ax = o.left + aw / 2, ay = o.top + ah / 2;
    return { cx: (b.x0 + b.x1) / 2 - (ax - W / 2) * k, cy: (b.y0 + b.y1) / 2 - (ay - H / 2) * k, w: k * W };
  }
  function applyCam() {
    const h = (cam.w * H) / W;
    svg.setAttribute('viewBox', `${(cam.cx - cam.w / 2).toFixed(1)} ${(cam.cy - h / 2).toFixed(1)} ${cam.w.toFixed(1)} ${h.toFixed(1)}`);
    const k = cam.w / W;
    const mf = isMobile() ? 0.72 : 1, ps = Math.min(4.2, Math.max(0.32, k * 0.95 * mf)), ls = ps;
    for (const o of sc.pinObjs) o.node.setAttribute('transform', `translate(${f1(o.sx)},${f1(o.sy)}) scale(${ps.toFixed(3)})`);
    for (const o of sc.labelObjs) o.node.setAttribute('transform', `translate(${f1(o.sx)},${f1(o.sy)}) scale(${ls.toFixed(3)})`);
    svg.classList.toggle('near', k < 1.25);
    const pxPerM = S / k / M_PER_UNIT, m = [5, 10, 20, 50, 100, 200, 500, 1000, 2000].find(m => m * pxPerM >= 48) ?? 5000;
    cb.onScale(m, m * pxPerM, Math.round(100 / k));
  }
  const flyTo = (to: Cam, dur = 1250) => { camAnim = { from: { ...cam }, to, t0: performance.now(), dur }; };
  function stepCam(now: number) {
    const a = camAnim!; const u = Math.min(1, (now - a.t0) / a.dur); const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    const dist = Math.hypot(a.to.cx - a.from.cx, a.to.cy - a.from.cy);
    const bump = 1 + Math.min(0.45, (dist / Math.max(a.from.w, a.to.w)) * 0.55) * Math.sin(Math.PI * u);
    cam.cx = a.from.cx + (a.to.cx - a.from.cx) * e; cam.cy = a.from.cy + (a.to.cy - a.from.cy) * e;
    cam.w = Math.exp(Math.log(a.from.w) + (Math.log(a.to.w) - Math.log(a.from.w)) * e) * bump;
    if (u >= 1) camAnim = null; applyCam();
  }
  /** Screen bounds of the neighbourhood of a pizzeria: a world box around it, up to rooftop height. */
  function placeBounds(id: string): Bounds {
    const [x, y] = sc.pins[id].at, r = 7.5, P: [number, number][] = [];
    for (const [dx, dy] of [[-r, -r], [r, -r], [r, r], [-r, r]]) for (const z of [0, 7]) P.push(iso(x + dx, y + dy, z));
    return { x0: Math.min(...P.map(p => p[0])), x1: Math.max(...P.map(p => p[0])), y0: Math.min(...P.map(p => p[1])), y1: Math.max(...P.map(p => p[1])) };
  }
  function targetFor(): Cam {
    const v = cb.getView();
    if (v.curPlace && sc.pins[v.curPlace]) return fit(placeBounds(v.curPlace), 0.02);
    if (v.mode === 'hood' && v.curHood) { const t = fit(tileBounds(sc.tileById[v.curHood]), 0.04); t.w = Math.max(t.w, W * 0.66); return t; }
    return fit(overviewBounds(), 0.02);
  }
  const minW = () => 380, maxW = () => fit(overviewBounds()).w * (isMobile() ? 2.6 : 1.8);

  /* ---------- x-ray: fade whatever is drawn in front of the open pizzeria's storefront ---------- */
  let xrayed: Element[] = [];
  function xray() {
    xrayed.forEach(n => n.classList.remove('xray')); xrayed = [];
    const info = activeId ? sc.pins[activeId] : null;
    if (!info?.focus || !info.item.node) return;
    const f = info.focus, me = info.item.node;
    const candidates: (Item | TopItem)[] = [...sc.tiles.flatMap(t => t.sorted), ...sc.topSorted.filter(o => o.node.classList.contains('bridge'))];
    for (const it of candidates) {
      const n = it.node;
      if (!n || n === me || ('small' in it && it.small)) continue;
      if (!(me.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING)) continue; // drawn before → behind
      const b = (n as SVGGraphicsElement).getBBox();
      if (b.x < f.x1 && b.x + b.width > f.x0 && b.y < f.y1 && b.y + b.height > f.y0) { n.classList.add('xray'); xrayed.push(n); }
    }
  }

  /* ---------- fade: buildings far from the open pizzeria fade out, so its block reads clearly ---------- */
  let fadeAt: [number, number] | null = null;
  function fadeLevel(b: AABB) {
    if (!fadeAt) return 0;
    const d = Math.hypot(Math.max(b.x0 - fadeAt[0], 0, fadeAt[0] - b.x1), Math.max(b.y0 - fadeAt[1], 0, fadeAt[1] - b.y1));
    return d < 6 ? 0 : d < 10 ? 1 : d < 15 ? 2 : 3;
  }
  function fade() {
    const info = activeId ? sc.pins[activeId] : null;
    fadeAt = info ? rot(info.at[0], info.at[1]) : null;
    for (const t of sc.tiles) for (const it of t.sorted) {
      const n = it.node!, f = fadeLevel(it);
      for (let i = 1; i < 4; i++) n.classList.toggle('f' + i, i === f);
    }
  }

  /* ---------- pointer: drag to turn (mouse) or pan (touch, shift / right-drag), pinch, tap ---------- */
  const ptrs = new Map<number, { x: number; y: number }>();
  let drag: { x: number; y: number; cx: number; cy: number; target: EventTarget | null; turn: boolean; tx: number } | null = null;
  let pinch: { d: number; w: number; m: [number, number] } | null = null, moved = false;
  const toWorld = (px: number, py: number): [number, number] => [cam.cx + ((px - W / 2) * cam.w) / W, cam.cy + ((py - H / 2) * cam.w) / W];

  function tap(target: EventTarget | null) {
    cb.onUserMove();
    const t = target instanceof Element ? target : null;
    const pin = t?.closest<SVGGElement>('.pin'); if (pin) return cb.onPin(pin.dataset.id!);
    const lab = t?.closest<SVGGElement>('.tlabel'); if (lab) return cb.onHood(lab.dataset.hood as HoodId);
    const tile = t?.closest<SVGGElement>('.tile.hood');
    if (tile) { const h = tile.dataset.hood as HoodId; const v = cb.getView(); if (v.mode === 'overview' || v.curHood !== h) cb.onHood(h); return; }
    cb.onBackground();
  }
  const onDown = (e: PointerEvent) => {
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, cx: cam.cx, cy: cam.cy, target: e.target, turn: e.pointerType === 'mouse' && e.button === 0 && !e.shiftKey, tx: e.clientX }; moved = false; }
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, w: cam.w, m: toWorld((a.x + b.x) / 2, (a.y + b.y) / 2) }; moved = true; }
  };
  const onMove = (e: PointerEvent) => {
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y) || 1; const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      cam.w = Math.min(maxW(), Math.max(minW(), (pinch.w * pinch.d) / d)); cam.cx = pinch.m[0] - ((mx - W / 2) * cam.w) / W; cam.cy = pinch.m[1] - ((my - H / 2) * cam.w) / W;
      camAnim = null; cb.onUserMove(); applyCam(); return;
    }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!moved && Math.hypot(dx, dy) > 6) { moved = true; try { svg.setPointerCapture(e.pointerId); } catch { /* ignore */ } svg.classList.add('dragging'); cb.onUserMove(); }
      if (moved && drag.turn) { const d = e.clientX - drag.tx; if (Math.abs(d) > 110) { drag.tx = e.clientX; cb.onTurn(d > 0 ? 1 : -1); } return; }
      if (moved) { camAnim = null; cam.cx = drag.cx - (dx * cam.w) / W; cam.cy = drag.cy - (dy * cam.w) / W; applyCam(); }
    }
  };
  const onUp = (e: PointerEvent) => {
    const had = ptrs.has(e.pointerId); ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0) { if (had && drag && !moved && e.type === 'pointerup') tap(drag.target); drag = null; svg.classList.remove('dragging'); }
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault(); cb.onUserMove(); camAnim = null;
    const f = Math.exp(e.deltaY * (e.ctrlKey ? 0.012 : 0.0016)); const m = toWorld(e.clientX, e.clientY);
    cam.w = Math.min(maxW(), Math.max(minW(), cam.w * f)); cam.cx = m[0] - ((e.clientX - W / 2) * cam.w) / W; cam.cy = m[1] - ((e.clientY - H / 2) * cam.w) / W; applyCam();
  };
  const noMenu = (e: Event) => e.preventDefault(); // right-drag pans
  const onResize = () => { W = innerWidth; H = innerHeight; Object.assign(cam, targetFor()); camAnim = null; applyCam(); };
  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);
  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('contextmenu', noMenu);
  window.addEventListener('resize', onResize);

  /* ---------- animation loop ---------- */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function placeMover(m: Mover, list: (Item | TopItem)[], parent: Element, x0: number, y0: number, time: number) {
    const t = m.p, len = m.len!; let pos: number, op = 1;
    if (m.kind === 'walk') { const q = t % (2 * len); pos = q < len ? q : 2 * len - q; }
    else { pos = t % len; op = Math.max(0, Math.min(1, pos / 0.9, (len - pos) / 0.9)); }
    const along = m.a + m.dir! * pos;
    const wx = x0 + (m.axis === 'x' ? along : m.c), wy = y0 + (m.axis === 'y' ? along : m.c);
    const [vx, vy] = rot(wx, wy), odd = getRot() % 2 === 1;
    const s = iso0(vx, vy, m.z || 0);
    const bob = m.kind === 'walk' ? -Math.abs(Math.sin(time * 9 + m.phase!)) * 0.6 : 0;
    const node = m.node as SVGGElement;
    node.setAttribute('transform', `translate(${f1(s[0])},${f1(s[1] + bob)})`);
    if (m.kind === 'walk') { const st = Math.sin(time * 9 + m.phase!) > 0; if (st !== m.st) { m.st = st; node.classList.toggle('st', st); } }
    const hw = odd ? m.hd : m.hw, hd = odd ? m.hw : m.hd;
    m.x0 = vx - hw; m.x1 = vx + hw; m.y0 = vy - hd; m.y1 = vy + hd;
    op *= FADE_OP[fadeLevel(m)];
    node.style.opacity = op < 1 ? op.toFixed(2) : '';
    const idx = moverIndex(m, list);
    if (idx !== m.idx) { m.idx = idx; parent.insertBefore(node, list[idx]?.node ?? null); }
  }
  let last = performance.now(), time = 0, frameN = 0, raf = 0;
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt; frameN++;
    if (camAnim) stepCam(now);
    if (!reduce || frameN < 3) {
      for (const t of sc.tiles) for (const m of t.movers) { m.p += m.speed * dt; placeMover(m, t.sorted, t.objs!, t.x0, t.y0, time); }
      for (const b of sc.boats) { b.p += b.speed * dt; placeMover(b, sc.topSorted, layers.scene, 0, 0, time); }
      for (const c of sc.clouds) c.n.setAttribute('transform', `translate(${f1(c.x + Math.sin(time * 0.12 + c.ph) * 40)},${f1(c.y)})`);
    }
    raf = requestAnimationFrame(frame);
  }

  /* ---------- rotation: fade, rebuild, frame the same thing, fade in ---------- */
  let rebuilding: Promise<void> | null = null;
  function setRotation(k: number): Promise<void> {
    k = ((k % 4) + 4) % 4;
    if (k === getRot() && !rebuilding) return Promise.resolve();
    const run = async () => {
      if (rebuilding) await rebuilding;
      if (k === getRot()) return;
      svg.classList.add('turning');
      await new Promise(r => setTimeout(r, reduce ? 0 : 170));
      for (const g of Object.values(layers)) g.replaceChildren();
      setRot(k);
      svg.classList.add('no-intro');
      sc = mountScene(layers, false);
      frameN = 0; xrayed = [];
      svg.classList.toggle('ov', overview);
      sc.pinObjs.forEach(o => o.g.classList.toggle('active', o.p.id === activeId));
      camAnim = null; Object.assign(cam, targetFor()); applyCam();
      xray(); fade();
      requestAnimationFrame(() => svg.classList.remove('turning'));
    };
    const p = run().finally(() => { if (rebuilding === p) rebuilding = null; });
    rebuilding = p;
    return p;
  }

  /* ---------- start: drop in slightly zoomed out, then settle ---------- */
  const t0 = fit(overviewBounds(), 0.02);
  cam.cx = t0.cx; cam.cy = t0.cy - 40; cam.w = t0.w * 1.12; applyCam();
  flyTo(t0, 1600);
  raf = requestAnimationFrame(frame);

  return {
    refit: (dur = 900) => flyTo(targetFor(), dur),
    setActivePin: id => {
      activeId = id;
      sc.pinObjs.forEach(o => o.g.classList.toggle('active', o.p.id === id));
      xray(); fade();
    },
    setOverview: on => { overview = on; svg.classList.toggle('ov', on); },
    setRotation,
    facing: id => sc.pins[id].facing,
    zoomBy: f => { cb.onUserMove(); flyTo({ ...cam, w: Math.min(maxW(), Math.max(minW(), cam.w * f)) }, 350); },
    destroy() {
      cancelAnimationFrame(raf);
      svg.removeEventListener('pointerdown', onDown);
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerup', onUp);
      svg.removeEventListener('pointercancel', onUp);
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('contextmenu', noMenu);
      window.removeEventListener('resize', onResize);
      for (const g of Object.values(layers)) g.replaceChildren();
    },
  };
}
