import React, { useEffect, useState } from 'react'
import { Boxes, PackageOpen, History, X, Loader2, Warehouse } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { fetchInventory, fetchMovements, fetchReleaseRequests, fetchReleaseItems, createReleaseRequest, cancelReleaseRequest } from '../../lib/data'
import { fmtDateTime } from '../../lib/format'
import { releaseLabel } from '../../lib/status'

function ReleaseModal({ stock, dealerId, onClose, onDone }) {
  const [qtys, setQtys] = useState({})           // sku -> qty
  const [form, setForm] = useState({ recipient: '', phone: '', address: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setQty = (sku, v, max) => setQtys(q => ({ ...q, [sku]: Math.max(0, Math.min(Number(v) || 0, max)) }))

  const chosen = stock.filter(s => (qtys[s.sku] || 0) > 0)

  const submit = async () => {
    if (chosen.length === 0) { setErr('請至少選擇一項出庫數量'); return }
    if (!form.recipient || !form.phone || !form.address) { setErr('請填寫收貨人、電話與地址'); return }
    setErr(''); setBusy(true)
    try {
      await createReleaseRequest({
        dealerId, ...form,
        items: chosen.map(s => ({ sku: s.sku, name: s.name, qty: qtys[s.sku] })),
      })
      onDone()
    } catch (e) { console.error(e); setErr('送出失敗：' + (e.message || '請稍後再試')); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <h3 className="font-bold text-stone-800">申請出庫</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-stone-400" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <div className="mb-2 text-sm font-semibold text-stone-700">選擇品項與數量</div>
            <div className="space-y-2">
              {stock.map(s => (
                <div key={s.sku} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-stone-800">{s.name}</div>
                    <div className="text-xs text-stone-400">庫存 {s.qty}</div>
                  </div>
                  <input type="number" min="0" max={s.qty} value={qtys[s.sku] || 0}
                    onChange={e => setQty(s.sku, e.target.value, s.qty)}
                    className="w-20 rounded-lg border border-stone-200 px-2 py-1.5 text-center text-sm" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-stone-700">收貨資訊</div>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.recipient} onChange={e => set('recipient', e.target.value)} placeholder="收貨人 *" className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-teal-400" />
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="聯絡電話 *" className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-teal-400" />
            </div>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="收貨地址 *" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-teal-400" />
            <textarea value={form.note} onChange={e => set('note', e.target.value)} placeholder="備註（選填）" rows={2} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-teal-400" />
          </div>
          {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}
        </div>
        <div className="border-t border-stone-100 p-4">
          <button onClick={submit} disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 font-semibold text-white disabled:opacity-60">
            {busy && <Loader2 className="h-5 w-5 animate-spin" />}{busy ? '送出中…' : '送出出庫申請'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RequestCard({ req }) {
  const [items, setItems] = useState(null)
  const toggle = async () => { if (items === null) setItems(await fetchReleaseItems(req.id)); else setItems(null) }
  const cancel = async (e) => { e.stopPropagation(); if (!confirm('取消此出庫申請？')) return; await cancelReleaseRequest(req.id); location.reload() }
  const color = req.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : req.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-500'
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4" onClick={toggle}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-sm font-bold text-stone-800">{req.request_no}</div>
          <div className="text-xs text-stone-400">{fmtDateTime(req.created_at)}</div>
        </div>
        <div className="flex items-center gap-2">
          {req.status === 'pending' && <button onClick={cancel} className="rounded-lg border border-stone-200 px-2 py-1 text-xs text-stone-500">取消</button>}
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{releaseLabel(req.status)}</span>
        </div>
      </div>
      {items && (
        <div className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
          {items.map(it => <div key={it.id} className="flex justify-between text-stone-600"><span>{it.name}</span><span>×{it.qty}</span></div>)}
          <div className="pt-1 text-xs text-stone-400">{req.recipient} · {req.phone} · {req.address}</div>
        </div>
      )}
    </div>
  )
}

export default function Inventory() {
  const { dealer } = useAuth()
  const [tab, setTab] = useState('stock')
  const [stock, setStock] = useState([])
  const [requests, setRequests] = useState([])
  const [moves, setMoves] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRelease, setShowRelease] = useState(false)

  const load = async () => {
    setLoading(true)
    const [s, r, m] = await Promise.all([fetchInventory(dealer?.id), fetchReleaseRequests(dealer?.id), fetchMovements(dealer?.id)])
    setStock(s); setRequests(r); setMoves(m); setLoading(false)
  }
  useEffect(() => { if (dealer?.id) load() /* eslint-disable-next-line */ }, [dealer?.id])

  const TABS = [['stock', '庫存', Boxes], ['requests', '出庫申請', PackageOpen], ['moves', '異動', History]]

  return (
    <div className="space-y-4">
      {showRelease && <ReleaseModal stock={stock} dealerId={dealer.id} onClose={() => setShowRelease(false)} onDone={() => { setShowRelease(false); load() }} />}

      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold text-stone-800"><Warehouse className="h-5 w-5 text-teal-700" />庫存代管</h1>
        {stock.length > 0 && (
          <button onClick={() => setShowRelease(true)} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white">申請出庫</button>
        )}
      </div>
      <p className="text-xs text-stone-400">您存放於<b className="text-stone-500">樹林倉</b>的代管庫存，可線上申請出庫。</p>

      <div className="flex gap-1 rounded-xl bg-stone-100 p-1">
        {TABS.map(([k, l, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${tab === k ? 'bg-white text-teal-700 shadow-sm' : 'text-stone-500'}`}>
            <Icon className="h-4 w-4" />{l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-stone-400">載入中…</div>
      ) : tab === 'stock' ? (
        stock.length === 0 ? <Empty text="目前沒有代管庫存" />
          : <div className="space-y-2">
            {stock.map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-stone-800">{s.name}</div>
                  <div className="text-xs text-stone-400">{s.spec || s.sku} · {s.warehouse}</div>
                </div>
                <div className="text-right"><div className="font-mono text-lg font-bold text-teal-700">{s.qty}</div><div className="text-[10px] text-stone-400">在庫</div></div>
              </div>
            ))}
          </div>
      ) : tab === 'requests' ? (
        requests.length === 0 ? <Empty text="尚無出庫申請" />
          : <div className="space-y-2">{requests.map(r => <RequestCard key={r.id} req={r} />)}</div>
      ) : (
        moves.length === 0 ? <Empty text="尚無異動紀錄" />
          : <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {moves.map(m => (
              <div key={m.id} className="flex items-center justify-between border-b border-stone-50 px-4 py-3 last:border-0">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-stone-700">{m.name}</div>
                  <div className="text-xs text-stone-400">{fmtDateTime(m.created_at)}{m.note ? ` · ${m.note}` : ''}</div>
                </div>
                <span className={`font-mono text-sm font-bold ${m.type === 'in' ? 'text-emerald-600' : 'text-rose-500'}`}>{m.type === 'in' ? '+' : '−'}{m.qty}</span>
              </div>
            ))}
          </div>
      )}
    </div>
  )
}

const Empty = ({ text }) => (
  <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-16 text-center text-sm text-stone-400">{text}</div>
)
