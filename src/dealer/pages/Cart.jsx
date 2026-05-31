import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingCart, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useCart } from '../../lib/cart'
import { qtyRate } from '../../lib/pricing'
import { createOrder } from '../../lib/data'
import { nt, addTax, taxOf } from '../../lib/format'

const effUnit = (line) => Math.round(Number(line.unitPrice) * qtyRate({ qty_tiers: line.qty_tiers }, line.qty))

export default function Cart() {
  const { dealer } = useAuth()
  const { items, updateQty, removeItem, clear } = useCart()
  const navigate = useNavigate()
  const [withTax, setWithTax] = useState(true)
  const [form, setForm] = useState({ recipient: '', phone: '', address: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const subtotal = items.reduce((s, i) => s + effUnit(i) * i.qty, 0)
  const tax = taxOf(subtotal)
  const total = subtotal + tax

  const submit = async () => {
    if (items.length === 0) return
    if (!form.recipient || !form.phone || !form.address) { setErr('請填寫收貨人、電話與地址'); return }
    setErr(''); setBusy(true)
    try {
      const order = await createOrder({
        dealerId: dealer.id, ...form,
        items: items.map(i => ({ sku: i.sku, name: i.name, spec: i.spec, options: i.options, unitPrice: effUnit(i), qty: i.qty })),
      })
      clear()
      navigate(`/orders/${order.id}`)
    } catch (e) {
      console.error(e); setErr('送出失敗：' + (e.message || '請稍後再試')); setBusy(false)
    }
  }

  if (items.length === 0) return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-stone-800">我的訂單</h1>
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-16 text-center">
        <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-stone-300" />
        <p className="text-sm text-stone-400">尚未加入任何品項</p>
        <Link to="/catalog" className="mt-3 inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">去選品</Link>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-stone-800">我的訂單</h1>
        <button onClick={() => setWithTax(v => !v)} className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-500">
          明細{withTax ? '含稅' : '未稅'} · 切換
        </button>
      </div>

      <div className="space-y-3">
        {items.map(i => {
          const u = effUnit(i)
          const lineUnit = withTax ? addTax(u) : u
          return (
            <div key={i.key} className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-3">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100">
                {i.image_url && <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-stone-800">{i.name}</div>
                    {i.options?.length > 0 && (
                      <div className="mt-0.5 text-xs text-stone-400">{i.options.map(o => `${o.group_name}:${o.label}`).join(' · ')}</div>
                    )}
                  </div>
                  <button onClick={() => removeItem(i.key)} className="p-1 text-stone-300 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(i.key, i.qty - 1)} className="rounded-full border border-stone-200 p-1"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-8 text-center text-sm font-medium">{i.qty}</span>
                    <button onClick={() => updateQty(i.key, i.qty + 1)} className="rounded-full border border-stone-200 p-1"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold text-stone-800">{nt(lineUnit * i.qty)}</div>
                    <div className="text-[10px] text-stone-400">{nt(lineUnit)} / 件</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 收貨資訊 */}
      <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
        <div className="text-sm font-semibold text-stone-700">收貨 / 出庫資訊</div>
        <div className="grid grid-cols-2 gap-3">
          <input value={form.recipient} onChange={e => set('recipient', e.target.value)} placeholder="收貨人 *"
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-teal-400" />
          <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="聯絡電話 *"
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-teal-400" />
        </div>
        <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="收貨地址 *"
          className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-teal-400" />
        <textarea value={form.note} onChange={e => set('note', e.target.value)} placeholder="備註（選填）" rows={2}
          className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-teal-400" />
      </div>

      {/* 金額 */}
      <div className="space-y-1.5 rounded-2xl border border-stone-200 bg-white p-5 text-sm">
        <div className="flex justify-between text-stone-500"><span>未稅小計</span><span className="font-mono">{nt(subtotal)}</span></div>
        <div className="flex justify-between text-stone-500"><span>營業稅 5%</span><span className="font-mono">{nt(tax)}</span></div>
        <div className="flex justify-between border-t border-stone-100 pt-2 text-base font-bold text-stone-800"><span>含稅總計</span><span className="font-mono text-teal-700">{nt(total)}</span></div>
      </div>

      {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}

      <button onClick={submit} disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3.5 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60">
        {busy && <Loader2 className="h-5 w-5 animate-spin" />}{busy ? '送出中…' : '確認下單'}
      </button>
    </div>
  )
}
