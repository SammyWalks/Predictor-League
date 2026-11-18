import { useState } from 'react'
import Nav from '../components/Nav'

export default function Predictions({ state, setState }) {
  const user = state.users.find(u => u.id === state.currentUserId)
  const locked = state.locked[user.id]
  const myPreds = state.predictions[user.id] || {}
  const [preds, setPreds] = useState(myPreds)
  const [justLocked, setJustLocked] = useState(false)

  const fixturesToShow = user.wildcard ? state.fixtures : state.fixtures.filter(f => f.hardest)

  const update = (id, score) => {
    if (locked) return
    setPreds({ ...preds, [id]: score })
  }

  const submit = () => {
    setState({
      ...state,
      predictions: { ...state.predictions, [user.id]: preds },
      locked: { ...state.locked, [user.id]: true }
    })
    setJustLocked(true)
    setTimeout(() => setJustLocked(false), 800)
  }

  return (
    <div>
      <Nav state={state} setState={setState} />
      <div className="card">
        <h2 style={{ fontSize: 14 }}>{locked ? 'LOCKED PREDICTIONS' : 'MAKE PREDICTIONS'}</h2>
        <p style={{ margin: '12px 0', color: '#ffd700' }}>
          {user.wildcard ? 'WILDCARD - ALL 10 GAMES' : 'SELECTED FIXTURES'}
        </p>
        {fixturesToShow.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ width: 220, fontSize: 10 }}>{f.home} vs {f.away}</span>
            <input
              value={preds[f.id] || ''}
              onChange={e => update(f.id, e.target.value)}
              placeholder="2-1"
              disabled={locked}
              style={{ width: 90, padding: 8, background: '#000', border: '2px solid #fff', color: '#fff', fontSize: 12 }}
            />
          </div>
        ))}
        {!locked && <button className="btn" onClick={submit} style={{ marginTop: 12 }}>LOCK IN</button>}
        {locked && <div className="locked-banner">LOCKED</div>}
        {justLocked && <div className="bounce" style={{ marginTop: 10 }}>LOCKED!</div>}

        <h3 style={{ marginTop: 32, fontSize: 12 }}>ALL LOCKED PREDICTIONS</h3>
        {state.users.filter(u => state.locked[u.id]).map(u => (
          <div key={u.id} style={{ marginTop: 12, padding: 12, background: '#000', borderLeft: `4px solid ${u.colour}` }}>
            <strong style={{ color: u.colour }}>{u.name}</strong>
            <div style={{ fontSize: 10, marginTop: 6 }}>
              {Object.entries(state.predictions[u.id] || {}).map(([fid, score]) => {
                const f = state.fixtures.find(x => x.id === Number(fid))
                return <div key={fid}>{f?.home} vs {f?.away}: {score}</div>
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}