const ICONS = {
  perfect: '★',
  streak: '▲',
  bottled: '0',
  top: '1',
  slayer: 'VS',
}

export default function Badges({ badges, compact = false }) {
  if (!badges?.length) return null
  return (
    <span className={compact ? 'badges compact' : 'badges'}>
      {badges.map((badge) => (
        <span key={badge.id} className={`badge-icon badge-${badge.id}`} title={badge.label}>
          {ICONS[badge.id]}
          {badge.id === 'slayer' ? <span className="badge-label">x{badge.count}</span> : compact ? null : <span className="badge-label">{badge.label}</span>}
        </span>
      ))}
    </span>
  )
}
