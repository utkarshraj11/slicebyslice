import { PLACES, HOODS, HOOD_ORDER, RATING_MAX, type Place } from '../data/places';
import { closeList, openPlace, setListBy, type State } from '../store';

function Item({ p, rank }: { p: Place; rank?: number }) {
  return (
    <button className="item" onClick={() => openPlace(p.id)}>
      {rank != null && <span className="rk">{rank}</span>}
      <div><div className="nm">{p.name}</div><div className="ad">{p.address}</div></div>
      {p.rating != null ? <span className="bd">{p.rating}</span> : <span className="bd empty">–/{RATING_MAX}</span>}
    </button>
  );
}

export function ListPanel({ open, by }: { open: boolean; by: State['listBy'] }) {
  const rated = PLACES.filter(p => p.rating != null).sort((a, b) => b.rating! - a.rating!);
  const unrated = PLACES.filter(p => p.rating == null);
  return (
    <aside className={'panel list' + (open ? ' open' : '')} id="list" inert={!open}>
      <button className="x" aria-label="Close" onClick={() => closeList()}>✕</button>
      <div className="cardin">
        <h2 style={{ fontFamily: 'Fraunces,Georgia,serif', fontSize: 30, margin: '0 44px 10px 0', fontWeight: 800 }}>All {PLACES.length} spots</h2>
        <div className="seg">
          <button className={by === 'hood' ? 'on' : ''} onClick={() => setListBy('hood')}>By neighborhood</button>
          <button className={by === 'rank' ? 'on' : ''} onClick={() => setListBy('rank')}>By rating</button>
        </div>
        {by === 'hood'
          ? HOOD_ORDER.map(id => (
            <div className="grp" key={id}>
              <h4><i style={{ background: HOODS[id].color }} />{HOODS[id].name} · {HOODS[id].sub}</h4>
              {PLACES.filter(p => p.hood === id).map(p => <Item key={p.id} p={p} />)}
            </div>))
          : <>
            {rated.length
              ? rated.map((p, k) => <Item key={p.id} p={p} rank={k + 1} />)
              : <p className="review ph" style={{ marginBottom: 14 }}>The ranking appears here once ratings are in.</p>}
            {rated.length > 0 && unrated.length > 0 && <div className="grp"><h4>Not rated yet</h4>{unrated.map(p => <Item key={p.id} p={p} />)}</div>}
            {!rated.length && unrated.map(p => <Item key={p.id} p={p} />)}
          </>}
      </div>
    </aside>
  );
}
