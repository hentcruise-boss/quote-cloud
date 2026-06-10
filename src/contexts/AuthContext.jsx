import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { INTERNAL_ROLES } from '../lib/constants'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) loadProfile(data.session.user.id)
      else setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) loadProfile(s.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  const loadProfile = async (uid) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile(data || null)
    setLoading(false)
  }

  const role = profile?.role || null
  const isInternal = !!role && INTERNAL_ROLES.includes(role)

  const value = {
    session,
    profile,
    role,
    isInternal,
    loading,
    user: session?.user || null,
    signIn:  (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp:  (email, password, fullName) =>
      supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } }),
    signOut: () => supabase.auth.signOut(),
    reloadProfile: () => session && loadProfile(session.user.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
