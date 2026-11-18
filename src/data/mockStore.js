import { PLAYERS } from './players.js'
import { FIXTURES, CURRENT_WEEK, SEASON, LEAGUE_ID } from './fixtures.js'
import { formatScore, parseScore, settlePick } from './scoring.js'
import { firstKickoff } from './extras.js'
import { visiblePicks, weekRevealed } from './visibility.js'
import { WEEK_ALL_FIXTURES, playable, playableFixtures } from './round.js'
import { h2hRecord } from './h2h.js'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function requiredFixtures(state) {
  return state.fixtures.filter((fixture) => fixture.week === state.currentWeek && fixture.hardest)
}

const MOCK_KEY = 'predictor-mock-v1'

function readPersisted() {
  try {
    if (typeof sessionStorage === 'undefined') return null
    const raw = sessionStorage.getItem(MOCK_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function createStore({ demo = false, persist = false } = {}) {
  const passwords = new Map(PLAYERS.map((player) => [player.id, 'office']))
  const saved = persist ? readPersisted() : null
  const state = {
    players: saved?.players || PLAYERS.map((player) => ({ ...player })),
    fixtures: saved?.fixtures || FIXTURES.map((fixture) => ({ ...fixture })),
    currentWeek: saved?.currentWeek || CURRENT_WEEK,
    season: saved?.season || SEASON,
    leagueId: saved?.leagueId || LEAGUE_ID,
    predictions: saved?.predictions || [],
    publishedPicks: saved?.publishedPicks || [],
    entries: saved?.entries || [],
    weekAllFixtures: WEEK_ALL_FIXTURES.map((row) => ({ ...row })),
    rivalries: saved?.rivalries || [],
  }
  const sessions = new Map(saved?.sessions || [])
  const listeners = new Set()

  if (demo && !saved) {
    const reuben = ['3', '4', '9']
    const scores = { 3: '1-1', 4: '2-0', 9: '1-1' }
    reuben.forEach((id) => {
      state.predictions.push({
        userId: 'reuben',
        fixtureId: Number(id),
        week: CURRENT_WEEK,
        score: scores[id],
        locked: true,
        pointsAwarded: null,
        enteredByAdmin: false,
      })
      state.publishedPicks.push({
        userId: 'reuben',
        fixtureId: Number(id),
        week: CURRENT_WEEK,
        score: scores[id],
        pointsAwarded: null,
        lockedAt: '2026-11-18T12:00:00.000Z',
        enteredByAdmin: false,
      })
    })
    state.entries.push({ userId: 'reuben', week: CURRENT_WEEK, lockedAt: '2026-11-18T12:00:00.000Z' })
    state.predictions.push({
      userId: 'saj',
      fixtureId: 3,
      week: CURRENT_WEEK,
      score: '0-0',
      locked: false,
      pointsAwarded: null,
      enteredByAdmin: false,
    })
  }

  function emit() {
    if (persist) {
      try {
        sessionStorage.setItem(MOCK_KEY, JSON.stringify({
          players: state.players,
          fixtures: state.fixtures,
          currentWeek: state.currentWeek,
          season: state.season,
          leagueId: state.leagueId,
          predictions: state.predictions,
          publishedPicks: state.publishedPicks,
          entries: state.entries,
          rivalries: state.rivalries,
          sessions: [...sessions.entries()],
        }))
      } catch {
        // The preview still works until the tab is closed.
      }
    }
    listeners.forEach((listener) => listener())
  }

  function userFromToken(token) {
    const userId = sessions.get(token)
    if (!userId) {
      const error = new Error('Session expired. Log in again.')
      error.code = 'session'
      throw error
    }
    const user = state.players.find((player) => player.id === userId)
    if (!user) {
      const error = new Error('Session expired. Log in again.')
      error.code = 'session'
      throw error
    }
    return user
  }

  function requireAdmin(token) {
    const user = userFromToken(token)
    if (!user.isAdmin) {
      const error = new Error('Admin only')
      throw error
    }
    return user
  }

  function payload(token) {
    const user = token ? userFromToken(token) : null
    return {
      me: user ? withRecord(user) : null,
      players: [...state.players].sort((a, b) => a.name.localeCompare(b.name)).map(withRecord),
      fixtures: clone(state.fixtures),
      currentWeek: state.currentWeek,
      season: state.season,
      leagueId: state.leagueId,
      myPredictions: state.predictions
        .filter((prediction) => prediction.userId === user?.id)
        .map((prediction) => ({
          fixtureId: prediction.fixtureId,
          week: prediction.week,
          score: prediction.score,
          locked: prediction.locked,
          pointsAwarded: prediction.pointsAwarded,
          enteredByAdmin: Boolean(prediction.enteredByAdmin),
        })),
      publishedPicks: visiblePicks({
        user,
        picks: state.publishedPicks,
        fixtures: state.fixtures,
        entries: state.entries,
      }),
      entries: clone(state.entries),
      picksRevealed: user ? weekRevealed({
        user,
        week: state.currentWeek,
        fixtures: state.fixtures,
        entries: state.entries,
      }) : false,
      revealedWeeks: [...new Set(state.fixtures.map((fixture) => fixture.week))]
        .filter((week) => user && weekRevealed({
          user,
          week,
          fixtures: state.fixtures,
          entries: state.entries,
        })),
      weekAllFixtures: state.weekAllFixtures.map((row) => ({ ...row })),
      myRival: user
        ? (state.rivalries.find((row) => row.userId === user.id && row.week === state.currentWeek)?.rivalId || '')
        : '',
    }
  }

  function withRecord(user) {
    return {
      ...publicUser(user),
      h2h: h2hRecord(user.id, state.rivalries, state.fixtures, state.publishedPicks),
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    login(name, password) {
      const user = state.players.find((player) => player.name.toLowerCase() === String(name || '').trim().toLowerCase())
      if (!user || passwords.get(user.id) !== password) {
        throw new Error('Invalid name or password')
      }
      const token = `mock-${user.id}-${Math.random().toString(16).slice(2)}`
      sessions.set(token, user.id)
      emit()
      return { token }
    },
    topScores() {
      return topFive(state.players).map((player) => ({
        name: player.name,
        colour: player.colour,
        points: player.points,
        sprite: player.sprite || 'striker',
        kitShirt: player.kitShirt || player.colour,
        kitShorts: player.kitShorts || '#ffffff',
        kitSocks: player.kitSocks || player.kitShirt || player.colour,
      }))
    },
    logout(token) {
      sessions.delete(token)
      emit()
    },
    setRival(token, rivalId) {
      const user = userFromToken(token)
      const week = state.currentWeek
      const deadline = firstKickoff(state.fixtures.filter((fixture) => fixture.week === week))
      if (deadline && deadline <= new Date()) throw new Error('The deadline has passed')
      if (state.entries.some((entry) => entry.userId === user.id && entry.week === week)) {
        throw new Error('Rival is locked for this week')
      }
      const next = String(rivalId || '').trim()
      if (next === user.id) throw new Error('Pick someone else')
      if (next && !state.players.some((player) => player.id === next)) throw new Error('Player not found')
      state.rivalries = state.rivalries.filter((row) => !(row.userId === user.id && row.week === week))
      if (next) state.rivalries.push({ userId: user.id, week, rivalId: next })
      emit()
      return { ok: true }
    },
    loadGame(token) {
      autoLock(state)
      return payload(token)
    },
    savePrediction(token, fixtureId, score) {
      autoLock(state)
      const user = userFromToken(token)
      const fixture = state.fixtures.find((item) => item.id === Number(fixtureId))
      if (!fixture) throw new Error('Fixture not found')
      if (fixture.week !== state.currentWeek) throw new Error('That fixture is not in the current week')
      const deadline = firstKickoff(state.fixtures.filter((item) => item.week === fixture.week))
      if (deadline && deadline <= new Date()) throw new Error('The deadline has passed')
      const locked = state.entries.some((entry) => entry.userId === user.id && entry.week === fixture.week)
      if (locked) throw new Error('Predictions are locked for this week')
      if (!playable(fixture, user.id, state.weekAllFixtures)) throw new Error('That fixture is not in this week\'s round')
      const parsed = parseScore(String(score || ''))
      if (!parsed) throw new Error('Enter a score like 2-1')
      const canonical = formatScore(parsed.home, parsed.away)
      const existing = state.predictions.find((prediction) => prediction.userId === user.id && prediction.fixtureId === fixture.id)
      if (existing) {
        existing.score = canonical
        existing.locked = false
        existing.week = fixture.week
        existing.enteredByAdmin = false
      } else {
        state.predictions.push({
          userId: user.id,
          fixtureId: fixture.id,
          week: fixture.week,
          score: canonical,
          locked: false,
          pointsAwarded: null,
          enteredByAdmin: false,
        })
      }
      emit()
      return { ok: true }
    },
    lockPredictions(token) {
      const user = userFromToken(token)
      const week = state.currentWeek
      if (state.entries.some((entry) => entry.userId === user.id && entry.week === week)) {
        throw new Error('Predictions are already locked')
      }
      const required = playableFixtures(state.fixtures, user.id, week, state.weekAllFixtures)
      if (required.length === 0) throw new Error('There are no fixtures to lock')
      const missing = required.filter((fixture) => {
        const prediction = state.predictions.find((item) => item.userId === user.id && item.fixtureId === fixture.id)
        return !prediction || !parseScore(prediction.score)
      })
      if (missing.length) {
        throw new Error(`Add a score for ${missing.map((fixture) => `${fixture.home} vs ${fixture.away}`).join(', ')}`)
      }
      const lockedAt = new Date().toISOString()
      state.entries.push({ userId: user.id, week, lockedAt })
      required.forEach((fixture) => {
        const prediction = state.predictions.find((item) => item.userId === user.id && item.fixtureId === fixture.id)
        prediction.locked = true
        state.publishedPicks.push({
          userId: user.id,
          fixtureId: fixture.id,
          week,
          score: prediction.score,
          pointsAwarded: null,
          lockedAt,
          enteredByAdmin: Boolean(prediction.enteredByAdmin),
        })
      })
      emit()
      return { ok: true }
    },
    updateProfile(token, { name, colour, sprite, kitShirt, kitShorts, kitSocks }) {
      const user = userFromToken(token)
      const nextName = String(name || '').trim()
      if (nextName.length < 2) throw new Error('Name is too short')
      if (!/^#[0-9a-fA-F]{6}$/.test(colour || '')) throw new Error('Pick a colour')
      const paint = (value, label) => {
        if (value == null || value === '') return null
        if (!/^#[0-9a-fA-F]{6}$/.test(value)) throw new Error(`Pick a ${label} colour`)
        return value
      }
      user.name = nextName
      user.colour = colour
      if (['striker', 'keeper', 'winger', 'captain', 'wall'].includes(sprite)) user.sprite = sprite
      const shirt = paint(kitShirt, 'shirt')
      const shorts = paint(kitShorts, 'shorts')
      const socks = paint(kitSocks, 'socks')
      if (shirt) user.kitShirt = shirt
      if (shorts) user.kitShorts = shorts
      if (socks) user.kitSocks = socks
      emit()
      return { ok: true }
    },
    changePassword(token, currentPassword, nextPassword) {
      const user = userFromToken(token)
      if (passwords.get(user.id) !== currentPassword) throw new Error('Current password incorrect')
      if (!nextPassword || nextPassword.length < 4) throw new Error('New password is too short')
      passwords.set(user.id, nextPassword)
      return { ok: true }
    },
    adminSaveResult(token, fixtureId, home, away) {
      requireAdmin(token)
      const fixture = state.fixtures.find((item) => item.id === Number(fixtureId))
      if (!fixture) throw new Error('Fixture not found')
      if (home == null || away == null || home === '' || away === '') {
        fixture.actualHome = null
        fixture.actualAway = null
      } else {
        const h = Number(home)
        const a = Number(away)
        if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0 || h > 20 || a > 20) {
          throw new Error('Scores must be whole numbers from 0 to 20')
        }
        fixture.actualHome = h
        fixture.actualAway = a
      }
      emit()
      return { ok: true }
    },
    adminCalculate(token, week) {
      requireAdmin(token)
      return calculateWeek(state, Number(week) || state.currentWeek, emit)
    },
    adminSaveFixture(token, fixture) {
      requireAdmin(token)
      const home = String(fixture.home || '').trim()
      const away = String(fixture.away || '').trim()
      if (!home || !away) throw new Error('Enter both teams')
      if (home.toLowerCase() === away.toLowerCase()) throw new Error('Teams must be different')
      const week = Number(fixture.week) || state.currentWeek
      let id = fixture.id ? Number(fixture.id) : 0
      if (!id) id = Math.max(0, ...state.fixtures.map((item) => item.id)) + 1
      const existing = state.fixtures.find((item) => item.id === id)
      const next = {
        id,
        week,
        home,
        away,
        kickoffLabel: String(fixture.kickoffLabel || '').trim(),
        kickoffAt: fixture.kickoffAt || existing?.kickoffAt || null,
        hardest: Boolean(fixture.hardest),
        actualHome: existing ? existing.actualHome : null,
        actualAway: existing ? existing.actualAway : null,
      }
      if (existing) Object.assign(existing, next)
      else state.fixtures.push(next)
      emit()
      return { ok: true, id }
    },
    adminLoadPlayerPredictions(token, userId) {
      requireAdmin(token)
      const player = state.players.find((item) => item.id === userId)
      if (!player) throw new Error('Player not found')
      const week = state.currentWeek
      return {
        userId,
        week,
        locked: state.entries.some((entry) => entry.userId === userId && entry.week === week),
        predictions: state.predictions
          .filter((prediction) => prediction.userId === userId && prediction.week === week)
          .filter((prediction) => state.fixtures.some((fixture) => fixture.id === prediction.fixtureId && playable(fixture, userId, state.weekAllFixtures)))
          .map((prediction) => ({
            fixtureId: prediction.fixtureId,
            score: prediction.score,
            locked: prediction.locked,
            enteredByAdmin: Boolean(prediction.enteredByAdmin),
          })),
      }
    },
    adminSavePlayerPredictions(token, userId, scores, lock) {
      requireAdmin(token)
      const player = state.players.find((item) => item.id === userId)
      if (!player) throw new Error('Player not found')
      const week = state.currentWeek
      const already = state.entries.some((entry) => entry.userId === userId && entry.week === week)
      scores.forEach((item) => {
        const fixture = state.fixtures.find((candidate) => candidate.id === Number(item.fixtureId))
        if (!fixture || fixture.week !== week || !playable(fixture, userId, state.weekAllFixtures)) {
          throw new Error('That fixture is not in this week\'s round')
        }
        const parsed = parseScore(String(item.score || ''))
        if (!parsed) throw new Error('Enter a score like 2-1')
        const canonical = formatScore(parsed.home, parsed.away)
        const existing = state.predictions.find((prediction) => prediction.userId === userId && prediction.fixtureId === fixture.id)
        if (existing) {
          existing.score = canonical
          existing.week = week
          existing.enteredByAdmin = true
        } else {
          state.predictions.push({
            userId,
            fixtureId: fixture.id,
            week,
            score: canonical,
            locked: false,
            pointsAwarded: null,
            enteredByAdmin: true,
          })
        }
      })
      const required = playableFixtures(state.fixtures, userId, week, state.weekAllFixtures)
      if (lock && !already) {
        const missing = required.filter((fixture) => {
          const prediction = state.predictions.find((item) => item.userId === userId && item.fixtureId === fixture.id)
          return !prediction || !parseScore(prediction.score)
        })
        if (required.length === 0) throw new Error('There are no fixtures to lock')
        if (missing.length) throw new Error(`Add a score for ${missing.map((fixture) => `${fixture.home} vs ${fixture.away}`).join(', ')}`)
        state.entries.push({ userId, week, lockedAt: new Date().toISOString() })
      }
      if (lock || already) {
        const touched = new Set((scores || []).map((item) => Number(item.fixtureId)))
        required.forEach((fixture) => {
          const include = (lock && !already) || touched.has(fixture.id)
          if (!include) return
          const prediction = state.predictions.find((item) => item.userId === userId && item.fixtureId === fixture.id)
          if (!prediction) return
          prediction.locked = true
          const published = state.publishedPicks.find((pick) => pick.userId === userId && pick.fixtureId === fixture.id)
          if (published) {
            published.score = prediction.score
            published.enteredByAdmin = Boolean(prediction.enteredByAdmin)
          } else {
            state.publishedPicks.push({
              userId,
              fixtureId: fixture.id,
              week,
              score: prediction.score,
              pointsAwarded: null,
              lockedAt: new Date().toISOString(),
              enteredByAdmin: Boolean(prediction.enteredByAdmin),
            })
          }
        })
        calculateWeek(state, week, () => {})
      }
      emit()
      return { ok: true, locked: Boolean(lock) || already }
    },
    adminSetWeek(token, week) {
      requireAdmin(token)
      const value = Number(week)
      if (!Number.isInteger(value) || value < 1 || value > 38) throw new Error('Week must be from 1 to 38')
      state.currentWeek = value
      emit()
      return { ok: true, currentWeek: value }
    },
    applyScores(scores, { overwrite = false } = {}) {
      scores.forEach((score) => {
        const fixture = state.fixtures.find((item) => item.id === score.fixtureId)
        if (!fixture) return
        if (!overwrite && fixture.actualHome != null && fixture.actualAway != null) return
        fixture.actualHome = score.home
        fixture.actualAway = score.away
      })
      emit()
    },
  }
}

function autoLock(state, now = new Date()) {
  const dueWeeks = new Set()
  state.fixtures.forEach((fixture) => {
    if (fixture.hardest && fixture.kickoffAt && new Date(fixture.kickoffAt) <= now) dueWeeks.add(fixture.week)
  })
  dueWeeks.forEach((week) => {
    const userIds = new Set(
      state.predictions
        .filter((prediction) => !prediction.locked && prediction.week === week)
        .filter((prediction) => state.fixtures.some((fixture) => fixture.id === prediction.fixtureId && playable(fixture, prediction.userId, state.weekAllFixtures)))
        .map((prediction) => prediction.userId),
    )
    userIds.forEach((userId) => {
      state.predictions.forEach((prediction) => {
        const fixture = state.fixtures.find((item) => item.id === prediction.fixtureId)
        if (prediction.userId === userId && fixture?.week === week && playable(fixture, userId, state.weekAllFixtures) && !prediction.locked) {
          prediction.locked = true
        }
      })
      if (!state.entries.some((entry) => entry.userId === userId && entry.week === week)) {
        state.entries.push({ userId, week, lockedAt: now.toISOString() })
      }
      state.predictions
        .filter((prediction) => prediction.userId === userId && prediction.week === week && prediction.locked)
        .forEach((prediction) => {
          if (state.publishedPicks.some((pick) => pick.userId === userId && pick.fixtureId === prediction.fixtureId)) return
          state.publishedPicks.push({
            userId,
            fixtureId: prediction.fixtureId,
            week,
            score: prediction.score,
            pointsAwarded: prediction.pointsAwarded,
            lockedAt: now.toISOString(),
            enteredByAdmin: Boolean(prediction.enteredByAdmin),
          })
        })
    })
  })
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    colour: user.colour,
    avatar: user.avatar || '',
    points: user.points,
    wildcard: Boolean(user.wildcard),
    isAdmin: Boolean(user.isAdmin),
    sprite: user.sprite || 'striker',
    kitShirt: user.kitShirt || user.colour || '#94a3b8',
    kitShorts: user.kitShorts || '#ffffff',
    kitSocks: user.kitSocks || user.kitShirt || user.colour || '#94a3b8',
  }
}

export function topFive(players) {
  return [...players].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)).slice(0, 5)
}

function calculateWeek(state, week, emit) {
  let updated = 0
  let unchanged = 0
  let skipped = 0
  let pointsAdded = 0
  state.publishedPicks.forEach((pick) => {
    if (pick.week !== week) return
    const fixture = state.fixtures.find((item) => item.id === pick.fixtureId)
    if (fixture && !playable(fixture, pick.userId, state.weekAllFixtures)) {
      skipped += 1
      return
    }
    const settled = settlePick(
      pick,
      fixture ? fixture.actualHome : null,
      fixture ? fixture.actualAway : null,
    )
    if (settled.kind === 'skipped') {
      skipped += 1
      return
    }
    if (settled.kind === 'unchanged') {
      unchanged += 1
      return
    }
    const user = state.players.find((player) => player.id === pick.userId)
    if (user) user.points += settled.delta
    const draft = state.predictions.find((prediction) => prediction.userId === pick.userId && prediction.fixtureId === pick.fixtureId)
    if (draft) draft.pointsAwarded = settled.pointsAwarded
    pick.pointsAwarded = settled.pointsAwarded
    pointsAdded += settled.delta
    updated += 1
  })
  emit()
  return { ok: true, week, updated, unchanged, skipped, pointsAdded }
}

let demoStore
export function getMock() {
  if (!demoStore) demoStore = createStore({ demo: true, persist: true })
  return demoStore
}
