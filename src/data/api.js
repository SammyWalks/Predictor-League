import { supabase, friendlyError } from '../supabase.js'
import { getMock } from './mockStore.js'

const mockMode = import.meta.env.VITE_MOCK === '1'

function callMock(method, args) {
  return getMock()[method](...args)
}

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(friendlyError(error))
  return data
}

export function isMock() {
  return mockMode
}

export async function login(name, password) {
  if (mockMode) return callMock('login', [name, password])
  return rpc('login', { p_name: name, p_password: password })
}

export async function logout(token) {
  if (!token) return
  if (mockMode) return callMock('logout', [token])
  try {
    await rpc('logout', { p_token: token })
  } catch {
    // Dropping the token locally is enough if the server is unreachable.
  }
}

export async function loadGame(token) {
  if (mockMode) return callMock('loadGame', [token])
  return rpc('load_game', { p_token: token })
}

export async function savePrediction(token, fixtureId, score) {
  if (mockMode) return callMock('savePrediction', [token, fixtureId, score])
  return rpc('save_prediction', { p_token: token, p_fixture_id: fixtureId, p_score: score })
}

export async function lockPredictions(token) {
  if (mockMode) return callMock('lockPredictions', [token])
  return rpc('lock_predictions', { p_token: token })
}

export async function updateProfile(token, profile) {
  if (mockMode) return callMock('updateProfile', [token, profile])
  return rpc('update_profile', {
    p_token: token,
    p_name: profile.name,
    p_colour: profile.colour,
    p_avatar: profile.avatar || '',
  })
}

export async function changePassword(token, currentPassword, nextPassword) {
  if (mockMode) return callMock('changePassword', [token, currentPassword, nextPassword])
  return rpc('change_password', {
    p_token: token,
    p_current: currentPassword,
    p_next: nextPassword,
  })
}

export async function adminSaveResult(token, fixtureId, home, away) {
  if (mockMode) return callMock('adminSaveResult', [token, fixtureId, home, away])
  return rpc('admin_save_result', {
    p_token: token,
    p_fixture_id: fixtureId,
    p_home: home === '' || home == null ? null : Number(home),
    p_away: away === '' || away == null ? null : Number(away),
  })
}

export async function adminCalculate(token, week) {
  if (mockMode) return callMock('adminCalculate', [token, week])
  return rpc('admin_calculate', { p_token: token, p_week: week })
}

export async function adminSaveFixture(token, fixture) {
  if (mockMode) return callMock('adminSaveFixture', [token, fixture])
  return rpc('admin_save_fixture', {
    p_token: token,
    p_id: fixture.id || null,
    p_week: fixture.week,
    p_home: fixture.home,
    p_away: fixture.away,
    p_kickoff: fixture.kickoffLabel || '',
    p_hardest: Boolean(fixture.hardest),
  })
}

export async function adminSetWeek(token, week) {
  if (mockMode) return callMock('adminSetWeek', [token, week])
  return rpc('admin_set_week', { p_token: token, p_week: week })
}

export function subscribe(onChange) {
  if (mockMode) return getMock().subscribe(onChange)
  const channel = supabase
    .channel('published-picks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'published_picks' }, () => onChange())
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
