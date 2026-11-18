export const KITS = ['striker', 'keeper', 'winger', 'captain', 'wall']

export function kitProps(player = {}) {
  return {
    kit: player.sprite || 'striker',
    colour: player.colour,
    shirt: player.kitShirt,
    shorts: player.kitShorts,
    socks: player.kitSocks,
  }
}

function hex(value, fallback) {
  return /^#[0-9A-Fa-f]{6}$/.test(value || '') ? value : fallback
}

export default function Sprite({ kit = 'striker', colour = '#ffd700', shirt, shorts, socks, size = 28 }) {
  const shirtColour = hex(shirt, hex(colour, '#ffd700'))
  const shortsColour = hex(shorts, '#ffffff')
  const socksColour = hex(socks, shirtColour)
  return (
    <svg className="kit" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <rect width="16" height="16" fill="transparent" />
      <rect x="6" y="1" width="4" height="3" fill="#f1c27d" />
      <rect x="5" y="4" width="6" height="5" fill={shirtColour} />
      <rect x="3" y="5" width="2" height="3" fill={shirtColour} />
      <rect x="11" y="5" width="2" height="3" fill={shirtColour} />
      <rect x="5" y="9" width="2" height="2" fill={shortsColour} />
      <rect x="9" y="9" width="2" height="2" fill={shortsColour} />
      <rect x="5" y="11" width="2" height="2" fill={socksColour} />
      <rect x="9" y="11" width="2" height="2" fill={socksColour} />
      {kit === 'captain' && <rect x="7" y="5" width="2" height="2" fill="#ffd700" />}
      {kit === 'winger' && <rect x="1" y="6" width="2" height="1" fill="#fff" />}
      {kit === 'wall' && <rect x="4" y="13" width="8" height="1" fill="#fff" />}
      {kit === 'striker' && <rect x="6" y="10" width="4" height="1" fill={shirtColour === '#ffffff' ? '#111111' : '#ffffff'} />}
      {kit === 'keeper' && <rect x="6" y="6" width="4" height="1" fill="#111111" />}
    </svg>
  )
}
