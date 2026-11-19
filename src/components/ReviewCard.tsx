import { useEffect, useRef } from 'react';
import { PLACES, HOODS, RATING_MAX, photoSrc } from '../data/places';
import { closeCard, stepPlace } from '../store';
import { SliceIcon, CameraIcon, PinIcon } from './icons';

export function ReviewCard({ placeId }: { placeId: string | null }) {
  const ref = useRef<HTMLElement>(null);
  // keep showing the last place while the panel slides out
  const last = useRef(placeId);
  if (placeId) last.current = placeId;
  const p = PLACES.find(x => x.id === last.current);

  useEffect(() => { if (placeId && ref.current) ref.current.scrollTop = 0; }, [placeId]);

  const open = !!placeId;
  return (
    <aside ref={ref} className={'panel' + (open ? ' open' : '')} id="card" aria-hidden={!open}>
      <button className="x" aria-label="Close" onClick={() => closeCard()}>✕</button>
      {p && <Card p={p} />}
    </aside>
  );
}

function Card({ p }: { p: (typeof PLACES)[number] }) {
  const i = PLACES.indexOf(p), h = HOODS[p.hood], has = p.rating != null;
  const filled = has ? Math.round((p.rating! / RATING_MAX) * 5) : 0;
  return (
    <div className="cardin">
      <span className="chip"><i style={{ background: h.color }} />{h.name} · {h.sub}</span>
      <h2>{p.name}</h2>
      <p className="addr"><PinIcon /><span>{p.address}</span></p>
      <div className="rating">
        <div className={'score' + (has ? '' : ' empty')}>{has ? p.rating : '–'}<small>/{RATING_MAX}</small></div>
        <div className="rmeta">
          <div className="slices">{[0, 1, 2, 3, 4].map(k => <SliceIcon key={k} fill={k < filled} />)}</div>
          <div className="rnote">{has ? 'My rating' : 'Rating coming soon'}</div>
        </div>
      </div>
      <div className="sect">My review</div>
      {p.review ? <p className="review">{p.review}</p> : <p className="review ph">Review coming soon.</p>}
      <div className="sect">Photos</div>
      <div className="photos">
        {p.photos.slice(0, 2).map((src, k) => src
          ? <figure key={k}><img src={photoSrc(src)} alt={`Pizza at ${p.name}, photo ${k + 1}`} /></figure>
          : <figure key={k} className="ph"><div><CameraIcon />Photo {k + 1}<br />coming soon</div></figure>)}
      </div>
      <nav className="cardnav">
        <button className="btn" onClick={() => stepPlace(-1)}>← Prev</button>
        <span>{i + 1} of {PLACES.length}</span>
        <button className="btn" onClick={() => stepPlace(1)}>Next →</button>
      </nav>
    </div>
  );
}
