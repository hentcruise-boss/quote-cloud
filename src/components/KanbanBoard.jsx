import { useState } from 'react'
import { STAGES } from '../lib/constants'
import CaseCard from './CaseCard'

// 桌機可拖曳卡片改階段; 手機可橫向捲動 + 點卡片進詳情改階段。
export default function KanbanBoard({ cases, customersMap, profilesMap, onOpen, onMoveStage }) {
  const [dragId, setDragId] = useState(null)
  const [overStage, setOverStage] = useState(null)

  const handleDrop = (stage) => {
    const c = cases.find(x => x.id === dragId)
    if (c && c.stage !== stage) onMoveStage(dragId, stage)
    setDragId(null); setOverStage(null)
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
      {STAGES.map(s => {
        const list = cases.filter(c => c.stage === s.key)
        return (
          <div key={s.key}
            onDragOver={e => { e.preventDefault(); setOverStage(s.key) }}
            onDragLeave={() => setOverStage(o => (o === s.key ? null : o))}
            onDrop={() => handleDrop(s.key)}
            className={`flex-shrink-0 w-64 rounded-xl border flex flex-col ${overStage === s.key ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-200 bg-slate-100/60'}`}>
            <div className="px-3 py-2.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <span className={`w-2 h-2 rounded-full ${s.dot}`}/>{s.label}
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-full px-1.5">{list.length}</span>
            </div>
            <div className="px-2 pb-2 space-y-2 min-h-[60px]">
              {list.map(c => (
                <CaseCard key={c.id} c={c}
                  customerName={customersMap[c.customer_id]}
                  ownerName={profilesMap[c.owner_id]}
                  onClick={() => onOpen(c.id)}
                  onDragStart={() => setDragId(c.id)}/>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
