import { useEffect, useState } from 'react'
import { useGame } from '../context/GameContext'
import ScoreInputs from './ScoreInputs'
import { friendlyError } from '../supabase'
import { formatScore, parseScore } from '../data/scoring'

export default function AdminPlayerPicks() {
  const game = useGame()
  const selected = game.fixtures.filter((fixture) => fixture.hardest)
  const [playerId, setPlayerId] = useState(game.players[0]?.id || '')
  const [draft, setDraft] = useState({})
  const [locked, setLocked] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!playerId) return undefined
    let cancel = false
    setError('')
    game.adminLoadPlayerPredictions(playerId)
      .then((data) => {
        if (cancel || !data) return
        const next = {}
        selected.forEach((fixture) => {
          const saved = (data.predictions || []).find((prediction) => prediction.fixtureId === fixture.id)
          next[fixture.id] = saved?.score || ''
        })
        setDraft(next)
        setLocked(Boolean(data.locked))
      })
      .catch((err) => {
        if (!cancel) setError(friendlyError(err))
      })
    return () => {
      cancel = true
    }
  }, [playerId, game.currentWeek])

  function onScore(fixtureId, score) {
    setDraft((current) => ({ ...current, [fixtureId]: score }))
  }

  async function save(lock) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const scores = selected
        .filter((fixture) => parseScore(draft[fixture.id] || ''))
        .map((fixture) => {
          const parsed = parseScore(draft[fixture.id])
          return { fixtureId: fixture.id, score: formatScore(parsed.home, parsed.away) }
        })
      if (lock && scores.length !== selected.length) {
        throw new Error('Enter a score for every selected game before locking.')
      }
      if (scores.length === 0) throw new Error('Enter at least one score.')
      await game.adminSavePlayerPredictions(playerId, scores, lock || locked)
      const name = game.players.find((player) => player.id === playerId)?.name || 'player'
      setMessage(lock || locked
        ? `Locked picks saved for ${name}. Everyone can see them.`
        : `Saved privately for ${name}. They stay hidden until you lock them in.`)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <h2>Enter predictions for a player</h2>
      <p className="lede">Use this when someone sends their picks by text. Locking them in publishes the row on the results table. You can still change a score after it is locked.</p>
      <label>
        Player
        <select value={playerId} onChange={(event) => setPlayerId(event.target.value)}>
          {game.players.map((player) => (
            <option key={player.id} value={player.id}>{player.name}</option>
          ))}
        </select>
      </label>
      {locked && <p className="note">This player is already locked. Saving updates the live picks.</p>}
      {selected.length === 0 && <p className="empty">No fixtures are selected for this week yet.</p>}
      {selected.map((fixture) => (
        <div key={fixture.id} className="score-line">
          <span className="kickoff">{fixture.kickoffLabel}</span>
          <span className="team home">{fixture.home}</span>
          <ScoreInputs score={draft[fixture.id] || ''} onChange={(score) => onScore(fixture.id, score)} />
          <span className="team away">{fixture.away}</span>
        </div>
      ))}
      {message && <p className="note" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="hero-actions">
        {!locked && (
          <button type="button" className="btn secondary" disabled={busy || selected.length === 0} onClick={() => save(false)}>Save privately</button>
        )}
        <button type="button" className="btn" disabled={busy || selected.length === 0} onClick={() => save(true)}>
          {locked ? 'Update locked picks' : 'Lock in for this player'}
        </button>
      </div>
    </section>
  )
}
