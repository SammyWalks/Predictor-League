import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pointsFor, settlePick, scoringMessage } from './scoring.js'
import { sameTeam } from './teams.js'
import { matchFixtures, scoresToApply, finishedScore } from './football.js'
import { FIXTURES } from './fixtures.js'
import { PLAYERS } from './players.js'
import { createStore } from './mockStore.js'
import { runScoreTuesday } from '../../netlify/functions/_shared/run-tuesday.js'

test('exact score is 3, right result is 1, wrong result is 0', () => {
  // The old results page: Ipswich 1-2, Man Utd 4-4, Leeds 1-0.
  assert.equal(pointsFor('1-2', 1, 2), 3)
  assert.equal(pointsFor('1-3', 1, 2), 1)
  assert.equal(pointsFor('2-1', 1, 2), 0)
  assert.equal(pointsFor('1-1', 4, 4), 1)
  assert.equal(pointsFor('2-2', 4, 4), 1)
  assert.equal(pointsFor('2-1', 4, 4), 0)
  assert.equal(pointsFor('0-1', 1, 0), 0)
  assert.equal(pointsFor('1-0', 1, 0), 3)
  assert.equal(pointsFor('2-0', 1, 0), 1)
})

test('scoring twice does not add the points again, and a corrected score adjusts', () => {
  const pick = { score: '1-2', pointsAwarded: null, locked: true }
  const first = settlePick(pick, 1, 2)
  assert.deepEqual(first, { pointsAwarded: 3, delta: 3, kind: 'updated' })
  const second = settlePick({ ...pick, pointsAwarded: first.pointsAwarded }, 1, 2)
  assert.equal(second.delta, 0)
  assert.equal(second.kind, 'unchanged')
  const corrected = settlePick({ ...pick, pointsAwarded: 3 }, 0, 1)
  assert.equal(corrected.pointsAwarded, 1)
  assert.equal(corrected.delta, -2)
  const cleared = settlePick({ ...pick, pointsAwarded: 1 }, null, null)
  assert.equal(cleared.pointsAwarded, null)
  assert.equal(cleared.delta, -1)
  const clearedAgain = settlePick({ ...pick, pointsAwarded: null }, null, null)
  assert.equal(clearedAgain.kind, 'skipped')
  assert.equal(clearedAgain.delta, 0)
})

test('Kieran Savage is not a player', () => {
  const names = PLAYERS.map((player) => player.name.toLowerCase())
  assert.equal(names.includes('kieran savage'), false)
  assert.equal(PLAYERS.some((player) => player.id === 'kieran'), false)
})

test('drafts stay private and a second calculate does not double points', () => {
  const store = createStore()
  const sam = store.login('Sam Walker', 'office')
  const saj = store.login('Saj Ali', 'office')
  store.savePrediction(saj.token, 3, '0-0')
  const seenBySam = store.loadGame(sam.token)
  assert.equal(seenBySam.publishedPicks.length, 0)
  assert.equal(seenBySam.myPredictions.length, 0)
  assert.equal(store.loadGame(saj.token).myPredictions[0].score, '0-0')

  store.savePrediction(sam.token, 3, '1-0')
  store.savePrediction(sam.token, 4, '2-1')
  store.savePrediction(sam.token, 9, '1-1')
  store.lockPredictions(sam.token)
  assert.throws(() => store.savePrediction(sam.token, 3, '3-0'), /locked/i)

  const afterLock = store.loadGame(saj.token)
  assert.equal(afterLock.publishedPicks.length, 3)
  assert.equal(afterLock.myPredictions.length, 1)
  assert.equal(afterLock.publishedPicks.some((pick) => pick.score === '0-0'), false)

  store.adminSaveResult(sam.token, 3, 1, 0)
  store.adminSaveResult(sam.token, 4, 0, 1)
  store.adminSaveResult(sam.token, 9, 1, 1)
  const first = store.adminCalculate(sam.token, 11)
  assert.equal(first.pointsAdded, 3 + 0 + 3)
  const total = store.loadGame(sam.token).me.points
  const second = store.adminCalculate(sam.token, 11)
  assert.equal(second.pointsAdded, 0)
  assert.equal(second.updated, 0)
  assert.equal(store.loadGame(sam.token).me.points, total)

  store.adminSaveResult(sam.token, 4, 2, 1)
  const adjusted = store.adminCalculate(sam.token, 11)
  assert.equal(adjusted.pointsAdded, 3)
  assert.equal(store.loadGame(sam.token).me.points, total + 3)
})

test('an admin can lock picks for another player and a player cannot', () => {
  const store = createStore()
  const sam = store.login('Sam Walker', 'office')
  const saj = store.login('Saj Ali', 'office')
  assert.throws(() => store.adminSavePlayerPredictions(saj.token, 'sam', [{ fixtureId: 3, score: '1-0' }], true), /admin/i)
  store.adminSavePlayerPredictions(sam.token, 'saj', [
    { fixtureId: 3, score: '2-0' },
    { fixtureId: 4, score: '1-1' },
    { fixtureId: 9, score: '0-1' },
  ], true)
  const seen = store.loadGame(sam.token)
  const sajPicks = seen.publishedPicks.filter((pick) => pick.userId === 'saj')
  assert.equal(sajPicks.length, 3)
  assert.equal(sajPicks.every((pick) => pick.enteredByAdmin), true)
  assert.equal(seen.publishedPicks.some((pick) => pick.score === '0-0'), false)
  store.adminSavePlayerPredictions(sam.token, 'saj', [{ fixtureId: 3, score: '3-0' }], true)
  const updated = store.loadGame(saj.token).publishedPicks.find((pick) => pick.userId === 'saj' && pick.fixtureId === 3)
  assert.equal(updated.score, '3-0')
})

