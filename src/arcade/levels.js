const BANDS = [
  [0, 'Sunday League'],
  [8, 'Pub Side'],
  [16, 'County'],
  [28, 'Conference'],
  [45, 'Championship'],
  [70, 'Legend'],
]

export function levelFor(points) {
  const xp = Math.max(0, Number(points) || 0)
  let index = 0
  BANDS.forEach((band, i) => { if (xp >= band[0]) index = i })
  const start = BANDS[index][0]
  const next = BANDS[index + 1]
  const span = next ? next[0] - start : 1
  const into = next ? xp - start : span
  return {
    title: BANDS[index][1],
    xp,
    nextTitle: next ? next[1] : 'Legend',
    nextAt: next ? next[0] : null,
    pct: next ? Math.min(100, Math.round((into / span) * 100)) : 100,
  }
}
