import { useGame } from '../context/GameContext'
import LeagueTable from '../components/LeagueTable'

export default function Table() {
  const game = useGame()
  return (
    <section className="card">
      <p className="eyebrow">Week {game.currentWeek}</p>
      <h1>League table</h1>
      <p className="lede">Season points. Week points appear after the final scores are calculated.</p>
      <LeagueTable players={game.players} picks={game.allPicks} />
      <p className="hint">3 points for an exact score. 1 point for the right result.</p>
    </section>
  )
}
