import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Check, Truck, Banknote, Copy, Upload, FileCheck2, Loader2, RotateCcw } from 'lucide-react'
import { fetchOrder, uploadPaymentProof, paymentProofSignedUrl, fetchProducts, fetchOverrides } from '../../lib/data'
import { nt, fmtDate, fmtDateTime } from '../../lib/format'
import { flowFor, statusIndexInFlow, statusLabel } from '../../lib/status'
import { orderModeLabel, deliveryLabel } from '../../lib/filters'
import { tierUnitPrice, optionsDelta } from '../../lib/pricing'
import { bankAccount } from '../../lib/bankInfo'
import { useAuth } from '../../lib/auth'
import { useCart } from '../../lib/cart'

function BankAccountRows({ account, order, copy }) {
  if (account.type === 'OVERSEAS') {
    return (
      <>
        <Row label="Beneficiary" value={account.beneficiary} copy={copy} />
        <Row label="Bank"  value={account.bank} />
        <Row label="SWIFT" value={account.swift} mono copy={copy} />
        <Row label="A/C (USD)" value={account.usd} mono copy={copy} />
        <Row label="A/C (CNY)" value={account.cny} mono copy={copy} />
        <Row label="Reference" value={order.order_no} mono copy={copy} hint="Please include order number as reference" />
      </>
    )
  }
  return (
    <>
      <Row label="戶名" value={account.name} copy={copy} />
      <Row label="銀行" value={account.bank} />
      <Row label="帳號" value={account.account} mono copy={copy} />
      <Row label="備註" value={order.order_no} mono copy={copy} hint="請於匯款備註欄填上訂單編號" />
    </>
  )
}

