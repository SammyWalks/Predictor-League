import { levelFor } from '../arcade/levels'

export default function XpBar({ points }) {
  const level = levelFor(points)
  return (
    <div className="xp">
      <p>{level.title}</p>
      <div className="xp-track" role="meter" aria-valuenow={level.pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${level.pct}%` }} />
      </div>
      <p className="hint">{level.nextAt == null ? 'Legend' : `${level.xp} / ${level.nextAt} XP`}</p>
    </div>
  )
}
