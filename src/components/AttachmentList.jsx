import { useEffect, useState } from 'react'
import { FileText, Trash2 } from 'lucide-react'
import { signedUrl } from '../lib/storage'
import { fromNow } from '../lib/format'

const isImage = (a) => a.kind === 'photo' || (a.mime_type || '').startsWith('image/')

export default function AttachmentList({ attachments, onDelete }) {
  const [urls, setUrls] = useState({})

  useEffect(() => {
    let active = true
    ;(async () => {
      const entries = await Promise.all(attachments.map(async a => [a.id, await signedUrl(a.path)]))
      if (active) setUrls(Object.fromEntries(entries))
    })()
    return () => { active = false }
  }, [attachments])

  if (!attachments.length) return <div className="text-center text-slate-300 py-6 text-sm">尚無附件</div>

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {attachments.map(a => (
        <div key={a.id} className="group relative border border-slate-200 rounded-lg overflow-hidden bg-white">
          {isImage(a) && urls[a.id]
            ? <a href={urls[a.id]} target="_blank" rel="noreferrer"><img src={urls[a.id]} alt={a.filename} className="w-full h-28 object-cover"/></a>
            : <a href={urls[a.id] || '#'} target="_blank" rel="noreferrer" className="flex items-center justify-center h-28 text-slate-400"><FileText className="w-7 h-7"/></a>}
          <div className="px-2 py-1.5">
            <div className="text-[11px] text-slate-600 truncate" title={a.filename}>{a.filename}</div>
            <div className="text-[10px] text-slate-400">{fromNow(a.created_at)}</div>
          </div>
          {onDelete && (
            <button onClick={() => onDelete(a)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-white/90 rounded text-slate-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5"/>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
