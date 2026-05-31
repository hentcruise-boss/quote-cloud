import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, Send, RefreshCw, Paperclip, MessageSquare, User } from 'lucide-react'
import StageBadge from '../components/StageBadge'
import Timeline from '../components/Timeline'
import AttachmentList from '../components/AttachmentList'
import FileUpload from '../components/FileUpload'
import { useAuth } from '../contexts/AuthContext'
import { useSync } from '../contexts/SyncContext'
import * as api from '../lib/api'
import { supabase } from '../supabase'
import { STAGES, STAGE_MAP, STATUSES } from '../lib/constants'
import { uploadCaseFile, removeCaseFile } from '../lib/storage'
import { nt } from '../lib/format'

export default function CaseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, isInternal } = useAuth()
  const { run } = useSync()

  const [caseItem, setCaseItem] = useState(null)
  const [customers, setCustomers] = useState([])
  const [profiles, setProfiles] = useState([])
  const [events, setEvents] = useState([])
  const [comments, setComments] = useState([])
  const [attachments, setAttachments] = useState([])
  const [quote, setQuote] = useState(null)
  const [quoteTotal, setQuoteTotal] = useState({ count: 0, sales: 0 })
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)

  const loadCase = async () => { const { data } = await api.getCase(id); setCaseItem(data || null) }
  const loadFeeds = async () => {
    const [e, c, a] = await Promise.all([api.listEvents(id), api.listComments(id), api.listAttachments(id)])
    setEvents(e.data || []); setComments(c.data || []); setAttachments(a.data || [])
  }
  const loadQuote = async () => {
    const { data } = await api.getQuotesForCase(id)
    const q = data?.[0] || null
    setQuote(q)
    if (q) {
      const { data: items } = await api.listQuoteItems(q.id)
      const sales = (items || []).reduce((s, i) => s + Number(i.price) * Number(i.qty), 0)
      setQuoteTotal({ count: items?.length || 0, sales })
    } else {
      setQuoteTotal({ count: 0, sales: 0 })
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      loadCase(), loadFeeds(), loadQuote(),
      api.listCustomers().then(r => setCustomers(r.data || [])),
      api.listProfiles().then(r => setProfiles(r.data || [])),
    ]).finally(() => setLoading(false))

    const ch = supabase.channel(`rt-case-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'case_events', filter: `case_id=eq.${id}` }, loadFeeds)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `case_id=eq.${id}` }, loadFeeds)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attachments', filter: `case_id=eq.${id}` }, loadFeeds)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [id])

  const profilesMap = api.profileNameMap(profiles)
  const customerName = customers.find(c => c.id === caseItem?.customer_id)?.name
  const ownerName = profilesMap[caseItem?.owner_id]

  const timelineItems = useMemo(() => {
    const evs = events.map(e => ({ ...e, kind: 'event' }))
    const cms = comments.map(c => ({ ...c, kind: 'comment' }))
    return [...evs, ...cms].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [events, comments])

  const changeStage = (stage) => run(async () => {
    const from = caseItem.stage
    setCaseItem(prev => ({ ...prev, stage }))
    await api.updateCase(id, { stage })
    await api.addEvent({ case_id: id, actor_id: profile?.id, type: 'stage_changed', summary: `階段:${STAGE_MAP[from]?.label || from} → ${STAGE_MAP[stage]?.label || stage}`, meta: { from, to: stage } })
    await Promise.all([loadCase(), loadFeeds()])
  })

  const changeStatus = (status) => run(async () => {
    const from = caseItem.status
    setCaseItem(prev => ({ ...prev, status }))
    await api.updateCase(id, { status })
    await api.addEvent({ case_id: id, actor_id: profile?.id, type: 'status_changed', summary: `狀態變更:${from} → ${status}`, meta: { from, to: status } })
    await Promise.all([loadCase(), loadFeeds()])
  })

  const submitComment = () => {
    if (!commentText.trim()) return
    const body = commentText.trim()
    setCommentText('')
    return run(async () => {
      await api.addComment({ case_id: id, author_id: profile?.id, body })
      await loadFeeds()
    })
  }

  const handleUpload = (file) => run(async () => {
    const path = await uploadCaseFile(id, file)
    const kind = (file.type || '').startsWith('image/') ? 'photo' : 'document'
    await api.addAttachment({ case_id: id, uploaded_by: profile?.id, path, filename: file.name, mime_type: file.type, size_bytes: file.size, kind })
    await api.addEvent({ case_id: id, actor_id: profile?.id, type: 'attachment', summary: `上傳檔案:${file.name}` })
    await loadFeeds()
  })

  const handleDeleteAttachment = async (a) => {
    if (!window.confirm(`刪除附件 ${a.filename}？`)) return
    await run(async () => { await removeCaseFile(a.path); await api.deleteAttachment(a.id); await loadFeeds() })
  }

  if (loading) return <div className="py-20 text-center text-slate-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500"/>載入中…</div>
  if (!caseItem) return <div className="text-center text-slate-400 py-20">找不到此案件。</div>

  const selCls = 'border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 bg-white'

  return (
    <div className="space-y-5">
      <Link to="/cases" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"><ArrowLeft className="w-4 h-4"/>返回看板</Link>

      {/* 標頭 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-slate-400">{caseItem.code}</span>
              <StageBadge stage={caseItem.stage}/>
            </div>
            <h1 className="text-xl font-bold text-slate-800">{caseItem.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5"/>{customerName || '未指定客戶'}</span>
              {ownerName && <span className="text-xs">負責人:{ownerName}</span>}
            </div>
          </div>
          {isInternal && (
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 uppercase">階段</span>
                <select value={caseItem.stage} onChange={e => changeStage(e.target.value)} className={selCls}>
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 uppercase">狀態</span>
                <select value={caseItem.status} onChange={e => changeStatus(e.target.value)} className={selCls}>
                  {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* 左:時間軸 + 留言 */}
        <section className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3">留言</h2>
            <div className="flex gap-2">
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)} rows={2}
                placeholder="輸入留言,讓相關的人都看得到…"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-none"/>
              <button onClick={submitComment} className="self-end inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"><Send className="w-4 h-4"/>送出</button>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-slate-400"/>活動時間軸</h2>
            <Timeline items={timelineItems} profilesMap={profilesMap}/>
          </div>
        </section>

        {/* 右:報價摘要 + 附件 */}
        <aside className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-slate-400"/>報價</h2>
            {quote
              ? <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">狀態</span><span className="font-medium">{quote.status}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">項目</span><span className="font-mono">{quoteTotal.count}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">總報價</span><span className="font-mono font-bold text-indigo-700">{nt(quoteTotal.sales)}</span></div>
                </div>
              : <p className="text-xs text-slate-400">尚未建立報價。</p>}
            {isInternal && (
              <Link to={`/cases/${id}/quote`} className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-indigo-200 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-50">
                <FileSpreadsheet className="w-4 h-4"/>開啟報價工作區
              </Link>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Paperclip className="w-4 h-4 text-slate-400"/>附件</h2>
              <FileUpload onUpload={handleUpload}/>
            </div>
            <AttachmentList attachments={attachments} onDelete={isInternal ? handleDeleteAttachment : null}/>
          </div>
        </aside>
      </div>
    </div>
  )
}
