import { useEffect, useState } from 'react'
import { Plus, Trash2, ClipboardCheck, ListPlus, ArrowRight } from 'lucide-react'
import { useSync } from '../../contexts/SyncContext'
import { useAuth } from '../../contexts/AuthContext'
import * as api from '../../lib/api'
import { supabase } from '../../supabase'
import { QC_RESULT, QC_RESULT_MAP, QC_TEMPLATE, STAGE_MAP } from '../../lib/constants'

export default function QcPanel({ caseId, caseItem, isInternal, onCaseChange }) {
  const { run } = useSync()
  const { profile } = useAuth()
  const [checks, setChecks] = useState([])
  const [label, setLabel] = useState('')

  const load = async () => { const { data } = await api.listQcChecks(caseId); setChecks(data || []) }
  useEffect(() => {
    load()
    const ch = supabase.channel(`rt-qc-${caseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qc_checks', filter: `case_id=eq.${caseId}` }, load).subscribe()
    return () => supabase.removeChannel(ch)
  }, [caseId])

  const applyTemplate = () => run(async () => {
    await api.addQcChecks(QC_TEMPLATE.map((l, i) => ({ case_id: caseId, label: l, sort_order: i })))
    await load()
  })
  const addItem = () => {
    if (!label.trim()) return
    const l = label.trim(); setLabel('')
    return run(async () => { await api.addQcChecks([{ case_id: caseId, label: l, sort_order: checks.length }]); await load() })
  }
  const setResult = (c, result) => run(async () => {
    setChecks(prev => prev.map(x => x.id === c.id ? { ...x, result } : x))
    await api.updateQcCheck(c.id, { result, checked_by: profile?.id, checked_at: new Date().toISOString() })
    await load()
  })
  const setNote = (id, note) => run(async () => { await api.updateQcCheck(id, { note }); setChecks(prev => prev.map(x => x.id === id ? { ...x, note } : x)) })
  const del = (id) => run(async () => { await api.deleteQcCheck(id); await load() })

  const done = checks.length > 0 && checks.every(c => c.result !== 'pending')
  const anyFail = checks.some(c => c.result === 'fail')
  const overall = checks.length === 0 ? null : (anyFail ? 'fail' : (done ? 'pass' : 'pending'))

  const finishPass = () => run(async () => {
    await api.addEvent({ case_id: caseId, actor_id: profile?.id, type: 'note', summary: 'QC 驗收結果:合格 ✅' })
    if (caseItem?.stage === 'inspection') {
      await api.updateCase(caseId, { stage: 'aftersales' })
      await api.addEvent({ case_id: caseId, actor_id: profile?.id, type: 'stage_changed', summary: `階段:${STAGE_MAP.inspection.label} → ${STAGE_MAP.aftersales.label}`, meta: { from: 'inspection', to: 'aftersales' } })
      onCaseChange?.()
    }
  })
  const finishFail = () => run(async () => {
    await api.addEvent({ case_id: caseId, actor_id: profile?.id, type: 'note', summary: 'QC 驗收結果:不合格,需返工 ⚠️' })
  })

  const inputCls = 'border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400 bg-white'

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-slate-400"/>QC 驗收檢查表</h2>
        {overall && <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${QC_RESULT_MAP[overall]?.badge}`}>整體:{QC_RESULT_MAP[overall]?.label}</span>}
      </div>

      {checks.length === 0 && (
        <div className="px-5 py-8 text-center text-sm text-slate-400">
          尚無檢查項目。
          {isInternal && <div className="mt-3"><button onClick={applyTemplate} className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"><ListPlus className="w-4 h-4"/>套用預設檢查表</button></div>}
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {checks.map(c => (
          <div key={c.id} className="px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-800 flex-1">{c.label}</span>
              {isInternal ? (
                <select value={c.result} onChange={e => setResult(c, e.target.value)} className={inputCls}>
                  {QC_RESULT.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              ) : <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${QC_RESULT_MAP[c.result]?.badge}`}>{QC_RESULT_MAP[c.result]?.label}</span>}
              {isInternal && <button onClick={() => del(c.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>}
            </div>
            {isInternal
              ? <input defaultValue={c.note || ''} onBlur={e => e.target.value !== (c.note || '') && setNote(c.id, e.target.value)} placeholder="備註(缺失說明…)" className="w-full mt-1.5 text-xs text-slate-500 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 rounded px-2 py-1 outline-none"/>
              : (c.note && <div className="text-xs text-slate-500 mt-1">{c.note}</div>)}
          </div>
        ))}
      </div>

      {isInternal && checks.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100 space-y-3">
          <div className="flex gap-2">
            <input value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="新增檢查項目…" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"/>
            <button onClick={addItem} className="inline-flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"><Plus className="w-4 h-4"/>新增項目</button>
          </div>
          <div className="flex gap-2">
            <button onClick={finishPass} disabled={!done || anyFail} className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40"><ArrowRight className="w-3.5 h-3.5"/>通過驗收 → 售後</button>
            <button onClick={finishFail} className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-200 text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-50">標記不合格(返工)</button>
          </div>
        </div>
      )}
    </div>
  )
}
