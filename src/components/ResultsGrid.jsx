function heading(fixture) {
  if (fixture.actualHome != null && fixture.actualAway != null) {
    return `${fixture.home} ${fixture.actualHome}-${fixture.actualAway}`
  }
  return `${fixture.home} vs ${fixture.away}`
}

function cell(pick) {
  if (!pick) return '–'
  const score = pick.pointsAwarded == null ? pick.score : `${pick.score} (${pick.pointsAwarded})`
  if (!pick.enteredByAdmin) return score
  return <span>{score}<span className="admin-note">via admin</span></span>
}

export default function ResultsGrid({ fixtures, players, publishedPicks, entries }) {
  const selected = fixtures.filter((fixture) => fixture.hardest)
  const lockedIds = new Set(entries.map((entry) => entry.userId))
  if (selected.length === 0) return <p className="empty">No fixtures are selected for this week.</p>
  return (
    <div className="table-wrap">
      <table className="results-grid">
        <thead>
          <tr>
            <th>Name</th>
            {selected.map((fixture) => <th key={fixture.id}>{heading(fixture)}</th>)}
            <th>GW Points</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const locked = lockedIds.has(player.id)
            const picks = publishedPicks.filter((pick) => pick.userId === player.id && selected.some((fixture) => fixture.id === pick.fixtureId))
            const scored = picks.filter((pick) => pick.pointsAwarded != null)
            const gw = scored.reduce((sum, pick) => sum + pick.pointsAwarded, 0)
            return (
              <tr key={player.id} className={locked ? '' : 'not-locked'}>
                <td className="player-name" style={{ color: player.colour || '#94a3b8' }}>{player.name}</td>
                {locked
                  ? selected.map((fixture) => <td key={fixture.id}>{cell(picks.find((pick) => pick.fixtureId === fixture.id))}</td>)
                  : <td colSpan={selected.length}>not locked in</td>}
                <td>{locked && scored.length ? gw : '–'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
