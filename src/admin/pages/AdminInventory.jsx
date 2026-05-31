import React, { useEffect, useState } from 'react'
import { Check, X, Boxes, PackageOpen } from 'lucide-react'
import { supabase } from '../../supabase'
import { fetchReleaseItems } from '../../lib/data'
import { fmtDateTime } from '../../lib/format'
import { releaseLabel } from '../../lib/status'

function ReleaseRow({ req, dealersMap, onChanged }) {
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  useEffect(() => { fetchReleaseItems(req.id).then(setItems) }, [req.id])

  const approve = async () => {
    if (!confirm(`核准出庫單 ${req.request_no}？將自動扣減庫存。`)) return
    setBusy(true)
    const { error } = await supabase.rpc('release_request_approve', { p_request: req.id })
    setBusy(false)
    if (error) alert('核准失敗：' + error.message); else onChanged()
  }
  const reject = async () => {
    if (!confirm('拒絕此出庫申請？')) return
    await supabase.from('release_requests').update({ status: 'rejected' }).eq('id', req.id); onChanged()
  }
  const color = req.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : req.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-sm font-bold">{req.request_no}</div>
          <div className="text-xs text-slate-400">{dealersMap[req.dealer_id]?.company || '—'} · {fmtDateTime(req.created_at)}</div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{releaseLabel(req.status)}</span>
      </div>
      <div className="mt-2 space-y-0.5 text-sm text-slate-600">
        {items.map(it => <div key={it.id} className="flex justify-between"><span>{it.name}</span><span>×{it.qty}</span></div>)}
      </div>
      <div className="mt-2 text-xs text-slate-400">{req.recipient} · {req.phone} · {req.address}{req.note ? ` · ${req.note}` : ''}</div>
      {req.status === 'pending' && (
        <div className="mt-3 flex gap-2">
          <button onClick={approve} disabled={busy} className="flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"><Check className="h-3.5 w-3.5" />核准出庫</button>
          <button onClick={reject} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500"><X className="h-3.5 w-3.5" />拒絕</button>
        </div>
      )}
    </div>
  )
}

export default function AdminInventory() {
  const [dealers, setDealers] = useState([])
  const [requests, setRequests] = useState([])
  const [sel, setSel] = useState('')           // 選定的 dealer_id
  const [stock, setStock] = useState([])
  const [products, setProducts] = useState([])
  const [add, setAdd] = useState({ sku: '', qty: 0, note: '' })

  const dealersMap = Object.fromEntries(dealers.map(d => [d.id, d]))

  const loadTop = async () => {
    const [{ data: d }, { data: r }, { data: p }] = await Promise.all([
      supabase.from('dealers').select('id, company').order('company'),
      supabase.from('release_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('dealer_products').select('sku, name, spec').order('name'),
    ])
    setDealers(d || []); setRequests(r || []); setProducts(p || [])
  }
  const loadStock = async (did) => {
    if (!did) { setStock([]); return }
    const { data } = await supabase.from('inventory').select('*').eq('dealer_id', did).order('name')
    setStock(data || [])
  }
  useEffect(() => { loadTop() }, [])
  useEffect(() => { loadStock(sel) }, [sel])

  const submitAdd = async () => {
    if (!sel || !add.sku || !Number(add.qty)) { alert('請選擇經銷商、品項與數量'); return }
    const p = products.find(x => x.sku === add.sku) || {}
    const { error } = await supabase.rpc('inventory_adjust', {
      p_dealer: sel, p_sku: add.sku, p_name: p.name || add.sku, p_spec: p.spec || null,
      p_warehouse: '樹林倉', p_qty: Number(add.qty), p_note: add.note || null,
    })
    if (error) { alert('失敗：' + error.message); return }
    setAdd({ sku: '', qty: 0, note: '' }); loadStock(sel)
  }

  const pending = requests.filter(r => r.status === 'pending')
  const others = requests.filter(r => r.status !== 'pending')

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">庫存代管</h1>

      {/* 出庫申請審核 */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-700"><PackageOpen className="h-4 w-4" />出庫申請 {pending.length > 0 && <span className="rounded-full bg-amber-100 px-2 text-xs text-amber-700">{pending.length} 待處理</span>}</h2>
        {requests.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-400">尚無出庫申請</div>
          : <div className="grid gap-2 sm:grid-cols-2">{[...pending, ...others].map(r => <ReleaseRow key={r.id} req={r} dealersMap={dealersMap} onChanged={() => { loadTop(); loadStock(sel) }} />)}</div>}
      </section>

      {/* 入庫 / 庫存管理 */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-700"><Boxes className="h-4 w-4" />入庫 / 庫存管理</h2>
        <select value={sel} onChange={e => setSel(e.target.value)} className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">— 選擇經銷商 —</option>
          {dealers.map(d => <option key={d.id} value={d.id}>{d.company}</option>)}
        </select>

        {sel && (
          <>
            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
              <div><label className="mb-1 block text-xs text-slate-500">品項</label>
                <select value={add.sku} onChange={e => setAdd({ ...add, sku: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="">— 選擇 —</option>
                  {products.map(p => <option key={p.sku} value={p.sku}>{p.name}（{p.sku}）</option>)}
                </select></div>
              <div><label className="mb-1 block text-xs text-slate-500">數量（負數=扣減）</label>
                <input type="number" value={add.qty} onChange={e => setAdd({ ...add, qty: e.target.value })} className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono" /></div>
              <div className="flex-1"><label className="mb-1 block text-xs text-slate-500">備註</label>
                <input value={add.note} onChange={e => setAdd({ ...add, note: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="如：到貨入庫" /></div>
              <button onClick={submitAdd} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">入庫 / 調整</button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-2.5 font-semibold">品項</th><th className="px-4 py-2.5 font-semibold">倉庫</th><th className="px-4 py-2.5 font-semibold text-right">在庫</th>
                </tr></thead>
                <tbody>
                  {stock.map(s => (
                    <tr key={s.id} className="border-b border-slate-100">
                      <td className="px-4 py-2.5"><div className="font-medium">{s.name}</div><div className="text-xs text-slate-400">{s.sku}</div></td>
                      <td className="px-4 py-2.5 text-slate-500">{s.warehouse}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold">{s.qty}</td>
                    </tr>
                  ))}
                  {stock.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-400">此經銷商尚無庫存</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
