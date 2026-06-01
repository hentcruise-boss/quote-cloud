import { useEffect, useState } from 'react'
import { BarChart3, RefreshCw, TrendingUp, DollarSign, Percent } from 'lucide-react'
import * as api from '../lib/api'
import { nt, num } from '../lib/format'

const monthsBack = (n) => {
  const out = []; const now = new Date()
  for (let i = n - 1; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`) }
  return out
}
const mk = (s) => (s || '').slice(0, 7)

function GroupedBars({ months, series }) {
  const max = Math.max(1, ...series.flatMap(s => s.values))
  return (
    <div className="flex items-end gap-1.5 h-44">
      {months.map((m, i) => (
        <div key={m} className="flex-1 flex flex-col items-center justify-end gap-1">
          <div className="w-full flex items-end justify-center gap-0.5 flex-1">
            {series.map((s, si) => (
              <div key={si} className={`flex-1 rounded-t ${s.color}`} style={{ height: `${(s.values[i] / max) * 100}%`, minHeight: s.values[i] > 0 ? '2px' : '0' }} title={`${m} · ${s.label} ${num(s.values[i])}`}/>
            ))}
          </div>
          <span className="text-[9px] text-slate-400">{m.slice(5)}</span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ icon, label, value, tone }) {
  const tones = { indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600' }
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0"><div className="text-xl font-bold text-slate-800 leading-none">{value}</div><div className="text-xs text-slate-400 mt-1">{label}</div></div>
    </div>
  )
}

function Legend({ items }) {
  return <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-3">{items.map(it => <span key={it.label} className="inline-flex items-center gap-1"><span className={`w-3 h-3 rounded ${it.color}`}/>{it.label}</span>)}</div>
}

export default function ReportsPage() {
  const [paid, setPaid] = useState([])
  const [aq, setAq] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [pi, q] = await Promise.all([api.listPaidInvoices(), api.listAcceptedQuotes()])
      setPaid(pi.data || [])
      const quotes = q.data || []
      setAq(quotes)
      const ids = quotes.map(x => x.id)
      if (ids.length) { const it = await api.listQuoteItemsForQuotes(ids); setItems(it.data || []) }
      setLoading(false)
    })()
  }, [])

  const months = monthsBack(12)
  const idx = Object.fromEntries(months.map((m, i) => [m, i]))
  const revByMonth = months.map(m => paid.filter(p => mk(p.paid_at) === m).reduce((s, p) => s + Number(p.amount), 0))

  const quoteMonth = Object.fromEntries(aq.map(q => [q.id, mk(q.created_at)]))
  const salesByMonth = months.map(() => 0); const costByMonth = months.map(() => 0)
  items.forEach(it => { const i = idx[quoteMonth[it.quote_id]]; if (i !== undefined) { salesByMonth[i] += Number(it.price) * Number(it.qty); costByMonth[i] += Number(it.cost) * Number(it.qty) } })
  const marginByMonth = salesByMonth.map((s, i) => s - costByMonth[i])

  const thisYear = String(new Date().getFullYear())
  const revYTD = paid.filter(p => (p.paid_at || '').startsWith(thisYear)).reduce((s, p) => s + Number(p.amount), 0)
  const totalSales = salesByMonth.reduce((a, b) => a + b, 0)
  const totalMargin = marginByMonth.reduce((a, b) => a + b, 0)
  const avgMarginPct = totalSales > 0 ? (totalMargin / totalSales * 100) : 0

  if (loading) return <div className="py-20 text-center text-slate-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500"/>載入中…</div>

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-500"/>報表</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<DollarSign className="w-5 h-5"/>} label={`${thisYear} 年度已收`} value={nt(revYTD)} tone="emerald"/>
        <StatCard icon={<TrendingUp className="w-5 h-5"/>} label="近 12 月成交總額" value={nt(totalSales)} tone="indigo"/>
        <StatCard icon={<Percent className="w-5 h-5"/>} label="平均毛利率" value={`${avgMarginPct.toFixed(1)}%`} tone="amber"/>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-4">月營收(已收款)· 近 12 月</h2>
        <GroupedBars months={months} series={[{ label: '已收款', color: 'bg-emerald-500', values: revByMonth }]}/>
        <Legend items={[{ label: '已收款', color: 'bg-emerald-500' }]}/>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-4">成交銷售 vs 毛利(依接受的報價)· 近 12 月</h2>
        <GroupedBars months={months} series={[
          { label: '銷售額', color: 'bg-indigo-500', values: salesByMonth },
          { label: '毛利', color: 'bg-amber-400', values: marginByMonth },
        ]}/>
        <Legend items={[{ label: '銷售額', color: 'bg-indigo-500' }, { label: '毛利', color: 'bg-amber-400' }]}/>
      </div>
      <p className="text-xs text-slate-400">營收以「已收款的請款」統計;成交銷售/毛利以「已接受的報價」依建立月份統計。</p>
    </div>
  )
}
