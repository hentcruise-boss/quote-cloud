import { useState } from 'react'
import { Trash2, History, ChevronDown, Clock } from 'lucide-react'

export default function HistoryTab({ history, onDelete }) {
  const [expanded, setExpanded] = useState(null)
  return (
    <div className="space-y-3">
      {history.length===0&&<div className="py-20 text-center text-slate-300"><History className="w-10 h-10 mx-auto mb-2 opacity-30"/><p className="text-sm">尚無匯出記錄</p><p className="text-xs mt-1">每次按「客戶版」或「內部版」匯出時自動存入</p></div>}
      {history.map(h=>{
        const date=new Date(h.exported_at).toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})
        const items=Array.isArray(h.items)?h.items:[]
        return (
          <div key={h.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={()=>setExpanded(expanded===h.id?null:h.id)}>
              <div className="flex items-center gap-4">
                <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${h.type==='client'?'bg-emerald-50 text-emerald-700':'bg-indigo-50 text-indigo-700'}`}>{h.type==='client'?'客戶版':'內部版'}</div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{h.client||'（未填客戶）'} — {h.project_name||'未命名專案'}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3"/>{date} · {items.length} 項</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-slate-700">NT$ {Number(h.total_sales).toLocaleString()}</div>
                  {h.type==='internal'&&<div className="text-xs text-emerald-600 font-mono">毛利 NT$ {Number(h.total_sales-h.total_cost).toLocaleString()}</div>}
                </div>
                <button onClick={e=>{e.stopPropagation();onDelete(h.id)}} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5"/></button>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded===h.id?'rotate-180':''}`}/>
              </div>
            </div>
            {expanded===h.id&&(
              <div className="border-t border-slate-100 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50 text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-2 text-left">樓層/空間</th><th className="px-4 py-2 text-left">產品</th>
                    <th className="px-4 py-2 text-left">規格</th><th className="px-4 py-2 text-right">單價</th>
                    <th className="px-4 py-2 text-center">數量</th><th className="px-4 py-2 text-right">小計</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item,i)=><tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2"><div className="text-slate-400 font-mono">{item.floor}</div><div className="font-bold text-indigo-700">{item.space}</div></td>
                      <td className="px-4 py-2 font-medium text-slate-700">{item.name} <span className="text-slate-400 font-mono">{item.sku}</span></td>
                      <td className="px-4 py-2 text-slate-500">{item.spec}</td>
                      <td className="px-4 py-2 text-right font-mono">{Number(item.price).toLocaleString()}</td>
                      <td className="px-4 py-2 text-center font-mono font-bold">{item.qty}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold">{(item.price*item.qty).toLocaleString()}</td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
