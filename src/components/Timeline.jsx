import { Clock, MessageSquare, ArrowRightCircle, FileText, Paperclip, CheckCircle2, FilePlus2 } from 'lucide-react'
import { fromNow } from '../lib/format'

const ICON = {
  created:        <FilePlus2 className="w-4 h-4"/>,
  stage_changed:  <ArrowRightCircle className="w-4 h-4"/>,
  status_changed: <ArrowRightCircle className="w-4 h-4"/>,
  quote_sent:     <FileText className="w-4 h-4"/>,
  quote_accepted: <CheckCircle2 className="w-4 h-4"/>,
  attachment:     <Paperclip className="w-4 h-4"/>,
  note:           <FileText className="w-4 h-4"/>,
}

// items: 合併後的事件 + 留言, 依時間新到舊。留言以 kind:'comment' 標記。
export default function Timeline({ items, profilesMap }) {
  if (!items.length)
    return <div className="text-center text-slate-300 py-10 text-sm"><Clock className="w-8 h-8 mx-auto mb-2 opacity-30"/>尚無活動紀錄</div>

  return (
    <div>
      {items.map((it, i) => {
        const who = profilesMap[it.actor_id || it.author_id] || '系統'
        const isComment = it.kind === 'comment'
        return (
          <div key={it.id || i} className="flex gap-3 pb-4">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isComment ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-100 text-slate-400'}`}>
                {isComment ? <MessageSquare className="w-4 h-4"/> : (ICON[it.type] || <Clock className="w-4 h-4"/>)}
              </div>
              {i < items.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1"/>}
            </div>
            <div className="flex-1 -mt-0.5 min-w-0">
              <div className="text-xs text-slate-400"><span className="font-semibold text-slate-600">{who}</span> · {fromNow(it.created_at)}</div>
              {isComment
                ? <div className="mt-1 text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">{it.body}</div>
                : <div className="mt-0.5 text-sm text-slate-700">{it.summary || it.type}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
