import { useEffect, useRef } from 'react';
import { createMap, type MapHandle } from '../engine/map';
import { attachMap, mapView, openPlace, focusHood, tapBackground, stopTour, rotate, getState } from '../store';

/** The isometric map. React renders the empty <svg> shell once; the engine owns everything inside. */
export function MapView() {
  const svg = useRef<SVGSVGElement>(null);
  const scene = useRef<SVGGElement>(null), sky = useRef<SVGGElement>(null), labels = useRef<SVGGElement>(null), pins = useRef<SVGGElement>(null);
  const map = useRef<MapHandle | null>(null), bar = useRef<HTMLDivElement>(null), barLabel = useRef<HTMLSpanElement>(null), pct = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const m = createMap(svg.current!, { scene: scene.current!, sky: sky.current!, labels: labels.current!, pins: pins.current! }, {
      getView: mapView,
      onPin: id => { stopTour(); openPlace(id); },
      onHood: focusHood,
      onBackground: tapBackground,
      onUserMove: stopTour,
      onTurn: rotate,
      // written straight to the DOM: this runs every camera frame
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

  return (<>
    <svg id="map" ref={svg} className="ov" xmlns="http://www.w3.org/2000/svg" aria-label="Isometric map of New York City and Hoboken pizza spots">
      <defs>
        <pattern id="cobble" width="9" height="6" patternUnits="userSpaceOnUse">
          <rect width="9" height="6" fill="#d9d1c2" />
          <ellipse cx="2.4" cy="1.6" rx="1.9" ry="1.1" fill="#cbc2b1" />
          <ellipse cx="6.9" cy="4.6" rx="1.9" ry="1.1" fill="#cbc2b1" />
        </pattern>
        <pattern id="pavers" width="12" height="7" patternUnits="userSpaceOnUse">
          <rect width="12" height="7" fill="#ece4d4" />
          <path d="M0 3.5h12M6 0v3.5M0 7V3.5" stroke="#dcd2bf" strokeWidth=".8" fill="none" />
        </pattern>
      </defs>
      <g id="world" stroke="#2e2b29" strokeWidth=".9" strokeLinejoin="round" strokeLinecap="round">
        <g id="scene" ref={scene} />
        <g id="sky" ref={sky} />
        <g id="labels" ref={labels} />
        <g id="pins" ref={pins} />
      </g>
    </svg>
    <div className="scalebar" aria-hidden="true"><span ref={barLabel} /><div ref={bar} /></div>
    <div className="zoomctl" role="group" aria-label="Zoom">
      <button aria-label="Zoom in" title="Zoom in" onClick={() => map.current?.zoomBy(1 / 1.5)}>+</button>
      <span ref={pct} />
      <button aria-label="Zoom out" title="Zoom out" onClick={() => map.current?.zoomBy(1.5)}>−</button>
    </div>
  </>);
}
