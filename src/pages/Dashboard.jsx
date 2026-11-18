import { Link } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import LeagueTable from '../components/LeagueTable'
import StatusPill from '../components/StatusPill'
import Countdown from '../components/Countdown'
import { playerOfTheWeek } from '../data/extras'

export default function Dashboard() {
  const game = useGame()
  const selected = game.fixtures.filter((fixture) => fixture.hardest)
  const trophy = playerOfTheWeek(game.players, game.allPicks, game.currentWeek)

  return (
    <div>
      {trophy && (
        <section className="trophy">
          <p className="eyebrow">Week {trophy.week}</p>
          <h2>Player of the week</h2>
          <p className="trophy-names">{trophy.names.join(' and ')}</p>
          <p>{trophy.points} pts</p>
        </section>
      )}
      <section className="card hero">
        <p className="eyebrow">Week {game.currentWeek}</p>
        <h1>{game.me.name}</h1>
        <p className="hero-points">{game.me.points} pts</p>
        <StatusPill status={game.status} />
        <Countdown fixtures={selected} />
        <div className="hero-actions">
          <Link className="btn" to="/predict">{game.locked ? 'See locked picks' : 'Make predictions'}</Link>
          {game.me.isAdmin && <Link className="btn secondary" to="/admin">Enter scores</Link>}
        </div>
      </section>

      <section className="card">
        <h2>League table</h2>
        <LeagueTable players={game.players} picks={game.allPicks} />
      </section>

      <section className="card">
        <h2>Selected fixtures</h2>
        <p className="lede">Everyone predicts these games.</p>
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
