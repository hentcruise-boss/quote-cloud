import { useState } from 'react'
import { ChevronRight, AlertCircle, FileSpreadsheet, Trash2 } from 'lucide-react'

export default function QuoteTab({ products, scenes, quoteItems, onAddItems, onUpdateItem, onRemoveItem, totalSales, totalCost, totalProfit }) {
  const [batchText, setBatchText] = useState('')
  const [parsedSpaces, setParsedSpaces] = useState(null)
  const [assignments, setAssignments] = useState({})
  const productMap = Object.fromEntries(products.map(p=>[p.sku,p]))
  const sceneMap = Object.fromEntries(scenes.map(s=>[s.id,s]))

  const handleParse = () => {
    if(!batchText.trim())return
    const lines=batchText.trim().split('\n').filter(l=>l.trim())
    const spaces=lines.map((line,i)=>{
      const parts=line.trim().split(/[\t,，]+/).filter(Boolean)
      let floor='',code='',spaceType=''
      if(parts.length>=3){floor=parts[0];code=parts[1];spaceType=parts.slice(2).join(' ')}
      else if(parts.length===2){code=parts[0];spaceType=parts[1]}
      else{spaceType=parts[0]||''}
      return {id:`sp-${i}`,floor,code,spaceType,include:true}
    })
    setParsedSpaces(spaces)
    const types=[...new Set(spaces.map(s=>s.spaceType))]
    const auto={}
    types.forEach(t=>{const match=scenes.find(sc=>sc.space_type===t);auto[t]=match?match.id:''})
    setAssignments(auto)
  }

  const handleGenerate = async () => {
    const newItems=[]
    ;(parsedSpaces||[]).filter(sp=>sp.include).forEach(space=>{
      const sceneId=assignments[space.spaceType];if(!sceneId)return
      const scene=sceneMap[sceneId];if(!scene)return
      const spaceName=[space.code,space.spaceType].filter(Boolean).join(' ')
      scene.items.forEach((item,sortIdx)=>{
        const p=productMap[item.sku];if(!p)return
        newItems.push({id:crypto.randomUUID(),floor:space.floor,space:spaceName,sku:p.sku,name:p.name,spec:p.spec||'',material:p.material||'',price:p.price||0,cost:p.cost||0,vendor:p.vendor||'',lead_time:p.lead_time||'',volume:p.volume||'',weight:p.weight||'',assembly_fee:p.assembly_fee||'',logistics_fee:p.logistics_fee||'',labor_hours:p.labor_hours||'',qty:item.qty,remark:'',sort_order:quoteItems.length+newItems.length+sortIdx})
      })
    })
    await onAddItems(newItems)
    setBatchText('');setParsedSpaces(null);setAssignments({})
  }

  const uniqueTypes=parsedSpaces?[...new Set(parsedSpaces.map(s=>s.spaceType))]:[]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 space-y-4">
        <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${parsedSpaces?'border-slate-200':'border-indigo-300 ring-2 ring-indigo-100'}`}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
            <h3 className="font-semibold text-slate-800 text-sm">批次貼入空間清單</h3>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-xs text-slate-400">每行一個空間：<code className="bg-slate-100 px-1 rounded">樓層 編號 類型</code></p>
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 font-mono leading-relaxed border border-slate-100">17F　201　主管室<br/>17F　202　主管室<br/>18F　301　會議室</div>
            <textarea value={batchText} onChange={e=>setBatchText(e.target.value)} placeholder="在此貼上空間清單…" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono h-36 resize-none focus:ring-2 focus:ring-indigo-400 outline-none"/>
            <button onClick={handleParse} disabled={!batchText.trim()} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2"><ChevronRight className="w-4 h-4"/>解析空間清單</button>
          </div>
        </div>

        {parsedSpaces&&(
          <div className="bg-white rounded-xl border border-amber-300 ring-2 ring-amber-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="font-semibold text-slate-800 text-sm">指定場景模板</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="max-h-32 overflow-y-auto space-y-1">
                {parsedSpaces.map(sp=><label key={sp.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5">
                  <input type="checkbox" checked={sp.include} onChange={e=>setParsedSpaces(prev=>prev.map(s=>s.id===sp.id?{...s,include:e.target.checked}:s))} className="accent-indigo-600"/>
                  <span className={sp.include?'text-slate-700':'text-slate-400 line-through'}><span className="font-mono text-slate-400">{sp.floor}</span> {sp.code} <strong>{sp.spaceType}</strong></span>
                </label>)}
              </div>
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase">每種空間套用模板</p>
                {uniqueTypes.map(type=><div key={type} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-700 w-20 flex-shrink-0">{type}</span>
                  <select value={assignments[type]||''} onChange={e=>setAssignments(prev=>({...prev,[type]:e.target.value}))} className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-amber-400 outline-none bg-white">
                    <option value="">— 不套用 —</option>
                    {scenes.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {!assignments[type]&&<AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0"/>}
                </div>)}
              </div>
              <button onClick={handleGenerate} className="w-full py-2.5 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 flex items-center justify-center gap-2">確認加入報價清單 →</button>
              <button onClick={()=>{setParsedSpaces(null);setAssignments({})}} className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-600">取消</button>
            </div>
          </div>
        )}

        {quoteItems.length>0&&(
          <div className="bg-slate-800 text-white rounded-xl p-5 shadow-md">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">利潤試算（內部）</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-slate-300">總報價</span><span className="font-mono">NT$ {totalSales.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">預估成本</span><span className="font-mono text-slate-400">− NT$ {totalCost.toLocaleString()}</span></div>
              <div className="h-px bg-slate-600"/>
              <div className="flex justify-between"><span className="font-medium">預估毛利</span><span className="font-bold text-xl font-mono text-emerald-400">NT$ {totalProfit.toLocaleString()}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">毛利率</span><span className={`font-bold ${totalSales>0&&totalProfit/totalSales>0.3?'text-emerald-400':'text-amber-400'}`}>{totalSales>0?((totalProfit/totalSales)*100).toFixed(1):0}%</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-slate-400"/>報價清單<span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold ml-1">{quoteItems.length} 項</span></h3>
            <p className="text-xs text-slate-400">所有欄位可直接點擊編輯</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="px-3 py-3 text-left w-28">樓層/空間</th><th className="px-3 py-3 text-left">產品</th>
                <th className="px-3 py-3 text-left w-32">規格</th><th className="px-3 py-3 text-right w-24">單價</th>
                <th className="px-3 py-3 text-center w-24">數量</th><th className="px-3 py-3 text-right w-24">小計</th>
                <th className="px-3 py-3 text-left w-32">備註</th><th className="px-3 py-3 w-8"></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {quoteItems.length===0&&<tr><td colSpan="8" className="py-16 text-center text-slate-300"><FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-30"/><p className="text-sm">報價清單為空</p><p className="text-xs mt-1">從左側批次貼入空間清單開始</p></td></tr>}
                {quoteItems.map(item=>(
                  <tr key={item.id} className="hover:bg-slate-50/80 group transition">
                    <td className="px-3 py-2"><div className="text-xs font-mono text-slate-400">{item.floor}</div><div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">{item.space}</div></td>
                    <td className="px-3 py-2"><div className="font-semibold text-slate-800 text-xs">{item.name} <span className="text-slate-400 font-mono font-normal">{item.sku}</span></div><div className="text-[10px] text-slate-400 mt-0.5">{item.material}</div></td>
                    <td className="px-3 py-2"><input value={item.spec} onChange={e=>onUpdateItem(item.id,'spec',e.target.value)} className="w-full text-xs text-slate-600 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 rounded px-2 py-1 outline-none"/></td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700 text-xs">{Number(item.price).toLocaleString()}</td>
                    <td className="px-3 py-2"><div className="flex items-center justify-center border border-slate-200 rounded-lg overflow-hidden bg-white w-20 mx-auto">
                      <button onClick={()=>onUpdateItem(item.id,'qty',Math.max(0,item.qty-1))} className="px-2 py-1 text-slate-400 hover:bg-slate-50 border-r border-slate-200 text-xs">−</button>
                      <span className="px-2 text-xs font-bold font-mono text-indigo-700 w-8 text-center">{item.qty}</span>
                      <button onClick={()=>onUpdateItem(item.id,'qty',item.qty+1)} className="px-2 py-1 text-slate-400 hover:bg-slate-50 border-l border-slate-200 text-xs">+</button>
                    </div></td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-700 text-xs">{(item.price*item.qty).toLocaleString()}</td>
                    <td className="px-3 py-2"><input value={item.remark} onChange={e=>onUpdateItem(item.id,'remark',e.target.value)} className="w-full text-xs text-slate-500 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-300 rounded px-2 py-1 outline-none" placeholder="備註…"/></td>
                    <td className="px-3 py-2"><button onClick={()=>onRemoveItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5"/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {quoteItems.length>0&&<div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end"><div className="text-sm font-bold text-slate-700 flex items-center gap-2">總計：<span className="font-mono text-indigo-700 text-base">NT$ {totalSales.toLocaleString()}</span></div></div>}
        </div>
      </div>
    </div>
  )
}
