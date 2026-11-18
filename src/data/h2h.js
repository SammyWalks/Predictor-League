// Head-to-head is a record, not league points. A scored week is one where
// every selected fixture has a result. The higher gameweek total wins.

export function weekScored(fixtures, week) {
  const selected = (fixtures || []).filter((fixture) => fixture.week === week && fixture.hardest)
  return selected.length > 0 && selected.every((fixture) => fixture.actualHome != null && fixture.actualAway != null)
}

export function gwPoints(picks, userId, week) {
  return (picks || [])
    .filter((pick) => pick.userId === userId && pick.week === week && pick.pointsAwarded != null)
    .reduce((sum, pick) => sum + pick.pointsAwarded, 0)
}

export function h2hRecord(userId, rivalries, fixtures, picks) {
  const tally = { wins: 0, draws: 0, losses: 0 }
  ;(rivalries || []).filter((row) => row.userId === userId).forEach((row) => {
    if (!weekScored(fixtures, row.week)) return
    const mine = gwPoints(picks, userId, row.week)
    const theirs = gwPoints(picks, row.rivalId, row.week)
    if (mine > theirs) tally.wins += 1
    else if (mine < theirs) tally.losses += 1
    else tally.draws += 1
  })
  return tally
}

export function h2hLabel(record) {
  const row = record || { wins: 0, draws: 0, losses: 0 }
  return `${row.wins}-${row.draws}-${row.losses}`
}
