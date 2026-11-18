// Standings extras: player of the week, badges, form and movement.
// A week counts once any locked pick in it has points stored.

export function pointsBand(points) {
  if (points == null) return 'empty'
  if (points <= 0) return 'zero'
  if (points <= 2) return 'low'
  if (points <= 5) return 'mid'
  return 'high'
}

export function scoredWeeks(picks) {
  const weeks = new Set()
  for (const pick of picks || []) {
    if (pick.pointsAwarded != null) weeks.add(pick.week)
  }
  return [...weeks].sort((a, b) => a - b)
}

export function weekTotals(picks) {
  const map = new Map()
  for (const pick of picks || []) {
    if (pick.pointsAwarded == null) continue
    const key = `${pick.week}:${pick.userId}`
    const row = map.get(key) || { week: pick.week, userId: pick.userId, points: 0, exact: 0, correct: 0 }
    row.points += pick.pointsAwarded
    if (pick.pointsAwarded === 3) row.exact += 1
    if (pick.pointsAwarded === 1) row.correct += 1
    map.set(key, row)
  }
  return [...map.values()]
}

export function playerOfTheWeek(players, picks, week) {
  const totals = weekTotals(picks).filter((row) => row.week === week)
  if (totals.length === 0) return null
  const best = Math.max(...totals.map((row) => row.points))
  const ids = totals.filter((row) => row.points === best).map((row) => row.userId)
  const names = players.filter((player) => ids.includes(player.id)).map((player) => player.name)
  if (names.length === 0) return null
  return { week, points: best, names }
}

function ranks(players, pointsFor) {
  const rows = [...players].sort((a, b) => pointsFor(b) - pointsFor(a) || a.name.localeCompare(b.name))
  const map = {}
  let rank = 0
  let last = null
  rows.forEach((player, index) => {
    const points = pointsFor(player)
    if (last == null || points !== last) rank = index + 1
    last = points
    map[player.id] = rank
  })
  return map
}

export function movements(players, picks) {
  const weeks = scoredWeeks(picks)
  const latest = weeks[weeks.length - 1]
  const totals = weekTotals(picks)
  const latestPoints = (id) => totals.filter((row) => row.week === latest && row.userId === id).reduce((sum, row) => sum + row.points, 0)
  if (latest == null) {
    return Object.fromEntries(players.map((player) => [player.id, 'same']))
  }
  const now = ranks(players, (player) => player.points)
  const before = ranks(players, (player) => player.points - latestPoints(player.id))
  return Object.fromEntries(players.map((player) => {
    if (now[player.id] < before[player.id]) return [player.id, 'up']
    if (now[player.id] > before[player.id]) return [player.id, 'down']
    return [player.id, 'same']
  }))
}

export function formFor(userId, picks) {
  const weeks = scoredWeeks(picks).slice(-5)
  const totals = weekTotals(picks)
  return weeks.map((week) => {
    const row = totals.find((item) => item.week === week && item.userId === userId)
    return { week, points: row ? row.points : null }
  })
}

export function badgesFor(player, players, picks) {
  const badges = []
  const mine = (picks || []).filter((pick) => pick.userId === player.id && pick.pointsAwarded != null)
  if (mine.some((pick) => pick.pointsAwarded === 3)) badges.push({ id: 'perfect', label: 'Perfect score' })
  const totals = weekTotals(picks).filter((row) => row.userId === player.id)
  if (totals.some((row) => row.points === 0)) badges.push({ id: 'bottled', label: 'Bottled it' })
  const weeks = scoredWeeks(picks)
  let run = 0
  let best = 0
  for (const week of weeks) {
    const row = totals.find((item) => item.week === week)
    if (row && row.points > 0) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 0
    }
  }
  if (best >= 3) badges.push({ id: 'streak', label: 'Streak' })
  const top = Math.max(...players.map((item) => item.points))
  if (player.points === top) badges.push({ id: 'top', label: 'Top of the league' })
  return badges
}

export function seasonRows(players, picks) {
  const totals = weekTotals(picks)
  return players.map((player) => {
    const rows = totals.filter((row) => row.userId === player.id)
    const exact = rows.reduce((sum, row) => sum + row.exact, 0)
    const correct = rows.reduce((sum, row) => sum + row.correct, 0)
    const best = rows.reduce((top, row) => (top == null || row.points > top.points ? row : top), null)
    const sum = rows.reduce((total, row) => total + row.points, 0)
    return {
      id: player.id,
      name: player.name,
      colour: player.colour,
      exact,
      correct,
      bestWeek: best ? best.week : null,
      bestPoints: best ? best.points : null,
      average: rows.length ? Math.round((sum / rows.length) * 10) / 10 : 0,
      lockedWeeks: rows.length,
    }
  }).sort((a, b) => b.exact - a.exact || b.correct - a.correct || a.name.localeCompare(b.name))
}

export function leagueRecords(players, picks) {
  const totals = weekTotals(picks)
  const bestWeek = totals.reduce((top, row) => (top == null || row.points > top.points ? row : top), null)
  const mostExact = totals.reduce((top, row) => (top == null || row.exact > top.exact ? row : top), null)
  const name = (id) => players.find((player) => player.id === id)?.name || 'Player'
  return {
    bestWeek: bestWeek ? { name: name(bestWeek.userId), week: bestWeek.week, points: bestWeek.points } : null,
    mostExact: mostExact && mostExact.exact > 0 ? { name: name(mostExact.userId), week: mostExact.week, exact: mostExact.exact } : null,
  }
}

export function firstKickoff(fixtures) {
  const times = (fixtures || [])
    .filter((fixture) => fixture.hardest && fixture.kickoffAt)
    .map((fixture) => new Date(fixture.kickoffAt).getTime())
    .filter((time) => !Number.isNaN(time))
  if (times.length === 0) return null
  return new Date(Math.min(...times))
}

export function countdownParts(target, now) {
  if (!target) return null
  const ms = target.getTime() - now.getTime()
  if (ms <= 0) return { passed: true, days: 0, hours: 0, minutes: 0, seconds: 0 }
  const total = Math.floor(ms / 1000)
  return {
    passed: false,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

export function londonKickoffLabel(iso) {
  if (!iso) return ''
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const get = (type) => parts.find((part) => part.type === type)?.value || ''
  return `${get('weekday')} ${get('hour')}:${get('minute')}`
}
