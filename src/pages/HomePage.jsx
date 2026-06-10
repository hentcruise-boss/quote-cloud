import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import StageBadge from '../components/StageBadge'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/api'
import { fromNow } from '../lib/format'
import { ROLE_MAP } from '../lib/constants'

export default function HomePage() {
  const { profile, role } = useAuth()
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.listCases().then(r => setCases(r.data || [])),
      api.listCustomers().then(r => setCustomers(r.data || [])),
    ]).finally(() => setLoading(false))
  }, [])

  const custName = Object.fromEntries(customers.map(c => [c.id, c.name]))

  if (loading) return <div className="py-20 text-center text-slate-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500"/>載入中…</div>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">您好,{profile?.full_name || '訪客'}</h1>
        <p className="text-sm text-slate-400 mt-1">{ROLE_MAP[role]?.label} · 以下是與您相關的案件</p>
      </div>

      {cases.length === 0
        ? <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center text-slate-400 text-sm">目前沒有指派給您的案件</div>
        : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cases.map(c => (
              <button key={c.id} onClick={() => navigate(`/cases/${c.id}`)} className="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-indigo-200 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-slate-400">{c.code}</span>
                  <StageBadge stage={c.stage}/>
                </div>
                <div className="font-bold text-slate-800">{c.title}</div>
                <div className="text-xs text-slate-500 mt-1">{custName[c.customer_id] || ''}</div>
                <div className="text-[11px] text-slate-400 mt-3">最後更新 {fromNow(c.updated_at)}</div>
              </button>
            ))}
          </div>
        )}
    </div>
  )
}
