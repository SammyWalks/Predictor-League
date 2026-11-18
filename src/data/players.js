// Offline mock roster only. The live app reads every row from public.users,
// so a player added in the database (login, table, results, admin) shows up
// without a code change. This list is the local seed for tests and VITE_MOCK.
// Kieran Savage is not in this list. Seeds use ON CONFLICT DO NOTHING, so
// season points already stored are left alone.

export const PLAYERS = [
  { id: 'sam', name: 'Sam Walker', colour: '#1d9bf0', avatar: '', points: 21, wildcard: false, isAdmin: true },
  { id: 'reuben', name: 'Reuben Swinfield', colour: '#e11d48', avatar: '', points: 24, wildcard: false, isAdmin: false },
  { id: 'saj', name: 'Saj Ali', colour: '#f59e0b', avatar: '', points: 23, wildcard: false, isAdmin: false },
  { id: 'morrell', name: 'Sam Morrell', colour: '#10b981', avatar: '', points: 21, wildcard: false, isAdmin: false },
  { id: 'matthew', name: 'Matthew Iles', colour: '#8b5cf6', avatar: '', points: 20, wildcard: false, isAdmin: false },
  { id: 'annabel', name: 'Annabel Mackereth', colour: '#ec4899', avatar: '', points: 0, wildcard: false, isAdmin: false },
  { id: 'sophie', name: 'Sophie Brookes', colour: '#06b6d4', avatar: '', points: 0, wildcard: false, isAdmin: false },
  { id: 'karolina', name: 'Karolina Bersadska', colour: '#f97316', avatar: '', points: 0, wildcard: false, isAdmin: false },
]
