import { readEnv } from './_shared/env.js'

// Every hour, lock any picks whose selected kick-off has passed.
// Opening the app also does this, so a quiet hour still cannot be edited.
export default async function autoLock() {
  const url = readEnv('SUPABASE_URL')
  const key = readEnv('SUPABASE_ANON_KEY')
  const secret = readEnv('SCORING_SECRET')
  if (!url || !key || !secret) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing Supabase or scoring secret' }), { status: 500 })
  }
  const response = await fetch(`${url}/rest/v1/rpc/scheduled_auto_lock`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_secret: secret }),
  })
  const text = await response.text()
  return new Response(text || '{}', { status: response.status, headers: { 'Content-Type': 'application/json' } })
}

export const config = {
  schedule: '0 * * * *',
}
