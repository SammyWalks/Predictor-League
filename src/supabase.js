import { createClient } from '@supabase/supabase-js'

// The publishable key is safe in the browser. It was already shipped in this
// repo. A service-role key must never be added here. Set the VITE_ variables
// in Netlify to override these.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pilytmsoimdguzfchubv.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Igw329JsNxTneIoMDBTudg_0fCKouO7'

export const supabase = createClient(supabaseUrl, supabaseKey)

export function friendlyError(error) {
  const message = error?.message || String(error || 'Something went wrong')
  if (/could not find the function|schema cache|PGRST202/i.test(message)) {
    return 'The database is missing the latest game functions. Run the SQL files in supabase/migrations in the Supabase SQL editor, then try again.'
  }
  if (/permission denied|42501/i.test(message)) {
    return 'Supabase is blocking this request. Run the SQL files in supabase/migrations, which set who can read locked predictions.'
  }
  return message
}
