import { soundOn } from './settings.js'

let context

function ctx() {
  if (!soundOn()) return null
  if (!context) context = new AudioContext()
  if (context.state === 'suspended') context.resume()
  return context
}

function tone(freq, start, dur, type = 'square', gain = 0.04) {
  const audio = ctx()
  if (!audio) return
  const osc = audio.createOscillator()
  const amp = audio.createGain()
  osc.type = type
  osc.frequency.value = freq
  amp.gain.setValueAtTime(gain, audio.currentTime + start)
  amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + dur)
  osc.connect(amp)
  amp.connect(audio.destination)
  osc.start(audio.currentTime + start)
  osc.stop(audio.currentTime + start + dur + 0.02)
}

export function unlockSound() {
  const audio = ctx()
  if (audio && audio.state === 'suspended') audio.resume()
}

export function tap() { tone(440, 0, 0.05, 'square', 0.03) }
export function coin() {
  tone(988, 0, 0.08, 'square', 0.05)
  tone(1319, 0.09, 0.12, 'square', 0.05)
}
export function jingle() {
  ;[523, 659, 784, 1047].forEach((freq, index) => tone(freq, index * 0.1, 0.12, 'square', 0.05))
}
