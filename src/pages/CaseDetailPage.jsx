import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, Send, RefreshCw, Paperclip, MessageSquare, User, Users, Plus, X, Factory, ClipboardCheck, Truck, LayoutList, LifeBuoy, Star, Receipt } from 'lucide-react'
import StageBadge from '../components/StageBadge'
import Timeline from '../components/Timeline'
import AttachmentList from '../components/AttachmentList'
import FileUpload from '../components/FileUpload'
import ProductionPanel from '../features/production/ProductionPanel'
import QcPanel from '../features/qc/QcPanel'
import DeliveryPanel from '../features/delivery/DeliveryPanel'
import TicketsPanel from '../features/tickets/TicketsPanel'
import StarRating from '../components/StarRating'
import BillingPanel from '../features/billing/BillingPanel'
import { useAuth } from '../contexts/AuthContext'
import { useSync } from '../contexts/SyncContext'
import * as api from '../lib/api'
import { supabase } from '../supabase'
import { STAGES, STAGE_MAP, STATUSES, ROLE_MAP, INVOICE_STATUS_MAP } from '../lib/constants'
import { uploadCaseFile, removeCaseFile } from '../lib/storage'
import { nt, num, fromNow } from '../lib/format'

const RELATIONS = [
  { key: 'customer', label: '客戶' },
  { key: 'supplier', label: '供應商/工廠' },
  { key: 'field',    label: '現場' },
  { key: 'watcher',  label: '旁觀' },
]
const RELATION_MAP = Object.fromEntries(RELATIONS.map(r => [r.key, r.label]))

const SUBTABS = [
  { key: 'overview',   label: '總覽',   icon: <LayoutList className="w-4 h-4"/> },
  { key: 'production', label: '生產',   icon: <Factory className="w-4 h-4"/> },
  { key: 'qc',         label: 'QC驗收', icon: <ClipboardCheck className="w-4 h-4"/> },
  { key: 'delivery',   label: '交貨',   icon: <Truck className="w-4 h-4"/> },
  { key: 'tickets',    label: '售後',   icon: <LifeBuoy className="w-4 h-4"/> },
  { key: 'billing',    label: '請款',   icon: <Receipt className="w-4 h-4"/>, internalOnly: true },
]

