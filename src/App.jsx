import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Download, FileSpreadsheet, Building2, Edit2, X, Package, LayoutTemplate, ChevronRight, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { supabase } from './supabase'

// ─── 常數 ─────────────────────────────────────────────────────────
const SPACE_TYPES = ['總裁室','高管室','主管室','職員區','會議室','儲物室','培訓室','公共區','櫃台','茶水間']
const EMPTY_PRODUCT = { sku:'',name:'',spaces:[],spec:'',material:'',price:0,cost:0,vendor:'',lead_time:'',volume:'',weight:'',assembly_fee:'',logistics_fee:'',labor_hours:'' }

// ─── 同步狀態指示器 ───────────────────────────────────────────────
function SyncBadge({ status }) {
  if (status === 'syncing') return (
    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
      <RefreshCw className="w-3 h-3 animate-spin"/> 同步中
    </span>
  )
  if (status === 'error') return (
    <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">
      <WifiOff className="w-3 h-3"/> 連線失敗
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
      <Wifi className="w-3 h-3"/> 已同步
    </span>
  )
}

// ─── Field 元件 ───────────────────────────────────────────────────
function Field({ label, value, onChange, type='text', disabled=false, mono=false }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{label}</label>
      <input type={type} value={value??''} onChange={e=>onChange(e.target.value)} disabled={disabled}
        className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition disabled:bg-slate-100 disabled:text-slate-400 bg-white ${mono?'font-mono':''}`} />
    </div>
  )
}

// ─── 產品 Modal ───────────────────────────────────────────────────
function ProductModal({ product, onSave, onClose }) {
  const [form, setForm] = useState(product ? {...product} : {...EMPTY_PRODUCT})
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const toggleSpace = s => set('spaces', form.spaces.includes(s) ? form.spaces.filter(x=>x!==s) : [...form.spaces, s])
  const margin = form.price > 0 ? ((form.price-form.cost)/form.price*100).toFixed(1) : 0

  const handleSave = async () => {
    if (!form.sku || !form.name) { alert('SKU 與產品名稱為必填'); return }
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">{product ? `編輯 — ${product.sku}` : '新增產品'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400"/></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="產品編號 SKU" value={form.sku} onChange={v=>set('sku',v)} disabled={!!product} mono/>
            <Field label="產品名稱" value={form.name} onChange={v=>set('name',v)}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="規格/尺寸" value={form.spec} onChange={v=>set('spec',v)}/>
            <Field label="材質" value={form.material} onChange={v=>set('material',v)}/>
          </div>
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
              {SPACE_TYPES.map(s=>(
                <button key={s} type="button" onClick={()=>toggleSpace(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${form.spaces.includes(s)?'bg-indigo-600 text-white border-indigo-600':'bg-white text-slate-600 border-slate-300 hover:border-indigo-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">取消</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60">
            {saving ? '儲存中…' : (product ? '儲存修改' : '新增產品')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 產品資料庫 Tab ───────────────────────────────────────────────
function ProductsTab({ products, onSave, onDelete }) {
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const filtered = products.filter(p=>!search||p.sku.toLowerCase().includes(search.toLowerCase())||p.name.includes(search)||p.vendor.includes(search))

  return (
    <div className="space-y-4">
      {(modal==='add'||(modal&&modal.sku)) && (
        <ProductModal product={modal==='add'?null:modal} onSave={async p=>{await onSave(p);setModal(null)}} onClose={()=>setModal(null)}/>
      )}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜尋 SKU / 名稱 / 廠商…"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 outline-none focus:ring-2 focus:ring-indigo-400 bg-white"/>
          <span className="text-sm text-slate-400">{filtered.length} 筆</span>
        </div>
        <button onClick={()=>setModal('add')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm">
          <Plus className="w-4 h-4"/> 新增產品
        </button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3 text-left font-semibold w-24">SKU</th>
              <th className="px-4 py-3 text-left font-semibold">產品名稱</th>
              <th className="px-4 py-3 text-left font-semibold w-32">規格</th>
              <th className="px-4 py-3 text-left font-semibold w-32">材質</th>
              <th className="px-4 py-3 text-right font-semibold w-28">售價</th>
              <th className="px-4 py-3 text-right font-semibold w-20">毛利率</th>
              <th className="px-4 py-3 text-left font-semibold w-24">廠商</th>
              <th className="px-4 py-3 text-left font-semibold">適用空間</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(p=>{
              const margin=p.price>0?((p.price-p.cost)/p.price*100).toFixed(0):0
              return (
                <tr key={p.sku} className="hover:bg-slate-50 transition group">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{p.sku}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.spec}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.material}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{Number(p.price).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${Number(margin)>=30?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{margin}%</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.vendor}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{(p.spaces||[]).map(s=><span key={s} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{s}</span>)}</div></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={()=>setModal(p)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5"/></button>
                      <button onClick={()=>onDelete(p.sku)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length===0&&<div className="py-12 text-center text-slate-400"><Package className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-sm">找不到產品</p></div>}
      </div>
    </div>
  )
}

// ─── 場景模板 Tab ─────────────────────────────────────────────────
function ScenesTab({ scenes, products, onUpdate, onAdd, onDelete }) {
  const [editing, setEditing] = useState(null)
  const productMap = Object.fromEntries(products.map(p=>[p.sku,p]))

  const addScene = async () => {
    const newScene = { id:`SC_${Date.now()}`, name:'新場景', space_type:'職員區', items:[] }
    await onAdd(newScene)
    setEditing(newScene.id)
  }

  const updateField = async (scene, field, val) => {
    await onUpdate({...scene, [field]:val})
  }

  const addItem = async (scene) => {
    const sku = prompt('輸入產品 SKU:')
    if (!sku) return
    if (!productMap[sku]) { alert(`找不到 SKU: ${sku}`); return }
    await onUpdate({...scene, items:[...scene.items,{sku,qty:1}]})
  }

  const updateItemQty = async (scene, idx, qty) => {
    const items = scene.items.map((it,i)=>i===idx?{...it,qty:Math.max(0,qty)}:it)
    await onUpdate({...scene, items})
  }

  const removeItem = async (scene, idx) => {
    await onUpdate({...scene, items:scene.items.filter((_,i)=>i!==idx)})
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={addScene} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm">
          <Plus className="w-4 h-4"/> 新增場景模板
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenes.map(scene=>(
          <div key={scene.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              {editing===scene.id ? (
                <div className="flex gap-2 flex-1 mr-3">
                  <input value={scene.name} onChange={e=>updateField(scene,'name',e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1 text-sm flex-1 focus:ring-2 focus:ring-indigo-400 outline-none"/>
                  <select value={scene.space_type} onChange={e=>updateField(scene,'space_type',e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-400 outline-none">
                    {SPACE_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              ) : (
                <div className="flex-1">
                  <div className="font-semibold text-slate-800 text-sm">{scene.name}</div>
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full mt-1 inline-block">{scene.space_type}</span>
                </div>
              )}
              <div className="flex gap-1">
                <button onClick={()=>setEditing(editing===scene.id?null:scene.id)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5"/></button>
                <button onClick={()=>onDelete(scene.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {scene.items.map((item,idx)=>{
                const p=productMap[item.sku]
                return (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium text-slate-700">{p?p.name:<span className="text-red-500">找不到 {item.sku}</span>}</span>
                      <span className="text-xs text-slate-400 ml-2 font-mono">{item.sku}</span>
                    </div>
                    {editing===scene.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={()=>updateItemQty(scene,idx,item.qty-1)} className="w-6 h-6 border rounded text-xs text-slate-500 hover:bg-white">-</button>
                        <span className="w-8 text-center font-mono text-sm font-bold">{item.qty}</span>
                        <button onClick={()=>updateItemQty(scene,idx,item.qty+1)} className="w-6 h-6 border rounded text-xs text-slate-500 hover:bg-white">+</button>
                        <button onClick={()=>removeItem(scene,idx)} className="ml-1 text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5"/></button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold font-mono bg-white border rounded px-2 py-0.5 text-slate-600">x{item.qty}</span>
                    )}
                  </div>
                )
              })}
              {editing===scene.id && (
                <button onClick={()=>addItem(scene)} className="w-full mt-2 py-2 border-2 border-dashed border-indigo-200 rounded-lg text-sm text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50 flex items-center justify-center gap-1">
                  <Plus className="w-3.5 h-3.5"/> 加入產品
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 報價 Tab ─────────────────────────────────────────────────────
function QuoteTab({ products, scenes, quoteItems, onAddItems, onUpdateItem, onRemoveItem, totalSales, totalCost, totalProfit }) {
  const [batchText, setBatchText] = useState('')
  const [parsedSpaces, setParsedSpaces] = useState(null)
  const [assignments, setAssignments] = useState({})

  const productMap = Object.fromEntries(products.map(p=>[p.sku,p]))
  const sceneMap = Object.fromEntries(scenes.map(s=>[s.id,s]))

  const handleParse = () => {
    if (!batchText.trim()) return
    const lines = batchText.trim().split('\n').filter(l=>l.trim())
    const spaces = lines.map((line,i)=>{
      const parts = line.trim().split(/[\t,，]+/).filter(Boolean)
      let floor='',code='',spaceType=''
      if(parts.length>=3){floor=parts[0];code=parts[1];spaceType=parts.slice(2).join(' ')}
      else if(parts.length===2){code=parts[0];spaceType=parts[1]}
      else{spaceType=parts[0]||''}
      return {id:`sp-${i}`,floor,code,spaceType,include:true}
    })
    setParsedSpaces(spaces)
    const types=[...new Set(spaces.map(s=>s.spaceType))]
    const auto={}
    types.forEach(t=>{
      const match=scenes.find(sc=>sc.space_type===t)
      auto[t]=match?match.id:''
    })
    setAssignments(auto)
  }

  const handleGenerate = async () => {
    const newItems = []
    ;(parsedSpaces||[]).filter(sp=>sp.include).forEach(space=>{
      const sceneId=assignments[space.spaceType]
      if(!sceneId)return
      const scene=sceneMap[sceneId]
      if(!scene)return
      const spaceName=[space.code,space.spaceType].filter(Boolean).join(' ')
      scene.items.forEach((item,sortIdx)=>{
        const p=productMap[item.sku]
        if(!p)return
        newItems.push({
          id:crypto.randomUUID(),
          project_id:'default',
          floor:space.floor, space:spaceName,
          sku:p.sku, name:p.name, spec:p.spec||'', material:p.material||'',
          price:p.price||0, cost:p.cost||0, vendor:p.vendor||'',
          lead_time:p.lead_time||'', volume:p.volume||'', weight:p.weight||'',
          assembly_fee:p.assembly_fee||'', logistics_fee:p.logistics_fee||'', labor_hours:p.labor_hours||'',
          qty:item.qty, remark:'', sort_order: quoteItems.length + newItems.length + sortIdx
        })
      })
    })
    await onAddItems(newItems)
    setBatchText('')
    setParsedSpaces(null)
    setAssignments({})
  }

  const uniqueTypes = parsedSpaces ? [...new Set(parsedSpaces.map(s=>s.spaceType))] : []

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-4 space-y-4">
        <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${parsedSpaces?'border-slate-200':'border-indigo-300 ring-2 ring-indigo-100'}`}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
            <h3 className="font-semibold text-slate-800 text-sm">批次貼入空間清單</h3>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-xs text-slate-400">每行一個空間：<code className="bg-slate-100 px-1 rounded">樓層 編號 類型</code></p>
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 font-mono leading-relaxed border border-slate-100">
              17F　201　主管室<br/>17F　202　主管室<br/>18F　301　會議室
            </div>
            <textarea value={batchText} onChange={e=>setBatchText(e.target.value)} placeholder="在此貼上空間清單…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono h-36 resize-none focus:ring-2 focus:ring-indigo-400 outline-none"/>
            <button onClick={handleParse} disabled={!batchText.trim()}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2">
              <ChevronRight className="w-4 h-4"/> 解析空間清單
            </button>
          </div>
        </div>

        {parsedSpaces && (
          <div className="bg-white rounded-xl border border-amber-300 ring-2 ring-amber-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="font-semibold text-slate-800 text-sm">指定場景模板</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="max-h-32 overflow-y-auto space-y-1">
                {parsedSpaces.map(sp=>(
                  <label key={sp.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5">
                    <input type="checkbox" checked={sp.include} onChange={e=>setParsedSpaces(prev=>prev.map(s=>s.id===sp.id?{...s,include:e.target.checked}:s))} className="accent-indigo-600"/>
                    <span className={sp.include?'text-slate-700':'text-slate-400 line-through'}>
                      <span className="font-mono text-slate-400">{sp.floor}</span> {sp.code} <strong>{sp.spaceType}</strong>
                    </span>
                  </label>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase">每種空間套用模板</p>
                {uniqueTypes.map(type=>(
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700 w-20 flex-shrink-0">{type}</span>
                    <select value={assignments[type]||''} onChange={e=>setAssignments(prev=>({...prev,[type]:e.target.value}))}
                      className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-amber-400 outline-none bg-white">
                      <option value="">— 不套用 —</option>
                      {scenes.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {!assignments[type]&&<AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0"/>}
                  </div>
                ))}
              </div>
              <button onClick={handleGenerate} className="w-full py-2.5 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 flex items-center justify-center gap-2">
                確認加入報價清單 →
              </button>
              <button onClick={()=>{setParsedSpaces(null);setAssignments({})}} className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-600">取消</button>
            </div>
          </div>
        )}

        {quoteItems.length > 0 && (
          <div className="bg-slate-800 text-white rounded-xl p-5 shadow-md">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">利潤試算（內部）</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-300">總報價</span><span className="font-mono">NT$ {totalSales.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">預估成本</span><span className="font-mono text-slate-400">− NT$ {totalCost.toLocaleString()}</span></div>
              <div className="h-px bg-slate-600"/>
              <div className="flex justify-between"><span className="font-medium">預估毛利</span><span className="font-bold text-xl font-mono text-emerald-400">NT$ {totalProfit.toLocaleString()}</span></div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">毛利率</span>
                <span className={`font-bold ${totalSales>0&&totalProfit/totalSales>0.3?'text-emerald-400':'text-amber-400'}`}>
                  {totalSales>0?((totalProfit/totalSales)*100).toFixed(1):0}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="col-span-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-slate-400"/>
              報價清單
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold ml-1">{quoteItems.length} 項</span>
            </h3>
            <p className="text-xs text-slate-400">所有欄位可直接點擊編輯</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                  <th className="px-3 py-3 text-left font-semibold w-28">樓層/空間</th>
                  <th className="px-3 py-3 text-left font-semibold">產品</th>
                  <th className="px-3 py-3 text-left font-semibold w-32">規格</th>
                  <th className="px-3 py-3 text-right font-semibold w-24">單價</th>
                  <th className="px-3 py-3 text-center font-semibold w-24">數量</th>
                  <th className="px-3 py-3 text-right font-semibold w-24">小計</th>
                  <th className="px-3 py-3 text-left font-semibold w-32">備註</th>
                  <th className="px-3 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {quoteItems.length===0&&(
                  <tr><td colSpan="8" className="py-16 text-center text-slate-300">
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                    <p className="text-sm">報價清單為空</p>
                    <p className="text-xs mt-1">從左側批次貼入空間清單開始</p>
                  </td></tr>
                )}
                {quoteItems.map(item=>(
                  <tr key={item.id} className="hover:bg-slate-50/80 group transition">
                    <td className="px-3 py-2">
                      <div className="text-xs font-mono text-slate-400">{item.floor}</div>
                      <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">{item.space}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-800 text-xs">{item.name} <span className="text-slate-400 font-mono font-normal">{item.sku}</span></div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.material}</div>
                    </td>
                    <td className="px-3 py-2">
                      <input value={item.spec} onChange={e=>onUpdateItem(item.id,'spec',e.target.value)}
                        className="w-full text-xs text-slate-600 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 rounded px-2 py-1 outline-none"/>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700 text-xs">{Number(item.price).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center border border-slate-200 rounded-lg overflow-hidden bg-white w-20 mx-auto">
                        <button onClick={()=>onUpdateItem(item.id,'qty',Math.max(0,item.qty-1))} className="px-2 py-1 text-slate-400 hover:bg-slate-50 border-r border-slate-200 text-xs">−</button>
                        <span className="px-2 text-xs font-bold font-mono text-indigo-700 w-8 text-center">{item.qty}</span>
                        <button onClick={()=>onUpdateItem(item.id,'qty',item.qty+1)} className="px-2 py-1 text-slate-400 hover:bg-slate-50 border-l border-slate-200 text-xs">+</button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-700 text-xs">{(item.price*item.qty).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <input value={item.remark} onChange={e=>onUpdateItem(item.id,'remark',e.target.value)}
                        className="w-full text-xs text-slate-500 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 rounded px-2 py-1 outline-none" placeholder="備註…"/>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={()=>onRemoveItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {quoteItems.length>0&&(
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                總計：<span className="font-mono text-indigo-700 text-base">NT$ {totalSales.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 主程式 ───────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('quote')
  const [products, setProducts] = useState([])
  const [scenes, setScenes] = useState([])
  const [quoteItems, setQuoteItems] = useState([])
  const [projectInfo, setProjectInfo] = useState({ client:'', name:'' })
  const [syncStatus, setSyncStatus] = useState('synced')
  const [loading, setLoading] = useState(true)

  // ── 初始載入 ────────────────────────────────────────────────────
  useEffect(() => {
    loadAll()

    // 即時訂閱：products
    const prodSub = supabase.channel('products-changes')
      .on('postgres_changes', { event:'*', schema:'public', table:'products' }, () => loadProducts())
      .subscribe()

    // 即時訂閱：scenes
    const sceneSub = supabase.channel('scenes-changes')
      .on('postgres_changes', { event:'*', schema:'public', table:'scenes' }, () => loadScenes())
      .subscribe()

    // 即時訂閱：quote_items
    const quoteSub = supabase.channel('quote-changes')
      .on('postgres_changes', { event:'*', schema:'public', table:'quote_items' }, () => loadQuoteItems())
      .subscribe()

    return () => {
      supabase.removeChannel(prodSub)
      supabase.removeChannel(sceneSub)
      supabase.removeChannel(quoteSub)
    }
  }, [])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadProducts(), loadScenes(), loadQuoteItems(), loadProject()])
    setLoading(false)
  }

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('sku')
    if (data) setProducts(data)
  }

  const loadScenes = async () => {
    const { data } = await supabase.from('scenes').select('*')
    if (data) setScenes(data)
  }

  const loadQuoteItems = async () => {
    const { data } = await supabase.from('quote_items').select('*').eq('project_id','default').order('sort_order')
    if (data) setQuoteItems(data)
  }

  const loadProject = async () => {
    const { data } = await supabase.from('projects').select('*').eq('id','default').single()
    if (data) setProjectInfo(data)
  }

  const withSync = async (fn) => {
    setSyncStatus('syncing')
    try { await fn(); setSyncStatus('synced') }
    catch (e) { console.error(e); setSyncStatus('error') }
  }

  // ── 產品 CRUD ──────────────────────────────────────────────────
  const handleSaveProduct = async (p) => {
    await withSync(async () => {
      await supabase.from('products').upsert(p, { onConflict:'sku' })
      await loadProducts()
    })
  }

  const handleDeleteProduct = async (sku) => {
    if (!window.confirm(`確定刪除 ${sku}？`)) return
    await withSync(async () => {
      await supabase.from('products').delete().eq('sku', sku)
      await loadProducts()
    })
  }

  // ── 場景 CRUD ──────────────────────────────────────────────────
  const handleAddScene = async (scene) => {
    await withSync(async () => {
      await supabase.from('scenes').insert(scene)
      await loadScenes()
    })
  }

  const handleUpdateScene = async (scene) => {
    await withSync(async () => {
      await supabase.from('scenes').upsert(scene, { onConflict:'id' })
      await loadScenes()
    })
  }

  const handleDeleteScene = async (id) => {
    if (!window.confirm('確定刪除此場景模板？')) return
    await withSync(async () => {
      await supabase.from('scenes').delete().eq('id', id)
      await loadScenes()
    })
  }

  // ── 報價清單 CRUD ──────────────────────────────────────────────
  const handleAddItems = async (items) => {
    await withSync(async () => {
      await supabase.from('quote_items').insert(items)
      await loadQuoteItems()
    })
  }

  const handleUpdateItem = async (id, field, value) => {
    await withSync(async () => {
      await supabase.from('quote_items').update({ [field]: value }).eq('id', id)
      setQuoteItems(prev => prev.map(i => i.id===id ? {...i,[field]:value} : i))
    })
  }

  const handleRemoveItem = async (id) => {
    await withSync(async () => {
      await supabase.from('quote_items').delete().eq('id', id)
      setQuoteItems(prev => prev.filter(i => i.id!==id))
    })
  }

  // ── 專案資訊 ──────────────────────────────────────────────────
  const updateProjectInfo = async (field, val) => {
    const next = {...projectInfo, [field]:val}
    setProjectInfo(next)
    await supabase.from('projects').upsert({id:'default',...next}, {onConflict:'id'})
  }

  const totalSales = quoteItems.reduce((s,i)=>s+Number(i.price)*Number(i.qty),0)
  const totalCost  = quoteItems.reduce((s,i)=>s+Number(i.cost)*Number(i.qty),0)
  const totalProfit = totalSales - totalCost

  // ── 匯出 CSV ──────────────────────────────────────────────────
  const exportCSV = (type) => {
    const esc = v => '"'+String(v??'').replace(/"/g,'""')+'"'
    let csv = '\uFEFF'
    csv += `客戶,${esc(projectInfo.client)},專案,${esc(projectInfo.name)}\n\n`
    if (type==='client') {
      csv += ['樓層','空間','產品編號','產品名稱','規格/尺寸','材質','單價','數量','小計','備註'].join(',') + '\n'
      quoteItems.filter(i=>i.qty>0).forEach(i=>{
        csv += [esc(i.floor),esc(i.space),esc(i.sku),esc(i.name),esc(i.spec),esc(i.material),i.price,i.qty,i.price*i.qty,esc(i.remark)].join(',') + '\n'
      })
      csv += `\n,,,,,,,總計 NT$,${totalSales},\n`
    } else {
      csv += ['樓層','空間','產品編號','產品名稱','規格/尺寸','材質','單價','數量','銷售小計','備註','廠商','成本','成本小計','毛利','交期','方數','重量','組裝費','物流費','工時'].join(',') + '\n'
      quoteItems.filter(i=>i.qty>0).forEach(i=>{
        const ss=i.price*i.qty, cs=i.cost*i.qty
        csv += [esc(i.floor),esc(i.space),esc(i.sku),esc(i.name),esc(i.spec),esc(i.material),i.price,i.qty,ss,esc(i.remark),esc(i.vendor),i.cost,cs,ss-cs,esc(i.lead_time),esc(i.volume),esc(i.weight),esc(i.assembly_fee),esc(i.logistics_fee),esc(i.labor_hours)].join(',') + '\n'
      })
      csv += `\n,,,,,,,總計 NT$,${totalSales},,,${totalCost},${totalProfit},,,,,\n`
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}))
    a.download = `${projectInfo.name||'報價單'}_${type==='client'?'客戶版':'內部版'}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const TABS = [
    {id:'quote',label:'報價工具',icon:<FileSpreadsheet className="w-4 h-4"/>},
    {id:'products',label:`產品資料庫 (${products.length})`,icon:<Package className="w-4 h-4"/>},
    {id:'scenes',label:'場景模板',icon:<LayoutTemplate className="w-4 h-4"/>},
  ]

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3"/>
        <p className="text-slate-500 text-sm">連接資料庫中…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white"/>
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm leading-none">祥鼎辦公家具</div>
              <div className="text-[10px] text-slate-400 mt-0.5">報價管理系統 v3.0 雲端版</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <SyncBadge status={syncStatus}/>
            <input placeholder="客戶名稱" value={projectInfo.client} onChange={e=>updateProjectInfo('client',e.target.value)}
              className="border-b border-slate-200 focus:border-indigo-500 outline-none px-1 py-1 text-sm w-28 bg-transparent"/>
            <input placeholder="專案名稱" value={projectInfo.name} onChange={e=>updateProjectInfo('name',e.target.value)}
              className="border-b border-slate-200 focus:border-indigo-500 outline-none px-1 py-1 text-sm w-44 bg-transparent"/>
            <div className="flex gap-2 ml-2">
              <button onClick={()=>exportCSV('client')} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm">
                <FileSpreadsheet className="w-3.5 h-3.5"/> 客戶版
              </button>
              <button onClick={()=>exportCSV('internal')} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm">
                <Download className="w-3.5 h-3.5"/> 內部版
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 flex gap-1 border-t border-slate-100">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${tab===t.id?'border-indigo-600 text-indigo-600':'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </header>
      <main className="max-w-screen-xl mx-auto px-6 py-6">
        {tab==='quote'&&<QuoteTab products={products} scenes={scenes} quoteItems={quoteItems} onAddItems={handleAddItems} onUpdateItem={handleUpdateItem} onRemoveItem={handleRemoveItem} totalSales={totalSales} totalCost={totalCost} totalProfit={totalProfit}/>}
        {tab==='products'&&<ProductsTab products={products} onSave={handleSaveProduct} onDelete={handleDeleteProduct}/>}
        {tab==='scenes'&&<ScenesTab scenes={scenes} products={products} onUpdate={handleUpdateScene} onAdd={handleAddScene} onDelete={handleDeleteScene}/>}
      </main>
    </div>
  )
}
