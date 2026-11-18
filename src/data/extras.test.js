import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { badgesFor, countdownParts, firstKickoff, formFor, movements, playerOfTheWeek } from './extras.js'
import { levelFor } from '../arcade/levels.js'

const players = [
  { id: 'a', name: 'Ada', points: 10, colour: '#fff' },
  { id: 'b', name: 'Bea', points: 8, colour: '#fff' },
  { id: 'c', name: 'Cal', points: 8, colour: '#fff' },
]

const picks = [
  { userId: 'a', week: 1, pointsAwarded: 3 },
  { userId: 'a', week: 2, pointsAwarded: 1 },
  { userId: 'a', week: 3, pointsAwarded: 1 },
  { userId: 'b', week: 1, pointsAwarded: 0 },
  { userId: 'b', week: 2, pointsAwarded: 3 },
  { userId: 'b', week: 3, pointsAwarded: 3 },
  { userId: 'c', week: 3, pointsAwarded: 1 },
]

test('player of the week includes ties', () => {
  const tied = [
    { userId: 'a', week: 4, pointsAwarded: 3 },
    { userId: 'b', week: 4, pointsAwarded: 3 },
  ]
  const result = playerOfTheWeek(players, tied, 4)
  assert.equal(result.points, 3)
  assert.deepEqual(result.names.sort(), ['Ada', 'Bea'])
  assert.equal(playerOfTheWeek(players, picks, 9), null)
})

test('badges come from scored weeks', () => {
  const ada = badgesFor(players[0], players, picks).map((badge) => badge.id)
  assert.ok(ada.includes('perfect'))
  assert.ok(ada.includes('streak'))
  assert.ok(ada.includes('top'))
  assert.equal(ada.includes('bottled'), false)
  const bea = badgesFor(players[1], players, picks).map((badge) => badge.id)
  assert.ok(bea.includes('bottled'))
  assert.equal(bea.includes('top'), false)
})

test('form is the last five scored weeks and arrows follow the latest week', () => {
  assert.equal(formFor('c', picks).length, 3)
  assert.equal(formFor('c', picks)[2].points, 1)
  const move = movements(players, picks)
  assert.equal(move.b, 'up')
  assert.ok(['up', 'down', 'same'].includes(move.a))
})

test('levels climb without rewriting stored points', () => {
  assert.equal(levelFor(0).title, 'Sunday League')
  assert.equal(levelFor(70).title, 'Legend')
  const sql = readFileSync(new URL('../../supabase/migrations/20261118180000_arcade_sprites.sql', import.meta.url), 'utf8')
  assert.doesNotMatch(sql, /set points/i)
  assert.match(sql, /sprite/)
  assert.match(sql, /arcade_top_scores/)
})

test('deadline is the earliest selected kick-off', () => {
  const kick = firstKickoff([
    { hardest: true, kickoffAt: '2026-11-22T16:30:00Z' },
    { hardest: false, kickoffAt: '2026-11-21T12:30:00Z' },
    { hardest: true, kickoffAt: '2026-11-21T15:00:00Z' },
  ])
  assert.equal(kick.toISOString(), '2026-11-21T15:00:00.000Z')
  const parts = countdownParts(kick, new Date('2026-11-21T14:00:00Z'))
  assert.equal(parts.passed, false)
  assert.equal(parts.hours, 1)
  assert.equal(countdownParts(kick, new Date('2026-11-21T15:00:00Z')).passed, true)
})
