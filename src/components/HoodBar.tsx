import { useRef } from 'react';
import { PLACES, HOODS, type HoodId } from '../data/places';
import { openPlace } from '../store';

/** Bottom bar listing the current neighborhood's spots. Keeps its last content while sliding away. */
export function HoodBar({ hood, curPlace }: { hood: HoodId | null; curPlace: string | null }) {
  const last = useRef(hood);
  if (hood) last.current = hood;
  const id = last.current;
  return (
    <div className={'hoodbar' + (hood ? ' show' : '')} id="hoodbar" inert={!hood}>
      {id && <>
        <b>{HOODS[id].name}</b>
        {PLACES.filter(p => p.hood === id).map(p => (
          <button key={p.id} className={curPlace === p.id ? 'on' : ''} onClick={() => openPlace(p.id)}>{p.name}</button>
        ))}
      </>}
    </div>
  );
}
