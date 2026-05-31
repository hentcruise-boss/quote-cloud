import React from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { Users, Package, Tags, ClipboardList, Boxes, ReceiptText, LogOut, ExternalLink } from 'lucide-react'
import { useAuth } from '../lib/auth'
import AdminDealers from './pages/AdminDealers'
import AdminProducts from './pages/AdminProducts'
import AdminPricing from './pages/AdminPricing'
import AdminOrders from './pages/AdminOrders'
import AdminInventory from './pages/AdminInventory'
import AdminBilling from './pages/AdminBilling'

const NAV = [
  { to: '/admin', end: true, icon: ClipboardList, label: '訂單' },
  { to: '/admin/dealers', icon: Users, label: '經銷商' },
  { to: '/admin/products', icon: Package, label: '產品' },
  { to: '/admin/pricing', icon: Tags, label: '定價等級' },
  { to: '/admin/inventory', icon: Boxes, label: '庫存' },
  { to: '/admin/billing', icon: ReceiptText, label: '對帳' },
]

export default function AdminApp() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-white text-xs font-bold">管</div>
            <div className="leading-none">
              <div className="text-sm font-bold">木美家 · 下單系統後台</div>
              <div className="mt-0.5 text-[10px] text-slate-400">Admin Console</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50"><ExternalLink className="h-3.5 w-3.5" />經銷商前台</a>
            <button onClick={async () => { await signOut(); navigate('/login') }} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50"><LogOut className="h-3.5 w-3.5" />登出</button>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5">
          {NAV.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition ${isActive ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">
        <Routes>
          <Route index element={<AdminOrders />} />
          <Route path="dealers" element={<AdminDealers />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="pricing" element={<AdminPricing />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="billing" element={<AdminBilling />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  )
}
