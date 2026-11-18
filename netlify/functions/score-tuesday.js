import { readEnv } from './_shared/env.js'
import { runScoreTuesday } from './_shared/run-tuesday.js'

async function rpc(name, args) {
  const url = readEnv('SUPABASE_URL')
  const key = readEnv('SUPABASE_ANON_KEY')
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })
  const text = await response.text()
  const body = text ? JSON.parse(text) : null
  if (!response.ok) {
    const message = body?.message || body?.error || `Supabase ${name} failed`
    throw new Error(message)
  }
  return body
}

export default async function scoreTuesday() {
  const result = await runScoreTuesday({
    env: {
      SCORING_SECRET: readEnv('SCORING_SECRET'),
      SUPABASE_URL: readEnv('SUPABASE_URL'),
      SUPABASE_ANON_KEY: readEnv('SUPABASE_ANON_KEY'),
    },
    rpc,
  })
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// 08:00 UTC every Tuesday, after the Monday night game.
export const config = {
  schedule: '0 8 * * 2',
}
