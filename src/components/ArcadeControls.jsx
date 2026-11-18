import { useEffect, useState } from 'react'
import { applyArcadeClasses, crtOn, crowdOn, setCrt, setCrowd, setSound, soundOn } from '../arcade/settings'
import { tap, unlockSound } from '../arcade/sfx'

export default function ArcadeControls() {
  const [sound, setSoundState] = useState(soundOn)
  const [crt, setCrtState] = useState(crtOn)
  const [crowd, setCrowdState] = useState(crowdOn)

  useEffect(() => { applyArcadeClasses() }, [sound, crt, crowd])

  return (
    <div className="arcade-controls">
      <button type="button" className="btn btn-small" aria-pressed={sound} onClick={() => {
        const next = !sound
        setSound(next)
        setSoundState(next)
        if (next) unlockSound()
        tap()
      }}>{sound ? 'Sound on' : 'Sound off'}</button>
      <button type="button" className="btn btn-small" aria-pressed={crt} onClick={() => {
        setCrt(!crt)
        setCrtState(!crt)
        tap()
      }}>CRT</button>
      <button type="button" className="btn btn-small" aria-pressed={crowd} onClick={() => {
        setCrowd(!crowd)
        setCrowdState(!crowd)
        tap()
      }}>Crowd</button>
    </div>
  )
}
