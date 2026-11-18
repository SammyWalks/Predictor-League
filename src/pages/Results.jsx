import { useGame } from '../context/GameContext'
import ResultsGrid from '../components/ResultsGrid'
import Ball from '../components/Ball'

export default function Results() {
  const game = useGame()
  return (
    <section className="card">
      <p className="eyebrow">Week {game.currentWeek}</p>
      <h1><Ball />Results</h1>
      <p className="lede">Locked predictions show here straight away. Points appear in brackets after the final scores are calculated.</p>
      <ResultsGrid
        fixtures={game.fixtures}
        players={game.players}
        publishedPicks={game.publishedPicks}
        entries={game.entries}
      />
      <p className="hint">3 points for an exact score. 1 point for the right result.</p>
    </section>
  )
}
