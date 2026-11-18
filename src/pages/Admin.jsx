import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { fetchRoundEvents, matchFixtures } from '../data/football'
import { scoringMessage } from '../data/scoring'
import { friendlyError } from '../supabase'

export default function Admin() {
  const game = useGame()
  const [scores, setScores] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [fixtureForm, setFixtureForm] = useState({ home: '', away: '', kickoffLabel: '', hardest: false, week: game.currentWeek })
  const [week, setWeek] = useState(game.currentWeek || 11)

  if (!game.me.isAdmin) return <Navigate to="/" replace />

  function valueFor(fixture, side) {
    const typed = scores[fixture.id]
    if (typed && typed[side] != null) return typed[side]
    const actual = side === 'home' ? fixture.actualHome : fixture.actualAway
    return actual == null ? '' : String(actual)
  }

  function editScore(fixture, side, value) {
    setScores((current) => {
      const existing = current[fixture.id] || {
        home: fixture.actualHome == null ? '' : String(fixture.actualHome),
        away: fixture.actualAway == null ? '' : String(fixture.actualAway),
      }
      const digits = value.replace(/\D/g, '').slice(0, 2)
      const capped = digits === '' ? '' : String(Math.min(20, Number(digits)))
      return {
        ...current,
        [fixture.id]: { ...existing, [side]: capped },
      }
    })
  }

  async function saveFixtureScore(fixture) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const home = valueFor(fixture, 'home')
      const away = valueFor(fixture, 'away')
      if ((home === '') !== (away === '')) {
        setError('Enter both scores, or clear both, before saving.')
        setBusy(false)
        return
      }
      await game.adminSaveResult(fixture.id, home === '' ? null : home, away === '' ? null : away)
      setScores((current) => {
        const next = { ...current }
        delete next[fixture.id]
        return next
      })
      setMessage(`Saved ${fixture.home} vs ${fixture.away}. Calculate points when the scores are in.`)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function fetchScores() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const events = await fetchRoundEvents({
        leagueId: game.leagueId,
        round: game.currentWeek,
        season: game.season,
      })
      const next = matchFixtures(game.fixtures, events)
      setSuggestions(next)
      const found = next.filter((item) => item.found).length
      setMessage(found ? `Found ${found} finished score${found === 1 ? '' : 's'}. Apply the ones you want.` : 'No finished scores matched yet. Type them in below.')
    } catch (err) {
      setError(`${friendlyError(err)} Type the scores in below.`)
    } finally {
      setBusy(false)
    }
  }

  async function applySuggestion(suggestion) {
    setBusy(true)
    setError('')
    try {
      await game.adminSaveResult(suggestion.fixtureId, suggestion.home, suggestion.away)
      setMessage(`Applied ${suggestion.homeName} ${suggestion.home}-${suggestion.away} ${suggestion.awayName}.`)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function calculate() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await game.adminCalculate(game.currentWeek)
      setMessage(scoringMessage(result))
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function toggleSelected(fixture) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await game.adminSaveFixture({
        id: fixture.id,
        week: fixture.week,
        home: fixture.home,
        away: fixture.away,
        kickoffLabel: fixture.kickoffLabel,
        hardest: !fixture.hardest,
      })
      setMessage(fixture.hardest
        ? `${fixture.home} vs ${fixture.away} is out of this week's predictions.`
        : `${fixture.home} vs ${fixture.away} is in this week's predictions.`)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function addFixture(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await game.adminSaveFixture({ ...fixtureForm, week: Number(fixtureForm.week) || game.currentWeek })
      setFixtureForm({ home: '', away: '', kickoffLabel: '', hardest: false, week: game.currentWeek })
      setMessage('Fixture saved.')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function saveWeek(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await game.adminSetWeek(Number(week))
      setMessage(`Current week is now ${week}. Tuesday scoring uses this week.`)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <section className="card">
        <p className="eyebrow">Admin</p>
        <h1>Final scores</h1>
        <p className="lede">Type the weekend scores, or fetch them. Then calculate points. Doing it again will not double-count.</p>
        <div className="hero-actions">
          <button type="button" className="btn secondary" onClick={fetchScores} disabled={busy}>Fetch scores</button>
          <button type="button" className="btn" onClick={calculate} disabled={busy}>Calculate points</button>
        </div>
        {message && <p className="note" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}

        {suggestions.some((suggestion) => suggestion.found) && (
          <ul className="suggest-list">
            {suggestions.filter((suggestion) => suggestion.found).map((suggestion) => (
              <li key={suggestion.fixtureId}>
                <span>{suggestion.homeName} vs {suggestion.awayName}</span>
                <button type="button" className="btn btn-small" onClick={() => applySuggestion(suggestion)} disabled={busy}>{suggestion.home}-{suggestion.away} Apply</button>
              </li>
            ))}
          </ul>
        )}

        <div className="predict-list">
          {game.fixtures.map((fixture) => (
            <div key={fixture.id} className="predict-row">
              <div>
                <span className="kickoff">{fixture.kickoffLabel}</span>
                <strong>{fixture.home} vs {fixture.away}</strong>
              </div>
              <div className="admin-score">
                <input
                  inputMode="numeric"
                  aria-label={`${fixture.home} goals`}
                  value={valueFor(fixture, 'home')}
                  onChange={(event) => editScore(fixture, 'home', event.target.value)}
                />
                <span>-</span>
                <input
                  inputMode="numeric"
                  aria-label={`${fixture.away} goals`}
                  value={valueFor(fixture, 'away')}
                  onChange={(event) => editScore(fixture, 'away', event.target.value)}
                />
                <button type="button" className="btn btn-small" onClick={() => saveFixtureScore(fixture)} disabled={busy}>Save</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>This week's round</h2>
        <p className="lede">Tick the games everyone predicts. Unticked games stay off the prediction screen and the results table.</p>
        <ul className="round-list">
          {game.fixtures.map((fixture) => (
            <li key={fixture.id}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={fixture.hardest}
                  disabled={busy}
                  onChange={() => toggleSelected(fixture)}
                />
                <span>{fixture.kickoffLabel} {fixture.home} vs {fixture.away}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Add a fixture</h2>
        <form className="stack-form" onSubmit={addFixture}>
          <label>Home<input value={fixtureForm.home} onChange={(event) => setFixtureForm({ ...fixtureForm, home: event.target.value })} required /></label>
          <label>Away<input value={fixtureForm.away} onChange={(event) => setFixtureForm({ ...fixtureForm, away: event.target.value })} required /></label>
          <label>Kickoff<input value={fixtureForm.kickoffLabel} onChange={(event) => setFixtureForm({ ...fixtureForm, kickoffLabel: event.target.value })} placeholder="Sat 15:00" /></label>
          <label className="check">
            <input type="checkbox" checked={fixtureForm.hardest} onChange={(event) => setFixtureForm({ ...fixtureForm, hardest: event.target.checked })} />
            Selected fixture for every player
          </label>
          <button className="btn secondary" type="submit" disabled={busy}>Save fixture</button>
        </form>
      </section>

      <section className="card">
        <h2>Current week</h2>
        <p className="lede">Leave this on the weekend's round until Tuesday scoring has run. The automatic fetch uses this number as the Premier League round.</p>
        <form className="inline-form" onSubmit={saveWeek}>
          <input inputMode="numeric" aria-label="Current week" value={week} onChange={(event) => setWeek(event.target.value.replace(/\D/g, '').slice(0, 2))} />
          <button className="btn secondary" type="submit" disabled={busy}>Set week</button>
        </form>
      </section>
    </div>
  )
}
