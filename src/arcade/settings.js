const SOUND = 'predictor-sound'
const CRT = 'predictor-crt'
const CROWD = 'predictor-crowd'
const SECRET = 'predictor-secret'
const SEEN = 'predictor-achievements'
const RIVAL = 'predictor-rival'

function read(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function write(key, value) {
  try { localStorage.setItem(key, value) } catch { /* private mode */ }
}

export function soundOn() { return read(SOUND) === '1' }
export function setSound(on) { write(SOUND, on ? '1' : '0') }
export function crtOn() { return read(CRT) === '1' }
export function setCrt(on) { write(CRT, on ? '1' : '0') }
export function crowdOn() {
  const value = read(CROWD)
  return value == null ? true : value === '1'
}
export function setCrowd(on) { write(CROWD, on ? '1' : '0') }
export function secretOn() { return read(SECRET) === '1' }
export function setSecret(on) { write(SECRET, on ? '1' : '0') }
export function rivalId() { return read(RIVAL) || '' }
export function setRival(id) { write(RIVAL, id || '') }

export function seenAchievements(userId) {
  try {
    const all = JSON.parse(read(SEEN) || '{}')
    return new Set(all[userId] || [])
  } catch {
    return new Set()
  }
}

export function markAchievement(userId, id) {
  try {
    const all = JSON.parse(read(SEEN) || '{}')
    const list = new Set(all[userId] || [])
    list.add(id)
    all[userId] = [...list]
    write(SEEN, JSON.stringify(all))
  } catch { /* ignore */ }
}

export function applyArcadeClasses() {
  const root = document.documentElement
  root.classList.toggle('crt', crtOn())
  root.classList.toggle('crowd', crowdOn())
  root.classList.toggle('secret', secretOn())
  root.classList.toggle('cheering', root.classList.contains('crowd') && root.dataset.scored === '1')
}
