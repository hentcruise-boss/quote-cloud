import { initials, fromNow } from '../lib/format'
import { STATUS_MAP } from '../lib/constants'

export default function CaseCard({ c, customerName, ownerName, onClick, onDragStart }) {
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md hover:border-indigo-200 cursor-pointer transition">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono text-slate-400">{c.code || '—'}</span>
        <span className="text-[10px] text-slate-400">{fromNow(c.updated_at)}</span>
      </div>
      <div className="font-semibold text-slate-800 text-sm leading-snug">{c.title}</div>
      <div className="text-xs text-slate-500 mt-1 truncate">{customerName || '未指定客戶'}</div>
      <div className="flex items-center justify-between mt-2 h-6">
        {c.status !== 'active'
          ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{STATUS_MAP[c.status]?.label || c.status}</span>
          : <span/>}
        {ownerName && <span title={ownerName} className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">{initials(ownerName)}</span>}
      </div>
    </div>
  )
}
