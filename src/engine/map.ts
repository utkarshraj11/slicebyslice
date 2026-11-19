/* The live map: mounts the scene into an <svg>, runs the camera, pointer input and animation loop.
   UI state lives outside (store.ts); the map reads it through `getView` and reports taps via callbacks. */
import type { HoodId } from '../data/places';
import { iso, f1 } from './iso';
import { mountScene, moverIndex, type SceneLayers, type TopItem } from './scene';
import type { Tile, Mover, Item } from './tile';

export interface MapView { mode: 'overview' | 'hood'; curHood: HoodId | null; panelOpen: boolean }
export interface MapCallbacks {
  getView(): MapView;
  onPin(id: string): void;
  onHood(id: HoodId): void;
  onBackground(): void;
  /** user dragged / zoomed / tapped: stop the tour */
  onUserMove(): void;
}
export interface MapHandle {
  refit(dur?: number): void;
  setActivePin(id: string | null): void;
  setOverview(on: boolean): void;
  destroy(): void;
}
interface Cam { cx: number; cy: number; w: number }
interface Bounds { x0: number; x1: number; y0: number; y1: number }

export function createMap(svg: SVGSVGElement, layers: SceneLayers, cb: MapCallbacks): MapHandle {
  const { tiles, tileById, topSorted, boats, clouds, pinObjs, labelObjs } = mountScene(layers);

  /* ---------- camera ---------- */
  let W = innerWidth, H = innerHeight;
  const cam: Cam = { cx: 0, cy: 0, w: 2000 };
  let camAnim: { from: Cam; to: Cam; t0: number; dur: number } | null = null;
  const isMobile = () => W < 760;

  function tileBounds(t: Tile): Bounds {
    const P = [iso(t.x0, t.y0, 0), iso(t.x0 + t.T, t.y0, 0), iso(t.x0 + t.T, t.y0 + t.T, -t.thick), iso(t.x0, t.y0 + t.T, -t.thick), iso(t.x0, t.y0, t.top), iso(t.x0 + t.T, t.y0, t.top * 0.6), iso(t.x0, t.y0 + t.T, t.top * 0.6)];
    return { x0: Math.min(...P.map(p => p[0])), x1: Math.max(...P.map(p => p[0])), y0: Math.min(...P.map(p => p[1])), y1: Math.max(...P.map(p => p[1])) };
  }
  function overviewBounds(): Bounds {
    // On phones the whole-map view frames only Manhattan + Brooklyn; Hoboken and Midwood peek in.
    const bs = (isMobile() ? ['midtown', 'village', 'fidi', 'dumbo'].map(id => tileById[id]) : tiles).map(tileBounds);
    const b = { x0: Math.min(...bs.map(b => b.x0)), x1: Math.max(...bs.map(b => b.x1)), y0: Math.min(...bs.map(b => b.y0)), y1: Math.max(...bs.map(b => b.y1)) };
    if (isMobile()) { b.x0 -= 150; b.x1 += 10; b.y0 -= 60; return b; }
    b.x0 -= 60; b.y0 -= 150; b.y1 += 40; return b;
  }
  /** Screen areas covered by the header, panels and neighborhood bar. */
  function occlusion() {
    const v = cb.getView();
    if (isMobile()) return { top: v.mode === 'overview' ? 118 : 96, right: 0, bottom: v.panelOpen ? H * 0.62 : v.mode === 'hood' ? 118 : 70, left: 0 };
    return { top: v.mode === 'overview' ? 150 : 84, right: v.panelOpen ? 440 : 0, bottom: v.mode === 'hood' ? 78 : 40, left: 0 };
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
    for (const o of pinObjs) o.node.setAttribute('transform', `translate(${f1(o.sx)},${f1(o.sy)}) scale(${ps.toFixed(3)})`);
    for (const o of labelObjs) o.node.setAttribute('transform', `translate(${f1(o.sx)},${f1(o.sy)}) scale(${ls.toFixed(3)})`);
    svg.classList.toggle('near', k < 1.25);
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
  function targetFor(): Cam {
    const v = cb.getView();
    if (v.mode === 'hood' && v.curHood) { const t = fit(tileBounds(tileById[v.curHood]), 0.04); t.w = Math.max(t.w, W * 0.66); return t; }
    return fit(overviewBounds(), 0.02);
  }
  const minW = () => 380, maxW = () => fit(overviewBounds()).w * (isMobile() ? 2.6 : 1.8);

  /* ---------- pointer: pan, pinch, tap ---------- */
  const ptrs = new Map<number, { x: number; y: number }>();
  let drag: { x: number; y: number; cx: number; cy: number; target: EventTarget | null } | null = null;
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
    if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, cx: cam.cx, cy: cam.cy, target: e.target }; moved = false; }
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
  const onResize = () => { W = innerWidth; H = innerHeight; const t = targetFor(); Object.assign(cam, t); camAnim = null; applyCam(); };
  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);
  svg.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('resize', onResize);

  /* ---------- animation loop ---------- */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function placeMover(m: Mover, list: (Item | TopItem)[], parent: Element, x0: number, y0: number, time: number) {
    const t = m.p, len = m.len!; let pos: number, op = 1;
    if (m.kind === 'walk') { const q = t % (2 * len); pos = q < len ? q : 2 * len - q; }
    else { pos = t % len; op = Math.max(0, Math.min(1, pos / 0.9, (len - pos) / 0.9)); }
    const along = m.a + m.dir! * pos;
    const wx = x0 + (m.axis === 'x' ? along : m.c), wy = y0 + (m.axis === 'y' ? along : m.c);
    const s = iso(wx, wy, m.z || 0);
    const bob = m.kind === 'walk' ? -Math.abs(Math.sin(time * 7 + m.phase!)) * 1.3 : 0;
    const node = m.node as SVGGElement;
    node.setAttribute('transform', `translate(${f1(s[0])},${f1(s[1] + bob)})`);
    if (m.kind !== 'walk') node.style.opacity = op < 1 ? op.toFixed(2) : '';
    m.x0 = wx - m.hw; m.x1 = wx + m.hw; m.y0 = wy - m.hd; m.y1 = wy + m.hd;
    const idx = moverIndex(m, list);
    if (idx !== m.idx) { m.idx = idx; parent.insertBefore(node, list[idx]?.node ?? null); }
  }
  let last = performance.now(), time = 0, frameN = 0, raf = 0;
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt; frameN++;
    if (camAnim) stepCam(now);
    if (!reduce || frameN < 3) {
      for (const t of tiles) for (const m of t.movers) { m.p += m.speed * dt; placeMover(m, t.sorted, t.objs!, t.x0, t.y0, time); }
      for (const b of boats) { b.p += b.speed * dt; placeMover(b, topSorted, layers.scene, 0, 0, time); }
      for (const c of clouds) c.n.setAttribute('transform', `translate(${f1(c.x + Math.sin(time * 0.12 + c.ph) * 40)},${f1(c.y)})`);
    }
    raf = requestAnimationFrame(frame);
  }

  /* ---------- start: drop in slightly zoomed out, then settle ---------- */
  const t0 = fit(overviewBounds(), 0.02);
  cam.cx = t0.cx; cam.cy = t0.cy - 40; cam.w = t0.w * 1.12; applyCam();
  flyTo(t0, 1600);
  raf = requestAnimationFrame(frame);

  return {
    refit: (dur = 900) => flyTo(targetFor(), dur),
    setActivePin: id => pinObjs.forEach(o => o.g.classList.toggle('active', o.p.id === id)),
    setOverview: on => svg.classList.toggle('ov', on),
    destroy() {
      cancelAnimationFrame(raf);
      svg.removeEventListener('pointerdown', onDown);
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerup', onUp);
      svg.removeEventListener('pointercancel', onUp);
      svg.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      for (const g of Object.values(layers)) g.replaceChildren();
    },
  };
}
