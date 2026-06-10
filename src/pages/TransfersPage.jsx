import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, ArrowLeft, Plus, X, RefreshCw, Trash2 } from 'lucide-react'
import { useSync } from '../contexts/SyncContext'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/api'
import { fromNow } from '../lib/format'

function NewTransferModal({ warehouses, products, onClose, onExecute }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState([])
  const [sku, setSku] = useState('')
  const [qty, setQty] = useState('')
  const [busy, setBusy] = useState(false)
  const prodName = Object.fromEntries(products.map(p => [p.sku, p.name]))

  const addLine = () => { if (!sku || !Number(qty)) return; setLines(l => [...l.filter(x => x.sku !== sku), { sku, qty: Number(qty) }]); setSku(''); setQty('') }
  const removeLine = (s) => setLines(l => l.filter(x => x.sku !== s))
  const submit = async () => {
    if (!from || !to || from === to) { alert('請選擇不同的來源與目的倉'); return }
    if (lines.length === 0) { alert('請至少加入一個品項'); return }
    setBusy(true)
    try { await onExecute(from, to, lines, note) } finally { setBusy(false) }
  }
  const sel = 'border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">新增調撥單</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">來源倉<select value={from} onChange={e => setFrom(e.target.value)} className={`${sel} w-full mt-1`}><option value="">選擇</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
            <label className="text-xs text-slate-400">目的倉<select value={to} onChange={e => setTo(e.target.value)} className={`${sel} w-full mt-1`}><option value="">選擇</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
          </div>
          <div className="border border-slate-100 rounded-lg p-3 space-y-2">
            <div className="flex gap-2">
              <select value={sku} onChange={e => setSku(e.target.value)} className={`${sel} flex-1`}><option value="">選擇品項</option>{products.map(p => <option key={p.sku} value={p.sku}>{p.sku} · {p.name}</option>)}</select>
              <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="數量" className={`${sel} w-24`}/>
              <button onClick={addLine} className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200">加入</button>
            </div>
            {lines.length === 0 && <p className="text-xs text-slate-300 text-center py-2">尚無品項</p>}
            {lines.map(l => (
              <div key={l.sku} className="flex items-center justify-between text-sm bg-slate-50 rounded px-2 py-1">
                <span className="text-slate-700">{prodName[l.sku] || l.sku} <span className="font-mono text-slate-400">×{l.qty}</span></span>
                <button onClick={() => removeLine(l.sku)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
            ))}
          </div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="備註(可選)" className={`${sel} w-full`}/>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">取消</button>
          <button onClick={submit} disabled={busy} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">{busy ? '執行中…' : '執行調撥'}</button>
        </div>
      </div>
    </div>
  )
}

export default function TransfersPage() {
  const { run } = useSync()
  const { profile } = useAuth()
  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [transfers, setTransfers] = useState([])
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => { const { data } = await api.listTransfers(); setTransfers(data || []) }
  useEffect(() => {
    Promise.all([
      api.listWarehouses().then(r => setWarehouses(r.data || [])),
      api.listProducts().then(r => setProducts(r.data || [])),
      load(),
    ]).finally(() => setLoading(false))
  }, [])

  const whName = (id) => warehouses.find(w => w.id === id)?.name || '—'
  const execute = (from, to, lines, note) => run(async () => {
    const { error } = await api.executeTransfer(from, to, lines, note || null, profile?.id)
    if (error) { alert(error.message); throw error }
    setShow(false); await load()
  })

  if (loading) return <div className="py-20 text-center text-slate-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500"/>載入中…</div>

  return (
    <div className="space-y-4">
      {show && <NewTransferModal warehouses={warehouses} products={products} onClose={() => setShow(false)} onExecute={execute}/>}
      <Link to="/inventory" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"><ArrowLeft className="w-4 h-4"/>返回庫存</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ArrowLeftRight className="w-5 h-5 text-indigo-500"/>倉間調撥</h1>
        <button onClick={() => setShow(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4"/>新增調撥單</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {transfers.length === 0 && <div className="py-12 text-center text-slate-300 text-sm">尚無調撥紀錄</div>}
        {transfers.map(t => (
          <div key={t.id} className="px-5 py-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="font-semibold">{whName(t.from_warehouse_id)}</span>
              <ArrowLeftRight className="w-4 h-4 text-slate-400"/>
              <span className="font-semibold">{whName(t.to_warehouse_id)}</span>
              {t.note && <span className="text-xs text-slate-400">· {t.note}</span>}
            </div>
            <span className="text-xs text-slate-400">{fromNow(t.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
