import { useGame } from '../context/GameContext'

function heading(fixture) {
  if (fixture.actualHome != null && fixture.actualAway != null) {
    return `${fixture.home} ${fixture.actualHome}-${fixture.actualAway}`
  }
  return `${fixture.home} vs ${fixture.away}`
}

function cell(pick) {
  if (!pick) return '–'
  if (pick.pointsAwarded == null) return pick.score
  return `${pick.score} (${pick.pointsAwarded})`
}

export default function Results() {
  const game = useGame()
  const selected = game.fixtures.filter((fixture) => fixture.hardest)
  const lockedIds = new Set(game.entries.map((entry) => entry.userId))

  return (
    <section className="card">
      <p className="eyebrow">Week {game.currentWeek}</p>
      <h1>Results</h1>
      <p className="lede">Locked predictions show here straight away. Points appear in brackets after the final scores are calculated.</p>
      {selected.length === 0 && <p className="empty">No fixtures are selected for this week yet.</p>}
      {selected.length > 0 && (
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
              {game.players.map((player) => {
                const locked = lockedIds.has(player.id)
                const picks = game.publishedPicks.filter((pick) => pick.userId === player.id && selected.some((fixture) => fixture.id === pick.fixtureId))
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
      )}
      <p className="hint">3 points for an exact score. 1 point for the right result.</p>
    </section>
  )
}