export default function CaseDetailPage() {
  const { id } = useParams()
  const { profile, isInternal } = useAuth()
  const { run } = useSync()

  const [caseItem, setCaseItem] = useState(null)
  const [customers, setCustomers] = useState([])
  const [profiles, setProfiles] = useState([])      // public_profiles (name map, 所有角色可讀)
  const [pickerProfiles, setPickerProfiles] = useState([]) // 完整 profiles (僅內部, 用於指派參與者)
  const [participants, setParticipants] = useState([])
  const [events, setEvents] = useState([])
  const [comments, setComments] = useState([])
  const [attachments, setAttachments] = useState([])
  const [quote, setQuote] = useState(null)
  const [quoteTotal, setQuoteTotal] = useState({ count: 0, sales: 0 })
  const [publicItems, setPublicItems] = useState([]) // 客戶唯讀報價
  const [commentText, setCommentText] = useState('')
  const [newPartId, setNewPartId] = useState('')
  const [newPartRel, setNewPartRel] = useState('customer')
  const [subtab, setSubtab] = useState('overview')
  const [feedbackList, setFeedbackList] = useState([])
  const [fbRating, setFbRating] = useState(0)
  const [fbComment, setFbComment] = useState('')
  const [custContract, setCustContract] = useState(null)
  const [custInvoices, setCustInvoices] = useState([])
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
      setQuoteTotal({ count: items?.length || 0, sales: (items || []).reduce((s, i) => s + Number(i.price) * Number(i.qty), 0) })
    } else { setQuoteTotal({ count: 0, sales: 0 }) }
  }
  const loadParticipants = async () => { const { data } = await api.listParticipants(id); setParticipants(data || []) }
  const loadPublicQuote = async () => { const { data } = await api.listPublicQuoteItems(id); setPublicItems(data || []) }
  const refreshCase = () => Promise.all([loadCase(), loadFeeds()])
  const loadFeedback = async () => { const { data } = await api.listFeedback(id); setFeedbackList(data || []) }
  const loadCustBilling = async () => {
    if (profile?.role !== 'customer') return
    const [c, v] = await Promise.all([api.listContracts(id), api.listInvoices(id)])
    setCustContract((c.data || [])[0] || null); setCustInvoices(v.data || [])
  }

  useEffect(() => {
    setLoading(true)
    const tasks = [
      loadCase(), loadFeeds(),
      api.listCustomers().then(r => setCustomers(r.data || [])),
      api.listPublicProfiles().then(r => setProfiles(r.data || [])),
      loadFeedback(),
      loadCustBilling(),
    ]
    if (isInternal) {
      tasks.push(loadQuote(), loadParticipants(), api.listProfiles().then(r => setPickerProfiles(r.data || [])))
    } else {
      tasks.push(loadPublicQuote())
    }
    Promise.all(tasks).finally(() => setLoading(false))

    const ch = supabase.channel(`rt-case-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'case_events', filter: `case_id=eq.${id}` }, loadFeeds)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `case_id=eq.${id}` }, loadFeeds)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attachments', filter: `case_id=eq.${id}` }, loadFeeds)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [id, isInternal])

  const profilesMap = api.profileNameMap(profiles)
  const customerName = customers.find(c => c.id === caseItem?.customer_id)?.name
  const ownerName = profilesMap[caseItem?.owner_id]
  const publicTotal = publicItems.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0)

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

  const changeOwner = (ownerId) => run(async () => {
    setCaseItem(prev => ({ ...prev, owner_id: ownerId || null }))
    await api.updateCase(id, { owner_id: ownerId || null })
    await api.addEvent({ case_id: id, actor_id: profile?.id, type: 'note', summary: `負責人變更為 ${profilesMap[ownerId] || '未指定'}` })
    await Promise.all([loadCase(), loadFeeds()])
  })

  const submitComment = () => {
    if (!commentText.trim()) return
    const body = commentText.trim()
    setCommentText('')
    return run(async () => { await api.addComment({ case_id: id, author_id: profile?.id, body }); await loadFeeds() })
  }

  // 上傳:附件→事件由 DB trigger 自動產生 (外部上傳免寫 case_events 權限)
  const handleUpload = (file) => run(async () => {
    const path = await uploadCaseFile(id, file)
    const kind = (file.type || '').startsWith('image/') ? 'photo' : 'document'
    await api.addAttachment({ case_id: id, uploaded_by: profile?.id, path, filename: file.name, mime_type: file.type, size_bytes: file.size, kind })
    await loadFeeds()
  })

  const handleDeleteAttachment = async (a) => {
    if (!window.confirm(`刪除附件 ${a.filename}？`)) return
    await run(async () => { await removeCaseFile(a.path); await api.deleteAttachment(a.id); await loadFeeds() })
  }

  const submitFeedback = () => {
    if (!fbRating) return
    return run(async () => {
      await api.addFeedback({ case_id: id, rating: fbRating, comment: fbComment || null, submitted_by: profile?.id })
      setFbRating(0); setFbComment('')
      await loadFeedback()
    })
  }

  const addParticipantFn = () => {
    if (!newPartId) return
    return run(async () => {
      await api.addParticipant({ case_id: id, profile_id: newPartId, relation: newPartRel })
      const who = profilesMap[newPartId] || (pickerProfiles.find(p => p.id === newPartId)?.email) || ''
      await api.addEvent({ case_id: id, actor_id: profile?.id, type: 'participant_added', summary: `加入參與者:${who}（${RELATION_MAP[newPartRel]}）` })
      setNewPartId('')
      await Promise.all([loadParticipants(), loadFeeds()])
    })
  }
  const removeParticipantFn = (pid) => run(async () => { await api.removeParticipant(id, pid); await loadParticipants() })

  if (loading) return <div className="py-20 text-center text-slate-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500"/>載入中…</div>
  if (!caseItem) return <div className="text-center text-slate-400 py-20">找不到此案件(或您沒有檢視權限)。</div>

  const selCls = 'border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 bg-white'
  const availableProfiles = pickerProfiles.filter(p => !participants.some(cp => cp.profile_id === p.id))

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
              {profile?.role === 'admin' && (
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase">負責人</span>
                  <select value={caseItem.owner_id || ''} onChange={e => changeOwner(e.target.value)} className={selCls}>
                    <option value="">未指定</option>
                    {pickerProfiles.filter(p => p.role === 'admin' || p.role === 'staff').map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {SUBTABS.filter(s => !s.internalOnly || isInternal).map(s => (
          <button key={s.key} onClick={() => setSubtab(s.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${subtab === s.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {s.icon}{s.label}
          </button>
        ))}
      </div>

      {subtab === 'production' && <ProductionPanel caseId={id} caseItem={caseItem} isInternal={isInternal} onCaseChange={refreshCase}/>}
      {subtab === 'qc' && <QcPanel caseId={id} caseItem={caseItem} isInternal={isInternal} onCaseChange={refreshCase}/>}
      {subtab === 'delivery' && <DeliveryPanel caseId={id} caseItem={caseItem} isInternal={isInternal} onCaseChange={refreshCase}/>}
      {subtab === 'tickets' && <TicketsPanel caseId={id} isInternal={isInternal} profilesMap={profilesMap}/>}
      {subtab === 'billing' && isInternal && <BillingPanel caseId={id}/>}

      {subtab === 'overview' && <div className="grid lg:grid-cols-3 gap-5">
        {/* 左:留言 + 時間軸 */}
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

        {/* 右:報價 + 附件 + 參與者 */}
        <aside className="space-y-4">
          {/* 內部:報價摘要 + 工作區入口 */}
          {isInternal && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-slate-400"/>報價</h2>
              {quote
                ? <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">狀態</span><span className="font-medium">{quote.status}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">項目</span><span className="font-mono">{quoteTotal.count}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">總報價</span><span className="font-mono font-bold text-indigo-700">{nt(quoteTotal.sales)}</span></div>
                  </div>
                : <p className="text-xs text-slate-400">尚未建立報價。</p>}
              <Link to={`/cases/${id}/quote`} className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-indigo-200 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-50">
                <FileSpreadsheet className="w-4 h-4"/>開啟報價工作區
              </Link>
            </div>
          )}

          {/* 客戶:唯讀報價 (無成本) */}
          {!isInternal && publicItems.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-slate-400"/><h2 className="text-sm font-bold text-slate-700">報價內容</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50 text-slate-400 uppercase tracking-wide">
                    <th className="px-3 py-2 text-left">空間</th><th className="px-3 py-2 text-left">產品</th>
                    <th className="px-3 py-2 text-right">單價</th><th className="px-3 py-2 text-center">數量</th><th className="px-3 py-2 text-right">小計</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {publicItems.map(i => (
                      <tr key={i.id}>
                        <td className="px-3 py-2"><div className="font-mono text-slate-400">{i.floor}</div><div className="font-semibold text-indigo-700">{i.space}</div></td>
                        <td className="px-3 py-2 text-slate-700">{i.name} <span className="text-slate-400 font-mono">{i.sku}</span></td>
                        <td className="px-3 py-2 text-right font-mono">{num(i.price)}</td>
                        <td className="px-3 py-2 text-center font-mono">{i.qty}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{num(i.price * i.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end text-sm font-bold text-slate-700">總計:<span className="font-mono text-indigo-700 ml-2">{nt(publicTotal)}</span></div>
            </div>
          )}

          {/* 客戶:付款進度(唯讀) */}
          {profile?.role === 'customer' && (custContract || custInvoices.length > 0) && (() => {
            const amt = Number(custContract?.amount || 0)
            const paid = custInvoices.filter(v => v.status === 'paid').reduce((s, v) => s + Number(v.amount), 0)
            const out = Math.max(0, amt - paid)
            return (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Receipt className="w-4 h-4 text-slate-400"/>付款進度</h2>
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                  <div><div className="text-[11px] text-slate-400">合約</div><div className="font-mono text-xs font-bold text-slate-700">{nt(amt)}</div></div>
                  <div><div className="text-[11px] text-slate-400">已付</div><div className="font-mono text-xs font-bold text-emerald-600">{nt(paid)}</div></div>
                  <div><div className="text-[11px] text-slate-400">未付</div><div className="font-mono text-xs font-bold text-rose-600">{nt(out)}</div></div>
                </div>
                {amt > 0 && <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (paid / amt) * 100)}%` }}/></div>}
                <div className="space-y-1.5">
                  {custInvoices.map(v => (
                    <div key={v.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{v.title} <span className="font-mono text-slate-400">{nt(Number(v.amount))}</span>{v.due_date ? ` · ${v.due_date}` : ''}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${INVOICE_STATUS_MAP[v.status]?.badge}`}>{INVOICE_STATUS_MAP[v.status]?.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* 附件 (所有參與者可看/上傳) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Paperclip className="w-4 h-4 text-slate-400"/>附件</h2>
              <FileUpload onUpload={handleUpload}/>
            </div>
            <AttachmentList attachments={attachments} onDelete={handleDeleteAttachment}/>
          </div>

          {/* 滿意度回饋 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-slate-400"/>滿意度回饋</h2>
            {feedbackList.length === 0 && <p className="text-xs text-slate-400">{profile?.role === 'customer' ? '完成後歡迎給我們評分。' : '客戶尚未回饋。'}</p>}
            <div className="space-y-3">
              {feedbackList.map(f => (
                <div key={f.id} className="border-b border-slate-50 pb-2 last:border-0">
                  <StarRating value={f.rating} readOnly size="w-4 h-4"/>
                  {f.comment && <div className="text-xs text-slate-600 mt-1">{f.comment}</div>}
                  <div className="text-[11px] text-slate-400 mt-0.5">{profilesMap[f.submitted_by] || '客戶'} · {fromNow(f.created_at)}</div>
                </div>
              ))}
            </div>
            {profile?.role === 'customer' && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                <p className="text-xs text-slate-500">為這次服務評分:</p>
                <StarRating value={fbRating} onChange={setFbRating}/>
                <textarea value={fbComment} onChange={e => setFbComment(e.target.value)} rows={2} placeholder="想說的話(可選)…" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-none"/>
                <button onClick={submitFeedback} disabled={!fbRating} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40">送出評分</button>
              </div>
            )}
          </div>

          {/* 參與者 (內部管理) */}
          {isInternal && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-slate-400"/>參與者</h2>
              <div className="space-y-2 mb-3">
                {participants.length === 0 && <p className="text-xs text-slate-400">尚無外部參與者。加入後對方登入即可看到此案件。</p>}
                {participants.map(cp => (
                  <div key={cp.profile_id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{profilesMap[cp.profile_id] || cp.profile_id}<span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{RELATION_MAP[cp.relation] || cp.relation}</span></span>
                    <button onClick={() => removeParticipantFn(cp.profile_id)} className="p-1 text-slate-300 hover:text-red-500"><X className="w-3.5 h-3.5"/></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t border-slate-100 pt-3">
                <select value={newPartId} onChange={e => setNewPartId(e.target.value)} className={`${selCls} flex-1`}>
                  <option value="">— 選擇帳號 —</option>
                  {availableProfiles.map(p => <option key={p.id} value={p.id}>{(p.full_name || p.email)}（{ROLE_MAP[p.role]?.label || p.role}）</option>)}
                </select>
                <select value={newPartRel} onChange={e => setNewPartRel(e.target.value)} className={selCls}>
                  {RELATIONS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
                <button onClick={addParticipantFn} disabled={!newPartId} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"><Plus className="w-3.5 h-3.5"/>加入</button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">提示:對方需先自行註冊帳號,並在「使用者」頁設好角色,才會出現在上方清單。</p>
            </div>
          )}
        </aside>
      </div>}
    </div>
  )
}
