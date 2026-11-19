/* App state + actions. A tiny external store so the imperative map and React both read the same state
   synchronously (the camera's framing depends on which panels are open at the moment it refits). */
import { useSyncExternalStore } from 'react';
import { PLACES, HOODS, isHood, type HoodId } from './data/places';
import type { MapHandle, MapView } from './world/map';
import { rotShowing } from './world/compass';

export interface State {
  mode: 'overview' | 'hood';
  curHood: HoodId | null;
  curPlace: string | null;
  listOpen: boolean;
  listBy: 'hood' | 'rank';
  /** view rotation, quarter turns (0 = from the south-west) */
  rot: number;
}
let state: State = { mode: 'overview', curHood: null, curPlace: null, listOpen: false, listBy: 'hood', rot: 0 };
const subs = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; subs.forEach(f => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export const getState = () => state;
export const useStore = () => useSyncExternalStore(subscribe, getState);

/* ---------- map hookup ---------- */
let map: MapHandle | null = null;
export const attachMap = (m: MapHandle | null) => { map = m; };
export const mapView = (): MapView => ({ mode: state.mode, curHood: state.curHood, curPlace: state.curPlace, panelOpen: !!(state.curPlace || state.listOpen) });
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
  setMode('hood', p.hood);
  // turn the map so the storefront faces the viewer
  const need = map ? rotShowing(map.facing(id), state.rot) : state.rot;
  if (map && need !== state.rot) { set({ rot: need }); void map.setRotation(need); }
  else refit(1200);
  setHash(id);
}

/* ---------- view rotation ---------- */
export function setRotation(k: number) {
  k = ((k % 4) + 4) % 4;
  if (k === state.rot) return;
  set({ rot: k });
  void map?.setRotation(k);
}
/** The user dragged the view round to near view k: record it without moving the camera. */
export const syncRot = (k: number) => set({ rot: ((k % 4) + 4) % 4 });
/** +1 turns the map a quarter turn counter-clockwise (the camera orbits clockwise). */
export const rotate = (delta: number) => setRotation(state.rot + delta);
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
export function openList() { closeCard(true); set({ listOpen: true }); refit(800); }
export function closeList(silent?: boolean) {
  if (!state.listOpen) return;
  set({ listOpen: false });
  if (!silent) refit(800);
}
export const toggleList = () => (state.listOpen ? closeList() : openList());
export const setListBy = (listBy: State['listBy']) => set({ listBy });

/** Map tapped on empty space: close whatever panel is open. */
export function tapBackground() { if (state.curPlace) closeCard(); else if (state.listOpen) closeList(); }
/** Esc: close card, else list, else back out to the overview. */
export function back() { if (state.curPlace) closeCard(); else if (state.listOpen) closeList(); else if (state.mode === 'hood') showOverview(); }
