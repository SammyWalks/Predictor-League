import { fetchRoundEvents, matchFixtures, scoresToApply } from '../../../src/data/football.js'

// Tuesday job: fill any blank final scores from the free football feed, then
// calculate points. Scores an admin has already typed are left alone.
// Calculating is idempotent in the database, and this runner only calls it once.
export async function runScoreTuesday({ env, fetchImpl, rpc }) {
  const secret = env.SCORING_SECRET
  const url = env.SUPABASE_URL
  const key = env.SUPABASE_ANON_KEY
  if (!secret || !url || !key) {
    return {
      status: 500,
      body: {
        ok: false,
        error: 'Set SUPABASE_URL, SUPABASE_ANON_KEY, and SCORING_SECRET on Netlify.',
      },
    }
  }

  const context = await rpc('scheduled_context', { p_secret: secret })
  let fetchError = ''
  let applied = 0
  try {
    const events = await fetchRoundEvents({
      leagueId: context.leagueId,
      round: context.currentWeek,
      season: context.season,
      fetchImpl,
    })
    const suggestions = matchFixtures(context.fixtures, events)
    const toWrite = scoresToApply(context.fixtures, suggestions, { overwrite: false })
    if (toWrite.length) {
      const saved = await rpc('scheduled_apply_scores', {
        p_secret: secret,
        p_scores: toWrite.map((item) => ({
          fixtureId: item.fixtureId,
          home: item.home,
          away: item.away,
        })),
      })
      applied = saved?.applied || toWrite.length
    }
  } catch (error) {
    fetchError = error?.message || 'Could not fetch scores'
  }

  const scoring = await rpc('scheduled_calculate', { p_secret: secret })
  return {
    status: 200,
    body: { ...scoring, applied, fetchError },
  }
}
