const ALIASES = {
  'man city': 'manchester city',
  'manchester city': 'manchester city',
  'man utd': 'manchester united',
  'man united': 'manchester united',
  'manchester utd': 'manchester united',
  'manchester united': 'manchester united',
  'nottm forest': 'nottingham forest',
  'nottingham forest': 'nottingham forest',
  'tottenham': 'tottenham hotspur',
  'tottenham hotspur': 'tottenham hotspur',
  'spurs': 'tottenham hotspur',
  'ipswich': 'ipswich town',
  'ipswich town': 'ipswich town',
  'leeds': 'leeds united',
  'leeds utd': 'leeds united',
  'leeds united': 'leeds united',
  'brighton': 'brighton',
  'brighton and hove albion': 'brighton',
  'newcastle': 'newcastle united',
  'newcastle united': 'newcastle united',
  'hull': 'hull city',
  'hull city': 'hull city',
  'wolves': 'wolverhampton wanderers',
  'wolverhampton': 'wolverhampton wanderers',
  'wolverhampton wanderers': 'wolverhampton wanderers',
  'west ham': 'west ham united',
  'west ham united': 'west ham united',
  'leicester': 'leicester city',
  'leicester city': 'leicester city',
  'palace': 'crystal palace',
  'crystal palace': 'crystal palace',
  'coventry': 'coventry city',
  'coventry city': 'coventry city',
  'bournemouth': 'bournemouth',
  'afc bournemouth': 'bournemouth',
  'chelsea': 'chelsea',
  'arsenal': 'arsenal',
  'fulham': 'fulham',
  'everton': 'everton',
  'brentford': 'brentford',
  'liverpool': 'liverpool',
  'sunderland': 'sunderland',
  'aston villa': 'aston villa',
  'villa': 'aston villa',
}

export function canonicalTeam(name) {
  let text = String(name || '').toLowerCase().replace(/&/g, ' and ')
  text = text.replace(/\b(fc|afc|cfc)\b/g, ' ')
  text = text.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  return ALIASES[text] || text
}

export function sameTeam(a, b) {
  return canonicalTeam(a) !== '' && canonicalTeam(a) === canonicalTeam(b)
}
