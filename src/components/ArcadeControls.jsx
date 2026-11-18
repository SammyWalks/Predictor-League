import { useEffect, useState } from 'react'
import { applyArcadeClasses, crtOn, crowdOn, setCrt, setCrowd, setSound, soundOn } from '../arcade/settings'
import { tap, unlockSound } from '../arcade/sfx'

function Toggle({ pressed, onClick, label }) {
  return (
    <button type="button" className="settings-toggle" aria-pressed={pressed} onClick={onClick}>
      {label} <span className="toggle-state">{pressed ? 'on' : 'off'}</span>
    </button>
  )
}

export default function ArcadeControls() {
  const [sound, setSoundState] = useState(soundOn)
  const [crt, setCrtState] = useState(crtOn)
  const [crowd, setCrowdState] = useState(crowdOn)

  useEffect(() => { applyArcadeClasses() }, [sound, crt, crowd])

  return (
    <div className="settings-toggles">
      <Toggle pressed={sound} label="Sound" onClick={() => {
        const next = !sound
        setSound(next)
        setSoundState(next)
        if (next) unlockSound()
        tap()
      }} />
      <Toggle pressed={crt} label="CRT" onClick={() => {
        setCrt(!crt)
        setCrtState(!crt)
        tap()
      }} />
      <Toggle pressed={crowd} label="Crowd" onClick={() => {
        setCrowd(!crowd)
        setCrowdState(!crowd)
        tap()
      }} />
    </div>
  )
}
