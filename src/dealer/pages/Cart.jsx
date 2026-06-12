import React, { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingCart, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useCart } from '../../lib/cart'
import { qtyRate } from '../../lib/pricing'
import { createOrder } from '../../lib/data'
import { nt, addTax, taxOf } from '../../lib/format'
import { ORDER_MODES, DELIVERY_SERVICES, computeAssemblyFee, ASSEMBLY_FREE_THRESHOLD } from '../../lib/filters'
import ContainerCountdown from '../ContainerCountdown'

const effUnit = (line) => Math.round(Number(line.unitPrice) * qtyRate({ qty_tiers: line.qty_tiers }, line.qty))

export default function Cart() {
  const { dealer } = useAuth()
  const { items, updateQty, removeItem, clear } = useCart()
  const navigate = useNavigate()
  const [withTax, setWithTax] = useState(true)
  const [mode, setMode] = useState('cash')
  const [delivery, setDelivery] = useState('self')
  const [form, setForm] = useState({ recipient: '', phone: '', address: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const modeObj = useMemo(() => ORDER_MODES.find(m => m.key === mode), [mode])
  const deliveryObj = useMemo(() => DELIVERY_SERVICES.find(d => d.key === delivery), [delivery])

  // 注意：購物車裡的 unitPrice 是「品項本身」的單價（未含 mode 的折扣）。
  // mode 的價格倍率（lock10 = 0.9）統一在這裡套用，讓三種方式都同一份明細推算。
  const itemsSub = items.reduce((s, i) => s + Math.round(effUnit(i) * (modeObj?.priceRate ?? 1)) * i.qty, 0)
  const assemblyFee = delivery === 'assembly' ? computeAssemblyFee(itemsSub) : 0
  const subtotal = itemsSub + assemblyFee
  const tax = taxOf(subtotal)
  const total = subtotal + tax
  const deposit = Math.round(total * (modeObj?.depositRate ?? 1))
  const balance = total - deposit

  const submit = async () => {
    if (items.length === 0) return
    if (!form.recipient || !form.phone || !form.address) { setErr('請填寫收貨人、電話與地址'); return }
    setErr(''); setBusy(true)
    try {
      const order = await createOrder({
        dealerId: dealer.id, ...form,
        orderMode: mode, deliveryService: delivery,
        assemblyFee, depositRate: modeObj?.depositRate ?? 1,
        items: items.map(i => ({
          sku: i.sku, name: i.name, spec: i.spec, options: i.options,
          unitPrice: Math.round(effUnit(i) * (modeObj?.priceRate ?? 1)), qty: i.qty,
        })),
      })
      clear()
      navigate(`/orders/${order.id}`)
    } catch (e) {
      console.error(e); setErr('送出失敗：' + (e.message || '請稍後再試')); setBusy(false)
    }
  }

  if (items.length === 0) return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-stone-800">購物車</h1>
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
        <h1 className="text-lg font-bold text-stone-800">購物車</h1>
        <button onClick={() => setWithTax(v => !v)} className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-500">
          明細{withTax ? '含稅' : '未稅'} · 切換
        </button>
      </div>

      <ContainerCountdown compact />

      {/* 品項 */}
      <div className="space-y-3">
        {items.map(i => {
          const u = Math.round(effUnit(i) * (modeObj?.priceRate ?? 1))
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

      {/* 下單方式 */}
      <div className="space-y-2 rounded-2xl border border-stone-200 bg-white p-5">
        <div className="text-sm font-semibold text-stone-700">下單方式</div>
        <div className="space-y-2">
          {ORDER_MODES.map(m => {
            const active = mode === m.key
            return (
              <button key={m.key} type="button" onClick={() => setMode(m.key)}
                className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition ${active ? 'border-teal-600 bg-teal-50/40' : 'border-stone-200'}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-4 w-4 flex-shrink-0 rounded-full border ${active ? 'border-teal-600 bg-teal-600' : 'border-stone-300'}`} />
                    <span className="text-sm font-semibold text-stone-800">{m.label}</span>
                    {m.priceRate < 1 && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">{Math.round((1 - m.priceRate) * 100)}% off</span>}
                  </div>
                  <div className="ml-6 mt-0.5 text-xs text-stone-500">{m.note}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-stone-400">{m.prep}</div>
                  <div className="text-[10px] text-stone-400">定金 {Math.round(m.depositRate * 100)}%</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 配送服務 */}
      <div className="space-y-2 rounded-2xl border border-stone-200 bg-white p-5">
        <div className="text-sm font-semibold text-stone-700">配送服務</div>
        <div className="space-y-2">
          {DELIVERY_SERVICES.map(d => {
            const active = delivery === d.key
            const fee = d.key === 'assembly' ? computeAssemblyFee(itemsSub) : 0
            const gap = ASSEMBLY_FREE_THRESHOLD - itemsSub
            const pct = Math.min(100, Math.round(itemsSub / ASSEMBLY_FREE_THRESHOLD * 100))
            return (
              <button key={d.key} type="button" onClick={() => setDelivery(d.key)}
                className={`flex w-full flex-col gap-2 rounded-xl border p-3 text-left transition ${active ? 'border-teal-600 bg-teal-50/40' : 'border-stone-200'}`}>
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-4 w-4 flex-shrink-0 rounded-full border ${active ? 'border-teal-600 bg-teal-600' : 'border-stone-300'}`} />
                      <span className="text-sm font-semibold text-stone-800">{d.label}</span>
                    </div>
                    <div className="ml-6 mt-0.5 text-xs text-stone-500">{d.note}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold text-stone-800">{fee === 0 ? '免費' : `+${nt(fee)}`}</div>
                  </div>
                </div>
                {d.key === 'assembly' && (
                  gap > 0 ? (
                    <div className="ml-6 w-[calc(100%-1.5rem)]">
                      <div className="mb-1 text-[11px] text-amber-700">再加購 <b className="font-mono">{nt(gap)}</b>（未稅）即可<b>免組配費 {nt(3000)}</b></div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ) : itemsSub > 0 && (
                    <div className="ml-6 text-[11px] font-semibold text-emerald-600">已達免組配費門檻 🎉</div>
                  )
                )}
              </button>
            )
          })}
        </div>
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
        <div className="flex justify-between text-stone-500"><span>品項小計（未稅）</span><span className="font-mono">{nt(itemsSub)}</span></div>
        {assemblyFee > 0 && <div className="flex justify-between text-stone-500"><span>組配服務費</span><span className="font-mono">{nt(assemblyFee)}</span></div>}
        <div className="flex justify-between text-stone-500"><span>營業稅 5%</span><span className="font-mono">{nt(tax)}</span></div>
        <div className="flex justify-between border-t border-stone-100 pt-2 text-base font-bold text-stone-800"><span>含稅總計</span><span className="font-mono text-teal-700">{nt(total)}</span></div>
        {modeObj && modeObj.depositRate < 1 && (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-amber-50 p-3 text-xs">
            <div><div className="text-amber-700">本次須付定金</div><div className="font-mono text-base font-bold text-amber-900">{nt(deposit)}</div></div>
            <div className="text-right"><div className="text-amber-700">出貨前付尾款</div><div className="font-mono text-base font-bold text-amber-900">{nt(balance)}</div></div>
          </div>
        )}
      </div>

      {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}

      <button onClick={submit} disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3.5 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60">
        {busy && <Loader2 className="h-5 w-5 animate-spin" />}
        {busy ? '送出中…' : modeObj && modeObj.depositRate < 1 ? `確認下單 · 付定金 ${nt(deposit)}` : '確認下單'}
      </button>
    </div>
  )
}
