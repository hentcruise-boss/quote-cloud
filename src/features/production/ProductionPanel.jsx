import { useEffect, useState } from 'react'
import { Plus, Trash2, Factory, CheckCircle2, ArrowRight } from 'lucide-react'
import { useSync } from '../../contexts/SyncContext'
import { useAuth } from '../../contexts/AuthContext'
import * as api from '../../lib/api'
import { supabase } from '../../supabase'
import { PRODUCTION_STATUS, PRODUCTION_STATUS_MAP, STAGE_MAP } from '../../lib/constants'

const today = () => new Date().toISOString().slice(0, 10)

export default function ProductionPanel({ caseId, caseItem, isInternal, onCaseChange }) {
  const { run } = useSync()
  const { profile } = useAuth()
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')

  const load = async () => { const { data } = await api.listProductionTasks(caseId); setTasks(data || []) }
  useEffect(() => {
    load()
    const ch = supabase.channel(`rt-prod-${caseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_tasks', filter: `case_id=eq.${caseId}` }, load).subscribe()
    return () => supabase.removeChannel(ch)
  }, [caseId])

  const add = () => {
    if (!title.trim()) return
    const t = title.trim(); setTitle('')
    return run(async () => { await api.addProductionTask({ case_id: caseId, title: t, sort_order: tasks.length }); await load() })
  }
  const patch = (id, p) => run(async () => { setTasks(prev => prev.map(x => x.id === id ? { ...x, ...p } : x)); await api.updateProductionTask(id, p); await load() })
  const del = (id) => run(async () => { await api.deleteProductionTask(id); await load() })
  const markDone = (t) => run(async () => {
    await api.updateProductionTask(t.id, { status: 'done', progress: 100, actual_end: today() })
    await api.addEvent({ case_id: caseId, actor_id: profile?.id, type: 'note', summary: `生產完成:${t.title}` })
    await load()
  })

  const allDone = tasks.length > 0 && tasks.every(t => t.status === 'done')
  const advance = () => run(async () => {
    await api.updateCase(caseId, { stage: 'delivery' })
    await api.addEvent({ case_id: caseId, actor_id: profile?.id, type: 'stage_changed', summary: `階段:${STAGE_MAP.production.label} → ${STAGE_MAP.delivery.label}`, meta: { from: 'production', to: 'delivery' } })
    onCaseChange?.()
  })

  const dateCls = 'border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400 bg-white'

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Factory className="w-4 h-4 text-slate-400"/>生產排程</h2>
        {isInternal && allDone && caseItem?.stage === 'production' &&
          <button onClick={advance} className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700"><ArrowRight className="w-3.5 h-3.5"/>全部完成 → 進入交貨</button>}
      </div>

      <div className="divide-y divide-slate-100">
        {tasks.length === 0 && <div className="px-5 py-8 text-center text-slate-300 text-sm">尚無生產項目</div>}
        {tasks.map(t => {
          const st = PRODUCTION_STATUS_MAP[t.status] || {}
          return (
            <div key={t.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-slate-800 text-sm flex-1">{t.title}</div>
                {isInternal ? (
                  <select value={t.status} onChange={e => patch(t.id, { status: e.target.value })} className={dateCls}>
                    {PRODUCTION_STATUS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                ) : <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.badge}`}>{st.label}</span>}
                {isInternal && t.status !== 'done' && <button onClick={() => markDone(t)} title="標記完成" className="p-1 text-slate-300 hover:text-emerald-600"><CheckCircle2 className="w-4 h-4"/></button>}
                {isInternal && <button onClick={() => del(t.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${t.progress}%` }}/></div>
                {isInternal
                  ? <select value={t.progress} onChange={e => patch(t.id, { progress: Number(e.target.value) })} className="text-[11px] border border-slate-200 rounded px-1 py-0.5 bg-white outline-none">
                      {[0,25,50,75,100].map(v => <option key={v} value={v}>{v}%</option>)}
                    </select>
                  : <span className="text-[11px] font-mono text-slate-500 w-9 text-right">{t.progress}%</span>}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-400">
                {isInternal ? (
                  <label className="flex items-center gap-1">預計完成 <input type="date" value={t.planned_end || ''} onChange={e => patch(t.id, { planned_end: e.target.value || null })} className={dateCls}/></label>
                ) : (t.planned_end && <span>預計完成:{t.planned_end}</span>)}
                {t.actual_end && <span className="text-emerald-600">實際完成:{t.actual_end}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {isInternal && (
        <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
          <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="新增生產項目(例:主管桌 ×3 開料)" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"/>
          <button onClick={add} className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"><Plus className="w-4 h-4"/>新增</button>
        </div>
      )}
    </div>
  )
}
