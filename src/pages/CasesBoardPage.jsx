import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, LayoutGrid, X, RefreshCw } from 'lucide-react'
import KanbanBoard from '../components/KanbanBoard'
import { useAuth } from '../contexts/AuthContext'
import { useSync } from '../contexts/SyncContext'
import * as api from '../lib/api'
import { supabase } from '../supabase'
import { STAGES, STAGE_MAP } from '../lib/constants'

function NewCaseModal({ customers, onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [newCustomer, setNewCustomer] = useState('')
  const [stage, setStage] = useState('presales')
  const [saving, setSaving] = useState(false)
  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white'

  const submit = async () => {
    if (!title.trim()) { alert('請輸入案件名稱'); return }
    setSaving(true)
    try { await onCreate({ title, customerId, newCustomer, stage }) }
    catch { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">新增案件</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">案件名稱 *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="例:台北總部 12F 辦公室"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">客戶</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} className={inputCls}>
              <option value="">— 選擇既有客戶 —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {!customerId && <input value={newCustomer} onChange={e => setNewCustomer(e.target.value)} className={`${inputCls} mt-2`} placeholder="或輸入新客戶名稱"/>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">起始階段</label>
            <select value={stage} onChange={e => setStage(e.target.value)} className={inputCls}>
              {STAGES.filter(s => !['closed','lost'].includes(s.key)).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">取消</button>
          <button onClick={submit} disabled={saving} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">{saving ? '建立中…' : '建立案件'}</button>
        </div>
      </div>
    </div>
  )
}

export default function CasesBoardPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { run } = useSync()
  const [cases, setCases] = useState([])
  const [customers, setCustomers] = useState([])
  const [profiles, setProfiles] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [c, cu, pr] = await Promise.all([api.listCases(), api.listCustomers(), api.listProfiles()])
    setCases(c.data || []); setCustomers(cu.data || []); setProfiles(pr.data || [])
    setLoading(false)
  }
  useEffect(() => {
    load()
    const ch = supabase.channel('rt-cases')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, load).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const customersMap = Object.fromEntries(customers.map(c => [c.id, c.name]))
  const profilesMap = api.profileNameMap(profiles)

  const moveStage = (id, stage) => run(async () => {
    const c = cases.find(x => x.id === id)
    setCases(prev => prev.map(x => x.id === id ? { ...x, stage } : x))
    await api.updateCase(id, { stage })
    await api.addEvent({ case_id: id, actor_id: profile?.id, type: 'stage_changed', summary: `階段:${STAGE_MAP[c?.stage]?.label || c?.stage} → ${STAGE_MAP[stage]?.label || stage}`, meta: { from: c?.stage, to: stage } })
    await load()
  })

  const createCase = (form) => run(async () => {
    let customerId = form.customerId
    if (!customerId && form.newCustomer?.trim()) {
      const { data } = await api.createCustomer({ name: form.newCustomer.trim() })
      customerId = data?.id
    }
    const { data: newCase } = await api.createCase({
      title: form.title.trim(), customer_id: customerId || null,
      stage: form.stage, status: 'active', owner_id: profile?.id, created_by: profile?.id,
    })
    if (newCase) {
      await api.addEvent({ case_id: newCase.id, actor_id: profile?.id, type: 'created', summary: '建立案件' })
      setShowNew(false)
      navigate(`/cases/${newCase.id}`)
    }
  })

  return (
    <div className="space-y-4">
      {showNew && <NewCaseModal customers={customers} onClose={() => setShowNew(false)} onCreate={createCase}/>}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-indigo-500"/>案件看板 <span className="text-sm font-normal text-slate-400">({cases.length})</span></h1>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4"/>新增案件</button>
      </div>
      {loading
        ? <div className="py-20 text-center text-slate-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500"/>載入中…</div>
        : <KanbanBoard cases={cases} customersMap={customersMap} profilesMap={profilesMap} onOpen={cid => navigate(`/cases/${cid}`)} onMoveStage={moveStage}/>}
      <p className="text-xs text-slate-400">提示:桌機可直接拖曳卡片到其他階段;手機請點卡片進入詳情後變更階段。</p>
    </div>
  )
}
