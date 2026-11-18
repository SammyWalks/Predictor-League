import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pointsFor, settlePick, scoringMessage } from './scoring.js'
import { sameTeam } from './teams.js'
import { matchFixtures, scoresToApply, finishedScore } from './football.js'
import { FIXTURES } from './fixtures.js'
import { PLAYERS } from './players.js'
import { createStore } from './mockStore.js'
import { weekRevealed } from './visibility.js'
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

test('Karolina is in the mock seed and the insert does not overwrite points', () => {
  const karolina = PLAYERS.find((player) => player.id === 'karolina')
  assert.equal(karolina?.name, 'Karolina Bersadska')
  const sql = readFileSync(new URL('../../supabase/migrations/20261118190000_add_karolina.sql', import.meta.url), 'utf8')
  const setup = readFileSync(new URL('../../supabase-setup.sql', import.meta.url), 'utf8')
  assert.match(sql, /'karolina', 'Karolina Bersadska'/)
  assert.match(sql, /on conflict \(id\) do nothing/)
  assert.doesNotMatch(sql, /set points/i)
  assert.match(setup, /Karolina Bersadska/)
  const store = createStore()
  const session = store.login('Karolina Bersadska', 'office')
  const game = store.loadGame(session.token)
  assert.equal(game.players.some((player) => player.id === 'karolina'), true)
  assert.equal(game.players.some((player) => player.id === 'kieran'), false)
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

  for (const fixture of store.loadGame(sam.token).fixtures.filter((item) => item.hardest)) {
    store.adminSaveFixture(sam.token, { ...fixture, kickoffAt: '2099-01-01T12:00:00Z' })
  }
  const afterLock = store.loadGame(saj.token)
  assert.equal(afterLock.picksRevealed, false)
  assert.equal(afterLock.publishedPicks.length, 0)
  assert.equal(afterLock.myPredictions.length, 1)
  assert.equal(afterLock.myPredictions[0].score, '0-0')

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

test('other players picks stay hidden until you lock in, the week is scored, or the deadline has passed', () => {
  const store = createStore()
  const sam = store.login('Sam Walker', 'office')
  const annabel = store.login('Annabel Mackereth', 'office')
  for (const fixture of store.loadGame(sam.token).fixtures.filter((item) => item.hardest)) {
    store.adminSaveFixture(sam.token, { ...fixture, kickoffAt: '2099-01-01T12:00:00Z' })
  }
  store.savePrediction(sam.token, 3, '1-0')
  store.savePrediction(sam.token, 4, '2-0')
  store.savePrediction(sam.token, 9, '0-1')
  store.lockPredictions(sam.token)

  const hidden = store.loadGame(annabel.token)
  assert.equal(hidden.picksRevealed, false)
  assert.equal(hidden.publishedPicks.some((pick) => pick.userId === 'sam'), false)
  assert.equal(store.loadGame(sam.token).publishedPicks.filter((pick) => pick.userId === 'sam').length, 3)

  store.savePrediction(annabel.token, 3, '1-1')
  store.savePrediction(annabel.token, 4, '1-1')
  store.savePrediction(annabel.token, 9, '1-1')
  const ownDraft = store.loadGame(annabel.token)
  assert.equal(ownDraft.myPredictions[0].score, '1-1')
  assert.equal(ownDraft.publishedPicks.some((pick) => pick.userId === 'sam'), false)

  store.lockPredictions(annabel.token)
  const open = store.loadGame(annabel.token)
  assert.equal(open.picksRevealed, true)
  assert.equal(open.publishedPicks.filter((pick) => pick.userId === 'sam').length, 3)
  assert.equal(open.me.points, 0)

  const scored = createStore()
  const admin = scored.login('Sam Walker', 'office')
  const viewer = scored.login('Sophie Brookes', 'office')
  for (const fixture of scored.loadGame(admin.token).fixtures.filter((item) => item.hardest)) {
    scored.adminSaveFixture(admin.token, { ...fixture, kickoffAt: '2099-01-01T12:00:00Z' })
  }
  scored.savePrediction(admin.token, 3, '1-0')
  scored.savePrediction(admin.token, 4, '1-0')
  scored.savePrediction(admin.token, 9, '1-0')
  scored.lockPredictions(admin.token)
  assert.equal(scored.loadGame(viewer.token).publishedPicks.length, 0)
  for (const id of [3, 4, 9]) scored.adminSaveResult(admin.token, id, 1, 0)
  assert.equal(scored.loadGame(viewer.token).publishedPicks.filter((pick) => pick.userId === 'sam').length, 3)
  assert.equal(scored.loadGame(viewer.token).me.points, 0)

  const late = createStore()
  const lateAdmin = late.login('Sam Walker', 'office')
  const lateViewer = late.login('Matthew Iles', 'office')
  for (const fixture of late.loadGame(lateAdmin.token).fixtures.filter((item) => item.hardest)) {
    late.adminSaveFixture(lateAdmin.token, { ...fixture, kickoffAt: '2099-01-01T12:00:00Z' })
  }
  late.savePrediction(lateAdmin.token, 3, '2-2')
  late.savePrediction(lateAdmin.token, 4, '2-2')
  late.savePrediction(lateAdmin.token, 9, '2-2')
  late.lockPredictions(lateAdmin.token)
  assert.equal(late.loadGame(lateViewer.token).picksRevealed, false)
  for (const fixture of late.loadGame(lateAdmin.token).fixtures.filter((item) => item.hardest)) {
    late.adminSaveFixture(lateAdmin.token, { ...fixture, kickoffAt: '2000-01-01T12:00:00Z' })
  }
  assert.equal(late.loadGame(lateViewer.token).picksRevealed, true)
  assert.equal(late.loadGame(lateViewer.token).publishedPicks.length, 3)
  assert.equal(late.loadGame(lateViewer.token).me.points, 20)

  const sql = readFileSync(new URL('../../supabase/migrations/20261118200000_kit_and_pick_privacy.sql', import.meta.url), 'utf8')
  assert.match(sql, /private\.picks_visible/)
  assert.match(sql, /pp\.user_id = actor\.id or private\.picks_visible/)
  assert.match(sql, /revoke select on public\.published_picks/)
  assert.doesNotMatch(sql, /set points/i)
  assert.equal(weekRevealed({ user: { id: 'a', isAdmin: true }, week: 1, fixtures: [], entries: [] }), true)
})

test('kit colours save without sending or clearing an avatar', () => {
  const store = createStore()
  const sam = store.login('Sam Walker', 'office')
  store.updateProfile(sam.token, {
    name: 'Sam Walker',
    colour: '#1d9bf0',
    sprite: 'captain',
    kitShirt: '#112233',
    kitShorts: '#ffffff',
    kitSocks: '#445566',
  })
  const me = store.loadGame(sam.token).me
  assert.equal(me.kitShirt, '#112233')
  assert.equal(me.kitShorts, '#ffffff')
  assert.equal(me.kitSocks, '#445566')
  assert.equal(me.sprite, 'captain')
  assert.equal(me.colour, '#1d9bf0')
  assert.equal(me.points, 21)
  const sql = readFileSync(new URL('../../supabase/migrations/20261118200000_kit_and_pick_privacy.sql', import.meta.url), 'utf8')
  assert.match(sql, /kit_shirt/)
  assert.match(sql, /kit_shorts/)
  assert.match(sql, /kit_socks/)
  assert.match(sql, /p_avatar text default null/)
  assert.match(sql, /when p_avatar is null then avatar/)
  assert.match(sql, /"kitShirt"/)
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
