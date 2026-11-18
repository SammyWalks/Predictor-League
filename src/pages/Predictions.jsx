import { useEffect, useRef, useState } from 'react'
import { useGame } from '../context/GameContext'
import ScoreInputs from '../components/ScoreInputs'
import StatusPill from '../components/StatusPill'
import ConfirmDialog from '../components/ConfirmDialog'
import WeekPicks from '../components/WeekPicks'
import { friendlyError } from '../supabase'
import { parseScore } from '../data/scoring'
import Countdown from '../components/Countdown'
import Ball from '../components/Ball'
import PixelArt from '../components/PixelArt'

export default function Predictions() {
  const game = useGame()
  const [draft, setDraft] = useState({})
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const dirtyRef = useRef({})
  const timers = useRef({})

  const savedKey = game.myPredictions.map((prediction) => `${prediction.fixtureId}:${prediction.score}`).join('|')

  useEffect(() => {
    setDraft((current) => {
      const next = {}
      game.requiredFixtures.forEach((fixture) => {
        if (dirtyRef.current[fixture.id]) next[fixture.id] = current[fixture.id] || ''
        else {
          const saved = game.myPredictions.find((prediction) => prediction.fixtureId === fixture.id)
          next[fixture.id] = saved?.score || ''
        }
      })
      return next
    })
  }, [savedKey, game.requiredFixtures, game.myPredictions])

  function onScore(fixtureId, score) {
    if (game.locked) return
    setDraft((current) => ({ ...current, [fixtureId]: score }))
    dirtyRef.current[fixtureId] = true
    clearTimeout(timers.current[fixtureId])
    if (!parseScore(score)) {
      setNote('Enter both numbers. This stays private until you lock in.')
      return
    }
    timers.current[fixtureId] = setTimeout(async () => {
      try {
        setNote('Saving privately…')
        await game.savePrediction(fixtureId, score)
        dirtyRef.current[fixtureId] = false
        setNote('Saved privately. Other players cannot see this yet.')
        setError('')
      } catch (err) {
        setError(friendlyError(err))
        setNote('')
      }
    }, 450)
  }

  const readyToLock = game.requiredFixtures.every((fixture) => parseScore(draft[fixture.id] || ''))

  async function confirmLock() {
    setBusy(true)
    setError('')
    try {
      for (const fixture of game.requiredFixtures) {
        clearTimeout(timers.current[fixture.id])
        await game.savePrediction(fixture.id, draft[fixture.id])
        dirtyRef.current[fixture.id] = false
      }
      await game.lockPredictions()
      setConfirming(false)
      setCelebrating(true)
      setNote('Locked in. Everyone can see these picks, and they cannot be edited.')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <section className="card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Week {game.currentWeek}</p>
            <h1><Ball />{game.locked ? 'Locked predictions' : 'Make predictions'}</h1>
          </div>
          <StatusPill status={game.status} />
        </div>
        <p className="lede">Predict the selected fixtures. Lock in when you are happy.</p>
        <Countdown fixtures={game.requiredFixtures} />

        {game.requiredFixtures.length === 0 && (
          <>
            <PixelArt name="bicycle-kick" alt="" className="empty-art" />
            <p className="empty">No fixtures are selected for this week yet.</p>
          </>
        )}
        {celebrating && <PixelArt name="siuu-pose" alt="" className="pop-art" />}

        <div className="predict-list">
          {game.requiredFixtures.map((fixture) => (
            <div key={fixture.id} className="score-line">
              <span className="kickoff">{fixture.kickoffLabel}</span>
              <span className="team home">{fixture.home}</span>
              <ScoreInputs score={draft[fixture.id] || ''} onChange={(score) => onScore(fixture.id, score)} disabled={game.locked} />
              <span className="team away">{fixture.away}</span>
            </div>
          ))}
        </div>

        {note && <p className="note" role="status">{note}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}

        {!game.locked && (
          <button type="button" className="btn lock-btn" disabled={!readyToLock} onClick={() => setConfirming(true)}>
            Lock in
          </button>
        )}
        {game.locked && <p className="locked-banner">Locked. These picks are live for the league.</p>}
      </section>

      <section className="card">
        <p className="live-label">Live</p>
        <WeekPicks
          fixtures={game.requiredFixtures}
          players={game.players}
          publishedPicks={game.publishedPicks}
          entries={game.entries}
          meId={game.me.id}
        />
      </section>

      {confirming && (
        <ConfirmDialog
          title="Lock these in?"
          confirmLabel="Lock in"
          busy={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={confirmLock}
        >
          <p>Everyone will be able to see these picks. You will not be able to change them.</p>
          <ul className="confirm-list">
            {game.requiredFixtures.map((fixture) => (
              <li key={fixture.id}>
                <span>{fixture.home} vs {fixture.away}</span>
                <strong>{draft[fixture.id]}</strong>
              </li>
            ))}
          </ul>
        </ConfirmDialog>
      )}
    </div>
  )
}
