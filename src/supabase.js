import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pilytmsoimdguzfchubv.supabase.co'
const supabaseKey = 'sb_publishable_Igw329JsNxTneIoMDBTudg_0fCKouO7'

export const supabase = createClient(supabaseUrl, supabaseKey)
