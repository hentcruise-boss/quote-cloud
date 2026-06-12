import React, { useEffect, useState } from 'react'
import { Plus, X, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'
import { supabase } from '../../supabase'
import { MEMBER_TYPES, memberTypeLabel } from '../../lib/filters'

const EMPTY = { company: '', contact_name: '', email: '', phone: '', pricing_tier_id: '', rep_name: '', rep_phone: '', member_type: 'distribution', is_active: true }

function DealerModal({ dealer, tiers, onClose, onSaved }) {
  const [f, setF] = useState(dealer ? { ...dealer } : { ...EMPTY })
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))
  const save = async () => {
    if (!f.company || !f.email) { alert('公司名稱與 Email 必填'); return }
    setBusy(true)
    const payload = { ...f, pricing_tier_id: f.pricing_tier_id || null }
    if (dealer) await supabase.from('dealers').update(payload).eq('id', dealer.id)
    else await supabase.from('dealers').insert(payload)
    setBusy(false); onSaved()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="font-bold">{dealer ? '編輯經銷商' : '新增經銷商'}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <L label="公司名稱 *"><input value={f.company} onChange={e => set('company', e.target.value)} className="inp" /></L>
            <L label="聯絡人"><input value={f.contact_name || ''} onChange={e => set('contact_name', e.target.value)} className="inp" /></L>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <L label="登入 Email *"><input value={f.email || ''} onChange={e => set('email', e.target.value)} className="inp" placeholder="dealer@example.com" /></L>
            <L label="電話"><input value={f.phone || ''} onChange={e => set('phone', e.target.value)} className="inp" /></L>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <L label="定價等級">
              <select value={f.pricing_tier_id || ''} onChange={e => set('pricing_tier_id', e.target.value)} className="inp">
                <option value="">— 未指定 —</option>
                {tiers.map(t => <option key={t.id} value={t.id}>{t.id} · {t.name}（×{t.price_rate}）</option>)}
              </select>
            </L>
            <L label="會員類型">
              <select value={f.member_type || 'distribution'} onChange={e => set('member_type', e.target.value)} className="inp">
                {MEMBER_TYPES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </L>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <L label="專員姓名"><input value={f.rep_name || ''} onChange={e => set('rep_name', e.target.value)} className="inp" /></L>
            <L label="專員電話"><input value={f.rep_phone || ''} onChange={e => set('rep_phone', e.target.value)} className="inp" /></L>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} />啟用此帳號
          </label>
          {!dealer && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              建立後，請到 Supabase → Authentication 以<b>相同 Email</b> 新增登入帳號並設密碼，系統會自動綁定，經銷商即可登入。
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">取消</button>
          <button onClick={save} disabled={busy} className="rounded-lg bg-slate-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? '儲存中…' : '儲存'}</button>
        </div>
      </div>
    </div>
  )
}
const L = ({ label, children }) => (
  <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>{children}</div>
)

export default function AdminDealers() {
  const [dealers, setDealers] = useState([])
  const [tiers, setTiers] = useState([])
  const [modal, setModal] = useState(null)

  const load = async () => {
    const [{ data: d }, { data: t }] = await Promise.all([
      supabase.from('dealers').select('*').order('created_at'),
      supabase.from('pricing_tiers').select('*').order('id'),
    ])
    setDealers(d || []); setTiers(t || [])
  }
  useEffect(() => { load() }, [])
  const del = async (id) => { if (!confirm('刪除此經銷商及其資料？')) return; await supabase.from('dealers').delete().eq('id', id); load() }

  return (
    <div className="space-y-4">
      <style>{`.inp{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:14px;outline:none}.inp:focus{border-color:#94a3b8}`}</style>
      {modal && <DealerModal dealer={modal === 'add' ? null : modal} tiers={tiers} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">經銷商（{dealers.length}）</h1>
        <button onClick={() => setModal('add')} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />新增經銷商</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-2.5 font-semibold">公司 / 聯絡人</th><th className="px-4 py-2.5 font-semibold">Email</th>
            <th className="px-4 py-2.5 font-semibold">等級</th><th className="px-4 py-2.5 font-semibold">會員</th><th className="px-4 py-2.5 font-semibold">登入</th><th className="px-4 py-2.5 font-semibold">狀態</th><th className="px-4 py-2.5"></th>
          </tr></thead>
          <tbody>
            {dealers.map(d => (
              <tr key={d.id} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => setModal(d)}>
                <td className="px-4 py-2.5"><div className="font-semibold text-slate-800">{d.company}</div><div className="text-xs text-slate-400">{d.contact_name || '—'}</div></td>
                <td className="px-4 py-2.5 text-slate-600">{d.email}</td>
                <td className="px-4 py-2.5"><span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs">{d.pricing_tier_id || '—'}</span></td>
                <td className="px-4 py-2.5"><span className={`rounded px-2 py-0.5 text-xs font-semibold ${d.member_type === 'core' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{memberTypeLabel(d.member_type || 'distribution')}</span></td>
                <td className="px-4 py-2.5">{d.auth_user_id
                  ? <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />已綁定</span>
                  : <span className="flex items-center gap-1 text-xs text-amber-600"><AlertCircle className="h-3.5 w-3.5" />待建帳號</span>}</td>
                <td className="px-4 py-2.5">{d.is_active ? <span className="text-xs text-emerald-600">啟用</span> : <span className="text-xs text-slate-400">停用</span>}</td>
                <td className="px-4 py-2.5"><button onClick={e => { e.stopPropagation(); del(d.id) }} className="rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
            {dealers.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">尚無經銷商，點右上角新增</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
