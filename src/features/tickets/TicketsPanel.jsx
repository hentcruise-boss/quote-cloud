import { useEffect, useState } from 'react'
import { Plus, Trash2, LifeBuoy, CheckCircle2 } from 'lucide-react'
import { useSync } from '../../contexts/SyncContext'
import { useAuth } from '../../contexts/AuthContext'
import * as api from '../../lib/api'
import { supabase } from '../../supabase'
import { TICKET_STATUS, TICKET_STATUS_MAP, TICKET_PRIORITY, TICKET_PRIORITY_MAP, TICKET_CATEGORY, TICKET_CATEGORY_MAP } from '../../lib/constants'
import { fromNow } from '../../lib/format'

const EMPTY = { title: '', category: 'service', priority: 'normal', description: '' }

export default function TicketsPanel({ caseId, isInternal, profilesMap }) {
  const { run } = useSync()
  const { profile } = useAuth()
  const [tickets, setTickets] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [show, setShow] = useState(false)

  const load = async () => { const { data } = await api.listTickets(caseId); setTickets(data || []) }
  useEffect(() => {
    load()
    const ch = supabase.channel(`rt-tickets-${caseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `case_id=eq.${caseId}` }, load).subscribe()
    return () => supabase.removeChannel(ch)
  }, [caseId])

  const create = () => {
    if (!form.title.trim()) return
    return run(async () => {
      await api.addTicket({ case_id: caseId, title: form.title.trim(), category: form.category, priority: form.priority, description: form.description || null, created_by: profile?.id })
      setForm(EMPTY); setShow(false)
      await load()
    })
  }
  const setStatus = (t, status) => run(async () => {
    const patch = { status }
    if (status === 'resolved') patch.resolved_at = new Date().toISOString()
    setTickets(prev => prev.map(x => x.id === t.id ? { ...x, ...patch } : x))
    await api.updateTicket(t.id, patch)
    if (status === 'resolved') await api.addEvent({ case_id: caseId, actor_id: profile?.id, type: 'note', summary: `售後工單已解決:${t.title}` })
    await load()
  })
  const del = (id) => run(async () => { await api.deleteTicket(id); await load() })

  const inputCls = 'border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white'

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2"><LifeBuoy className="w-4 h-4 text-slate-400"/>售後工單</h2>
        <button onClick={() => setShow(s => !s)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"><Plus className="w-3.5 h-3.5"/>{isInternal ? '新增工單' : '我要報修'}</button>
      </div>

      {show && (
        <div className="px-5 py-4 border-b border-slate-100 space-y-2 bg-slate-50/60">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="問題標題(例:主管椅氣壓棒異常)" className={`${inputCls} w-full`}/>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>{TICKET_CATEGORY.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={inputCls}>{TICKET_PRIORITY.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="問題描述…" className={`${inputCls} w-full resize-none`}/>
          <div className="flex justify-end"><button onClick={create} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">送出</button></div>
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {tickets.length === 0 && <div className="px-5 py-8 text-center text-slate-300 text-sm">尚無售後工單</div>}
        {tickets.map(t => {
          const st = TICKET_STATUS_MAP[t.status] || {}
          const pr = TICKET_PRIORITY_MAP[t.priority] || {}
          return (
            <div key={t.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.badge}`}>{st.label}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pr.badge}`}>{pr.label}</span>
                  <span className="text-[10px] text-slate-400">{TICKET_CATEGORY_MAP[t.category]?.label}</span>
                </div>
                {isInternal && <button onClick={() => del(t.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>}
              </div>
              <div className="font-semibold text-slate-800 text-sm mt-1.5">{t.title}</div>
              {t.description && <div className="text-xs text-slate-500 mt-0.5 whitespace-pre-wrap">{t.description}</div>}
              <div className="text-[11px] text-slate-400 mt-1">{profilesMap[t.created_by] || '—'} · {fromNow(t.created_at)}</div>
              {isInternal && (
                <div className="flex items-center gap-3 mt-2">
                  <select value={t.status} onChange={e => setStatus(t, e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 bg-white outline-none">
                    {TICKET_STATUS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                  {t.status !== 'resolved' && t.status !== 'closed' && <button onClick={() => setStatus(t, 'resolved')} className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5"/>標記解決</button>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
