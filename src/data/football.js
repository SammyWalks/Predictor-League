import { sameTeam } from './teams.js'

const NOT_PLAYED = new Set([
  '',
  'NS',
  'NOT STARTED',
  'POSTPONED',
  'CANC',
  'CANCELLED',
  'CANCELED',
  'ABD',
  'ABANDONED',
  'TBD',
  'SUSPENDED',
])

export function finishedScore(event) {
  if (!event) return null
  if (String(event.strPostponed || '').toLowerCase() === 'yes') return null
  const status = String(event.strStatus || '').trim().toUpperCase()
  if (NOT_PLAYED.has(status)) return null
  if (event.intHomeScore == null || event.intHomeScore === '') return null
  if (event.intAwayScore == null || event.intAwayScore === '') return null
  const home = Number(event.intHomeScore)
  const away = Number(event.intAwayScore)
  if (!Number.isInteger(home) || !Number.isInteger(away)) return null
  if (home < 0 || away < 0 || home > 20 || away > 20) return null
  return { home, away }
}

export function matchFixtures(fixtures, events) {
  const played = (events || [])
    .map((event) => ({
      home: event.strHomeTeam,
      away: event.strAwayTeam,
      score: finishedScore(event),
      date: event.dateEvent || '',
    }))
    .filter((event) => event.score)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (fixtures || []).map((fixture) => {
    const hit = played.find((event) => sameTeam(event.home, fixture.home) && sameTeam(event.away, fixture.away))
    if (!hit) {
      return {
        fixtureId: fixture.id,
        homeName: fixture.home,
        awayName: fixture.away,
        found: false,
      }
    }
    return {
      fixtureId: fixture.id,
      homeName: fixture.home,
      awayName: fixture.away,
      found: true,
      home: hit.score.home,
      away: hit.score.away,
    }
  })
}

// Automatic fetch only fills blanks. A score already typed by an admin stays put.
export function scoresToApply(fixtures, suggestions, { overwrite = false } = {}) {
  return (suggestions || []).filter((suggestion) => {
    if (!suggestion.found) return false
    const fixture = (fixtures || []).find((item) => item.id === suggestion.fixtureId)
    if (!fixture) return false
    const hasScore = fixture.actualHome != null && fixture.actualAway != null
    if (hasScore && !overwrite) return false
    return true
  })
}

export function roundUrl({ leagueId = '4328', round, season }) {
  const params = new URLSearchParams({
    id: String(leagueId),
    r: String(round),
    s: String(season),
  })
  return `https://www.thesportsdb.com/api/v1/json/123/eventsround.php?${params}`
}

export async function fetchRoundEvents({ leagueId, round, season, fetchImpl = fetch }) {
  const response = await fetchImpl(roundUrl({ leagueId, round, season }))
  if (!response.ok) throw new Error(`Football feed returned ${response.status}`)
  const body = await response.json()
  if (!body || !Array.isArray(body.events)) {
    throw new Error('Football feed did not return a fixture list')
  }
  return body.events
}
