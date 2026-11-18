import { Link } from 'react-router-dom'
import Nav from '../components/Nav'

export default function Dashboard({ state, setState }) {
  const user = state.users.find(u => u.id === state.currentUserId)
  const sorted = [...state.users].sort((a, b) => b.points - a.points)

  return (
    <div>
      <Nav state={state} setState={setState} />

      <div className="card" style={{ textAlign: 'center', background: '#000' }}>
        <div style={{ fontSize: 14, color: '#ffd700' }}>WEEK {state.currentWeek}</div>
        <div style={{ fontSize: 18, margin: '8px 0' }}>{user.name}</div>
        <div style={{ fontSize: 12 }}>PTS: {user.points}</div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 14, marginBottom: 16 }}>LEAGUE TABLE</h2>
        <table>
          <thead>
            <tr>
              <th>POS</th>
              <th>PLAYER</th>
              <th>PTS</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u, i) => (
              <tr key={u.id} style={{ borderLeft: `4px solid ${u.colour}` }}>
                <td>{i + 1}</td>
                <td style={{ color: u.colour }}>{u.name}{u.wildcard && ' (WC)'}</td>
                <td><strong>{u.points}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
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
                <td>{f.home} vs {f.away}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