test('a non-admin cannot calculate points', () => {
  const store = createStore()
  const saj = store.login('Saj Ali', 'office')
  assert.throws(() => store.adminCalculate(saj.token, 11), /admin/i)
})

test('short team names match the real round', () => {
  const events = [
    { strHomeTeam: 'Manchester City', strAwayTeam: 'Fulham', intHomeScore: '2', intAwayScore: '0', strStatus: 'FT', dateEvent: '2026-11-21' },
    { strHomeTeam: 'Nottingham Forest', strAwayTeam: 'Bournemouth', intHomeScore: '1', intAwayScore: '1', strStatus: 'FT', dateEvent: '2026-11-21' },
    { strHomeTeam: 'Liverpool', strAwayTeam: 'Manchester United', intHomeScore: null, intAwayScore: null, strStatus: 'NS', dateEvent: '2026-11-22' },
    { strHomeTeam: 'Brighton and Hove Albion', strAwayTeam: 'Hull City', intHomeScore: '1', intAwayScore: '0', strStatus: 'FT' },
  ]
  assert.equal(sameTeam('Man City', 'Manchester City'), true)
  assert.equal(sameTeam('Nottm Forest', 'Nottingham Forest'), true)
  assert.equal(sameTeam('Man Utd', 'Manchester United'), true)
  assert.equal(sameTeam('Brighton', 'Brighton and Hove Albion'), true)
  const suggestions = matchFixtures(FIXTURES, events)
  const city = suggestions.find((item) => item.fixtureId === 1)
  assert.equal(city.found, true)
  assert.equal(city.home, 2)
  const forest = suggestions.find((item) => item.fixtureId === 3)
  assert.equal(forest.found, false)
  const liverpool = suggestions.find((item) => item.fixtureId === 9)
  assert.equal(liverpool.found, false)
  const blanksOnly = scoresToApply(FIXTURES, suggestions, { overwrite: false })
  assert.equal(blanksOnly.some((item) => item.fixtureId === 1), true)
  const already = FIXTURES.map((fixture) => fixture.id === 1 ? { ...fixture, actualHome: 1, actualAway: 1 } : fixture)
  assert.equal(scoresToApply(already, suggestions, { overwrite: false }).some((item) => item.fixtureId === 1), false)
  assert.equal(finishedScore({ strStatus: 'NS', intHomeScore: '1', intAwayScore: '0' }), null)
})

test('tuesday runner calculates even if the feed fails, and skips when env is missing', async () => {
  const missing = await runScoreTuesday({ env: {}, rpc: async () => ({}) })
  assert.equal(missing.status, 500)

  const calls = []
  const result = await runScoreTuesday({
    env: { SCORING_SECRET: 'x'.repeat(24), SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'publishable' },
    fetchImpl: async () => { throw new Error('feed down') },
    rpc: async (name, args) => {
      calls.push(name)
      if (name === 'scheduled_context') {
        return { leagueId: '4328', currentWeek: 11, season: '2026-2027', fixtures: [] }
      }
      assert.equal(args.p_secret.length >= 16, true)
      return { ok: true, updated: 0, unchanged: 0, skipped: 0, pointsAdded: 0 }
    },
  })
  assert.equal(result.status, 200)
  assert.equal(calls.includes('scheduled_calculate'), true)
  assert.equal(calls.includes('scheduled_apply_scores'), false)
  assert.match(result.body.fetchError, /feed down/)
  assert.match(scoringMessage(result.body), /No locked predictions/)
})

test('full names replace the wildcard badge', () => {
  assert.equal(PLAYERS.find((player) => player.id === 'annabel').name, 'Annabel Mackereth')
  assert.equal(PLAYERS.find((player) => player.id === 'sophie').name, 'Sophie Brookes')
  assert.equal(PLAYERS.some((player) => player.wildcard), false)
  const sql = readFileSync(new URL('../../supabase/migrations/20261118140000_names_colours_selected_only.sql', import.meta.url), 'utf8')
  assert.match(sql, /Annabel Mackereth/)
  assert.match(sql, /Sophie Brookes/)
  assert.match(sql, /set default '#94a3b8'/)
  assert.match(sql, /not in this week/)
})

test('removal script only deletes Kieran and the migration does not seed him', () => {
  const removal = readFileSync(new URL('../../supabase/migrations/20261118120100_remove_kieran_savage.sql', import.meta.url), 'utf8')
  const migration = readFileSync(new URL('../../supabase/migrations/20261118120000_lock_in_and_scoring.sql', import.meta.url), 'utf8')
  assert.match(removal, /kieran savage/)
  assert.match(removal, /delete from public\.predictions where user_id = any\(ids\)/)
  assert.match(removal, /delete from public\.users where id = any\(ids\)/)
  assert.doesNotMatch(removal, /delete from public\.users\s*;/i)
  assert.match(migration, /return 3;/)
  assert.match(migration, /return 1;/)
  assert.match(migration, /published_picks/)
  assert.match(migration, /using \(true\)/)
  assert.doesNotMatch(migration, /'kieran'/i)
  assert.match(migration, /on conflict \(id\) do nothing/)
  assert.match(migration, /pg_advisory_xact_lock/)
})
