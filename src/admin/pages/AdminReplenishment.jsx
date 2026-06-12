import React, { useEffect, useState } from 'react'
import { Zap, Send, PackageCheck, X, AlertTriangle, Mail, Loader2 } from 'lucide-react'
import { supabase } from '../../supabase'
import { fetchReplenishments, fetchReplenishmentItems, generateReplenishments, replenishmentReceive, fetchSuppliers, sendReplenishmentEmail, sendAllPendingReplenishmentEmails } from '../../lib/data'
import { fmtDateTime } from '../../lib/format'
import { replenishmentLabel } from '../../lib/status'

function DetailModal({ rep, suppliersMap, onClose, onChanged }) {
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const supplier = suppliersMap[rep.supplier_id]

  useEffect(() => { fetchReplenishmentItems(rep.id).then(setItems) }, [rep.id])

  const sendEmail = async () => {
    if (!supplier?.email) { alert(`供應商「${supplier?.name || '—'}」未設定 email，請先去「供應商」分頁補上。`); return }
    if (!confirm(`寄送本張補倉單給 ${supplier.email}？`)) return
    setBusy(true); setMsg('')
    try {
      await sendReplenishmentEmail(rep.id)
      setMsg('已寄出 ✓'); onChanged?.()
      setTimeout(() => onClose(), 800)
    } catch (e) { setMsg('寄送失敗：' + e.message); setBusy(false) }
  }
  const markSent = async () => {
    setBusy(true)
    await supabase.from('replenishment_orders').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', rep.id)
    setBusy(false); onChanged?.(); onClose()
  }
  const receive = async () => {
    if (!confirm('確認補倉已入庫？將自動把品項數量加回現貨庫存。')) return
    setBusy(true)
    try { await replenishmentReceive(rep.id); onChanged?.(); onClose() }
    catch (e) { alert('失敗：' + e.message); setBusy(false) }
  }
  const cancel = async () => {
    if (!confirm('取消本張補倉單？')) return
    await supabase.from('replenishment_orders').update({ status: 'cancelled' }).eq('id', rep.id)
    onChanged?.(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="font-mono font-bold">{rep.replenishment_no}</h3>
            <div className="text-xs text-slate-400">供應商：{suppliersMap[rep.supplier_id]?.name || '—'} · {fmtDateTime(rep.generated_at)}</div>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <div className="text-sm"><b>狀態：</b>{replenishmentLabel(rep.status)}</div>
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">補貨品項</div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {items.map(it => (
                <div key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div><div className="font-medium">{it.name}</div><div className="text-xs text-slate-400">{it.sku}</div></div>
                  <div className="font-mono font-bold">×{it.qty}</div>
                </div>
              ))}
              {items.length === 0 && <div className="px-3 py-4 text-center text-xs text-slate-400">無品項</div>}
            </div>
          </div>
          {supplier && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              供應商 email：{supplier.email
                ? <span className="font-mono text-slate-800">{supplier.email}</span>
                : <span className="text-rose-500">尚未設定（無法寄 email）</span>}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            {(rep.status === 'pending' || rep.status === 'sent') && supplier?.email && (
              <button onClick={sendEmail} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {rep.status === 'sent' ? '重新寄 email' : '寄 email 給供應商'}
              </button>
            )}
            {rep.status === 'pending' && (
              <button onClick={markSent} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"><Send className="h-4 w-4" />僅標為「已發送」（不寄信）</button>
            )}
            {(rep.status === 'pending' || rep.status === 'sent') && (
              <button onClick={receive} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><PackageCheck className="h-4 w-4" />確認入庫（加回庫存）</button>
            )}
            {rep.status !== 'received' && rep.status !== 'cancelled' && (
              <button onClick={cancel} className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-500">取消</button>
            )}
          </div>
          {msg && <div className={`rounded-lg px-3 py-2 text-sm ${msg.startsWith('已寄出') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{msg}</div>}
        </div>
      </div>
    </div>
  )
}

export default function AdminReplenishment() {
  const [list, setList] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const [r, s] = await Promise.all([fetchReplenishments(), fetchSuppliers()])
    setList(r); setSuppliers(s)
  }
  useEffect(() => { load() }, [])
  const suppliersMap = Object.fromEntries(suppliers.map(s => [s.id, s]))

  const run = async () => {
    if (!confirm('立即依目前低庫存產品產生補倉單？\n（每個供應商一張，依產品的「補貨門檻」與「單次補貨量」）')) return
    setBusy(true); setMsg('')
    try {
      const n = await generateReplenishments()
      setMsg(n === 0 ? '目前沒有需要補倉的品項' : `已產生 ${n} 張補倉單`)
      load()
    } catch (e) { setMsg('失敗：' + e.message) }
    finally { setBusy(false) }
  }

  const sendAll = async () => {
    const pending = list.filter(r => r.status === 'pending').length
    if (pending === 0) { setMsg('目前沒有待發送的補倉單'); return }
    if (!confirm(`寄送全部 ${pending} 張待發送的補倉單給對應供應商？\n（會跳過未設定 email 的供應商）`)) return
    setBusy(true); setMsg('')
    try {
      const r = await sendAllPendingReplenishmentEmails()
      setMsg(`已寄出 ${r.sent} 張` + (r.failed > 0 ? `（失敗 ${r.failed} 張，請查看單一補倉單詳情）` : ''))
      load()
    } catch (e) { setMsg('失敗：' + e.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      {open && <DetailModal rep={open} suppliersMap={suppliersMap} onClose={() => setOpen(null)} onChanged={load} />}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold">補倉訂單（{list.length}）</h1>
        <div className="flex gap-2">
          <button onClick={sendAll} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 disabled:opacity-60"><Mail className="h-4 w-4" />寄送全部待發送</button>
          <button onClick={run} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Zap className="h-4 w-4" />{busy ? '產生中…' : '立即產生補倉單'}</button>
        </div>
      </div>
      {msg && <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{msg}</div>}

      <div className="flex items-start gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
        <div>
          補倉單依各「產品」設定的<b>補貨門檻</b>與<b>單次補貨量</b>產生（後台 → 產品 → 編輯）。
          每週自動產生請啟用 pg_cron，設定範例見 <code className="rounded bg-white px-1">dealer_migration_v4.sql</code> 結尾。
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-2.5 font-semibold">單號</th><th className="px-4 py-2.5 font-semibold">供應商</th>
            <th className="px-4 py-2.5 font-semibold">產生時間</th><th className="px-4 py-2.5 font-semibold">狀態</th>
          </tr></thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => setOpen(r)}>
                <td className="px-4 py-2.5 font-mono text-xs font-bold">{r.replenishment_no}</td>
                <td className="px-4 py-2.5">{suppliersMap[r.supplier_id]?.name || '—'}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{fmtDateTime(r.generated_at)}</td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.status === 'received' ? 'bg-emerald-50 text-emerald-700' : r.status === 'sent' ? 'bg-amber-50 text-amber-700' : r.status === 'cancelled' ? 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-600'}`}>{replenishmentLabel(r.status)}</span></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">尚無補倉單，點右上「立即產生」</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
