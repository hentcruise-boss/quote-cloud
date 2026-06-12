import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { supabase } from '../../supabase'

export default function AdminPricing() {
  const [tiers, setTiers] = useState([])
  const [draft, setDraft] = useState({ id: '', name: '', price_rate: 1, note: '' })
  const [msg, setMsg] = useState('')

  const load = async () => {
    const { data } = await supabase.from('pricing_tiers').select('*').order('id')
    setTiers(data || [])
  }
  useEffect(() => { load() }, [])

  const save = async (t) => {
    await supabase.from('pricing_tiers').upsert(t, { onConflict: 'id' })
    setMsg('已儲存'); setTimeout(() => setMsg(''), 1500); load()
  }
  const add = async () => {
    if (!draft.id || !draft.name) { setMsg('代號與名稱必填'); return }
    await save({ ...draft, price_rate: Number(draft.price_rate) })
    setDraft({ id: '', name: '', price_rate: 1, note: '' })
  }
  const del = async (id) => { if (!confirm(`刪除等級 ${id}？`)) return; await supabase.from('pricing_tiers').delete().eq('id', id); load() }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">定價等級</h1>
        {msg && <span className="text-xs text-emerald-600">{msg}</span>}
      </div>
      <p className="text-sm text-slate-500">乘數 = 經銷商看到的價格 ÷ 牌價。例如 0.75 代表此級享牌價 75 折。</p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-2.5 font-semibold">代號</th><th className="px-4 py-2.5 font-semibold">名稱</th>
            <th className="px-4 py-2.5 font-semibold w-28">乘數</th><th className="px-4 py-2.5 font-semibold">備註</th><th className="px-4 py-2.5 w-24"></th>
          </tr></thead>
          <tbody>
            {tiers.map((t, i) => (
              <tr key={t.id} className="border-b border-slate-100">
                <td className="px-4 py-2 font-mono font-semibold">{t.id}</td>
                <td className="px-4 py-2"><input defaultValue={t.name} onChange={e => tiers[i].name = e.target.value} className="w-full rounded border border-slate-200 px-2 py-1" /></td>
                <td className="px-4 py-2"><input type="number" step="0.01" defaultValue={t.price_rate} onChange={e => tiers[i].price_rate = Number(e.target.value)} className="w-24 rounded border border-slate-200 px-2 py-1 font-mono" /></td>
                <td className="px-4 py-2"><input defaultValue={t.note || ''} onChange={e => tiers[i].note = e.target.value} className="w-full rounded border border-slate-200 px-2 py-1" /></td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => save(tiers[i])} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Save className="h-4 w-4" /></button>
                    <button onClick={() => del(t.id)} className="rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50/60">
              <td className="px-4 py-2"><input value={draft.id} onChange={e => setDraft({ ...draft, id: e.target.value })} placeholder="如 D" className="w-16 rounded border border-slate-200 px-2 py-1 font-mono" /></td>
              <td className="px-4 py-2"><input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="等級名稱" className="w-full rounded border border-slate-200 px-2 py-1" /></td>
              <td className="px-4 py-2"><input type="number" step="0.01" value={draft.price_rate} onChange={e => setDraft({ ...draft, price_rate: e.target.value })} className="w-24 rounded border border-slate-200 px-2 py-1 font-mono" /></td>
              <td className="px-4 py-2"><input value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} placeholder="備註" className="w-full rounded border border-slate-200 px-2 py-1" /></td>
              <td className="px-4 py-2"><button onClick={add} className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white"><Plus className="h-3.5 w-3.5" />新增</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
