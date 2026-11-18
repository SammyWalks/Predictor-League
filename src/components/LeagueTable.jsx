export default function LeagueTable({ players, publishedPicks, meId }) {
  const rows = [...players]
    .map((player) => {
      const picks = publishedPicks.filter((pick) => pick.userId === player.id)
      const scored = picks.filter((pick) => pick.pointsAwarded != null)
      const weekPoints = scored.reduce((sum, pick) => sum + pick.pointsAwarded, 0)
      return { ...player, weekPoints: scored.length ? weekPoints : null }
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))

  return (
    <div className="table-wrap">
      <table className="league">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Player</th>
            <th>Week</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((player, index) => (
            <tr key={player.id} className={player.id === meId ? 'me' : ''} style={{ borderLeft: `6px solid ${player.colour}` }}>
              <td>{index + 1}</td>
              <td>
                <span className="player-name" style={{ color: player.colour }}>{player.name}</span>
                {player.wildcard && <span className="tag">WC</span>}
              </td>
              <td>{player.weekPoints == null ? '–' : player.weekPoints}</td>
              <td className="points">{player.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
