import React, { useEffect, useState } from 'react'
import { X, Sparkles, Save } from 'lucide-react'
import { supabase } from '../../supabase'
import { nt, fmtDate, fmtDateTime } from '../../lib/format'
import { customLabel } from '../../lib/status'

function RequestModal({ id, dealersMap, onClose, onChanged }) {
  const [r, setR] = useState(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ quoted_price: '', quoted_lead: '', admin_note: '', status: '' })

  const load = async () => {
    const { data } = await supabase.from('custom_requests').select('*').eq('id', id).maybeSingle()
    setR(data); setForm({
      quoted_price: data?.quoted_price ?? '',
      quoted_lead: data?.quoted_lead ?? '',
      admin_note: data?.admin_note ?? '',
      status: data?.status ?? 'submitted',
    })
  }
  useEffect(() => { load() }, [id])

  const saveQuote = async () => {
    if (!form.quoted_price) { alert('請填報價金額'); return }
    setBusy(true)
    await supabase.from('custom_requests').update({
      quoted_price: Number(form.quoted_price),
      quoted_lead: form.quoted_lead || null,
      admin_note: form.admin_note || null,
      status: 'quoted',
      quoted_at: new Date().toISOString(),
    }).eq('id', id)
    setBusy(false); onChanged?.(); load()
  }
  const setStatus = async (status) => {
    await supabase.from('custom_requests').update({ status }).eq('id', id)
    onChanged?.(); load()
  }

  if (!r) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-amber-500" />{r.request_no}</h3>
            <div className="text-xs text-slate-400">{dealersMap[r.dealer_id]?.company || '—'} · {fmtDate(r.created_at)}</div>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs uppercase text-slate-400">需求</div>
            <div className="mt-1 text-base font-bold">{r.title}</div>
            {r.description && <div className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{r.description}</div>}
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded bg-slate-50 p-2"><div className="text-slate-400">數量</div><div className="font-mono font-bold">{r.qty}</div></div>
              <div className="rounded bg-slate-50 p-2"><div className="text-slate-400">預算</div><div className="font-mono font-bold">{r.budget ? nt(r.budget) : '—'}</div></div>
              <div className="rounded bg-slate-50 p-2"><div className="text-slate-400">期望交貨</div><div className="font-bold">{r.desired_date ? fmtDate(r.desired_date) : '—'}</div></div>
            </div>
            {r.is_rush && <div className="mt-2 inline-block rounded bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">加急（+10~15%）</div>}
          </div>

          {/* 狀態 */}
          <div className="flex items-center justify-between">
            <span className="text-sm">目前狀態：<b className="text-amber-700">{customLabel(r.status)}</b></span>
            <div className="flex gap-1">
              {['submitted','closed'].map(s => (
                <button key={s} onClick={() => setStatus(s)} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600">標為 {customLabel(s)}</button>
              ))}
            </div>
          </div>

          {/* 報價 */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
            <div className="mb-2 text-sm font-semibold text-amber-900">報價給客戶</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><label className="mb-1 block text-xs text-slate-500">總價（含稅）</label>
                <input type="number" value={form.quoted_price} onChange={e => setForm(f => ({ ...f, quoted_price: e.target.value }))} className="inp font-mono" /></div>
              <div><label className="mb-1 block text-xs text-slate-500">交期說明</label>
                <input value={form.quoted_lead} onChange={e => setForm(f => ({ ...f, quoted_lead: e.target.value }))} className="inp" placeholder="例：生產 30 天 + 運送 7 天" /></div>
            </div>
            <div className="mt-2"><label className="mb-1 block text-xs text-slate-500">附註（給客戶看）</label>
              <textarea value={form.admin_note} onChange={e => setForm(f => ({ ...f, admin_note: e.target.value }))} rows={3} className="inp" placeholder="付款條件、其他說明…" /></div>
            <button onClick={saveQuote} disabled={busy} className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              <Save className="h-4 w-4" />送出報價（狀態 → 已報價）
            </button>
          </div>

          {r.status === 'confirmed' && r.decided_at && (
            <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">客戶已於 {fmtDateTime(r.decided_at)} 確認接受報價，請聯繫安排生產與收款。</div>
          )}
          {r.status === 'rejected' && r.decided_at && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">客戶已於 {fmtDateTime(r.decided_at)} 拒絕本次報價。</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminCustomRequests() {
  const [list, setList] = useState([])
  const [dealersMap, setDealersMap] = useState({})
  const [openId, setOpenId] = useState(null)
  const [filter, setFilter] = useState('open')

  const load = async () => {
    const [{ data: r }, { data: d }] = await Promise.all([
      supabase.from('custom_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('dealers').select('id, company'),
    ])
    setList(r || []); setDealersMap(Object.fromEntries((d || []).map(x => [x.id, x])))
  }
  useEffect(() => { load() }, [])

  const shown = list.filter(r => filter === 'all' ? true : filter === 'open' ? !['closed','rejected'].includes(r.status) : r.status === filter)
  const submittedCount = list.filter(r => r.status === 'submitted').length

  return (
    <div className="space-y-4">
      <style>{`.inp{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:14px;outline:none}.inp:focus{border-color:#94a3b8}`}</style>
      {openId && <RequestModal id={openId} dealersMap={dealersMap} onClose={() => setOpenId(null)} onChanged={load} />}
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-amber-500" />定制詢價（{list.length}）</h1>
        <div className="flex gap-1 text-xs">
          {[['all','全部'],['submitted', submittedCount > 0 ? `待回覆 ${submittedCount}` : '待回覆'],['open','進行中'],['confirmed','已確認'],['rejected','已拒絕']].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1 font-medium ${filter === k ? 'bg-slate-800 text-white' : k === 'submitted' && submittedCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-white text-slate-500 border border-slate-200'}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-2.5 font-semibold">詢價單 / 經銷商</th><th className="px-4 py-2.5 font-semibold">主題</th>
            <th className="px-4 py-2.5 font-semibold">數量</th><th className="px-4 py-2.5 font-semibold">報價</th>
            <th className="px-4 py-2.5 font-semibold">狀態</th><th className="px-4 py-2.5 font-semibold">建立</th>
          </tr></thead>
          <tbody>
            {shown.map(r => (
              <tr key={r.id} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => setOpenId(r.id)}>
                <td className="px-4 py-2.5"><div className="font-mono text-xs font-bold">{r.request_no}</div><div className="text-xs text-slate-400">{dealersMap[r.dealer_id]?.company || '—'}</div></td>
                <td className="px-4 py-2.5"><div className="font-medium">{r.title}</div>{r.is_rush && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] text-rose-600">加急</span>}</td>
                <td className="px-4 py-2.5 font-mono">{r.qty}</td>
                <td className="px-4 py-2.5 font-mono">{r.quoted_price ? nt(r.quoted_price) : '—'}</td>
                <td className="px-4 py-2.5"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{customLabel(r.status)}</span></td>
                <td className="px-4 py-2.5 text-xs text-slate-400">{fmtDate(r.created_at)}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">沒有資料</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
