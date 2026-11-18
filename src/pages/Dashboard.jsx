import { Link } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import LeagueTable from '../components/LeagueTable'
import StatusPill from '../components/StatusPill'

export default function Dashboard() {
  const game = useGame()
  const selected = game.fixtures.filter((fixture) => fixture.hardest)

  return (
    <div>
      <section className="card hero">
        <p className="eyebrow">Week {game.currentWeek}</p>
        <h1>{game.me.name}</h1>
        <p className="hero-points">{game.me.points} pts</p>
        <StatusPill status={game.status} />
        <div className="hero-actions">
          <Link className="btn" to="/predict">{game.locked ? 'See locked picks' : 'Make predictions'}</Link>
          {game.me.isAdmin && <Link className="btn secondary" to="/admin">Enter scores</Link>}
        </div>
      </section>

      <section className="card">
        <h2>League table</h2>
        <LeagueTable players={game.players} publishedPicks={game.publishedPicks} meId={game.me.id} />
        <p className="hint"><Link to="/table">Open the full table</Link></p>
      </section>

      <section className="card">
        <h2>Selected fixtures</h2>
        <p className="lede">Everyone predicts these. Wildcard players also predict the rest of the round.</p>
        <ul className="fixture-mini">
          {selected.map((fixture) => (
            <li key={fixture.id}>
              <span>{fixture.kickoffLabel}</span>
              <strong>{fixture.home} vs {fixture.away}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
