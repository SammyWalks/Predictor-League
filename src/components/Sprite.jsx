export const KITS = ['striker', 'keeper', 'winger', 'captain', 'wall']

export default function Sprite({ kit = 'striker', colour = '#ffd700', size = 28 }) {
  const shirt = colour || '#ffd700'
  const keeper = kit === 'keeper'
  return (
    <svg className="kit" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <rect width="16" height="16" fill="transparent" />
      <rect x="6" y="1" width="4" height="3" fill="#f1c27d" />
      <rect x="5" y="4" width="6" height="5" fill={keeper ? '#14532d' : shirt} />
      <rect x="3" y="5" width="2" height="3" fill={keeper ? '#14532d' : shirt} />
      <rect x="11" y="5" width="2" height="3" fill={keeper ? '#14532d' : shirt} />
      <rect x="5" y="9" width="2" height="4" fill="#111" />
      <rect x="9" y="9" width="2" height="4" fill="#111" />
      {kit === 'captain' && <rect x="7" y="5" width="2" height="2" fill="#ffd700" />}
      {kit === 'winger' && <rect x="1" y="6" width="2" height="1" fill="#fff" />}
      {kit === 'wall' && <rect x="4" y="13" width="8" height="1" fill="#fff" />}
      {kit === 'striker' && <rect x="7" y="11" width="2" height="1" fill="#fff" />}
    </svg>
  )
}
