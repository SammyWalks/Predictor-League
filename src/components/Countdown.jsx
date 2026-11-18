import { useEffect, useState } from 'react'
import { countdownParts, firstKickoff, londonKickoffLabel } from '../data/extras'

export default function Countdown({ fixtures }) {
  const target = firstKickoff(fixtures)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!target) return null
  const parts = countdownParts(target, now)
  const when = londonKickoffLabel(target.toISOString())

  return (
    <div className="countdown" aria-live="polite">
      <p className="kickoff">First kick-off {when} London</p>
      {parts.passed
        ? <p className="countdown-done">Deadline passed</p>
        : (
          <p className="countdown-digits">
            <span>{parts.days}d</span>
            <span>{String(parts.hours).padStart(2, '0')}h</span>
            <span>{String(parts.minutes).padStart(2, '0')}m</span>
            <span>{String(parts.seconds).padStart(2, '0')}s</span>
          </p>
        )}
    </div>
  )
}
