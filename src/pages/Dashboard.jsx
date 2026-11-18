import { Link } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import LeagueTable from '../components/LeagueTable'
import StatusPill from '../components/StatusPill'
import Countdown from '../components/Countdown'
import { playerOfTheWeek } from '../data/extras'
import Ball from '../components/Ball'
import PixelArt from '../components/PixelArt'
import XpBar from '../components/XpBar'
import Sprite, { kitProps } from '../components/Sprite'
import PicksHidden from '../components/PicksHidden'
import { rivalId, setRival, seenAchievements, markAchievement } from '../arcade/settings'
import { badgesFor } from '../data/extras'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const game = useGame()
  const selected = game.fixtures.filter((fixture) => fixture.hardest)
  const trophy = playerOfTheWeek(game.players, game.allPicks, game.currentWeek)
  const [rival, setRivalState] = useState(rivalId)
  const [toast, setToast] = useState('')
  const [flash, setFlash] = useState(false)
  const others = game.players.filter((player) => player.id !== game.me.id)
  const rivalPlayer = game.players.find((player) => player.id === rival)
  const mineWeek = game.publishedPicks.filter((pick) => pick.userId === game.me.id && pick.pointsAwarded != null)
  const rivalWeek = game.publishedPicks.filter((pick) => pick.userId === rival && pick.pointsAwarded != null)
  const myWeekPts = mineWeek.reduce((sum, pick) => sum + pick.pointsAwarded, 0)
  const rivalWeekPts = rivalWeek.reduce((sum, pick) => sum + pick.pointsAwarded, 0)

  useEffect(() => {
    const seen = seenAchievements(game.me.id)
    const earned = badgesFor(game.me, game.players, game.allPicks).map((badge) => badge.id)
    const lowest = Math.min(...game.players.map((player) => player.points))
    if (game.me.points === lowest) earned.push('spoon')
    const fresh = earned.find((id) => !seen.has(id))
    if (!fresh) return
    markAchievement(game.me.id, fresh)
    const labels = { perfect: 'Perfect score', streak: '3-week streak', bottled: 'Bottled it', top: 'Top of the league', spoon: 'Wooden spoon' }
    setToast(labels[fresh] || fresh)
    const timer = setTimeout(() => setToast(''), 2800)
    return () => clearTimeout(timer)
  }, [game.me, game.players, game.allPicks])

  useEffect(() => {
    const exact = game.allPicks.some((pick) => pick.userId === game.me.id && pick.week === game.currentWeek && pick.pointsAwarded === 3)
    if (!exact) return
    const key = `predictor-exact-${game.me.id}-${game.currentWeek}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    setFlash(true)
    const timer = setTimeout(() => setFlash(false), 2200)
    return () => clearTimeout(timer)
  }, [game.allPicks, game.me.id, game.currentWeek])

  return (
    <div>
      {trophy && game.picksRevealed && (
        <section className="trophy">
          <PixelArt
            name={['trophy-lift', 'crowd-celebration', 'celebration-knee-slide'][trophy.week % 3]}
            alt=""
            className="trophy-art"
          />
          <p className="eyebrow">Week {trophy.week}</p>
          <h2><Ball />Player of the week</h2>
          <p className="trophy-names">{trophy.names.join(' and ')}</p>
          <p>{trophy.points} pts</p>
        </section>
      )}
      <section className="card hero">
        <p className="eyebrow">Week {game.currentWeek}</p>
        <h1>{game.me.name}</h1>
        <p className="hero-points">{game.me.points} pts</p>
        <StatusPill status={game.status} />
        <XpBar points={game.me.points} />
        <Countdown fixtures={selected} />
        <div className="hero-actions">
          <Link className="btn" to="/predict">{game.locked ? 'See locked picks' : 'Make predictions'}</Link>
          {game.me.isAdmin && <Link className="btn secondary" to="/admin">Enter scores</Link>}
        </div>
        {!game.picksRevealed && <PicksHidden />}
      </section>

      {toast && <p className="toast" role="status">Achievement unlocked: {toast}</p>}
      {flash && (
        <div className="goal-flash">
          <PixelArt name="celebration-knee-slide" alt="" className="pop-art" />
          <p>Exact score</p>
          <span className="confetti" />
        </div>
      )}
      <section className="card vs-card">
        <h2>Head to head</h2>
        <label>
          Weekly rival
          <select value={rival} onChange={(event) => { setRival(event.target.value); setRivalState(event.target.value) }}>
            <option value="">Pick a rival</option>
            {others.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
          </select>
        </label>
        {rivalPlayer && (
          <div className="vs">
            <div><Sprite {...kitProps(game.me)} size={48} /><p>{game.me.name}</p></div>
            <strong>VS</strong>
            <div><Sprite {...kitProps(rivalPlayer)} size={48} /><p>{rivalPlayer.name}</p></div>
          </div>
        )}
        {rivalPlayer && !game.picksRevealed && <PicksHidden />}
        {rivalPlayer && game.picksRevealed && mineWeek.length > 0 && rivalWeek.length > 0 && (
          <p className="note">{myWeekPts === rivalWeekPts ? 'Draw' : myWeekPts > rivalWeekPts ? `${game.me.name} takes the week` : `${rivalPlayer.name} takes the week`}</p>
        )}
      </section>
      <section className="card">
        <h2><Ball />League table</h2>
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
