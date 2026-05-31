import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import RoleGate from './components/RoleGate'
import { INTERNAL_ROLES } from './lib/constants'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CasesBoardPage from './pages/CasesBoardPage'
import CaseDetailPage from './pages/CaseDetailPage'
import QuoteWorkspace from './pages/QuoteWorkspace'
import ProductsPage from './pages/ProductsPage'
import ScenesPage from './pages/ScenesPage'
import AdminUsersPage from './pages/AdminUsersPage'

function FullScreen({ children }) {
  return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-500">{children}</div>
}

function RequireAuth() {
  const { session, profile, loading, signOut } = useAuth()
  if (loading) return <FullScreen><div className="text-center"><RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3"/><p className="text-sm">載入中…</p></div></FullScreen>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return (
    <FullScreen>
      <div className="text-center max-w-xs px-6">
        <p className="text-sm">您的帳號尚未建立資料,請聯絡管理員,或稍後重新整理。</p>
        <button onClick={signOut} className="mt-4 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-white">登出</button>
      </div>
    </FullScreen>
  )
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/cases" replace />} />
          <Route path="/dashboard" element={<RoleGate allow={INTERNAL_ROLES}><DashboardPage /></RoleGate>} />
          <Route path="/cases" element={<CasesBoardPage />} />
          <Route path="/cases/:id" element={<CaseDetailPage />} />
          <Route path="/cases/:id/quote" element={<RoleGate allow={INTERNAL_ROLES}><QuoteWorkspace /></RoleGate>} />
          <Route path="/products" element={<RoleGate allow={INTERNAL_ROLES}><ProductsPage /></RoleGate>} />
          <Route path="/scenes" element={<RoleGate allow={INTERNAL_ROLES}><ScenesPage /></RoleGate>} />
          <Route path="/admin/users" element={<RoleGate allow={['admin']}><AdminUsersPage /></RoleGate>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
