import PixelArt from './PixelArt'

export default function WeekPicks({ fixtures, players, publishedPicks, entries, meId, showTitle = true }) {
  const lockedIds = new Set(entries.map((entry) => entry.userId))
  const waiting = players.filter((player) => !lockedIds.has(player.id))

  return (
    <section>
      {showTitle && <h2>This week's predictions</h2>}
      <p className="lede">Only locked-in predictions are shown. Picks stay private until that player locks in.</p>
      <p className="waiting">
        {waiting.length
          ? `Still to lock in: ${waiting.map((player) => player.name).join(', ')}`
          : 'Everyone has locked in.'}
      </p>
      {fixtures.length === 0 && (
        <>
          <PixelArt name="header-goal" alt="" className="empty-art" />
          <p className="empty">No fixtures for this week yet.</p>
        </>
      )}
      {fixtures.length > 0 && waiting.length === players.length && (
        <>
          <PixelArt name="dribble-duel" alt="" className="empty-art" />
          <p className="empty">No predictions locked in yet.</p>
        </>
      )}
      {fixtures.map((fixture) => {
        const picks = publishedPicks
          .filter((pick) => pick.fixtureId === fixture.id)
          .map((pick) => ({ ...pick, player: players.find((player) => player.id === pick.userId) }))
          .sort((a, b) => (a.player?.name || '').localeCompare(b.player?.name || ''))
        const finalScore = fixture.actualHome != null && fixture.actualAway != null
        return (
          <article key={fixture.id} className="fixture-card">
            <header>
              <span className="kickoff">{fixture.kickoffLabel}</span>
              {fixture.hardest && <span className="tag">Selected</span>}
              <strong>{fixture.home} vs {fixture.away}</strong>
              {finalScore && <span className="final">Final {fixture.actualHome}-{fixture.actualAway}</span>}
            </header>
            {picks.length === 0 && <p className="empty">No locked predictions yet.</p>}
            <ul className="pick-list">
              {picks.map((pick) => (
                <li key={pick.userId} className={pick.userId === meId ? 'me' : ''}>
                  <span className="player-name" style={{ color: pick.player?.colour || '#fff' }}>{pick.player?.name || 'Player'}</span>
                  <span className="pick-score">{pick.score}{pick.enteredByAdmin ? ' (admin)' : ''}</span>
                  <span className="pick-points">{pick.pointsAwarded == null ? '' : `${pick.pointsAwarded} pts`}</span>
                </li>
              ))}
            </ul>
          </article>
        )
      })}
    </section>
  )
}
