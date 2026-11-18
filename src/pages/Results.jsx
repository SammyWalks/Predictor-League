import { useGame } from '../context/GameContext'
import ResultsGrid from '../components/ResultsGrid'
import Ball from '../components/Ball'
import PixelArt from '../components/PixelArt'
import PicksHidden from '../components/PicksHidden'

export default function Results() {
  const game = useGame()
  return (
    <section className="card">
      <p className="eyebrow">Week {game.currentWeek}</p>
      <h1><Ball />Results</h1>
      <p className="lede">Locked predictions show here straight away. Points appear in brackets after the final scores are calculated.</p>
      {game.entries.length === 0 && game.picksRevealed && <PixelArt name="salute" alt="" className="empty-art" />}
      {game.picksRevealed ? (
        <ResultsGrid
          fixtures={game.fixtures}
          players={game.players}
          publishedPicks={game.publishedPicks}
          entries={game.entries}
          weekAllFixtures={game.weekAllFixtures}
          week={game.currentWeek}
        />
      ) : (
        <PicksHidden />
      )}
      <p className="hint">3 points for an exact score. 1 point for the right result.</p>
    </section>
  )
}
