import React, { useEffect, useState } from 'react'
import { X, FileText, Plus } from 'lucide-react'
import { supabase } from '../../supabase'
import { fetchStatement } from '../../lib/data'
import { nt, fmtDate } from '../../lib/format'
import { statementLabel } from '../../lib/status'

const lastDay = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0) }
// 以「本地」年月日格式化，避免 toISOString 在 UTC+8 把月底位移一天
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function StatementModal({ id, dealersMap, onClose, onChanged }) {
  const [data, setData] = useState(null)
  const [pay, setPay] = useState({ amount: '', method: '匯款', paid_at: toISO(new Date()), note: '' })
  const [busy, setBusy] = useState(false)
  const load = async () => setData(await fetchStatement(id))
  useEffect(() => { load() }, [id])

  const addPayment = async () => {
    if (!Number(pay.amount)) { alert('請輸入金額'); return }
    setBusy(true)
    const { error } = await supabase.rpc('payment_add', {
      p_statement: id, p_amount: Number(pay.amount), p_method: pay.method, p_paid_at: pay.paid_at, p_note: pay.note || null,
    })
    setBusy(false)
    if (error) { alert('登錄失敗：' + error.message); return }
    setPay({ amount: '', method: '匯款', paid_at: toISO(new Date()), note: '' }); load(); onChanged?.()
  }

  if (!data?.statement) return null
  const { statement: s, items, payments } = data

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div><h3 className="font-bold">{s.period} 月結 · {dealersMap[s.dealer_id]?.company || '—'}</h3>
            <div className="font-mono text-xs text-slate-400">{s.statement_no}</div></div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-400">應收</div><div className="font-mono font-bold">{nt(s.total)}</div></div>
            <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-400">已付</div><div className="font-mono font-bold text-emerald-600">{nt(s.paid)}</div></div>
            <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-400">未結</div><div className="font-mono font-bold text-teal-700">{nt(s.outstanding)}</div></div>
          </div>

          <div>
            <div className="mb-1 text-sm font-semibold text-slate-700">明細（{items.length}）</div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {items.map(it => <div key={it.id} className="flex justify-between px-3 py-2 text-sm"><span className="text-slate-600">{it.description}</span><span className="font-mono">{nt(it.amount)}</span></div>)}
              {items.length === 0 && <div className="px-3 py-4 text-center text-xs text-slate-400">本期無明細</div>}
            </div>
          </div>

          {/* 登錄付款 */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-700">登錄付款</div>
            <div className="flex flex-wrap items-end gap-2">
              <div><label className="mb-1 block text-xs text-slate-500">金額</label><input type="number" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-mono" /></div>
              <div><label className="mb-1 block text-xs text-slate-500">方式</label>
                <select value={pay.method} onChange={e => setPay({ ...pay, method: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
                  {['匯款', '現金', '支票', '其他'].map(m => <option key={m}>{m}</option>)}
                </select></div>
              <div><label className="mb-1 block text-xs text-slate-500">日期</label><input type="date" value={pay.paid_at} onChange={e => setPay({ ...pay, paid_at: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" /></div>
              <button onClick={addPayment} disabled={busy} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">登錄</button>
            </div>
            {payments.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-sm">
                {payments.map(p => <div key={p.id} className="flex justify-between text-slate-600"><span>{fmtDate(p.paid_at)} · {p.method}</span><span className="font-mono text-emerald-600">{nt(p.amount)}</span></div>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminBilling() {
  const [dealers, setDealers] = useState([])
  const [statements, setStatements] = useState([])
  const [gen, setGen] = useState({ dealer: '', month: new Date().toISOString().slice(0, 7) })
  const [openId, setOpenId] = useState(null)
  const dealersMap = Object.fromEntries(dealers.map(d => [d.id, d]))

  const load = async () => {
    const [{ data: d }, { data: s }] = await Promise.all([
      supabase.from('dealers').select('id, company').order('company'),
      supabase.from('statements').select('*').order('period', { ascending: false }),
    ])
    setDealers(d || []); setStatements(s || [])
  }
  useEffect(() => { load() }, [])

  const generate = async () => {
    if (!gen.dealer || !gen.month) { alert('請選擇經銷商與月份'); return }
    const start = gen.month + '-01'
    const end = toISO(lastDay(gen.month))
    if (!confirm(`產生 ${dealersMap[gen.dealer]?.company} ${gen.month} 月結對帳單？（同月若已存在將覆蓋）`)) return
    const { error } = await supabase.rpc('statement_generate', { p_dealer: gen.dealer, p_start: start, p_end: end, p_period: gen.month })
    if (error) { alert('產生失敗：' + error.message); return }
    load()
  }

  return (
    <div className="space-y-5">
      {openId && <StatementModal id={openId} dealersMap={dealersMap} onClose={() => setOpenId(null)} onChanged={load} />}
      <h1 className="text-lg font-bold">對帳中心</h1>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <FileText className="mb-2 h-5 w-5 text-slate-400" />
        <div><label className="mb-1 block text-xs text-slate-500">經銷商</label>
          <select value={gen.dealer} onChange={e => setGen({ ...gen, dealer: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">— 選擇 —</option>{dealers.map(d => <option key={d.id} value={d.id}>{d.company}</option>)}
          </select></div>
        <div><label className="mb-1 block text-xs text-slate-500">月份</label>
          <input type="month" value={gen.month} onChange={e => setGen({ ...gen, month: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
        <button onClick={generate} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />產生月結對帳單</button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-2.5 font-semibold">期間</th><th className="px-4 py-2.5 font-semibold">經銷商</th><th className="px-4 py-2.5 font-semibold">應收</th>
            <th className="px-4 py-2.5 font-semibold">已付</th><th className="px-4 py-2.5 font-semibold">未結</th><th className="px-4 py-2.5 font-semibold">狀態</th>
          </tr></thead>
          <tbody>
            {statements.map(s => (
              <tr key={s.id} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => setOpenId(s.id)}>
                <td className="px-4 py-2.5"><div className="font-semibold">{s.period}</div><div className="font-mono text-xs text-slate-400">{s.statement_no}</div></td>
                <td className="px-4 py-2.5">{dealersMap[s.dealer_id]?.company || '—'}</td>
                <td className="px-4 py-2.5 font-mono">{nt(s.total)}</td>
                <td className="px-4 py-2.5 font-mono text-emerald-600">{nt(s.paid)}</td>
                <td className="px-4 py-2.5 font-mono font-bold">{nt(s.outstanding)}</td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : s.status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600'}`}>{statementLabel(s.status)}</span></td>
              </tr>
            ))}
            {statements.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">尚無對帳單，從上方產生</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
