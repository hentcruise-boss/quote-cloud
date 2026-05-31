import { useEffect, useState } from 'react'
import { Plus, Trash2, Receipt, CheckCircle2, FileSignature } from 'lucide-react'
import { useSync } from '../../contexts/SyncContext'
import { useAuth } from '../../contexts/AuthContext'
import * as api from '../../lib/api'
import { supabase } from '../../supabase'
import { INVOICE_STATUS_MAP } from '../../lib/constants'
import { nt, num } from '../../lib/format'

const today = () => new Date().toISOString().slice(0, 10)

export default function BillingPanel({ caseId }) {
  const { run } = useSync()
  const { profile } = useAuth()
  const [contract, setContract] = useState(null)
  const [cForm, setCForm] = useState({ amount: 0, signed_date: '', status: 'draft', note: '' })
  const [invoices, setInvoices] = useState([])
  const [inv, setInv] = useState({ title: '期款', amount: '', due_date: '' })

  const loadContract = async () => {
    const { data } = await api.listContracts(caseId)
    const c = data?.[0] || null
    setContract(c)
    if (c) setCForm({ amount: c.amount, signed_date: c.signed_date || '', status: c.status, note: c.note || '' })
  }
  const loadInvoices = async () => { const { data } = await api.listInvoices(caseId); setInvoices(data || []) }

  useEffect(() => {
    loadContract(); loadInvoices()
    const ch = supabase.channel(`rt-bill-${caseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `case_id=eq.${caseId}` }, loadInvoices)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts', filter: `case_id=eq.${caseId}` }, loadContract)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [caseId])

  const saveContract = () => run(async () => {
    const patch = { amount: Number(cForm.amount) || 0, signed_date: cForm.signed_date || null, status: cForm.status, note: cForm.note || null }
    const wasSigned = contract?.status === 'signed'
    if (contract) await api.updateContract(contract.id, patch)
    else await api.createContract({ case_id: caseId, ...patch })
    if (!wasSigned && patch.status === 'signed') await api.addEvent({ case_id: caseId, actor_id: profile?.id, type: 'note', summary: `合約已簽訂(NT$ ${num(patch.amount)})` })
    await loadContract()
  })

  const addInvoice = () => {
    if (!inv.title.trim() || !inv.amount) return
    return run(async () => {
      await api.addInvoice({ case_id: caseId, title: inv.title.trim(), amount: Number(inv.amount) || 0, due_date: inv.due_date || null, status: 'pending' })
      setInv({ title: '期款', amount: '', due_date: '' })
      await loadInvoices()
    })
  }
  const setInvStatus = (v, status) => run(async () => {
    const patch = { status }
    if (status === 'paid') patch.paid_at = today()
    await api.updateInvoice(v.id, patch)
    if (status === 'paid') await api.addEvent({ case_id: caseId, actor_id: profile?.id, type: 'note', summary: `已收款:${v.title}(NT$ ${num(v.amount)})` })
    await loadInvoices()
  })
  const delInvoice = (id) => run(async () => { await api.deleteInvoice(id); await loadInvoices() })

  const contractAmt = Number(contract?.amount || cForm.amount || 0)
  const paid = invoices.filter(v => v.status === 'paid').reduce((s, v) => s + Number(v.amount), 0)
  const outstanding = Math.max(0, contractAmt - paid)
  const inputCls = 'border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white'

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><FileSignature className="w-4 h-4 text-slate-400"/>合約</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-xs text-slate-400">合約金額<input type="number" value={cForm.amount} onChange={e => setCForm(f => ({ ...f, amount: e.target.value }))} className={`${inputCls} w-full mt-1`}/></label>
          <label className="text-xs text-slate-400">簽約日期<input type="date" value={cForm.signed_date} onChange={e => setCForm(f => ({ ...f, signed_date: e.target.value }))} className={`${inputCls} w-full mt-1`}/></label>
          <label className="text-xs text-slate-400">狀態<select value={cForm.status} onChange={e => setCForm(f => ({ ...f, status: e.target.value }))} className={`${inputCls} w-full mt-1`}><option value="draft">草稿</option><option value="signed">已簽訂</option></select></label>
        </div>
        <input value={cForm.note} onChange={e => setCForm(f => ({ ...f, note: e.target.value }))} placeholder="備註…" className={`${inputCls} w-full mt-3`}/>
        <div className="flex justify-end mt-3"><button onClick={saveContract} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">儲存合約</button></div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><div className="text-xs text-slate-400">合約金額</div><div className="font-mono font-bold text-slate-700">{nt(contractAmt)}</div></div>
          <div><div className="text-xs text-slate-400">已收</div><div className="font-mono font-bold text-emerald-600">{nt(paid)}</div></div>
          <div><div className="text-xs text-slate-400">未收</div><div className="font-mono font-bold text-rose-600">{nt(outstanding)}</div></div>
        </div>
        {contractAmt > 0 && <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-3"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (paid / contractAmt) * 100)}%` }}/></div>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100"><h2 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Receipt className="w-4 h-4 text-slate-400"/>請款明細</h2></div>
        <div className="divide-y divide-slate-100">
          {invoices.length === 0 && <div className="px-5 py-6 text-center text-slate-300 text-sm">尚無請款項目</div>}
          {invoices.map(v => {
            const st = INVOICE_STATUS_MAP[v.status] || {}
            return (
              <div key={v.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800">{v.title} <span className="font-mono text-slate-500">{nt(Number(v.amount))}</span></div>
                  <div className="text-[11px] text-slate-400">{v.due_date ? `應收 ${v.due_date}` : ''}{v.paid_at ? ` · 已收 ${v.paid_at}` : ''}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.badge}`}>{st.label}</span>
                  {v.status !== 'paid' && <button onClick={() => setInvStatus(v, 'paid')} title="標記已收" className="p-1 text-slate-300 hover:text-emerald-600"><CheckCircle2 className="w-4 h-4"/></button>}
                  <button onClick={() => delInvoice(v.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input value={inv.title} onChange={e => setInv(f => ({ ...f, title: e.target.value }))} placeholder="名目(訂金/尾款)" className={inputCls}/>
          <input type="number" value={inv.amount} onChange={e => setInv(f => ({ ...f, amount: e.target.value }))} placeholder="金額" className={inputCls}/>
          <input type="date" value={inv.due_date} onChange={e => setInv(f => ({ ...f, due_date: e.target.value }))} className={inputCls}/>
          <button onClick={addInvoice} className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"><Plus className="w-4 h-4"/>新增</button>
        </div>
      </div>
    </div>
  )
}
