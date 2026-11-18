// Whether this player is allowed to see other people's picks for a week.
// Mirrors private.picks_visible in the database. Own picks are always shown
// by the caller. Admins, a locked week, a fully scored week, and a week
// whose deadline has passed are open. Nothing here changes season points.

export function weekRevealed({ user, week, fixtures, entries, now = new Date() }) {
  if (!user || week == null) return false
  if (user.isAdmin) return true
  if ((entries || []).some((entry) => entry.userId === user.id && entry.week === week)) return true
  const selected = (fixtures || []).filter((fixture) => fixture.week === week && fixture.hardest)
  if (selected.length > 0 && selected.every((fixture) => fixture.actualHome != null && fixture.actualAway != null)) {
    return true
  }
  const kickoffs = selected
    .map((fixture) => (fixture.kickoffAt ? new Date(fixture.kickoffAt).getTime() : NaN))
    .filter((value) => !Number.isNaN(value))
  if (kickoffs.length > 0 && now.getTime() >= Math.min(...kickoffs)) return true
  return false
}

export function visiblePicks({ user, picks, fixtures, entries, now }) {
  return (picks || []).filter((pick) => {
    if (!user) return false
    if (pick.userId === user.id) return true
    return weekRevealed({ user, week: pick.week, fixtures, entries, now })
  })
}
