const DEFAULT_STATE = {
  currentUserId: null,
  users: [
    { id: 'sam', name: 'Sam Walker', colour: '#1d9bf0', avatar: '', password: 'office', points: 21 },
    { id: 'reuben', name: 'Reuben Swinfield', colour: '#e11d48', avatar: '', password: 'office', points: 24 },
    { id: 'saj', name: 'Saj Ali', colour: '#f59e0b', avatar: '', password: 'office', points: 23 },
    { id: 'morrell', name: 'Sam Morrell', colour: '#10b981', avatar: '', password: 'office', points: 21 },
    { id: 'matthew', name: 'Matthew Iles', colour: '#8b5cf6', avatar: '', password: 'office', points: 20 },
    { id: 'annabel', name: 'Annabel', colour: '#ec4899', avatar: '', password: 'office', points: 0, wildcard: true },
    { id: 'sophie', name: 'Sophie', colour: '#06b6d4', avatar: '', password: 'office', points: 0, wildcard: true },
  ],
  currentWeek: 11,
  fixtures: [
    { id: 1, home: 'Man City', away: 'Fulham', time: 'Sat 12:30', hardest: false },
    { id: 2, home: 'Aston Villa', away: 'Sunderland', time: 'Sat 15:00', hardest: false },
    { id: 3, home: 'Bournemouth', away: 'Nottm Forest', time: 'Sat 15:00', hardest: true },
    { id: 4, home: 'Chelsea', away: 'Leeds', time: 'Sat 15:00', hardest: true },
    { id: 9, home: 'Liverpool', away: 'Man Utd', time: 'Sun 16:30', hardest: true },
    { id: 6, home: 'Tottenham', away: 'Ipswich', time: 'Sat 15:00', hardest: false },
    { id: 7, home: 'Newcastle', away: 'Arsenal', time: 'Sat 17:30', hardest: false },
    { id: 8, home: 'Hull City', away: 'Brighton', time: 'Sun 14:00', hardest: false },
    { id: 9, home: 'Liverpool', away: 'Man Utd', time: 'Sun 16:30', hardest: false },
    { id: 10, home: 'Brentford', away: 'Everton', time: 'Mon 20:00', hardest: false },
  ],
  previousResults: [
    { home: 'Leeds', away: 'Tottenham', score: '1-0' },
    { home: 'Ipswich', away: 'Bournemouth', score: '1-2' },
    { home: 'Man Utd', away: 'Aston Villa', score: '4-4' },
  ],
  predictions: {}, // { userId: { fixtureId: '2-1' } }
  locked: {}, // { userId: true }
}

export function loadState() {
  try {
    const saved = localStorage.getItem('predictor-league')
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_STATE
}

export function saveState(state) {
  localStorage.setItem('predictor-league', JSON.stringify(state))
}
