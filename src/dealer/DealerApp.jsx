import React from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { CartProvider } from '../lib/cart'
import DealerLayout from './DealerLayout'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Favorites from './pages/Favorites'
import Account from './pages/Account'
import Inventory from './pages/Inventory'
import Billing from './pages/Billing'
import StatementDetail from './pages/StatementDetail'

// 已登入、但找不到對應經銷商資料（帳號尚未開通）
function NotProvisioned() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <h1 className="text-lg font-bold text-stone-800">帳號尚未開通</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          您的登入帳號（{user?.email}）尚未綁定經銷商資料，請聯絡您的服務專員協助開通。
        </p>
        <button onClick={async () => { await signOut(); navigate('/login') }}
          className="mt-5 w-full rounded-lg border border-stone-200 py-2.5 text-sm font-semibold text-stone-600">
          重新登入
        </button>
      </div>
    </div>
  )
}

export default function DealerApp() {
  const { dealer } = useAuth()
  if (!dealer) return <NotProvisioned />

  return (
    <CartProvider>
      <DealerLayout>
        <Routes>
          <Route index element={<Home />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="product/:sku" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="account" element={<Account />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="billing" element={<Billing />} />
          <Route path="billing/:id" element={<StatementDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DealerLayout>
    </CartProvider>
  )
}
