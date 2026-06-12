import React, { useState } from 'react'
import { Banknote, Copy, Check } from 'lucide-react'
import { BANK_ACCOUNTS, BANK_KEYS } from '../../lib/bankInfo'

function CopyBtn({ text }) {
  const [done, setDone] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200) }
  return (
    <button onClick={copy} className={`ml-2 inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs ${done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{done ? '已複製' : '複製'}
    </button>
  )
}

function TWBlock({ a }) {
  const text = `戶名：${a.name}\n銀行：${a.bank}\n帳號：${a.account}`
  return (
    <>
      <Row label="戶名" value={a.name} />
      <Row label="銀行" value={`${a.bank}（${a.bankCode}）`} />
      <Row label="帳號" value={a.account} mono />
      <div className="border-t border-slate-100 pt-3">
        <div className="mb-1 text-[10px] uppercase text-slate-400">對外給客戶用（純文字）</div>
        <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700">{text}</pre>
        <div className="mt-2 flex justify-end"><CopyBtn text={text} /></div>
      </div>
    </>
  )
}

function OverseasBlock({ a }) {
  const text = `Beneficiary: ${a.beneficiary}\nBank: ${a.bank}\nSWIFT: ${a.swift}\nA/C (USD): ${a.usd}\nA/C (CNY): ${a.cny}`
  return (
    <>
      <Row label="Beneficiary" value={a.beneficiary} />
      <Row label="Bank" value={a.bank} />
      <Row label="SWIFT" value={a.swift} mono />
      <Row label="A/C (USD)" value={a.usd} mono />
      <Row label="A/C (CNY)" value={a.cny} mono />
      <div className="border-t border-slate-100 pt-3">
        <div className="mb-1 text-[10px] uppercase text-slate-400">For overseas suppliers / customers (plain text)</div>
        <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700">{text}</pre>
        <div className="mt-2 flex justify-end"><CopyBtn text={text} /></div>
      </div>
    </>
  )
}

const Row = ({ label, value, mono }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
    <span className="w-28 flex-shrink-0 text-xs text-slate-400">{label}</span>
    <span className={`text-right text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</span>
    <CopyBtn text={value} />
  </div>
)

export default function AdminBankAccounts() {
  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-lg font-bold"><Banknote className="h-5 w-5 text-teal-700" />銀行帳戶</h1>
      <p className="text-xs text-slate-500">
        後台「經銷商」可指定每位經銷商的訂單匯款卡顯示哪一個帳戶。
        對外提供帳戶資訊時，可從這裡直接複製標準格式文字。
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {BANK_KEYS.map(k => {
          const a = BANK_ACCOUNTS[k]
          return (
            <div key={k} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                <div className="text-sm font-bold text-slate-800">{a.label}</div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">key：{k}</div>
              </div>
              <div className="space-y-2 p-5">
                {a.type === 'TW' ? <TWBlock a={a} /> : <OverseasBlock a={a} />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
