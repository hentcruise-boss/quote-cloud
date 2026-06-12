import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cibwkvgaiclmrbujgios.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpYndrdmdhaWNsbXJidWpnaW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDU0MzAsImV4cCI6MjA5NTc4MTQzMH0.JldGuNpPsUYKVoOiGJAd9O3A9LE6mShHmL3GhV1kgmI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
