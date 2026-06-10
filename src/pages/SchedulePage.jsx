import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import * as api from '../lib/api'

const WD = ['日', '一', '二', '三', '四', '五', '六']
const todayStr = () => new Date().toISOString().slice(0, 10)
const ds = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export default function SchedulePage() {
  const navigate = useNavigate()
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [cases, setCases] = useState([])
  const [prod, setProd] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.listCases().then(r => setCases(r.data || [])),
      api.listAllProductionTasks().then(r => setProd(r.data || [])),
      api.listAllDeliveries().then(r => setDeliveries(r.data || [])),
    ]).finally(() => setLoading(false))
  }, [])

  const caseTitle = Object.fromEntries(cases.map(c => [c.id, c.title]))
  const today = todayStr()

  const byDate = useMemo(() => {
    const map = {}
    const push = (date, item) => { if (!date) return; (map[date] ||= []).push(item) }
    prod.forEach(t => t.planned_end && push(t.planned_end, { kind: 'prod', label: `生產:${t.title}`, caseId: t.case_id, overdue: t.planned_end < today && t.status !== 'done', done: t.status === 'done' }))
    deliveries.forEach(d => d.delivered_at && push(d.delivered_at, { kind: 'delivery', label: `交貨${d.recipient_name ? `:${d.recipient_name}` : ''}`, caseId: d.case_id, done: d.status === 'signed' }))
    return map
  }, [prod, deliveries, today])

  const first = new Date(cursor.y, cursor.m, 1)
  const startWd = first.getDay()
  const daysIn = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startWd; i++) cells.push(null)
  for (let d = 1; d <= daysIn; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const move = (delta) => setCursor(c => { const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const goToday = () => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }) }

  const chipCls = (it) => it.overdue ? 'bg-rose-100 text-rose-700' : it.kind === 'prod' ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'

  if (loading) return <div className="py-20 text-center text-slate-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500"/>載入中…</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-indigo-500"/>排程行事曆</h1>
        <div className="flex items-center gap-1.5">
          <button onClick={() => move(-1)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><ChevronLeft className="w-4 h-4"/></button>
          <span className="text-sm font-semibold text-slate-700 w-24 text-center">{cursor.y} 年 {cursor.m + 1} 月</span>
          <button onClick={() => move(1)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><ChevronRight className="w-4 h-4"/></button>
          <button onClick={goToday} className="ml-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white">今天</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-semibold text-slate-500">
          {WD.map(w => <div key={w} className="py-2">{w}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const date = d ? ds(cursor.y, cursor.m, d) : null
            const items = date ? (byDate[date] || []) : []
            const isToday = date === today
            return (
              <div key={i} className={`min-h-[92px] border-b border-r border-slate-100 p-1.5 ${d ? '' : 'bg-slate-50/50'}`}>
                {d && <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>{isToday ? `${d}・今天` : d}</div>}
                <div className="space-y-1">
                  {items.slice(0, 3).map((it, j) => (
                    <button key={j} onClick={() => navigate(`/cases/${it.caseId}`)} title={`${it.label} · ${caseTitle[it.caseId] || ''}`}
                      className={`block w-full text-left truncate text-[10px] px-1.5 py-0.5 rounded ${chipCls(it)} ${it.done ? 'line-through opacity-60' : ''}`}>
                      {it.label}
                    </button>
                  ))}
                  {items.length > 3 && <div className="text-[10px] text-slate-400 px-1">+{items.length - 3} 更多</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200"/>生產預計完成</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-200"/>交貨</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-100 border border-rose-200"/>逾期未完成</span>
      </div>
    </div>
  )
}
