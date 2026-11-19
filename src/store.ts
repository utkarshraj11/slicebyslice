/* App state + actions. A tiny external store so the imperative map and React both read the same state
   synchronously (the camera's framing depends on which panels are open at the moment it refits). */
import { useSyncExternalStore } from 'react';
import { PLACES, HOODS, TOUR, isHood, type HoodId } from './data/places';
import type { MapHandle, MapView } from './engine/map';

export interface State {
  mode: 'overview' | 'hood';
  curHood: HoodId | null;
  curPlace: string | null;
  listOpen: boolean;
  listBy: 'hood' | 'rank';
  touring: boolean;
}
let state: State = { mode: 'overview', curHood: null, curPlace: null, listOpen: false, listBy: 'hood', touring: false };
const subs = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; subs.forEach(f => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export const getState = () => state;
export const useStore = () => useSyncExternalStore(subscribe, getState);

/* ---------- map hookup ---------- */
let map: MapHandle | null = null;
export const attachMap = (m: MapHandle | null) => { map = m; };
export const mapView = (): MapView => ({ mode: state.mode, curHood: state.curHood, panelOpen: !!(state.curPlace || state.listOpen) });
const refit = (dur?: number) => map?.refit(dur);

/* ---------- hash routing: #<placeId> or #<hoodId> ---------- */
let suppressHash = false;
function setHash(h: string) {
  try { if (location.hash.slice(1) !== h) { suppressHash = true; location.hash = h; } } catch { /* ignore */ }
}
export function routeHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (PLACES.some(p => p.id === h)) openPlace(h);
  else if (isHood(h)) focusHood(h);
  else if (state.mode !== 'overview') showOverview();
}
export function onHashChange() {
  if (suppressHash) { suppressHash = false; return; }
  routeHash();
}

/* ---------- actions ---------- */
function setMode(mode: State['mode'], hood?: HoodId | null) {
  set({ mode, curHood: hood || null });
  map?.setOverview(mode === 'overview');
}
export function showOverview() { closeCard(true); closeList(true); setMode('overview'); refit(1300); setHash(''); }
export function focusHood(id: HoodId, o: { keepCard?: boolean; keepList?: boolean; noHash?: boolean; dur?: number } = {}) {
  if (!HOODS[id]) return;
  if (!o.keepCard && state.curPlace && PLACES.find(p => p.id === state.curPlace)!.hood !== id) closeCard(true);
  if (!o.keepList) closeList(true);
  setMode('hood', id); refit(o.dur || 1300);
  if (!o.noHash && !state.curPlace) setHash(id);
}
export function openPlace(id: string) {
  const p = PLACES.find(x => x.id === id); if (!p) return;
  closeList(true);
  set({ curPlace: id });
  map?.setActivePin(id);
  setMode('hood', p.hood); refit(1200); setHash(id);
}
export function closeCard(silent?: boolean) {
  if (!state.curPlace) return;
  set({ curPlace: null });
  map?.setActivePin(null);
  if (!silent) { refit(800); setHash(state.curHood || ''); }
}
/** Prev/Next through PLACES order. */
export function stepPlace(delta: number) {
  if (!state.curPlace) return;
  const i = PLACES.findIndex(p => p.id === state.curPlace);
  openPlace(PLACES[(i + delta + PLACES.length) % PLACES.length].id);
}
export function openList() { closeCard(true); stopTour(); set({ listOpen: true }); refit(800); }
export function closeList(silent?: boolean) {
  if (!state.listOpen) return;
  set({ listOpen: false });
  if (!silent) refit(800);
}
export const toggleList = () => (state.listOpen ? closeList() : openList());
export const setListBy = (listBy: State['listBy']) => set({ listBy });

let tourT: ReturnType<typeof setTimeout> | null = null;
export function startTour() {
  closeCard(true); closeList(true);
  let i = 0;
  set({ touring: true });
  const step = () => {
    if (i < TOUR.length) { focusHood(TOUR[i++], { dur: 1600 }); tourT = setTimeout(step, 4300); }
    else { stopTour(); showOverview(); }
  };
  step();
}
export function stopTour() {
  if (tourT != null) clearTimeout(tourT);
  tourT = null;
  if (state.touring) set({ touring: false });
}
export const toggleTour = () => (state.touring ? stopTour() : startTour());

/** Map tapped on empty space: close whatever panel is open. */
export function tapBackground() { if (state.curPlace) closeCard(); else if (state.listOpen) closeList(); }
/** Esc: close card, else list, else back out to the overview. */
export function back() { if (state.curPlace) closeCard(); else if (state.listOpen) closeList(); else if (state.mode === 'hood') showOverview(); }
