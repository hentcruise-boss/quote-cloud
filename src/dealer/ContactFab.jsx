import React, { useState } from 'react'
import { Headset, X, Phone, MessageCircle } from 'lucide-react'
import { useAuth } from '../lib/auth'

// 每頁固定的「聯絡專員」入口（藍圖：留人工出口）
export default function ContactFab() {
  const { dealer } = useAuth()
  const [open, setOpen] = useState(false)
  const name = dealer?.rep_name || '專屬服務專員'
  const phone = dealer?.rep_phone || ''
  const telHref = phone ? 'tel:' + phone.replace(/[^0-9+]/g, '') : null

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed right-4 bottom-20 z-40 flex items-center gap-2 rounded-full bg-teal-700 px-4 py-3 text-white shadow-lg shadow-teal-700/30 active:scale-95 transition">
        <Headset className="w-5 h-5" />
        <span className="text-sm font-semibold hidden sm:inline">聯絡專員</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-700"><Headset className="w-5 h-5" /></div>
                <div>
                  <div className="text-xs text-stone-400">您的專屬窗口</div>
                  <div className="font-bold text-stone-800">{name}</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)}><X className="w-5 h-5 text-stone-400" /></button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-stone-500">
              平常自助下單、追蹤進度；有任何問題，隨時找專員——我們都在。
            </p>
            <div className="mt-5 space-y-2">
              {telHref ? (
                <a href={telHref} className="flex items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 font-semibold text-white">
                  <Phone className="w-4 h-4" />撥打 {phone}
                </a>
              ) : (
                <div className="rounded-xl bg-stone-100 py-3 text-center text-sm text-stone-400">尚未設定專員電話</div>
              )}
              <div className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 py-3 text-sm text-stone-500">
                <MessageCircle className="w-4 h-4" />營業時間 09:00–18:00
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
