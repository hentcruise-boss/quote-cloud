import React, { useEffect, useState } from 'react'
import { X, ArrowRight, Ban } from 'lucide-react'
import { supabase } from '../../supabase'
import { nt, fmtDate, fmtDateTime } from '../../lib/format'
import { ORDER_FLOW, statusLabel, statusIndex, nextStatus } from '../../lib/status'
import { orderModeLabel, deliveryLabel } from '../../lib/filters'

function OrderModal({ id, dealersMap, onClose, onChanged }) {
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [events, setEvents] = useState([])
  const [eta, setEta] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data: o } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
    const { data: it } = await supabase.from('order_items').select('*').eq('order_id', id)
    const { data: ev } = await supabase.from('order_status_events').select('*').eq('order_id', id).order('created_at')
    setOrder(o); setItems(it || []); setEvents(ev || []); setEta(o?.eta || '')
  }
  useEffect(() => { load() }, [id])

  const setStatus = async (status) => {
    setBusy(true); await supabase.from('orders').update({ status }).eq('id', id); await load(); setBusy(false); onChanged?.()
  }
  const saveEta = async () => { await supabase.from('orders').update({ eta: eta || null }).eq('id', id); onChanged?.() }

  if (!order) return null
  const nxt = nextStatus(order.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="font-mono font-bold">{order.order_no}</h3>
            <div className="text-xs text-slate-400">{dealersMap[order.dealer_id]?.company || '—'} · {fmtDate(order.created_at)}</div>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* 狀態控制 */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">目前狀態：<span className="text-teal-700">{statusLabel(order.status)}</span></span>
              {order.status !== 'cancelled' && (
                <button onClick={() => setStatus('cancelled')} className="flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs text-rose-500"><Ban className="h-3.5 w-3.5" />取消訂單</button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ORDER_FLOW.map((s, i) => (
                <button key={s.key} onClick={() => setStatus(s.key)} disabled={busy}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${i <= statusIndex(order.status) ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            {nxt && (
              <button onClick={() => setStatus(nxt)} disabled={busy}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                推進到「{statusLabel(nxt)}」<ArrowRight className="h-4 w-4" />
              </button>
            )}
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-slate-500">預計到貨日</span>
              <input type="date" value={eta || ''} onChange={e => setEta(e.target.value)} className="rounded border border-slate-200 px-2 py-1" />
              <button onClick={saveEta} className="rounded-lg border border-slate-200 px-3 py-1 text-xs">儲存</button>
            </div>
          </div>

          {/* 收貨資訊 */}
          <div className="rounded-xl border border-slate-200 p-4 text-sm">
            <div className="mb-1 font-semibold text-slate-700">收貨資訊</div>
            <div className="text-slate-600">{order.recipient} · {order.phone}</div>
            <div className="text-slate-500">{order.address}</div>
            {order.note && <div className="text-slate-400">備註：{order.note}</div>}
          </div>

          {/* 品項 */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-700">品項</div>
            <div className="divide-y divide-slate-100">
              {items.map(it => (
                <div key={it.id} className="flex justify-between py-2 text-sm">
                  <div><div className="font-medium">{it.name}</div>
                    {it.options?.length > 0 && <div className="text-xs text-slate-400">{it.options.map(o => `${o.group_name}:${o.label}`).join(' · ')}</div>}
                    <div className="text-xs text-slate-400">{nt(it.unit_price)} × {it.qty}</div></div>
                  <div className="font-mono">{nt(it.subtotal)}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-sm">
              <div className="flex justify-between text-slate-500"><span>未稅</span><span className="font-mono">{nt(order.subtotal)}</span></div>
              {Number(order.assembly_fee) > 0 && <div className="flex justify-between text-slate-500"><span>組配費（已含於未稅）</span><span className="font-mono">{nt(order.assembly_fee)}</span></div>}
              <div className="flex justify-between text-slate-500"><span>稅</span><span className="font-mono">{nt(order.tax)}</span></div>
              <div className="flex justify-between font-bold"><span>含稅總計</span><span className="font-mono text-teal-700">{nt(order.total)}</span></div>
              {Number(order.deposit_amount) > 0 && Number(order.deposit_amount) < Number(order.total) && (
                <div className="flex justify-between pt-1 text-amber-700"><span>定金 / 尾款</span><span className="font-mono">{nt(order.deposit_amount)} / {nt(order.balance_amount)}</span></div>
              )}
            </div>
            {order.order_mode && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                <span className="rounded bg-slate-100 px-2 py-1">下單方式：<b>{orderModeLabel(order.order_mode)}</b></span>
                <span className="rounded bg-slate-100 px-2 py-1">配送：<b>{deliveryLabel(order.delivery_service)}</b></span>
              </div>
            )}
          </div>

          {/* 時間軸 */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-700">狀態紀錄</div>
            <div className="space-y-1.5 text-sm">
              {events.map(e => (
                <div key={e.id} className="flex justify-between"><span className="text-slate-600">{statusLabel(e.status)}{e.note ? ` · ${e.note}` : ''}</span><span className="text-xs text-slate-400">{fmtDateTime(e.created_at)}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [dealersMap, setDealersMap] = useState({})
  const [openId, setOpenId] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = async () => {
    const [{ data: o }, { data: d }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('dealers').select('id, company'),
    ])
    setOrders(o || [])
    setDealersMap(Object.fromEntries((d || []).map(x => [x.id, x])))
  }
  useEffect(() => { load() }, [])

  const shown = orders.filter(o => filter === 'all' ? true : filter === 'open' ? !['delivered', 'cancelled'].includes(o.status) : o.status === filter)

  return (
    <div className="space-y-4">
      {openId && <OrderModal id={openId} dealersMap={dealersMap} onClose={() => setOpenId(null)} onChanged={load} />}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">訂單（{orders.length}）</h1>
        <div className="flex gap-1 text-xs">
          {[['all', '全部'], ['open', '進行中'], ['delivered', '已出庫'], ['cancelled', '已取消']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1 font-medium ${filter === k ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-2.5 font-semibold">訂單編號</th><th className="px-4 py-2.5 font-semibold">經銷商</th><th className="px-4 py-2.5 font-semibold">日期</th>
            <th className="px-4 py-2.5 font-semibold">金額</th><th className="px-4 py-2.5 font-semibold">到貨日</th><th className="px-4 py-2.5 font-semibold">狀態</th>
          </tr></thead>
          <tbody>
            {shown.map(o => (
              <tr key={o.id} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => setOpenId(o.id)}>
                <td className="px-4 py-2.5 font-mono text-xs font-semibold">{o.order_no}</td>
                <td className="px-4 py-2.5">{dealersMap[o.dealer_id]?.company || '—'}</td>
                <td className="px-4 py-2.5 text-slate-500">{fmtDate(o.created_at)}</td>
                <td className="px-4 py-2.5 font-mono">{nt(o.total)}</td>
                <td className="px-4 py-2.5 text-slate-500">{o.eta ? fmtDate(o.eta) : '—'}</td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${o.status === 'cancelled' ? 'bg-slate-100 text-slate-500' : o.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' : 'bg-teal-50 text-teal-700'}`}>{statusLabel(o.status)}</span></td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">沒有訂單</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
