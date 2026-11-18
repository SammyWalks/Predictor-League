// Premier League round 11, 21–23 November 2026.
// The old list repeated Liverpool vs Man Utd and skipped Coventry vs Crystal Palace.
// Coventry is fixture 5, the id that list had left unused. Existing ids are unchanged.
// Regular players predict the three selected (hardest) games. Wildcards predict all ten.

export const CURRENT_WEEK = 11
export const SEASON = '2026-2027'
export const LEAGUE_ID = '4328'

export const FIXTURES = [
  { id: 1, week: 11, home: 'Man City', away: 'Fulham', kickoffLabel: 'Sat 12:30', kickoffAt: '2026-11-21T12:30:00Z', hardest: false, actualHome: null, actualAway: null },
  { id: 2, week: 11, home: 'Aston Villa', away: 'Sunderland', kickoffLabel: 'Sat 15:00', kickoffAt: '2026-11-21T15:00:00Z', hardest: false, actualHome: null, actualAway: null },
  { id: 3, week: 11, home: 'Bournemouth', away: 'Nottm Forest', kickoffLabel: 'Sat 15:00', kickoffAt: '2026-11-21T15:00:00Z', hardest: true, actualHome: null, actualAway: null },
  { id: 4, week: 11, home: 'Chelsea', away: 'Leeds', kickoffLabel: 'Sat 15:00', kickoffAt: '2026-11-21T15:00:00Z', hardest: true, actualHome: null, actualAway: null },
  { id: 5, week: 11, home: 'Coventry', away: 'Crystal Palace', kickoffLabel: 'Sat 15:00', kickoffAt: '2026-11-21T15:00:00Z', hardest: false, actualHome: null, actualAway: null },
  { id: 6, week: 11, home: 'Tottenham', away: 'Ipswich', kickoffLabel: 'Sat 15:00', kickoffAt: '2026-11-21T15:00:00Z', hardest: false, actualHome: null, actualAway: null },
  { id: 7, week: 11, home: 'Newcastle', away: 'Arsenal', kickoffLabel: 'Sat 17:30', kickoffAt: '2026-11-21T17:30:00Z', hardest: false, actualHome: null, actualAway: null },
  { id: 8, week: 11, home: 'Hull City', away: 'Brighton', kickoffLabel: 'Sun 14:00', kickoffAt: '2026-11-22T14:00:00Z', hardest: false, actualHome: null, actualAway: null },
  { id: 9, week: 11, home: 'Liverpool', away: 'Man Utd', kickoffLabel: 'Sun 16:30', kickoffAt: '2026-11-22T16:30:00Z', hardest: true, actualHome: null, actualAway: null },
  { id: 10, week: 11, home: 'Brentford', away: 'Everton', kickoffLabel: 'Mon 20:00', kickoffAt: '2026-11-23T20:00:00Z', hardest: false, actualHome: null, actualAway: null },
]
