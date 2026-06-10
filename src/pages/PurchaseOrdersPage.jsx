import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, ArrowLeft, Plus, X, Trash2, PackagePlus, RefreshCw } from 'lucide-react'
import { useSync } from '../contexts/SyncContext'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/api'
import { fromNow } from '../lib/format'

const STATUS = { draft: '草稿', ordered: '已下單', received: '已收貨' }
const STATUS_CLS = { draft: 'bg-slate-100 text-slate-500', ordered: 'bg-amber-100 text-amber-700', received: 'bg-emerald-100 text-emerald-700' }

function NewPOModal({ warehouses, products, onClose, onCreate }) {
  const [supplier, setSupplier] = useState('')
  const [warehouseId, setWarehouseId] = useState((warehouses.find(w => w.is_default) || warehouses[0])?.id || '')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState([])
  const [sku, setSku] = useState('')
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')
  const [batch, setBatch] = useState('')
  const [busy, setBusy] = useState(false)
  const prodName = Object.fromEntries(products.map(p => [p.sku, p.name]))

  const addLine = () => { if (!sku || !Number(qty)) return; setLines(l => [...l.filter(x => x.sku !== sku), { sku, qty: Number(qty), cost: Number(cost) || null, batch: batch || null }]); setSku(''); setQty(''); setCost(''); setBatch('') }
  const submit = async () => {
    if (!warehouseId) { alert('請選擇入庫倉'); return }
    if (lines.length === 0) { alert('請至少加入一個品項'); return }
    setBusy(true)
    try { await onCreate({ supplier, warehouseId, note, lines }) } finally { setBusy(false) }
  }
  const sel = 'border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">新增採購單</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">供應商<input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="廠商名稱" className={`${sel} w-full mt-1`}/></label>
            <label className="text-xs text-slate-400">入庫倉<select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className={`${sel} w-full mt-1`}>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
          </div>
          <div className="border border-slate-100 rounded-lg p-3 space-y-2">
            <div className="flex gap-2">
              <select value={sku} onChange={e => setSku(e.target.value)} className={`${sel} flex-1`}><option value="">選擇品項</option>{products.map(p => <option key={p.sku} value={p.sku}>{p.sku} · {p.name}</option>)}</select>
              <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="數量" className={`${sel} w-20`}/>
              <input type="number" min="0" value={cost} onChange={e => setCost(e.target.value)} placeholder="單價" className={`${sel} w-20`}/>
              <input value={batch} onChange={e => setBatch(e.target.value)} placeholder="批號" className={`${sel} w-20`}/>
              <button onClick={addLine} className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200">加入</button>
            </div>
            {lines.length === 0 && <p className="text-xs text-slate-300 text-center py-2">尚無品項</p>}
            {lines.map(l => (
              <div key={l.sku} className="flex items-center justify-between text-sm bg-slate-50 rounded px-2 py-1">
                <span className="text-slate-700">{prodName[l.sku] || l.sku} <span className="font-mono text-slate-400">×{l.qty}</span>{l.cost ? <span className="font-mono text-slate-400"> @{l.cost}</span> : ''}{l.batch ? <span className="text-[10px] text-slate-400"> 批號{l.batch}</span> : ''}</span>
                <button onClick={() => setLines(ls => ls.filter(x => x.sku !== l.sku))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
            ))}
          </div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="備註(可選)" className={`${sel} w-full`}/>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">取消</button>
          <button onClick={submit} disabled={busy} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">{busy ? '建立中…' : '建立採購單'}</button>
        </div>
      </div>
    </div>
  )
}

export default function PurchaseOrdersPage() {
  const { run } = useSync()
  const { profile } = useAuth()
  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [pos, setPos] = useState([])
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => { const { data } = await api.listPurchaseOrders(); setPos(data || []) }
  useEffect(() => {
    Promise.all([
      api.listWarehouses().then(r => setWarehouses(r.data || [])),
      api.listProducts().then(r => setProducts(r.data || [])),
      load(),
    ]).finally(() => setLoading(false))
  }, [])

  const whName = (id) => warehouses.find(w => w.id === id)?.name || '—'

  const create = ({ supplier, warehouseId, note, lines }) => run(async () => {
    const { data: po } = await api.createPO({ supplier: supplier || null, warehouse_id: warehouseId, status: 'ordered', note: note || null, created_by: profile?.id })
    if (po) await api.addPOItems(lines.map(l => ({ po_id: po.id, sku: l.sku, qty: l.qty, unit_cost: l.cost, batch_no: l.batch })))
    setShow(false); await load()
  })
  const receive = (po) => run(async () => {
    const { error } = await api.receivePO(po.id, profile?.id)
    if (error) { alert(error.message || '收貨失敗'); return }
    await load()
  })

  if (loading) return <div className="py-20 text-center text-slate-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500"/>載入中…</div>

  return (
    <div className="space-y-4">
      {show && <NewPOModal warehouses={warehouses} products={products} onClose={() => setShow(false)} onCreate={create}/>}
      <Link to="/inventory" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"><ArrowLeft className="w-4 h-4"/>返回庫存</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-indigo-500"/>採購單</h1>
        <button onClick={() => setShow(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4"/>新增採購單</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {pos.length === 0 && <div className="py-12 text-center text-slate-300 text-sm">尚無採購單</div>}
        {pos.map(po => (
          <div key={po.id} className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[po.status]}`}>{STATUS[po.status]}</span>
                <span className="text-sm font-semibold text-slate-800">{po.supplier || '(未填供應商)'}</span>
                <span className="text-xs text-slate-400">→ {whName(po.warehouse_id)}</span>
              </div>
              {po.note && <div className="text-xs text-slate-500 mt-0.5">{po.note}</div>}
              <div className="text-[11px] text-slate-400 mt-0.5">{fromNow(po.created_at)}{po.received_at ? ` · 已收貨 ${new Date(po.received_at).toLocaleDateString('zh-TW')}` : ''}</div>
            </div>
            {po.status !== 'received' && <button onClick={() => receive(po)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"><PackagePlus className="w-3.5 h-3.5"/>收貨入庫</button>}
          </div>
        ))}
      </div>
    </div>
  )
}
