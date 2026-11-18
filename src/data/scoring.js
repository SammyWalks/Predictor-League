// Scoring rules taken from the previous results table already in the game:
// an exact score is 3 points, the right result (home win, away win, or draw)
// is 1 point, and a wrong result is 0. Season totals are adjusted by the
// difference from the last points stored on that pick, so running this again
// does not add the same points twice.

export function parseScore(score) {
  if (typeof score !== 'string') return null
  const match = score.trim().match(/^(\d{1,2})\s*-\s*(\d{1,2})$/)
  if (!match) return null
  const home = Number(match[1])
  const away = Number(match[2])
  if (home > 20 || away > 20) return null
  return { home, away }
}

export function formatScore(home, away) {
  return `${Number(home)}-${Number(away)}`
}

export function pointsFor(prediction, actualHome, actualAway) {
  const parsed = typeof prediction === 'string' ? parseScore(prediction) : prediction
  if (!parsed) return null
  if (actualHome == null || actualAway == null) return null
  const home = Number(actualHome)
  const away = Number(actualAway)
  if (!Number.isInteger(home) || !Number.isInteger(away)) return null
  if (parsed.home === home && parsed.away === away) return 3
  if (Math.sign(parsed.home - parsed.away) === Math.sign(home - away)) return 1
  return 0
}

// One locked pick against one final score.
// Missing final score with nothing awarded yet is skipped.
// Missing final score after points were awarded reverses those points.
// The same final score a second time returns a delta of 0.
export function settlePick(pick, actualHome, actualAway) {
  if (actualHome == null || actualAway == null) {
    if (pick.pointsAwarded == null) return { pointsAwarded: null, delta: 0, kind: 'skipped' }
    return { pointsAwarded: null, delta: -pick.pointsAwarded, kind: 'updated' }
  }
  const points = pointsFor(pick.score, actualHome, actualAway)
  if (points == null) return { pointsAwarded: pick.pointsAwarded ?? null, delta: 0, kind: 'skipped' }
  if (pick.pointsAwarded === points) return { pointsAwarded: points, delta: 0, kind: 'unchanged' }
  return { pointsAwarded: points, delta: points - (pick.pointsAwarded ?? 0), kind: 'updated' }
}

export function scoringMessage(result) {
  if (!result) return ''
  const updated = result.updated || 0
  const unchanged = result.unchanged || 0
  const skipped = result.skipped || 0
  if (updated === 0 && unchanged === 0 && skipped > 0) {
    return 'No final scores yet, so no points were added.'
  }
  if (updated === 0 && unchanged === 0) {
    return 'No locked predictions to score.'
  }
  if (updated === 0) {
    return 'Already up to date. Running this again did not add any points.'
  }
  const amount = Math.abs(result.pointsAdded || 0)
  const direction = (result.pointsAdded || 0) < 0 ? 'adjusted down by' : 'added'
  return `Updated ${updated} locked prediction${updated === 1 ? '' : 's'}. Season points ${direction} ${amount}. Running this again will not double-count.`
}

export function scoreLockedPredictions(predictions, actualHome, actualAway) {
  const deltas = {}
  let updated = 0
  let unchanged = 0
  let skipped = 0
  const next = predictions.map((prediction) => {
    if (!prediction.locked) {
      skipped += 1
      return prediction
    }
    const settled = settlePick(prediction, actualHome, actualAway)
    if (settled.kind === 'skipped') skipped += 1
    if (settled.kind === 'unchanged') unchanged += 1
    if (settled.kind === 'updated') {
      updated += 1
      deltas[prediction.userId] = (deltas[prediction.userId] || 0) + settled.delta
    }
    return { ...prediction, pointsAwarded: settled.pointsAwarded }
  })
  return { predictions: next, deltas, updated, unchanged, skipped }
}
