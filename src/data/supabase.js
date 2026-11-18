import { supabase } from './supabase'

export async function loadUsers() {
  const { data, error } = await supabase.from('users').select('*')
  if (error) console.error(error)
  return data || []
}

export async function loadPredictions() {
  const { data, error } = await supabase.from('predictions').select('*')
  if (error) console.error(error)
  return data || []
}

export async function savePrediction(userId, fixtureId, score) {
  const { error } = await supabase.from('predictions').upsert({
    user_id: userId,
    fixture_id: fixtureId,
    score,
    locked: true
  }, { onConflict: 'user_id,fixture_id' })
  if (error) console.error(error)
}

export async function lockPredictions(userId) {
  const { error } = await supabase.from('predictions').update({ locked: true }).eq('user_id', userId)
  if (error) console.error(error)
}
