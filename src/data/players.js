// Office players. Kieran Savage is not in this list.
// The same people are seeded by supabase/migrations, which will not overwrite
// an existing row, so season points already in Supabase stay as they are.

export const PLAYERS = [
  { id: 'sam', name: 'Sam Walker', colour: '#1d9bf0', avatar: '', points: 21, wildcard: false, isAdmin: true },
  { id: 'reuben', name: 'Reuben Swinfield', colour: '#e11d48', avatar: '', points: 24, wildcard: false, isAdmin: false },
  { id: 'saj', name: 'Saj Ali', colour: '#f59e0b', avatar: '', points: 23, wildcard: false, isAdmin: false },
  { id: 'morrell', name: 'Sam Morrell', colour: '#10b981', avatar: '', points: 21, wildcard: false, isAdmin: false },
  { id: 'matthew', name: 'Matthew Iles', colour: '#8b5cf6', avatar: '', points: 20, wildcard: false, isAdmin: false },
  { id: 'annabel', name: 'Annabel', colour: '#ec4899', avatar: '', points: 0, wildcard: true, isAdmin: false },
  { id: 'sophie', name: 'Sophie', colour: '#06b6d4', avatar: '', points: 0, wildcard: true, isAdmin: false },
]
