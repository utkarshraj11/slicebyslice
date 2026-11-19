import { useEffect } from 'react';
import { PLACES, HOOD_IDS } from './data/places';
import {
  useStore, getState, routeHash, onHashChange, back, stepPlace,
  showOverview, toggleList, rotate,
} from './store';
import { MapView } from './components/MapView';
import { ReviewCard } from './components/ReviewCard';
import { ListPanel } from './components/ListPanel';
import { HoodBar } from './components/HoodBar';
import { Grain } from './components/Grain';
import { Compass } from './components/Compass';
import { FrameIcon, ListIcon } from './components/icons';

export default function App() {
  const s = useStore();

  // hash routing + keyboard
  useEffect(() => {
    const timer = location.hash.length > 1 ? setTimeout(routeHash, 900) : undefined; // let the intro land first
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') back();
      if (getState().curPlace && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) stepPlace(e.key === 'ArrowRight' ? 1 : -1);
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !(e.target instanceof HTMLInputElement)) {
        if (e.key === 'q' || e.key === 'Q') rotate(1);
        if (e.key === 'e' || e.key === 'E') rotate(-1);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(timer); window.removeEventListener('hashchange', onHashChange); document.removeEventListener('keydown', onKey); };
  }, []);

  const cls = ['app', s.mode !== 'overview' && 'zoomed', s.curPlace && 'panel-open'].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <MapView />
      <Grain />

      <header>
        <div className="kicker">NYC + Hoboken · summer pizza tour</div>
        <h1>Slice <span>by</span> Slice</h1>
        <p>{PLACES.length} pizzerias across {HOOD_IDS.length} neighborhoods. Pick a neighborhood to zoom in, then tap a pin for my rating and review.</p>
      </header>

      <div className="controls">
        <button className="btn" hidden={s.mode === 'overview'} onClick={showOverview}><FrameIcon />Whole map</button>
        <button className="btn primary" onClick={toggleList}><ListIcon />All {PLACES.length} spots</button>
      </div>

      <div className="hint">Drag to turn · right- or shift-drag to pan · scroll to zoom · click a neighborhood or a pizzeria</div>
      <Compass />
      <HoodBar hood={s.mode === 'hood' ? s.curHood : null} curPlace={s.curPlace} />
      <ReviewCard placeId={s.curPlace} />
      <ListPanel open={s.listOpen} by={s.listBy} />
    </div>
  );
}