function PaymentInfoCard({ order, onUploaded }) {
  const { dealer } = useAuth()
  const account = bankAccount(dealer?.bank_account_key)
  const isDeposit = Number(order.deposit_amount) > 0 && Number(order.deposit_amount) < Number(order.total)
  const dueAmount = isDeposit ? order.deposit_amount : order.total
  const copy = (t) => navigator.clipboard?.writeText(t)
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [proofUrl, setProofUrl] = useState(null)

  useEffect(() => {
    if (order.payment_proof) paymentProofSignedUrl(order.payment_proof).then(setProofUrl)
    else setProofUrl(null)
  }, [order.payment_proof])

  const handleFile = async (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setErr('檔案請小於 5MB'); return }
    setErr(''); setBusy(true)
    try { await uploadPaymentProof(order.id, file); onUploaded?.() }
    catch (e) { setErr('上傳失敗：' + (e.message || '請確認 Storage 已建立')) }
    finally { setBusy(false) }
  }

  const isOverseas = account.type === 'OVERSEAS'

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-amber-50">
      <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-100/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-amber-700" />
          <div className="text-sm font-bold text-amber-900">{isOverseas ? 'Please complete the wire transfer within 3 days' : '請於 3 日內完成匯款'}</div>
        </div>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{account.label}</span>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <div className="text-xs text-amber-700">{isOverseas ? `Amount due (${isDeposit ? 'Deposit' : 'Full payment'})` : `本次須匯金額（${isDeposit ? '定金' : '全款'}）`}</div>
          <div className="mt-0.5 font-mono text-3xl font-extrabold text-amber-900">{nt(dueAmount)}</div>
        </div>
        <div className="space-y-1.5 rounded-xl bg-white px-4 py-3 text-sm">
          <BankAccountRows account={account} order={order} copy={copy} />
        </div>
        <p className="text-xs leading-relaxed text-amber-800">
          {isOverseas
            ? 'After transfer, please upload the proof of payment and wait for confirmation. Status will update automatically.'
            : '請於匯款時於備註填上訂單編號，方便對帳。完成後請上傳匯款憑證並等待專員確認，狀態會自動更新為「已收款」。'}
        </p>

        {/* 上傳區塊 */}
        <div className="rounded-xl border border-amber-200 bg-white p-3">
          {order.payment_proof ? (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-emerald-700"><FileCheck2 className="h-4 w-4" />{isOverseas ? 'Proof uploaded, awaiting confirmation' : '已上傳憑證，等候專員確認'}</span>
              <div className="flex gap-2">
                {proofUrl && <a href={proofUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-600">{isOverseas ? 'View' : '檢視'}</a>}
                <button onClick={() => inputRef.current?.click()} className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-600">{isOverseas ? 'Re-upload' : '重新上傳'}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => inputRef.current?.click()} disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-700 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? (isOverseas ? 'Uploading…' : '上傳中…') : (isOverseas ? 'Upload Proof of Payment (image / PDF)' : '上傳匯款憑證（截圖 / PDF）')}
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={e => handleFile(e.target.files?.[0])} />
          {err && <div className="mt-2 text-xs text-rose-600">{err}</div>}
        </div>
      </div>
    </div>
  )
}
const Row = ({ label, value, mono, copy, hint }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-xs text-stone-400">{label}</span>
    <div className="flex items-center gap-2">
      <span className={`text-sm text-stone-800 ${mono ? 'font-mono' : ''}`}>{value}</span>
      {copy && <button onClick={() => copy(value)} title={hint || '複製'} className="text-stone-400 hover:text-teal-700"><Copy className="h-3.5 w-3.5" /></button>}
    </div>
  </div>
)

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { dealer, tier } = useAuth()
  const { addItem } = useCart()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(false)

  const load = async () => { setData(await fetchOrder(id)); setLoading(false) }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [id])

  // 一鍵回購：以「目前專屬價」重算，選配沿用當時快照的加價
  const reorder = async () => {
    setReordering(true)
    try {
      const [products, overrides] = await Promise.all([fetchProducts(), fetchOverrides(dealer?.id)])
      let added = 0, skipped = 0
      for (const it of (data?.items || [])) {
        const p = products.find(x => x.sku === it.sku)
        if (!p) { skipped++; continue }
        const opts = it.options || []
        addItem({
          sku: p.sku, name: p.name, spec: p.spec, image_url: p.image_url,
          options: opts,
          unitPrice: Math.round(tierUnitPrice({ product: p, tier, override: overrides[p.sku] }) + optionsDelta(opts)),
          qty_tiers: p.qty_tiers || [],
          qty: Number(it.qty) || 1,
        })
        added++
      }
      if (skipped > 0) alert(`${skipped} 個品項已下架，未加入；其餘 ${added} 項已加入購物車（價格依目前專屬價重算）。`)
      navigate('/cart')
    } finally { setReordering(false) }
  }

  if (loading) return <div className="py-20 text-center text-sm text-stone-400">載入中…</div>
  if (!data?.order) return (
    <div className="py-20 text-center text-sm text-stone-400">找不到訂單。<Link to="/orders" className="text-teal-700">回訂單列表</Link></div>
  )

  const { order, items, events } = data
  const flow = flowFor(order.order_mode || 'cash')
  const curIdx = statusIndexInFlow(order.status, order.order_mode || 'cash')
  const cancelled = order.status === 'cancelled'
  const awaitingPayment = order.status === 'awaiting_payment'
  // 各階段完成時間（取該狀態最早一次事件）
  const eventAt = {}
  events.forEach(e => { if (!eventAt[e.status]) eventAt[e.status] = e.created_at })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-stone-500">
          <ArrowLeft className="h-4 w-4" />返回
        </button>
        {!cancelled && (
          <button onClick={reorder} disabled={reordering}
            className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
            {reordering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            再下一單
          </button>
        )}
      </div>

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
        {order.order_mode && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md border border-stone-200 bg-white px-2 py-1 text-stone-600">下單方式：<b className="text-stone-800">{orderModeLabel(order.order_mode)}</b></span>
            <span className="rounded-md border border-stone-200 bg-white px-2 py-1 text-stone-600">配送：<b className="text-stone-800">{deliveryLabel(order.delivery_service)}</b></span>
          </div>
        )}
      </div>

      {/* 待收款時顯示匯款資訊 */}
      {awaitingPayment && !cancelled && <PaymentInfoCard order={order} onUploaded={load} />}

      {/* 進度時間軸 */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="mb-4 text-sm font-semibold text-stone-700">訂單進度</div>
        {cancelled ? (
          <div className="rounded-lg bg-stone-50 py-6 text-center text-sm text-stone-400">此訂單已取消</div>
        ) : (
          <ol className="relative ml-3 border-l-2 border-stone-100">
            {flow.map((step, i) => {
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
          {Number(order.assembly_fee) > 0 && <div className="flex justify-between text-stone-500"><span>組配服務費（已含於小計）</span><span className="font-mono">{nt(order.assembly_fee)}</span></div>}
          <div className="flex justify-between text-stone-500"><span>營業稅</span><span className="font-mono">{nt(order.tax)}</span></div>
          <div className="flex justify-between font-bold text-stone-800"><span>含稅總計</span><span className="font-mono text-teal-700">{nt(order.total)}</span></div>
          {Number(order.deposit_amount) > 0 && Number(order.deposit_amount) < Number(order.total) && (
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-amber-50 p-3 text-xs">
              <div><div className="text-amber-700">定金</div><div className="font-mono text-base font-bold text-amber-900">{nt(order.deposit_amount)}</div></div>
              <div className="text-right"><div className="text-amber-700">尾款</div><div className="font-mono text-base font-bold text-amber-900">{nt(order.balance_amount)}</div></div>
            </div>
          )}
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
