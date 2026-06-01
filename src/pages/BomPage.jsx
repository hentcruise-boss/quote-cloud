import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Component, ArrowLeft, Plus, Trash2, RefreshCw } from 'lucide-react'
import { useSync } from '../contexts/SyncContext'
import * as api from '../lib/api'

export default function BomPage() {
  const { run } = useSync()
  const [products, setProducts] = useState([])
  const [productSku, setProductSku] = useState('')
  const [bom, setBom] = useState([])
  const [compSku, setCompSku] = useState('')
  const [qtyPer, setQtyPer] = useState('1')
  const [loading, setLoading] = useState(true)

  const prodName = Object.fromEntries(products.map(p => [p.sku, p.name]))
  const loadBom = async (sku) => { if (!sku) { setBom([]); return } const { data } = await api.listBom(sku); setBom(data || []) }

  useEffect(() => { api.listProducts().then(r => { setProducts(r.data || []); setLoading(false) }) }, [])
  useEffect(() => { loadBom(productSku) }, [productSku])

  const add = () => {
    if (!productSku || !compSku || compSku === productSku) { alert('請選擇有效的物料(不可與產品本身相同)'); return }
    return run(async () => { await api.addBomItem({ product_sku: productSku, component_sku: compSku, qty_per: Number(qtyPer) || 1 }); setCompSku(''); setQtyPer('1'); await loadBom(productSku) })
  }
  const del = (id) => run(async () => { await api.deleteBomItem(id); await loadBom(productSku) })

  const sel = 'border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-400'
  if (loading) return <div className="py-20 text-center text-slate-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500"/>載入中…</div>

  return (
    <div className="space-y-4">
      <Link to="/products" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"><ArrowLeft className="w-4 h-4"/>返回產品</Link>
      <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Component className="w-5 h-5 text-indigo-500"/>BOM 物料表</h1>

      <label className="block text-sm text-slate-500">選擇產品
        <select value={productSku} onChange={e => setProductSku(e.target.value)} className={`${sel} w-full max-w-md mt-1 block`}>
          <option value="">— 選擇要設定 BOM 的產品 —</option>
          {products.map(p => <option key={p.sku} value={p.sku}>{p.sku} · {p.name}</option>)}
        </select>
      </label>

      {productSku && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100"><h2 className="text-sm font-bold text-slate-700">{prodName[productSku]} 的組成物料</h2></div>
          <div className="divide-y divide-slate-100">
            {bom.length === 0 && <div className="px-5 py-6 text-center text-slate-300 text-sm">尚未設定物料</div>}
            {bom.map(b => (
              <div key={b.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <span className="text-slate-700">{prodName[b.component_sku] || b.component_sku} <span className="font-mono text-slate-400">×{b.qty_per}</span></span>
                <button onClick={() => del(b.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
            <select value={compSku} onChange={e => setCompSku(e.target.value)} className={`${sel} flex-1`}>
              <option value="">選擇物料(SKU)</option>
              {products.filter(p => p.sku !== productSku).map(p => <option key={p.sku} value={p.sku}>{p.sku} · {p.name}</option>)}
            </select>
            <input type="number" min="0" step="0.01" value={qtyPer} onChange={e => setQtyPer(e.target.value)} placeholder="單位用量" className={`${sel} w-28`}/>
            <button onClick={add} className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"><Plus className="w-4 h-4"/>加入</button>
          </div>
        </div>
      )}
      <p className="text-xs text-slate-400">生產任務指定此產品並完工後,可一鍵依 BOM 從領料倉扣除對應物料庫存。</p>
    </div>
  )
}
