import { useRef, useState } from 'react'
import { Camera, Paperclip } from 'lucide-react'

// onUpload(file) 需回傳 Promise。手機顯示「拍照」(直接開相機)。
export default function FileUpload({ onUpload }) {
  const camRef = useRef(null)
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)

  const handle = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    try { for (const f of files) await onUpload(f) }
    finally { setBusy(false) }
  }

  return (
    <div className="flex gap-2">
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle}/>
      <input ref={fileRef} type="file" multiple className="hidden" onChange={handle}/>
      <button disabled={busy} onClick={() => camRef.current?.click()}
        className="sm:hidden inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50">
        <Camera className="w-4 h-4"/>拍照
      </button>
      <button disabled={busy} onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
        <Paperclip className="w-4 h-4"/>{busy ? '上傳中…' : '附加檔案'}
      </button>
    </div>
  )
}
