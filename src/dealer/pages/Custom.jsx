import React, { useEffect, useState } from 'react'
import { Sparkles, Plus, X, Loader2, ChevronDown, Check, Ban } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { fetchCustomRequests, createCustomRequest, customRequestDecide } from '../../lib/data'
import { nt, fmtDate, fmtDateTime } from '../../lib/format'
import { customLabel } from '../../lib/status'

function RequestForm({ dealerId, onDone, onClose }) {
  const [f, setF] = useState({ title: '', description: '', qty: 1, budget: '', isRush: false, desiredDate: '' })
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    if (!f.title.trim()) { setErr('請填品項名稱'); return }
    setErr(''); setBusy(true)
    try {
      await createCustomRequest({ dealerId, ...f })
      onDone()
    } catch (e) { setErr('送出失敗：' + (e.message || '請稍後再試')); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <h3 className="flex items-center gap-2 font-bold text-stone-800"><Sparkles className="h-4 w-4 text-amber-500" />新增定制詢價</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-stone-400" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <L label="品項名稱 / 主題 *">
            <input value={f.title} onChange={e => set('title', e.target.value)} placeholder="例如：客製化會議桌（橢圓 3 米）" className="inp" />
          </L>
          <L label="需求描述（尺寸 / 材質 / 顏色 / 細節）">
            <textarea value={f.description} onChange={e => set('description', e.target.value)} rows={4} className="inp" placeholder="可附上規格、用途、現場照片連結等" />
          </L>
          <div className="grid grid-cols-2 gap-3">
            <L label="數量"><input type="number" min="1" value={f.qty} onChange={e => set('qty', e.target.value)} className="inp font-mono" /></L>
            <L label="預算（未稅，可空）"><input type="number" value={f.budget} onChange={e => set('budget', e.target.value)} className="inp font-mono" placeholder="—" /></L>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <L label="期望交貨日（可空）"><input type="date" value={f.desiredDate} onChange={e => set('desiredDate', e.target.value)} className="inp" /></L>
            <L label="是否加急">
              <label className="flex h-[38px] items-center gap-2 text-sm text-stone-600">
                <input type="checkbox" checked={f.isRush} onChange={e => set('isRush', e.target.checked)} />
                需加急（加價 10~15%）
              </label>
            </L>
          </div>
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            提交後將由專員聯繫您報價。**核心會員專屬服務**——一張詢價單需付定金 30%、依生產排程提貨。
          </div>
          {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}
        </div>
        <div className="border-t border-stone-100 p-4">
          <button onClick={submit} disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-700 py-3 font-semibold text-white disabled:opacity-60">
            {busy && <Loader2 className="h-5 w-5 animate-spin" />}{busy ? '送出中…' : '送出詢價'}
          </button>
        </div>
      </div>
    </div>
  )
}
const L = ({ label, children }) => (
  <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</label>{children}</div>
)

function RequestCard({ req, onDecide }) {
  const [open, setOpen] = useState(false)
  const decide = async (e, decision) => {
    e.stopPropagation()
    const text = decision === 'confirmed' ? '確認接受此報價？' : '拒絕此報價？'
    if (!confirm(text)) return
    await customRequestDecide(req.id, decision)
    onDecide?.()
  }
  const pillCls = {
    submitted: 'bg-stone-100 text-stone-500',
    quoted:    'bg-amber-50 text-amber-700',
    confirmed: 'bg-emerald-50 text-emerald-700',
    rejected:  'bg-rose-50 text-rose-600',
    closed:    'bg-stone-100 text-stone-500',
  }[req.status]
  return (
    <div className="rounded-2xl border border-stone-200 bg-white" onClick={() => setOpen(o => !o)}>
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pillCls}`}>{customLabel(req.status)}</span>
            {req.is_rush && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">加急</span>}
          </div>
          <div className="mt-1.5 font-semibold text-stone-800">{req.title}</div>
          <div className="text-xs text-stone-400">{req.request_no} · {fmtDate(req.created_at)} · 數量 {req.qty}</div>
        </div>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-stone-300 transition ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="space-y-3 border-t border-stone-100 px-4 pb-4 pt-3 text-sm">
          {req.description && <div className="whitespace-pre-wrap text-stone-600">{req.description}</div>}
          <div className="grid grid-cols-2 gap-2 text-xs text-stone-500">
            {req.budget && <div>預算：<span className="text-stone-700">{nt(req.budget)}</span></div>}
            {req.desired_date && <div>期望交貨：<span className="text-stone-700">{fmtDate(req.desired_date)}</span></div>}
          </div>
          {req.status === 'quoted' && (
            <div className="rounded-xl bg-amber-50 p-3">
              <div className="text-xs text-amber-700">專員報價</div>
              <div className="mt-0.5 font-mono text-xl font-extrabold text-amber-900">{nt(req.quoted_price)}</div>
              {req.quoted_lead && <div className="text-xs text-amber-800">{req.quoted_lead}</div>}
              {req.admin_note && <div className="mt-1 whitespace-pre-wrap text-xs text-amber-800">{req.admin_note}</div>}
              <div className="mt-3 flex gap-2">
                <button onClick={e => decide(e, 'confirmed')} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white"><Check className="h-4 w-4" />確認接受</button>
                <button onClick={e => decide(e, 'rejected')} className="flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-500"><Ban className="h-4 w-4" />拒絕</button>
              </div>
            </div>
          )}
          {req.status === 'confirmed' && (
            <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">已確認接受報價，後續由專員聯繫安排生產與付款。</div>
          )}
          {req.quoted_at && <div className="text-[10px] text-stone-400">報價於 {fmtDateTime(req.quoted_at)}</div>}
        </div>
      )}
    </div>
  )
}

export default function Custom() {
  const { dealer } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = async () => { setList(await fetchCustomRequests(dealer?.id)); setLoading(false) }
  useEffect(() => { if (dealer?.id) load() /* eslint-disable-next-line */ }, [dealer?.id])

  const isCore = dealer?.member_type === 'core'

  return (
    <div className="space-y-4">
      <style>{`.inp{width:100%;border:1px solid #e7e5e4;border-radius:8px;padding:8px 12px;font-size:14px;outline:none}.inp:focus{border-color:#5eead4}`}</style>
      {showForm && <RequestForm dealerId={dealer.id} onDone={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />}

      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold text-stone-800"><Sparkles className="h-5 w-5 text-amber-500" />定制詢價</h1>
        {isCore && <button onClick={() => setShowForm(true)} className="flex items-center gap-1 rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />新增詢價</button>}
      </div>

      {!isCore ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="text-sm font-semibold text-amber-900">本服務僅開放核心會員</div>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            「有限定制」是針對核心會員提供的客製化服務（依生產排程提貨、可加急）。如有需求，請聯絡您的專員協助升級會員資格。
          </p>
        </div>
      ) : loading ? (
        <div className="py-20 text-center text-sm text-stone-400">載入中…</div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-16 text-center">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-stone-300" />
          <p className="text-sm text-stone-400">尚無詢價單</p>
          <button onClick={() => setShowForm(true)} className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white">新增第一張</button>
        </div>
      ) : (
        <div className="space-y-2">{list.map(r => <RequestCard key={r.id} req={r} onDecide={load} />)}</div>
      )}
    </div>
  )
}
