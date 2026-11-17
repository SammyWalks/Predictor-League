export default function Table({ state }) {
  const sorted = [...state.users].sort((a, b) => b.points - a.points)

  return (
    <div className="card">
      <h2 style={{ fontSize: 14, marginBottom: 16 }}><span className="football"></span> LEAGUE TABLE</h2>
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
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src={u.avatar || 'https://placehold.co/32'} alt="" className="profile-pic" style={{ borderColor: u.colour }} />
                  <span style={{ color: u.colour }}>{u.name}</span>
                  {u.wildcard && <span className="badge">WC</span>}
                </div>
              </td>
              <td><strong>{u.points}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}