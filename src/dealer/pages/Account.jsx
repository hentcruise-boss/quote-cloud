import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Boxes, ReceiptText, ChevronRight, LogOut, Headset, BadgeCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../../lib/auth'

const BASE_LINKS = [
  { to: '/favorites', icon: Heart, label: '常用清單', desc: '收藏的品項，回購更快' },
  { to: '/inventory', icon: Boxes, label: '庫存代管', desc: '查看樹林倉庫存、申請出庫' },
  { to: '/billing', icon: ReceiptText, label: '對帳中心', desc: '月結對帳單、付款紀錄' },
]
const CORE_LINKS = [
  { to: '/custom', icon: Sparkles, label: '定制詢價', desc: '核心會員專屬：有限定制 / 加急', accent: 'amber' },
]

export default function Account() {
  const { dealer, tier, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-stone-800">我的</h1>

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <BadgeCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-stone-800">{dealer?.company || '經銷夥伴'}</div>
            <div className="text-sm text-stone-400">{dealer?.contact_name || ''}{dealer?.email ? ` · ${dealer.email}` : ''}</div>
          </div>
        </div>
        {tier && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
            定價等級：{tier.name}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {[
          ...(dealer?.member_type === 'core' ? CORE_LINKS : []),
          ...BASE_LINKS,
        ].map(({ to, icon: Icon, label, desc, accent }) => (
          <Link key={to} to={to} className={`flex items-center gap-3 rounded-2xl border bg-white p-4 ${accent === 'amber' ? 'border-amber-300 bg-amber-50/40' : 'border-stone-200'}`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-stone-50 text-teal-700'}`}><Icon className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-stone-800">{label}</div>
              <div className="text-xs text-stone-400">{desc}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-stone-300" />
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <Headset className="h-4 w-4 flex-shrink-0" />
        有任何問題，點右下角「聯絡專員」隨時找我們。
      </div>

      <button onClick={async () => { await signOut(); navigate('/login') }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-sm font-semibold text-stone-600">
        <LogOut className="h-4 w-4" />登出
      </button>
    </div>
  )
}
