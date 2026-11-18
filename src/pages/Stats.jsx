import { useGame } from '../context/GameContext'
import { leagueRecords, seasonRows } from '../data/extras'

export default function Stats() {
  const game = useGame()
  const rows = seasonRows(game.players, game.allPicks)
  const records = leagueRecords(game.players, game.allPicks)

  return (
    <section className="card">
      <p className="eyebrow">Season</p>
      <h1>Stats</h1>
      <div className="records">
        <p>{records.bestWeek ? `Best week: ${records.bestWeek.name}, week ${records.bestWeek.week}, ${records.bestWeek.points} pts` : 'Best week appears after a gameweek is scored.'}</p>
        <p>{records.mostExact ? `Most exact scores in a week: ${records.mostExact.name}, ${records.mostExact.exact}` : 'No exact scores yet.'}</p>
      </div>
      <div className="table-wrap">
        <table className="league stats">
          <thead>
            <tr>
              <th>Player</th>
              <th>Exact</th>
              <th>Results</th>
              <th>Best</th>
              <th>Avg</th>
              <th>Weeks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="player-name" style={{ color: row.colour || '#94a3b8' }}>{row.name}</td>
                <td>{row.exact}</td>
                <td>{row.correct}</td>
                <td>{row.bestWeek == null ? '–' : `W${row.bestWeek} ${row.bestPoints}`}</td>
                <td>{row.average}</td>
                <td>{row.lockedWeeks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
