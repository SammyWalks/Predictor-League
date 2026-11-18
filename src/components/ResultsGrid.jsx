import Sprite, { kitProps } from './Sprite'
import { teamCode } from '../data/teams'
import { playsAll } from '../data/round'

function columnsFor(fixtures, week, weekAllFixtures) {
  const joiners = (weekAllFixtures || []).some((row) => Number(row.week) === Number(week))
  const rows = (fixtures || []).filter((fixture) => fixture.week == null || Number(fixture.week) === Number(week) || week == null)
  const list = joiners ? rows : rows.filter((fixture) => fixture.hardest)
  return [...list].sort((a, b) => a.id - b.id)
}

function heading(fixture) {
  const scored = fixture.actualHome != null && fixture.actualAway != null
  const title = scored
    ? `${fixture.home} ${fixture.actualHome}-${fixture.actualAway} ${fixture.away}`
    : `${fixture.home} vs ${fixture.away}`
  return (
    <span className="fix-head" title={title}>
      <span>{teamCode(fixture.home)}</span>
      <span>{teamCode(fixture.away)}</span>
      {scored && <span className="fix-score">{fixture.actualHome}-{fixture.actualAway}</span>}
    </span>
  )
}

function cell(pick) {
  if (!pick) return '–'
  const score = pick.pointsAwarded == null ? pick.score : `${pick.score} (${pick.pointsAwarded})`
  if (!pick.enteredByAdmin) return score
  return <span>{score}<span className="admin-note">via admin</span></span>
}

function plays(player, fixture, weekAllFixtures) {
  return fixture.hardest || playsAll(player.id, fixture.week, weekAllFixtures)
}

export default function ResultsGrid({ fixtures, players, publishedPicks, entries, weekAllFixtures = [], week }) {
  const shownWeek = week ?? fixtures[0]?.week
  const columns = columnsFor(fixtures, shownWeek, weekAllFixtures)
  const lockedIds = new Set(entries.map((entry) => entry.userId))
  if (columns.length === 0) return <p className="empty">No fixtures are selected for this week.</p>

  return (
    <>
      <div className="table-wrap results-table">
        <table className="results-grid">
          <thead>
            <tr>
              <th className="name-col">Name</th>
              {columns.map((fixture) => <th key={fixture.id}>{heading(fixture)}</th>)}
              <th className="gw-col">GW</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => {
              const locked = lockedIds.has(player.id)
              const picks = publishedPicks.filter((pick) => pick.userId === player.id && columns.some((fixture) => fixture.id === pick.fixtureId))
              const scored = picks.filter((pick) => pick.pointsAwarded != null && plays(player, columns.find((fixture) => fixture.id === pick.fixtureId) || {}, weekAllFixtures))
              const gw = scored.reduce((sum, pick) => sum + pick.pointsAwarded, 0)
              const joiner = playsAll(player.id, shownWeek, weekAllFixtures)
              return (
                <tr key={player.id} className={locked ? '' : 'not-locked'}>
                  <td className="player-name name-col" style={{ color: player.colour || '#94a3b8' }}>
                    <Sprite {...kitProps(player)} size={18} /> {player.name}
                    {joiner && <span className="joiner-note">NEW PLAYER: ALL 10 GAMES</span>}
                  </td>
                  {locked
                    ? columns.map((fixture) => (
                      <td key={fixture.id}>{plays(player, fixture, weekAllFixtures) ? cell(picks.find((pick) => pick.fixtureId === fixture.id)) : '–'}</td>
                    ))
                    : <td className="locked-out" colSpan={columns.length} title="Not locked in">–</td>}
                  <td className="gw-col">{locked && scored.length ? gw : '–'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="results-cards">
        {players.map((player) => {
          const locked = lockedIds.has(player.id)
          const picks = publishedPicks.filter((pick) => pick.userId === player.id)
          const scored = picks.filter((pick) => pick.pointsAwarded != null && columns.some((fixture) => fixture.id === pick.fixtureId && plays(player, fixture, weekAllFixtures)))
          const gw = scored.reduce((sum, pick) => sum + pick.pointsAwarded, 0)
          const joiner = playsAll(player.id, shownWeek, weekAllFixtures)
          return (
            <article key={player.id} className={locked ? 'result-card' : 'result-card not-locked'}>
              <header className="player-name" style={{ color: player.colour || '#94a3b8' }}>
                <Sprite {...kitProps(player)} size={18} /> {player.name}
                <strong>{locked && scored.length ? `${gw} pts` : '–'}</strong>
              </header>
              {joiner && <p className="joiner-note">NEW PLAYER: ALL 10 GAMES</p>}
              {locked ? columns.map((fixture) => (
                <p key={fixture.id} className="result-line">
                  <span title={`${fixture.home} vs ${fixture.away}`}>{teamCode(fixture.home)} {teamCode(fixture.away)}{fixture.actualHome != null ? ` ${fixture.actualHome}-${fixture.actualAway}` : ''}</span>
                  <span>{plays(player, fixture, weekAllFixtures) ? cell(picks.find((pick) => pick.fixtureId === fixture.id)) : '–'}</span>
                </p>
              )) : <p className="result-line muted">Not locked in</p>}
            </article>
          )
        })}
      </div>
    </>
  )
}
