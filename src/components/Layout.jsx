import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Building2, LayoutDashboard, LayoutGrid, CalendarDays, Package, LayoutTemplate, Boxes, Users, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSync } from '../contexts/SyncContext'
import SyncBadge from './SyncBadge'
import NotificationBell from './NotificationBell'
import { ROLE_MAP } from '../lib/constants'

export default function Layout() {
  const { profile, role, isInternal, signOut } = useAuth()
  const { status } = useSync()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const nav = [
    { to: '/dashboard',   label: '儀表板',     icon: <LayoutDashboard className="w-4 h-4"/>, show: isInternal },
    { to: '/cases',       label: '案件看板',   icon: <LayoutGrid className="w-4 h-4"/>,     show: true },
    { to: '/schedule',    label: '排程',       icon: <CalendarDays className="w-4 h-4"/>,   show: isInternal },
    { to: '/products',    label: '產品資料庫', icon: <Package className="w-4 h-4"/>,        show: isInternal },
    { to: '/scenes',      label: '場景模板',   icon: <LayoutTemplate className="w-4 h-4"/>, show: isInternal },
    { to: '/inventory',   label: '庫存',       icon: <Boxes className="w-4 h-4"/>,          show: isInternal },
    { to: '/admin/users', label: '使用者',     icon: <Users className="w-4 h-4"/>,          show: role === 'admin' },
  ].filter(n => n.show)

  const linkClass = ({ isActive }) =>
    `inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
      isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
    }`

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center"><Building2 className="w-4 h-4 text-white"/></div>
            <div>
              <div className="font-bold text-slate-800 text-sm leading-none">祥鼎辦公家具</div>
              <div className="text-[10px] text-slate-400 mt-0.5">案件平臺</div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {nav.map(n => <NavLink key={n.to} to={n.to} className={linkClass}>{n.icon}{n.label}</NavLink>)}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <SyncBadge status={status}/>
            <NotificationBell/>
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-xs font-semibold text-slate-700 max-w-[10rem] truncate">{profile?.full_name || profile?.email || '使用者'}</span>
              <span className="text-[10px] text-slate-400">{ROLE_MAP[role]?.label || '—'}</span>
            </div>
            <button onClick={handleSignOut} title="登出" className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><LogOut className="w-4 h-4"/></button>
            <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100">{menuOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}</button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t border-slate-100 px-4 py-2 flex flex-col gap-1">
            {nav.map(n => <NavLink key={n.to} to={n.to} onClick={() => setMenuOpen(false)} className={linkClass}>{n.icon}{n.label}</NavLink>)}
          </nav>
        )}
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6"><Outlet/></main>
    </div>
  )
}
