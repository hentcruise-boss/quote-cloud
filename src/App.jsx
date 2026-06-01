import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import RoleGate from './components/RoleGate'
import { INTERNAL_ROLES } from './lib/constants'

// 程式碼分割:各頁面按需載入,縮小首屏 bundle
const LoginPage      = lazy(() => import('./pages/LoginPage'))
const HomePage       = lazy(() => import('./pages/HomePage'))
const DashboardPage  = lazy(() => import('./pages/DashboardPage'))
const CasesBoardPage = lazy(() => import('./pages/CasesBoardPage'))
const SchedulePage   = lazy(() => import('./pages/SchedulePage'))
const CaseDetailPage = lazy(() => import('./pages/CaseDetailPage'))
const QuoteWorkspace = lazy(() => import('./pages/QuoteWorkspace'))
const ProductsPage   = lazy(() => import('./pages/ProductsPage'))
const ScenesPage     = lazy(() => import('./pages/ScenesPage'))
const InventoryPage  = lazy(() => import('./pages/InventoryPage'))
const TransfersPage  = lazy(() => import('./pages/TransfersPage'))
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage'))
const BomPage        = lazy(() => import('./pages/BomPage'))
const ReportsPage    = lazy(() => import('./pages/ReportsPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))

function FullScreen({ children }) {
  return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-500">{children}</div>
}
function Loader() {
  return <FullScreen><div className="text-center"><RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3"/><p className="text-sm">載入中…</p></div></FullScreen>
}

function RequireAuth() {
  const { session, profile, loading, signOut } = useAuth()
  if (loading) return <Loader />
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

// 依角色決定首頁:內部→看板;外部→專屬首頁
function RoleHome() {
  const { isInternal } = useAuth()
  return <Navigate to={isInternal ? '/cases' : '/home'} replace />
}

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/" element={<RoleHome />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/dashboard" element={<RoleGate allow={INTERNAL_ROLES}><DashboardPage /></RoleGate>} />
            <Route path="/cases" element={<CasesBoardPage />} />
            <Route path="/schedule" element={<RoleGate allow={INTERNAL_ROLES}><SchedulePage /></RoleGate>} />
            <Route path="/cases/:id" element={<CaseDetailPage />} />
            <Route path="/cases/:id/quote" element={<RoleGate allow={INTERNAL_ROLES}><QuoteWorkspace /></RoleGate>} />
            <Route path="/products" element={<RoleGate allow={INTERNAL_ROLES}><ProductsPage /></RoleGate>} />
            <Route path="/scenes" element={<RoleGate allow={INTERNAL_ROLES}><ScenesPage /></RoleGate>} />
            <Route path="/bom" element={<RoleGate allow={INTERNAL_ROLES}><BomPage /></RoleGate>} />
            <Route path="/reports" element={<RoleGate allow={INTERNAL_ROLES}><ReportsPage /></RoleGate>} />
            <Route path="/inventory" element={<RoleGate allow={INTERNAL_ROLES}><InventoryPage /></RoleGate>} />
            <Route path="/transfers" element={<RoleGate allow={INTERNAL_ROLES}><TransfersPage /></RoleGate>} />
            <Route path="/purchases" element={<RoleGate allow={INTERNAL_ROLES}><PurchaseOrdersPage /></RoleGate>} />
            <Route path="/admin/users" element={<RoleGate allow={['admin']}><AdminUsersPage /></RoleGate>} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
