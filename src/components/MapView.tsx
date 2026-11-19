import { useEffect, useRef } from 'react';
import { createMap } from '../engine/map';
import { attachMap, mapView, openPlace, focusHood, tapBackground, stopTour, getState } from '../store';

/** The isometric map. React renders the empty <svg> shell once; the engine owns everything inside. */
export function MapView() {
  const svg = useRef<SVGSVGElement>(null);
  const scene = useRef<SVGGElement>(null), sky = useRef<SVGGElement>(null), labels = useRef<SVGGElement>(null), pins = useRef<SVGGElement>(null);

  useEffect(() => {
    const m = createMap(svg.current!, { scene: scene.current!, sky: sky.current!, labels: labels.current!, pins: pins.current! }, {
      getView: mapView,
      onPin: id => { stopTour(); openPlace(id); },
      onHood: focusHood,
      onBackground: tapBackground,
      onUserMove: stopTour,
    });
    const s = getState();
    m.setOverview(s.mode === 'overview');
    m.setActivePin(s.curPlace);
    attachMap(m);
    return () => { attachMap(null); m.destroy(); };
  }, []);

  return (
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
  );
}
