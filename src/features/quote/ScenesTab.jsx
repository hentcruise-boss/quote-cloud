import { useState } from 'react'
import { Plus, Trash2, Edit2, X } from 'lucide-react'
import { SPACE_TYPES } from '../../lib/constants'

export default function ScenesTab({ scenes, products, onUpdate, onAdd, onDelete }) {
  const [editing, setEditing] = useState(null)
  const productMap = Object.fromEntries(products.map(p=>[p.sku,p]))
  const addScene = async () => { const n={id:`SC_${Date.now()}`,name:'新場景',space_type:'職員區',items:[]}; await onAdd(n); setEditing(n.id) }
  const updateField = async (scene,field,val) => await onUpdate({...scene,[field]:val})
  const addItem = async (scene) => { const sku=prompt('輸入產品 SKU:'); if(!sku)return; if(!productMap[sku]){alert(`找不到 SKU: ${sku}`);return}; await onUpdate({...scene,items:[...scene.items,{sku,qty:1}]}) }
  const updateItemQty = async (scene,idx,qty) => await onUpdate({...scene,items:scene.items.map((it,i)=>i===idx?{...it,qty:Math.max(0,qty)}:it)})
  const removeItem = async (scene,idx) => await onUpdate({...scene,items:scene.items.filter((_,i)=>i!==idx)})
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={addScene} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4"/>新增場景模板</button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenes.map(scene=>(
          <div key={scene.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              {editing===scene.id?<div className="flex gap-2 flex-1 mr-3">
                <input value={scene.name} onChange={e=>updateField(scene,'name',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-sm flex-1 focus:ring-2 focus:ring-indigo-400 outline-none"/>
                <select value={scene.space_type} onChange={e=>updateField(scene,'space_type',e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none">
                  {SPACE_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>:<div className="flex-1"><div className="font-semibold text-slate-800 text-sm">{scene.name}</div><span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full mt-1 inline-block">{scene.space_type}</span></div>}
              <div className="flex gap-1">
                <button onClick={()=>setEditing(editing===scene.id?null:scene.id)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5"/></button>
                <button onClick={()=>onDelete(scene.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {scene.items.map((item,idx)=>{
                const p=productMap[item.sku]
                return <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                  <div><span className="font-medium text-slate-700">{p?p.name:<span className="text-red-500">找不到 {item.sku}</span>}</span><span className="text-xs text-slate-400 ml-2 font-mono">{item.sku}</span></div>
                  {editing===scene.id?<div className="flex items-center gap-1">
                    <button onClick={()=>updateItemQty(scene,idx,item.qty-1)} className="w-6 h-6 border rounded text-xs text-slate-500 hover:bg-white">-</button>
                    <span className="w-8 text-center font-mono text-sm font-bold">{item.qty}</span>
                    <button onClick={()=>updateItemQty(scene,idx,item.qty+1)} className="w-6 h-6 border rounded text-xs text-slate-500 hover:bg-white">+</button>
                    <button onClick={()=>removeItem(scene,idx)} className="ml-1 text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5"/></button>
                  </div>:<span className="text-xs font-bold font-mono bg-white border rounded px-2 py-0.5 text-slate-600">x{item.qty}</span>}
                </div>
              })}
              {editing===scene.id&&<button onClick={()=>addItem(scene)} className="w-full mt-2 py-2 border-2 border-dashed border-indigo-200 rounded-lg text-sm text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50 flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5"/>加入產品</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
