import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from './lib/auth'
import Login from './dealer/pages/Login'

// 依路由分割：經銷商前台 / 後台 / 既有內部系統各自獨立載入
const DealerApp = lazy(() => import('./dealer/DealerApp'))
const AdminApp = lazy(() => import('./admin/AdminApp'))
const InternalApp = lazy(() => import('./App'))   // 既有「祥鼎報價系統」，原樣保留於 /internal

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50">
      <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
    </div>
  )
}

function RequireDealer({ children }) {
  const { session, isAdmin, loading } = useAuth()
  if (loading) return <Splash />
  if (!session) return <Navigate to="/login" replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  return children
}

function RequireAdmin({ children }) {
  const { session, isAdmin, loading } = useAuth()
  if (loading) return <Splash />
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

export default function Root() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Splash />}>
          <Routes>
            <Route path="/internal/*" element={<InternalApp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/*" element={<RequireAdmin><AdminApp /></RequireAdmin>} />
            <Route path="/*" element={<RequireDealer><DealerApp /></RequireDealer>} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
