import React, { useEffect, useState } from 'react'
import { Plus, X, Trash2 } from 'lucide-react'
import { supabase } from '../../supabase'

const EMPTY = { name: '', contact_name: '', phone: '', email: '', note: '', is_active: true }

function SupplierModal({ row, onClose, onSaved }) {
  const [f, setF] = useState(row ? { ...row } : { ...EMPTY })
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))
  const save = async () => {
    if (!f.name) { alert('請填供應商名稱'); return }
    setBusy(true)
    if (row) await supabase.from('suppliers').update(f).eq('id', row.id)
    else await supabase.from('suppliers').insert(f)
    setBusy(false); onSaved()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="font-bold">{row ? '編輯供應商' : '新增供應商'}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3 p-5">
          <L label="供應商名稱 *"><input value={f.name} onChange={e => set('name', e.target.value)} className="inp" /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="聯絡人"><input value={f.contact_name || ''} onChange={e => set('contact_name', e.target.value)} className="inp" /></L>
            <L label="電話"><input value={f.phone || ''} onChange={e => set('phone', e.target.value)} className="inp" /></L>
          </div>
          <L label="Email"><input value={f.email || ''} onChange={e => set('email', e.target.value)} className="inp" /></L>
          <L label="備註"><textarea value={f.note || ''} onChange={e => set('note', e.target.value)} rows={2} className="inp" /></L>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} />啟用</label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">取消</button>
          <button onClick={save} disabled={busy} className="rounded-lg bg-slate-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? '儲存中…' : '儲存'}</button>
        </div>
      </div>
    </div>
  )
}
const L = ({ label, children }) => (
  <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>{children}</div>
)

export default function AdminSuppliers() {
  const [list, setList] = useState([])
  const [modal, setModal] = useState(null)

  const load = async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name')
    setList(data || [])
  }
  useEffect(() => { load() }, [])

  const del = async (id) => { if (!confirm('刪除此供應商？')) return; await supabase.from('suppliers').delete().eq('id', id); load() }

  return (
    <div className="space-y-4">
      <style>{`.inp{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:14px;outline:none}.inp:focus{border-color:#94a3b8}`}</style>
      {modal && <SupplierModal row={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">供應商（{list.length}）</h1>
        <button onClick={() => setModal('add')} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />新增供應商</button>
      </div>
      <p className="text-xs text-slate-500">供應商與產品關聯後，可於「補倉」分頁自動產生補貨單。</p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-2.5 font-semibold">名稱</th><th className="px-4 py-2.5 font-semibold">聯絡人</th>
            <th className="px-4 py-2.5 font-semibold">電話</th><th className="px-4 py-2.5 font-semibold">Email</th>
            <th className="px-4 py-2.5 font-semibold">狀態</th><th className="px-4 py-2.5"></th>
          </tr></thead>
          <tbody>
            {list.map(s => (
              <tr key={s.id} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => setModal(s)}>
                <td className="px-4 py-2.5 font-semibold">{s.name}</td>
                <td className="px-4 py-2.5">{s.contact_name || '—'}</td>
                <td className="px-4 py-2.5 text-slate-600">{s.phone || '—'}</td>
                <td className="px-4 py-2.5 text-slate-600">{s.email || '—'}</td>
                <td className="px-4 py-2.5">{s.is_active ? <span className="text-xs text-emerald-600">啟用</span> : <span className="text-xs text-slate-400">停用</span>}</td>
                <td className="px-4 py-2.5"><button onClick={e => { e.stopPropagation(); del(s.id) }} className="rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">尚無供應商</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
