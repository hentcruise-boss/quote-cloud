import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { fetchStatement } from '../../lib/data'
import { nt, fmtDate } from '../../lib/format'
import { statementLabel } from '../../lib/status'

export default function StatementDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { dealer } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => { setData(await fetchStatement(id)); setLoading(false) })()
  }, [id])

  if (loading) return <div className="py-20 text-center text-sm text-stone-400">載入中…</div>
  if (!data?.statement) return <div className="py-20 text-center text-sm text-stone-400">找不到對帳單。<Link to="/billing" className="text-teal-700">回對帳中心</Link></div>

  const { statement: s, items, payments } = data

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-stone-500"><ArrowLeft className="h-4 w-4" />返回</button>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white"><Printer className="h-4 w-4" />下載 / 列印 PDF</button>
      </div>

      {/* 對帳單本體（可列印） */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b border-stone-100 pb-4">
          <div>
            <div className="text-lg font-extrabold text-stone-800">木美家 · 月結對帳單</div>
            <div className="mt-1 font-mono text-xs text-stone-400">{s.statement_no}</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold text-stone-700">{s.period}</div>
            <div className="text-xs text-stone-400">{fmtDate(s.period_start)} ~ {fmtDate(s.period_end)}</div>
          </div>
        </div>

        <div className="flex justify-between py-3 text-sm">
          <div><div className="text-xs text-stone-400">經銷商</div><div className="font-semibold text-stone-700">{dealer?.company}</div></div>
          <div className="text-right"><div className="text-xs text-stone-400">狀態</div><div className="font-semibold text-stone-700">{statementLabel(s.status)}</div></div>
        </div>

        {/* 明細 */}
        <table className="mt-2 w-full text-sm">
          <thead><tr className="border-y border-stone-100 text-left text-xs text-stone-400">
            <th className="py-2 font-semibold">單號</th><th className="py-2 font-semibold">說明</th><th className="py-2 text-right font-semibold">金額</th>
          </tr></thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} className="border-b border-stone-50">
                <td className="py-2 font-mono text-xs">{it.ref}</td>
                <td className="py-2 text-stone-600">{it.description}</td>
                <td className="py-2 text-right font-mono">{nt(it.amount)}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-xs text-stone-400">本期無交易明細</td></tr>}
          </tbody>
        </table>

        {/* 金額彙總 */}
        <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-stone-500"><span>未稅小計</span><span className="font-mono">{nt(s.subtotal)}</span></div>
          <div className="flex justify-between text-stone-500"><span>營業稅</span><span className="font-mono">{nt(s.tax)}</span></div>
          <div className="flex justify-between border-t border-stone-100 pt-1 font-bold text-stone-800"><span>應收總額</span><span className="font-mono">{nt(s.total)}</span></div>
          <div className="flex justify-between text-stone-500"><span>已付</span><span className="font-mono">−{nt(s.paid)}</span></div>
          <div className="flex justify-between border-t border-stone-100 pt-1 text-base font-extrabold text-teal-700"><span>未結金額</span><span className="font-mono">{nt(s.outstanding)}</span></div>
        </div>

        {/* 付款紀錄 */}
        {payments.length > 0 && (
          <div className="mt-5 border-t border-stone-100 pt-4">
            <div className="mb-2 text-sm font-semibold text-stone-700">付款紀錄</div>
            <div className="space-y-1 text-sm">
              {payments.map(p => (
                <div key={p.id} className="flex justify-between text-stone-600">
                  <span>{fmtDate(p.paid_at)}{p.method ? ` · ${p.method}` : ''}{p.note ? ` · ${p.note}` : ''}</span>
                  <span className="font-mono text-emerald-600">{nt(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {s.note && <div className="mt-4 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">{s.note}</div>}
      </div>
    </div>
  )
}
