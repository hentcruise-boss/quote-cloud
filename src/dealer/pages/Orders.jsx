import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { fetchOrders } from '../../lib/data'
import { nt, fmtDate } from '../../lib/format'
import { statusLabel, statusIndex } from '../../lib/status'

function StatusPill({ status }) {
  const cancelled = status === 'cancelled'
  const done = status === 'delivered'
  const cls = cancelled ? 'bg-stone-100 text-stone-500'
    : done ? 'bg-emerald-50 text-emerald-700'
    : 'bg-teal-50 text-teal-700'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{statusLabel(status)}</span>
}

export default function Orders() {
  const { dealer } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => { setOrders(await fetchOrders(dealer?.id)); setLoading(false) })()
  }, [dealer?.id])

  if (loading) return <div className="py-20 text-center text-sm text-stone-400">載入中…</div>

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-stone-800">訂單進度</h1>
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-16 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-stone-300" />
          <p className="text-sm text-stone-400">還沒有訂單</p>
          <Link to="/catalog" className="mt-3 inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">去選品</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => {
            const idx = statusIndex(o.status)
            const pct = o.status === 'cancelled' ? 0 : Math.max(0, idx) / 5 * 100
            return (
              <Link key={o.id} to={`/orders/${o.id}`} className="block rounded-2xl border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm font-bold text-stone-800">{o.order_no}</div>
                    <div className="mt-0.5 text-xs text-stone-400">{fmtDate(o.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={o.status} />
                    <ChevronRight className="h-4 w-4 text-stone-300" />
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-stone-400">{o.eta ? `預計到貨 ${fmtDate(o.eta)}` : '到貨日待定'}</span>
                  <span className="font-mono font-bold text-teal-700">{nt(o.total)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
