import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Sofa, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth'

export default function Login() {
  const { session, isAdmin, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // 已登入則依身分導向
  if (session && !loading) return <Navigate to={isAdmin ? '/admin' : '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    const { error } = await signIn(email.trim(), password)
    setBusy(false)
    if (error) setErr(error.message === 'Invalid login credentials' ? '帳號或密碼錯誤' : error.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4 font-sans">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-700/30">
            <Sofa className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold text-stone-800">木美家 · 入庫代管下單</h1>
          <p className="mt-1 text-sm text-stone-500">經銷商專屬 · 不必屯貨就能做生意</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username"
              className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              placeholder="you@company.com" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">密碼</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
              className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              placeholder="••••••••" />
          </div>
          {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}
          <button type="submit" disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 py-2.5 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? '登入中…' : '登入'}
          </button>
          <p className="text-center text-xs text-stone-400">尚未開通帳號？請聯絡您的專屬服務專員。</p>
        </form>
      </div>
    </div>
  )
}
