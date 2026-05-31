import { useEffect, useState } from 'react'
import { Plus, Trash2, Truck, CheckCircle2, ArrowRight } from 'lucide-react'
import { useSync } from '../../contexts/SyncContext'
import { useAuth } from '../../contexts/AuthContext'
import FileUpload from '../../components/FileUpload'
import * as api from '../../lib/api'
import { supabase } from '../../supabase'
import { uploadCaseFile, signedUrl } from '../../lib/storage'
import { DELIVERY_STATUS, DELIVERY_STATUS_MAP, STAGE_MAP } from '../../lib/constants'

const today = () => new Date().toISOString().slice(0, 10)

function SignoffImage({ path }) {
  const [url, setUrl] = useState(null)
  useEffect(() => { let a = true; signedUrl(path).then(u => a && setUrl(u)); return () => { a = false } }, [path])
  if (!url) return null
  return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="簽收" className="mt-2 h-24 rounded-lg border border-slate-200 object-cover"/></a>
}

export default function DeliveryPanel({ caseId, caseItem, isInternal, onCaseChange }) {
  const { run } = useSync()
  const { profile } = useAuth()
  const [records, setRecords] = useState([])
  const [form, setForm] = useState({ delivered_at: today(), recipient_name: '', note: '' })

  const load = async () => { const { data } = await api.listDeliveries(caseId); setRecords(data || []) }
  useEffect(() => {
    load()
    const ch = supabase.channel(`rt-delivery-${caseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_records', filter: `case_id=eq.${caseId}` }, load).subscribe()
    return () => supabase.removeChannel(ch)
  }, [caseId])

  const addRecord = () => run(async () => {
    await api.addDelivery({ case_id: caseId, status: 'delivered', delivered_at: form.delivered_at || today(), recipient_name: form.recipient_name || null, note: form.note || null })
    await api.addEvent({ case_id: caseId, actor_id: profile?.id, type: 'note', summary: `安排交貨${form.recipient_name ? `(收件:${form.recipient_name})` : ''}` })
    setForm({ delivered_at: today(), recipient_name: '', note: '' })
    await load()
  })
  const del = (id) => run(async () => { await api.deleteDelivery(id); await load() })

  const uploadSignoff = (rec) => (file) => run(async () => {
    const path = await uploadCaseFile(caseId, file)
    await api.updateDelivery(rec.id, { signoff_path: path })
    await load()
  })

  const confirmSigned = (rec) => run(async () => {
    await api.updateDelivery(rec.id, { status: 'signed', signed_by: profile?.id, signed_at: new Date().toISOString() })
    await api.addEvent({ case_id: caseId, actor_id: profile?.id, type: 'note', summary: `已簽收${rec.recipient_name ? `(${rec.recipient_name})` : ''} ✅` })
    if (caseItem?.stage === 'delivery') {
      await api.updateCase(caseId, { stage: 'inspection' })
      await api.addEvent({ case_id: caseId, actor_id: profile?.id, type: 'stage_changed', summary: `階段:${STAGE_MAP.delivery.label} → ${STAGE_MAP.inspection.label}`, meta: { from: 'delivery', to: 'inspection' } })
      onCaseChange?.()
    }
    await load()
  })

  const inputCls = 'border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white'

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Truck className="w-4 h-4 text-slate-400"/>交貨簽收</h2>
      </div>

      <div className="divide-y divide-slate-100">
        {records.length === 0 && <div className="px-5 py-8 text-center text-slate-300 text-sm">尚無交貨紀錄</div>}
        {records.map(r => {
          const st = DELIVERY_STATUS_MAP[r.status] || {}
          return (
            <div key={r.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.badge}`}>{st.label}</span>
                  <span className="text-sm text-slate-700">{r.delivered_at || '—'}</span>
                  {r.recipient_name && <span className="text-xs text-slate-500">收件:{r.recipient_name}</span>}
                </div>
                {isInternal && <button onClick={() => del(r.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>}
              </div>
              {r.note && <div className="text-xs text-slate-500 mt-1">{r.note}</div>}
              {r.signoff_path && <SignoffImage path={r.signoff_path}/>}
              {r.signed_at && <div className="text-[11px] text-emerald-600 mt-1">簽收時間:{new Date(r.signed_at).toLocaleString('zh-TW')}</div>}
              {isInternal && r.status !== 'signed' && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <FileUpload onUpload={uploadSignoff(r)}/>
                  <button onClick={() => confirmSigned(r)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"><CheckCircle2 className="w-3.5 h-3.5"/>確認簽收</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isInternal && (
        <div className="px-5 py-3 border-t border-slate-100 space-y-2">
          <p className="text-xs font-semibold text-slate-500">新增交貨</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">交貨日期<input type="date" value={form.delivered_at} onChange={e => setForm(f => ({ ...f, delivered_at: e.target.value }))} className={`${inputCls} w-full mt-1`}/></label>
            <label className="text-xs text-slate-400">收件人<input value={form.recipient_name} onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))} placeholder="現場簽收人" className={`${inputCls} w-full mt-1`}/></label>
          </div>
          <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="備註(品項/數量/注意事項…)" className={`${inputCls} w-full`}/>
          <button onClick={addRecord} className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"><Plus className="w-4 h-4"/>新增交貨紀錄</button>
        </div>
      )}
    </div>
  )
}
