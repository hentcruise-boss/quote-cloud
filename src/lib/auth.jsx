import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [dealer, setDealer] = useState(null)
  const [tier, setTier] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session)
      if (!data.session) setLoading(false)   // 確認過沒登入才放行守衛
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) { setDealer(null); setTier(null); setIsAdmin(false); setLoading(false) }
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (session) loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  async function loadProfile() {
    setLoading(true)
    const uid = session.user.id
    try {
      const { data: adminRow } = await supabase.from('admins').select('*').eq('auth_user_id', uid).maybeSingle()
      if (adminRow) { setIsAdmin(true); setDealer(null); setTier(null); return }
      setIsAdmin(false)
      const { data: d } = await supabase.from('dealers').select('*').eq('auth_user_id', uid).maybeSingle()
      setDealer(d || null)
      if (d?.pricing_tier_id) {
        const { data: t } = await supabase.from('pricing_tiers').select('*').eq('id', d.pricing_tier_id).maybeSingle()
        setTier(t || null)
      } else setTier(null)
    } catch (e) {
      console.error('loadProfile', e)
    } finally {
      setLoading(false)
    }
  }

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signOut = () => supabase.auth.signOut()

  return (
    <AuthCtx.Provider value={{ session, user: session?.user || null, dealer, tier, isAdmin, loading, signIn, signOut, reload: loadProfile }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
