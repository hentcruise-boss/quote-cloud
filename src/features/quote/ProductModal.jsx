import { useState } from 'react'
import { X } from 'lucide-react'
import Field from '../../components/Field'
import { SPACE_TYPES, EMPTY_PRODUCT } from '../../lib/constants'

export default function ProductModal({ product, onSave, onClose }) {
  const [form, setForm] = useState(product ? {...product} : {...EMPTY_PRODUCT})
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const toggleSpace = s => set('spaces', form.spaces.includes(s)?form.spaces.filter(x=>x!==s):[...form.spaces,s])
  const margin = form.price>0?((form.price-form.cost)/form.price*100).toFixed(1):0
  const handleSave = async () => {
    if (!form.sku||!form.name){alert('SKU 與產品名稱為必填');return}
    setSaving(true); await onSave(form); setSaving(false)
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">{product?`編輯 — ${product.sku}`:'新增產品'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400"/></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4"><Field label="SKU" value={form.sku} onChange={v=>set('sku',v)} disabled={!!product} mono/><Field label="產品名稱" value={form.name} onChange={v=>set('name',v)}/></div>
          <div className="grid grid-cols-2 gap-4"><Field label="規格/尺寸" value={form.spec} onChange={v=>set('spec',v)}/><Field label="材質" value={form.material} onChange={v=>set('material',v)}/></div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="售價 NT$" type="number" value={form.price} onChange={v=>set('price',Number(v))} mono/>
            <Field label="成本 NT$" type="number" value={form.cost} onChange={v=>set('cost',Number(v))} mono/>
            <Field label="廠商" value={form.vendor} onChange={v=>set('vendor',v)}/>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-3 gap-4">
            <div><span className="text-slate-400 text-xs block">毛利</span><strong className="font-mono">NT$ {(form.price-form.cost).toLocaleString()}</strong></div>
            <div><span className="text-slate-400 text-xs block">毛利率</span><strong className={Number(margin)>=30?'text-emerald-600':'text-amber-600'}>{margin}%</strong></div>
            <div><span className="text-slate-400 text-xs block">廠商</span><strong>{form.vendor||'—'}</strong></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="交期" value={form.lead_time} onChange={v=>set('lead_time',v)}/>
            <Field label="方數 m³" value={form.volume} onChange={v=>set('volume',v)} mono/>
            <Field label="重量" value={form.weight} onChange={v=>set('weight',v)}/>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="組裝費" value={form.assembly_fee} onChange={v=>set('assembly_fee',v)} mono/>
            <Field label="物流費" value={form.logistics_fee} onChange={v=>set('logistics_fee',v)} mono/>
            <Field label="工時 hr" value={form.labor_hours} onChange={v=>set('labor_hours',v)} mono/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">適用空間</label>
            <div className="flex flex-wrap gap-2">
              {SPACE_TYPES.map(s=><button key={s} type="button" onClick={()=>toggleSpace(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${form.spaces.includes(s)?'bg-indigo-600 text-white border-indigo-600':'bg-white text-slate-600 border-slate-300 hover:border-indigo-300'}`}>{s}</button>)}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">取消</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
            {saving?'儲存中…':(product?'儲存修改':'新增產品')}
          </button>
        </div>
      </div>
    </div>
  )
}
