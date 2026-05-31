import { useEffect, useState } from 'react'
import { Boxes, RefreshCw, X, Plus, Minus } from 'lucide-react'
import { useSync } from '../contexts/SyncContext'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/api'
import { supabase } from '../supabase'

function AdjustModal({ product, onClose, onApply }) {
  const [sign, setSign] = useState(1)
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const apply = () => { const d = (Number(qty) || 0) * sign; if (!d) return; onApply(d, reason) }
  const btn = (s, label, cls) => (
    <button onClick={() => setSign(s)} className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${sign === s ? cls : 'border-slate-200 text-slate-500'}`}>{label}</button>
  )
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">庫存調整 — {product.name}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex gap-2">
            {btn(1, '入庫 (+)', 'border-emerald-500 bg-emerald-50 text-emerald-700')}
            {btn(-1, '出庫 (−)', 'border-rose-500 bg-rose-50 text-rose-700')}
          </div>
          <label className="block text-xs text-slate-400">數量<input type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"/></label>
          <label className="block text-xs text-slate-400">原因 / 備註<input value={reason} onChange={e => setReason(e.target.value)} placeholder="進貨 / 出貨案件 / 盤點…" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"/></label>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">取消</button>
          <button onClick={apply} disabled={!qty} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">確認調整</button>
        </div>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const { run } = useSync()
  const { profile } = useAuth()
  const [products, setProducts] = useState([])
  const [inv, setInv] = useState([])
  const [search, setSearch] = useState('')
  const [adjust, setAdjust] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProducts = async () => { const { data } = await api.listProducts(); setProducts(data || []) }
  const loadInv = async () => { const { data } = await api.listInventory(); setInv(data || []) }

  useEffect(() => {
    Promise.all([loadProducts(), loadInv()]).finally(() => setLoading(false))
    const ch = supabase.channel('rt-inventory').on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, loadInv).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const invMap = Object.fromEntries(inv.map(i => [i.sku, i]))
  const rows = products
    .map(p => ({ sku: p.sku, name: p.name, on_hand: invMap[p.sku]?.on_hand ?? 0, reorder_point: invMap[p.sku]?.reorder_point ?? 0 }))
    .filter(p => !search || p.sku.toLowerCase().includes(search.toLowerCase()) || p.name.includes(search))

  const applyAdjust = (delta, reason) => run(async () => {
    await api.addStockMovement({ sku: adjust.sku, delta, reason: reason || null, created_by: profile?.id })
    setAdjust(null)
    await loadInv()
  })
  const setReorder = (sku, val) => run(async () => { await api.upsertReorderPoint(sku, Number(val) || 0); await loadInv() })

  const statusOf = (p) => {
    if (p.on_hand <= 0) return { label: '缺貨', cls: 'bg-rose-50 text-rose-700' }
    if (p.reorder_point > 0 && p.on_hand <= p.reorder_point) return { label: '低於安全量', cls: 'bg-amber-50 text-amber-700' }
    return { label: '正常', cls: 'bg-emerald-50 text-emerald-700' }
  }

  if (loading) return <div className="py-20 text-center text-slate-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500"/>載入中…</div>

  return (
    <div className="space-y-4">
      {adjust && <AdjustModal product={adjust} onClose={() => setAdjust(null)} onApply={applyAdjust}/>}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Boxes className="w-5 h-5 text-indigo-500"/>庫存管理</h1>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋 SKU / 名稱…" className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-56 outline-none focus:ring-2 focus:ring-indigo-400 bg-white"/>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-3 text-left font-semibold w-24">SKU</th>
            <th className="px-4 py-3 text-left font-semibold">產品名稱</th>
            <th className="px-4 py-3 text-right font-semibold w-20">在庫</th>
            <th className="px-4 py-3 text-right font-semibold w-28">安全庫存</th>
            <th className="px-4 py-3 text-center font-semibold w-28">狀態</th>
            <th className="px-4 py-3 w-20"></th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(p => {
              const st = statusOf(p)
              return (
                <tr key={p.sku} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{p.sku}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">{p.on_hand}</td>
                  <td className="px-4 py-3 text-right">
                    <input type="number" min="0" defaultValue={p.reorder_point} onBlur={e => Number(e.target.value) !== p.reorder_point && setReorder(p.sku, e.target.value)}
                      className="w-16 text-right border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400"/>
                  </td>
                  <td className="px-4 py-3 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-right"><button onClick={() => setAdjust(p)} className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">調整</button></td>
                </tr>
              )
            })}
            {rows.length === 0 && <tr><td colSpan="6" className="py-12 text-center text-slate-400 text-sm">找不到產品</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">在庫量由「出入庫調整」累計;安全庫存可直接於欄位輸入後離開即儲存。</p>
    </div>
  )
}
