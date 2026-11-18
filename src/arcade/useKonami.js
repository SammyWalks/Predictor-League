import { useEffect } from 'react'
import { applyArcadeClasses, secretOn, setSecret } from './settings'

const KEYS = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const TAPS = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a']

export function useKonami(onUnlock) {
  useEffect(() => {
    let keys = []
    const onKey = (event) => {
      keys = [...keys, event.key.length === 1 ? event.key.toLowerCase() : event.key].slice(-10)
      if (KEYS.every((key, index) => keys[index] === key)) {
        setSecret(true)
        applyArcadeClasses()
        onUnlock()
        keys = []
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onUnlock])
}

export function konamiTap(direction, onUnlock) {
  const prev = (konamiTap.buffer || []).concat(direction).slice(-10)
  konamiTap.buffer = prev
  if (TAPS.every((step, index) => prev[index] === step)) {
    setSecret(true)
    applyArcadeClasses()
    onUnlock()
    konamiTap.buffer = []
  }
}

export function secretUnlocked() {
  return secretOn()
}
