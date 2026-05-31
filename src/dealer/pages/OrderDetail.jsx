import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Check, Truck } from 'lucide-react'
import { fetchOrder } from '../../lib/data'
import { nt, fmtDate, fmtDateTime } from '../../lib/format'
import { ORDER_FLOW, statusIndex, statusLabel } from '../../lib/status'

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => { setData(await fetchOrder(id)); setLoading(false) })()
  }, [id])

  if (loading) return <div className="py-20 text-center text-sm text-stone-400">載入中…</div>
  if (!data?.order) return (
    <div className="py-20 text-center text-sm text-stone-400">找不到訂單。<Link to="/orders" className="text-teal-700">回訂單列表</Link></div>
  )

  const { order, items, events } = data
  const curIdx = statusIndex(order.status)
  const cancelled = order.status === 'cancelled'
  // 各階段完成時間（取該狀態最早一次事件）
  const eventAt = {}
  events.forEach(e => { if (!eventAt[e.status]) eventAt[e.status] = e.created_at })

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-stone-500">
        <ArrowLeft className="h-4 w-4" />返回
      </button>

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-lg font-bold text-stone-800">{order.order_no}</div>
            <div className="mt-0.5 text-xs text-stone-400">下單 {fmtDate(order.created_at)}</div>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cancelled ? 'bg-stone-100 text-stone-500' : order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' : 'bg-teal-50 text-teal-700'}`}>
            {statusLabel(order.status)}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-600">
          <Truck className="h-4 w-4 text-teal-600" />
          預計到貨日：<span className="font-semibold">{order.eta ? fmtDate(order.eta) : '待安排（專員確認後更新）'}</span>
        </div>
      </div>

      {/* 進度時間軸 */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="mb-4 text-sm font-semibold text-stone-700">物流進度</div>
        {cancelled ? (
          <div className="rounded-lg bg-stone-50 py-6 text-center text-sm text-stone-400">此訂單已取消</div>
        ) : (
          <ol className="relative ml-3 border-l-2 border-stone-100">
            {ORDER_FLOW.map((step, i) => {
              const done = i <= curIdx
              const current = i === curIdx
              return (
                <li key={step.key} className="mb-5 ml-5 last:mb-0">
                  <span className={`absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full ${done ? 'bg-teal-600' : 'bg-stone-200'}`}>
                    {done && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <div className={`text-sm font-semibold ${current ? 'text-teal-700' : done ? 'text-stone-700' : 'text-stone-400'}`}>
                    {step.label}{current && ' · 進行中'}
                  </div>
                  <div className="text-xs text-stone-400">{eventAt[step.key] ? fmtDateTime(eventAt[step.key]) : '—'}</div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {/* 品項 */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="mb-3 text-sm font-semibold text-stone-700">訂購品項</div>
        <div className="divide-y divide-stone-100">
          {items.map(it => (
            <div key={it.id} className="flex items-start justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-medium text-stone-800">{it.name}</div>
                {it.options?.length > 0 && <div className="text-xs text-stone-400">{it.options.map(o => `${o.group_name}:${o.label}`).join(' · ')}</div>}
                <div className="text-xs text-stone-400">{nt(it.unit_price)} × {it.qty}</div>
              </div>
              <div className="font-mono text-sm font-semibold text-stone-800">{nt(it.subtotal)}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
          <div className="flex justify-between text-stone-500"><span>未稅小計</span><span className="font-mono">{nt(order.subtotal)}</span></div>
          <div className="flex justify-between text-stone-500"><span>營業稅</span><span className="font-mono">{nt(order.tax)}</span></div>
          <div className="flex justify-between font-bold text-stone-800"><span>含稅總計</span><span className="font-mono text-teal-700">{nt(order.total)}</span></div>
        </div>
      </div>

      {/* 收貨資訊 */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm">
        <div className="mb-2 font-semibold text-stone-700">收貨資訊</div>
        <div className="space-y-1 text-stone-600">
          <div>{order.recipient} · {order.phone}</div>
          <div className="text-stone-500">{order.address}</div>
          {order.note && <div className="text-stone-400">備註：{order.note}</div>}
        </div>
      </div>
    </div>
  )
}
