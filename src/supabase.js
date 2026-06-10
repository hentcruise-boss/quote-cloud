import { createClient } from '@supabase/supabase-js'

// 注意:publishable key 本來就是公開的。第一階段起,安全邊界改由
// 資料庫的 RLS (Row Level Security) 把關,而非這把金鑰。
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wqenuwjgfmiiqgpestqz.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZW51d2pnZm1paXFncGVzdHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTQyMTUsImV4cCI6MjA5MDEzMDIxNX0.bZMzMPW0nA5MWAViry_laZf9jHjwbxjMfJl5_ymgDps'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
