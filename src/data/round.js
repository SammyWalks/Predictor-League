// Week 11 only: Annabel, Karolina and Sophie may predict every fixture.
// Everyone else still predicts the selected games. Week 12 has no rows.

export const WEEK_ALL_FIXTURES = [
  { userId: 'annabel', week: 11 },
  { userId: 'karolina', week: 11 },
  { userId: 'sophie', week: 11 },
]

export function playsAll(userId, week, rows = WEEK_ALL_FIXTURES) {
  return (rows || []).some((row) => row.userId === userId && Number(row.week) === Number(week))
}

export function playable(fixture, userId, rows = WEEK_ALL_FIXTURES) {
  if (!fixture) return false
  return Boolean(fixture.hardest) || playsAll(userId, fixture.week, rows)
}

export function playableFixtures(fixtures, userId, week, rows = WEEK_ALL_FIXTURES) {
  return (fixtures || []).filter((fixture) => fixture.week === week && playable(fixture, userId, rows))
}
