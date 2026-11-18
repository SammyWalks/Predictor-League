import { useGame } from '../context/GameContext'
import WeekPicks from '../components/WeekPicks'

export default function Results() {
  const game = useGame()
  return (
    <section className="card">
      <p className="eyebrow">Week {game.currentWeek}</p>
      <h1>This week's predictions</h1>
      <WeekPicks
        showTitle={false}
        fixtures={game.fixtures}
        players={game.players}
        publishedPicks={game.publishedPicks}
        entries={game.entries}
        meId={game.me.id}
      />
      <p className="hint">3 points for the exact score. 1 point if the result is right but the score is not. Points land after Tuesday's scoring, or when an admin calculates them.</p>
    </section>
  )
}
