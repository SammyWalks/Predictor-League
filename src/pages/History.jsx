import { useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import ResultsGrid from '../components/ResultsGrid'
import Ball from '../components/Ball'

export default function History() {
  const game = useGame()
  const weeks = useMemo(() => {
    const found = new Set(game.allFixtures.map((fixture) => fixture.week))
    game.allPicks.forEach((pick) => found.add(pick.week))
    return [...found].filter((week) => week != null).sort((a, b) => b - a)
  }, [game.allFixtures, game.allPicks])
  const [week, setWeek] = useState(weeks.find((item) => item !== game.currentWeek) || weeks[0] || game.currentWeek)
  const fixtures = game.allFixtures.filter((fixture) => fixture.week === week)
  const picks = game.allPicks.filter((pick) => pick.week === week)
  const entries = (game.allEntries || []).filter((entry) => entry.week === week)

  return (
    <section className="card">
      <p className="eyebrow">Past weeks</p>
      <h1><Ball />Week history</h1>
      <label>
        Gameweek
        <select value={week || ''} onChange={(event) => setWeek(Number(event.target.value))}>
          {weeks.map((item) => <option key={item} value={item}>Week {item}</option>)}
        </select>
      </label>
      <ResultsGrid fixtures={fixtures} players={game.players} publishedPicks={picks} entries={entries} />
    </section>
  )
}
