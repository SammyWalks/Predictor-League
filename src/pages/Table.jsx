import Nav from '../components/Nav'

export default function Table({ state }) {
  const sorted = [...state.users].sort((a, b) => b.points - a.points)

  return (
    <div>
      <Nav state={state} />
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
    </div>
  )
}
