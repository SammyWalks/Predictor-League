import { formatScore, parseScore } from '../data/scoring'

export default function ScoreInputs({ score, onChange, disabled }) {
  const parsed = parseScore(score || '')
  const [home, away] = (score || '').split('-')
  const homeValue = parsed ? String(parsed.home) : (home || '')
  const awayValue = parsed ? String(parsed.away) : (away || '')

  function cap(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 2)
    if (digits === '') return ''
    return String(Math.min(20, Number(digits)))
  }

  function update(nextHome, nextAway) {
    const home = cap(nextHome)
    const away = cap(nextAway)
    if (home === '' || away === '') {
      onChange(home === '' && away === '' ? '' : `${home}-${away}`)
      return
    }
    onChange(formatScore(Number(home), Number(away)))
  }

  return (
    <div className="score-pair">
      <input
        inputMode="numeric"
        aria-label="Home score"
        disabled={disabled}
        value={/^\d{0,2}$/.test(homeValue) ? homeValue : ''}
        onChange={(event) => update(event.target.value.replace(/\D/g, '').slice(0, 2), awayValue.replace(/\D/g, ''))}
      />
      <span aria-hidden="true">-</span>
      <input
        inputMode="numeric"
        aria-label="Away score"
        disabled={disabled}
        value={/^\d{0,2}$/.test(awayValue) ? awayValue : ''}
        onChange={(event) => update(homeValue.replace(/\D/g, ''), event.target.value.replace(/\D/g, '').slice(0, 2))}
      />
    </div>
  )
}
