import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kozmkcnmwylidrcrhyjx.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_vlxnmX7Fps4hIlcHh3layw_fXvmRXOh'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
