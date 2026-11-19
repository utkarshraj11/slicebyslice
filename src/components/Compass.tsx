import { rotate, setRotation } from '../store';

/** Rotate buttons around a compass whose needle points north. Clicking the compass resets the view. */
/** The needle follows the camera continuously: world/map.ts writes the screen angle of north to --north. */
export function Compass() {
  return (
    <div className="compass" role="group" aria-label="Rotate map">
      <button className="rb" aria-label="Rotate map left" title="Rotate left (Q)" onClick={() => rotate(1)}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3" /><path d="M3 2.5v3h3" /></svg>
      </button>
      <button className="dial" aria-label="Reset view (north to the upper left)" title="Reset view" onClick={() => setRotation(0)}>
        <svg viewBox="-20 -20 40 40" style={{ transform: 'rotate(var(--north, -60deg))' }}>
          <path d="M0 -14 L5 2 L0 -1 L-5 2Z" fill="#d9473a" stroke="#2e2b29" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M0 14 L5 2 L0 -1 L-5 2Z" fill="#fffaf1" stroke="#2e2b29" strokeWidth="1.2" strokeLinejoin="round" />
          <text x="0" y="-15.5" fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="DM Sans, sans-serif" fill="#2e2b29" style={{ transform: 'rotate(calc(-1 * var(--north, -60deg)))', transformOrigin: '0 -18px' }}>N</text>
        </svg>
      </button>
      <button className="rb" aria-label="Rotate map right" title="Rotate right (E)" onClick={() => rotate(-1)}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12.5 8a4.5 4.5 0 1 1-1.4-3.3" /><path d="M13 2.5v3h-3" /></svg>
      </button>
    </div>
  );
}
