import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, Briefcase, Activity, LifeBuoy, AlertTriangle, RefreshCw, Star, Download } from 'lucide-react'
import * as api from '../lib/api'
import { STAGES, STAGE_MAP, STATUS_MAP } from '../lib/constants'
import { fromNow } from '../lib/format'
import { downloadCSV } from '../lib/csv'

const todayStr = () => new Date().toISOString().slice(0, 10)

function StatCard({ icon, label, value, tone = 'slate' }) {
  const tones = {
    slate:  'bg-slate-50 text-slate-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber:  'bg-amber-50 text-amber-600',
    rose:   'bg-rose-50 text-rose-600',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-slate-800 leading-none">{value}</div>
        <div className="text-xs text-slate-400 mt-1">{label}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [cases, setCases] = useState([])
  const [customers, setCustomers] = useState([])
  const [tickets, setTickets] = useState([])
  const [prodTasks, setProdTasks] = useState([])
  const [events, setEvents] = useState([])
  const [profiles, setProfiles] = useState([])
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.listCases().then(r => setCases(r.data || [])),
      api.listCustomers().then(r => setCustomers(r.data || [])),
      api.listAllTickets().then(r => setTickets(r.data || [])),
      api.listAllProductionTasks().then(r => setProdTasks(r.data || [])),
      api.listRecentEvents(20).then(r => setEvents(r.data || [])),
      api.listPublicProfiles().then(r => setProfiles(r.data || [])),
      api.listAllFeedback().then(r => setRatings((r.data || []).map(f => f.rating))),
    ]).finally(() => setLoading(false))
  }, [])

  const caseTitle = Object.fromEntries(cases.map(c => [c.id, c.title]))
  const customerName = Object.fromEntries(customers.map(c => [c.id, c.name]))
  const profilesMap = api.profileNameMap(profiles)
  const activeCases = cases.filter(c => c.status === 'active')
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress')
  const overdueProd = prodTasks.filter(t => t.planned_end && t.planned_end < todayStr() && t.status !== 'done')
  const avgSat = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null
  const maxStage = Math.max(1, ...STAGES.map(s => cases.filter(c => c.stage === s.key).length))

  const exportCases = () => {
    const header = ['案件編號', '案件名稱', '客戶', '階段', '狀態', '負責人', '建立日期']
    const rows = cases.map(c => [
      c.code, c.title, customerName[c.customer_id] || '',
      STAGE_MAP[c.stage]?.label || c.stage, STATUS_MAP[c.status]?.label || c.status,
      profilesMap[c.owner_id] || '', (c.created_at || '').slice(0, 10),
    ])
    downloadCSV(`案件清單_${todayStr()}.csv`, [header, ...rows])
  }

  if (loading) return <div className="py-20 text-center text-slate-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500"/>載入中…</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-indigo-500"/>儀表板</h1>
        <button onClick={exportCases} className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white"><Download className="w-4 h-4"/>匯出案件 CSV</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={<Briefcase className="w-5 h-5"/>} label="案件總數" value={cases.length} tone="slate"/>
        <StatCard icon={<Activity className="w-5 h-5"/>} label="進行中案件" value={activeCases.length} tone="indigo"/>
        <StatCard icon={<LifeBuoy className="w-5 h-5"/>} label="待處理工單" value={openTickets.length} tone="amber"/>
        <StatCard icon={<AlertTriangle className="w-5 h-5"/>} label="逾期生產項目" value={overdueProd.length} tone="rose"/>
        <StatCard icon={<Star className="w-5 h-5"/>} label="平均滿意度" value={avgSat ? `${avgSat.toFixed(1)}★` : '—'} tone="amber"/>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-4">案件階段分佈</h2>
        <div className="space-y-2">
          {STAGES.map(s => {
            const n = cases.filter(c => c.stage === s.key).length
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 w-24 flex-shrink-0"><span className={`w-2 h-2 rounded-full ${s.dot}`}/>{s.label}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${s.dot}`} style={{ width: `${(n / maxStage) * 100}%` }}/></div>
                <span className="text-xs font-mono text-slate-500 w-6 text-right">{n}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-slate-400"/>最近活動</h2>
        {events.length === 0 && <p className="text-sm text-slate-300 text-center py-6">尚無活動</p>}
        <ul className="divide-y divide-slate-50">
          {events.map(e => (
            <li key={e.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <span className="text-slate-700">{e.summary || e.type}</span>
                <Link to={`/cases/${e.case_id}`} className="ml-2 text-xs text-indigo-600 hover:underline">{caseTitle[e.case_id] || '案件'}</Link>
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0">{profilesMap[e.actor_id] || '系統'} · {fromNow(e.created_at)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
