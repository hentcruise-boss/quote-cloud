import { useState } from 'react'
import { Plus, Trash2, Edit2, Package } from 'lucide-react'
import ProductModal from './ProductModal'

export default function ProductsTab({ products, onSave, onDelete }) {
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const filtered = products.filter(p=>!search||p.sku.toLowerCase().includes(search.toLowerCase())||p.name.includes(search)||p.vendor.includes(search))
  return (
    <div className="space-y-4">
      {(modal==='add'||(modal&&modal.sku))&&<ProductModal product={modal==='add'?null:modal} onSave={async p=>{await onSave(p);setModal(null)}} onClose={()=>setModal(null)}/>}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜尋 SKU / 名稱 / 廠商…" className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 outline-none focus:ring-2 focus:ring-indigo-400 bg-white"/>
          <span className="text-sm text-slate-400">{filtered.length} 筆</span>
        </div>
        <button onClick={()=>setModal('add')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4"/>新增產品</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-3 text-left font-semibold w-24">SKU</th><th className="px-4 py-3 text-left font-semibold">產品名稱</th>
            <th className="px-4 py-3 text-left font-semibold w-32">規格</th><th className="px-4 py-3 text-right font-semibold w-28">售價</th>
            <th className="px-4 py-3 text-right font-semibold w-20">毛利率</th><th className="px-4 py-3 text-left font-semibold w-24">廠商</th>
            <th className="px-4 py-3 text-left font-semibold">適用空間</th><th className="px-4 py-3 w-20"></th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(p=>{
              const margin=p.price>0?((p.price-p.cost)/p.price*100).toFixed(0):0
              return <tr key={p.sku} className="hover:bg-slate-50 transition group">
                <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{p.sku}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.spec}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-700">{Number(p.price).toLocaleString()}</td>
                <td className="px-4 py-3 text-right"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${Number(margin)>=30?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{margin}%</span></td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.vendor}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{(p.spaces||[]).map(s=><span key={s} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{s}</span>)}</div></td>
                <td className="px-4 py-3"><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={()=>setModal(p)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5"/></button>
                  <button onClick={()=>onDelete(p.sku)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                </div></td>
              </tr>
            })}
          </tbody>
        </table>
        {filtered.length===0&&<div className="py-12 text-center text-slate-400"><Package className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-sm">找不到產品</p></div>}
      </div>
    </div>
  )
}
