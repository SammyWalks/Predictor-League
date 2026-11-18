const SIZES = {
  'slide-tackle': [617, 480],
  'header-goal': [225, 225],
  'celebration-knee-slide': [225, 225],
  'salute': [225, 225],
  'trophy-lift': [1440, 960],
  'crowd-celebration': [1440, 960],
  'hand-of-god': [1920, 1080],
  'dribble-duel': [1920, 1080],
  'siuu-pose': [1440, 960],
  'bicycle-kick': [225, 225],
}

export default function PixelArt({ name, alt = '', className = '', eager = false }) {
  const [width, height] = SIZES[name] || [225, 225]
  return (
    <picture className={`pixel-art ${className}`}>
      <source srcSet={`/img/${name}.webp`} type="image/webp" />
      <img
        src={`/img/${name}.png`}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    </picture>
  )
}

export function ArtCredit() {
  return <p className="art-credit">Pixel art: 8-Bit Football</p>
}
