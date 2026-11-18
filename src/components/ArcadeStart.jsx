import { useEffect, useState } from 'react'
import Sprite from './Sprite'
import { ArtCredit } from './PixelArt'

export default function ArcadeStart({ scores, onStart }) {
  const [blink, setBlink] = useState(true)
  useEffect(() => {
    const timer = setInterval(() => setBlink((value) => !value), 500)
    const onKey = (event) => {
      if (event.key === 'Enter' || event.key === ' ') onStart()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearInterval(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [onStart])

  return (
    <div className="container arcade-start">
      <button type="button" className="start-card" onClick={onStart}>
        <p className="eyebrow">Office Predictor League</p>
        <h1>Press start</h1>
        <p className={blink ? 'start-cursor' : 'start-cursor dim'}>_</p>
        <ol className="hi-scores">
          {(scores || []).map((row, index) => (
            <li key={row.name}>
              <span>{index + 1}</span>
              <Sprite kit={row.sprite} colour={row.colour} size={20} />
              <span style={{ color: row.colour }}>{row.name}</span>
              <strong>{row.points}</strong>
            </li>
          ))}
        </ol>
      </button>
      <ArtCredit />
    </div>
  )
}
