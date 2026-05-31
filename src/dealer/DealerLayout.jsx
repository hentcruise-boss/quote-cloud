import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, LayoutGrid, ShoppingCart, ClipboardList, Heart, Bell, LogOut, Sofa } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { fetchNotifications, markNotificationRead } from '../lib/data'
import { fmtDateTime } from '../lib/format'
import ContactFab from './ContactFab'

const NAV = [
  { to: '/', icon: Home, label: '首頁', end: true },
  { to: '/catalog', icon: LayoutGrid, label: '選品' },
  { to: '/cart', icon: ShoppingCart, label: '訂單', cart: true },
  { to: '/orders', icon: ClipboardList, label: '進度' },
  { to: '/favorites', icon: Heart, label: '收藏' },
]

function NotificationBell() {
  const { dealer } = useAuth()
  const [open, setOpen] = useState(false)
  const [list, setList] = useState([])
  const unread = list.filter(n => !n.is_read).length

  const load = async () => setList(await fetchNotifications(dealer?.id))
  useEffect(() => { if (dealer?.id) load() /* eslint-disable-next-line */ }, [dealer?.id])

  const openPanel = async () => {
    setOpen(o => !o)
    if (!open) {
      const unreadIds = list.filter(n => !n.is_read).map(n => n.id)
      if (unreadIds.length) { await Promise.all(unreadIds.map(markNotificationRead)); load() }
    }
  }

  return (
    <div className="relative">
      <button onClick={openPanel} className="relative rounded-full p-2 hover:bg-stone-100">
        <Bell className="w-5 h-5 text-stone-600" />
        {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1 w-80 max-w-[88vw] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
            <div className="border-b border-stone-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-stone-400">通知</div>
            <div className="max-h-80 overflow-y-auto">
              {list.length === 0 && <div className="px-4 py-8 text-center text-sm text-stone-400">目前沒有通知</div>}
              {list.map(n => (
                <div key={n.id} className="border-b border-stone-50 px-4 py-3">
                  <div className="text-sm font-semibold text-stone-700">{n.title}</div>
                  {n.body && <div className="mt-0.5 text-xs leading-relaxed text-stone-500">{n.body}</div>}
                  <div className="mt-1 text-[10px] text-stone-300">{fmtDateTime(n.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function DealerLayout({ children }) {
  const { dealer, signOut } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-stone-50 pb-20 font-sans text-stone-800">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white"><Sofa className="w-4 h-4" /></div>
            <div className="leading-none">
              <div className="text-sm font-extrabold text-stone-800">木美家</div>
              <div className="mt-0.5 text-[10px] text-stone-400">入庫代管 · 下單系統</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <div className="hidden px-2 text-right sm:block">
              <div className="text-xs font-semibold text-stone-700">{dealer?.company || '—'}</div>
              <div className="text-[10px] text-stone-400">{dealer?.contact_name || ''}</div>
            </div>
            <button onClick={async () => { await signOut(); navigate('/login') }} className="rounded-full p-2 hover:bg-stone-100" title="登出">
              <LogOut className="w-5 h-5 text-stone-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>

      <ContactFab />

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl">
          {NAV.map(({ to, icon: Icon, label, end, cart }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${isActive ? 'text-teal-700' : 'text-stone-400'}`}>
              <span className="relative">
                <Icon className="w-5 h-5" />
                {cart && count > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{count}</span>
                )}
              </span>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
