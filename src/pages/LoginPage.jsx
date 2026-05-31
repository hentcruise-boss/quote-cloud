import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { session, signIn, signUp, loading } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  if (!loading && session) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setMsg(''); setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) throw error
        navigate('/')
      } else {
        const { data, error } = await signUp(email, password, fullName)
        if (error) throw error
        if (data.session) navigate('/')
        else { setMsg('註冊成功！若收到驗證信請先完成驗證,再登入。'); setMode('signin') }
      }
    } catch (e) {
      setErr(e.message || '發生錯誤')
    } finally { setBusy(false) }
  }

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-3"><Building2 className="w-6 h-6 text-white"/></div>
          <h1 className="font-bold text-slate-800">祥鼎辦公家具 · 案件平臺</h1>
          <p className="text-xs text-slate-400 mt-1">{mode === 'signin' ? '登入以繼續' : '建立新帳號'}</p>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">姓名</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls}/>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputCls}/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">密碼</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className={inputCls}/>
          </div>
          {err && <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</div>}
          {msg && <div className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">{msg}</div>}
          <button type="submit" disabled={busy} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
            {busy ? '處理中…' : (mode === 'signin' ? '登入' : '註冊')}
          </button>
          <div className="text-center text-xs text-slate-400">
            {mode === 'signin'
              ? <button type="button" onClick={() => { setMode('signup'); setErr('') }} className="hover:text-indigo-600">沒有帳號?建立新帳號</button>
              : <button type="button" onClick={() => { setMode('signin'); setErr('') }} className="hover:text-indigo-600">已有帳號?前往登入</button>}
          </div>
        </form>
        <p className="text-center text-[11px] text-slate-400 mt-4">新帳號預設為「內部員工」。第一位使用者請依 db/README 設為管理員。</p>
      </div>
    </div>
  )
}
