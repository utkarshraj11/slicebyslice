import { useEffect, useRef, useState } from 'react';
import { createMap, type MapHandle } from '../world/map';
import { attachMap, mapView, openPlace, focusHood, tapBackground, stopTour, rotate, getState } from '../store';

const TOD = ['☀ Day', '◐ Dusk', '☾ Night'];

/** The map. React renders an empty host and overlay once; the engine (world/map.ts) owns the canvas, pins and labels. */
export function MapView() {
  const host = useRef<HTMLDivElement>(null), overlay = useRef<HTMLDivElement>(null);
  const [tod, setTod] = useState(0);
  const map = useRef<MapHandle | null>(null), bar = useRef<HTMLDivElement>(null), barLabel = useRef<HTMLSpanElement>(null), pct = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const m = createMap(host.current!, overlay.current!, {
      getView: mapView,
      onPin: id => { stopTour(); openPlace(id); },
      onHood: focusHood,
      onBackground: tapBackground,
      onUserMove: stopTour,
      onTurn: rotate,
      // written straight to the DOM: this runs on camera frames
      onScale: (m, px, z) => {
        bar.current!.style.width = px.toFixed(1) + 'px';
        barLabel.current!.textContent = m >= 1000 ? m / 1000 + ' km' : m + ' m';
        pct.current!.textContent = z + '%';
      },
    }, getState().rot);
    map.current = m;
    const s = getState();
    m.setOverview(s.mode === 'overview');
    m.setActivePin(s.curPlace);
    attachMap(m);
    return () => { attachMap(null); map.current = null; m.destroy(); };
  }, []);

  const nextTod = () => { const k = (tod + 1) % TOD.length; setTod(k); map.current?.setTime(k); };
  return (<>
    <div id="map" ref={host} role="application" aria-label="Isometric map of New York City and Hoboken pizza spots" />
    <div className="overlay" ref={overlay} />
    <button className="todbtn" onClick={nextTod} title="Change the light">{TOD[tod]}</button>
    <div className="scalebar" aria-hidden="true"><span ref={barLabel} /><div ref={bar} /></div>
    <div className="zoomctl" role="group" aria-label="Zoom">
      <button aria-label="Zoom in" title="Zoom in" onClick={() => map.current?.zoomBy(1 / 1.5)}>+</button>
      <span ref={pct} />
      <button aria-label="Zoom out" title="Zoom out" onClick={() => map.current?.zoomBy(1.5)}>−</button>
    </div>
  </>);
}
