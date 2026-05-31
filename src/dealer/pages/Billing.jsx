import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ReceiptText, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { fetchStatements } from '../../lib/data'
import { nt } from '../../lib/format'
import { statementLabel } from '../../lib/status'

function StatusPill({ s }) {
  const cls = s === 'paid' ? 'bg-emerald-50 text-emerald-700' : s === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{statementLabel(s)}</span>
}

export default function Billing() {
  const { dealer } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => { setList(await fetchStatements(dealer?.id)); setLoading(false) })()
  }, [dealer?.id])

  const totalOutstanding = list.reduce((s, x) => s + Number(x.outstanding), 0)

  if (loading) return <div className="py-20 text-center text-sm text-stone-400">載入中…</div>

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-lg font-bold text-stone-800"><ReceiptText className="h-5 w-5 text-teal-700" />對帳中心</h1>

      <div className="rounded-2xl bg-gradient-to-br from-stone-800 to-stone-700 p-5 text-white">
        <div className="text-xs text-stone-300">目前未結金額</div>
        <div className="mt-1 font-mono text-3xl font-extrabold">{nt(totalOutstanding)}</div>
        <div className="mt-1 text-xs text-stone-300">共 {list.length} 期對帳單</div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-16 text-center text-sm text-stone-400">尚無對帳單</div>
      ) : (
        <div className="space-y-2">
          {list.map(s => (
            <Link key={s.id} to={`/billing/${s.id}`} className="block rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-stone-800">{s.period} 月結</div>
                  <div className="font-mono text-xs text-stone-400">{s.statement_no}</div>
                </div>
                <div className="flex items-center gap-2"><StatusPill s={s.status} /><ChevronRight className="h-4 w-4 text-stone-300" /></div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-stone-400">應收 {nt(s.total)}</span>
                <span className="font-mono font-bold text-stone-800">未結 {nt(s.outstanding)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
