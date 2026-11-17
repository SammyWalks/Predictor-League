import { Link } from 'react-router-dom'

export default function Dashboard({ state, setState }) {
  const user = state.users.find(u => u.id === state.currentUserId)
  const hasLocked = state.locked[user.id]

  return (
    <div>
      <div className="card" style={{ textAlign: 'center', background: '#000' }}>
        <div style={{ fontSize: 14, color: '#ffd700' }}>WEEK {state.currentWeek}</div>
        <div style={{ fontSize: 20, margin: '8px 0' }}><span className="football"></span> {user.name}</div>
        <div style={{ fontSize: 12 }}>PTS: {user.points}</div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 14, marginBottom: 16 }}>MENU</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/predict"><button className="btn"><span className="football"></span> {hasLocked ? 'VIEW PREDS' : 'MAKE PREDS'}</button></Link>
          <Link to="/table"><button className="btn secondary"><span className="football"></span> LEAGUE TABLE</button></Link>
          <Link to="/profile"><button className="btn secondary"><span className="football"></span> PROFILE</button></Link>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 12, marginBottom: 12 }}>SELECTED FIXTURES</h3>
        <table>
          <thead>
            <tr><th>TIME</th><th>MATCH</th></tr>
          </thead>
          <tbody>
            {state.fixtures.filter(f => f.hardest).map(f => (
              <tr key={f.id}>
                <td>{f.time}</td>
                <td><span className="football"></span> {f.home} vs {f.away}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 12, marginBottom: 12 }}>PREVIOUS WEEK RESULTS</h3>
        <table>
          <thead>
            <tr>
              <th>NAME</th>
              <th>LEEDS 1-0</th>
              <th>IPSWICH 1-2</th>
              <th>MAN UTD 4-4</th>
              <th>GW PTS</th>
            </tr>
          </thead>
          <tbody>
            {state.users.map((u, i) => {
              const pts = [0,0,0]; // placeholder - will be dynamic later
              return (
                <tr key={u.id} style={{ textAlign: 'center' }}>
                  <td style={{ textAlign: 'left', color: u.colour }}>{u.name}</td>
                  <td>0-1 (0)</td>
                  <td>1-2 (3)</td>
                  <td>1-1 (1)</td>
                  <td><strong>4</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}