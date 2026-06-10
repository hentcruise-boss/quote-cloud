import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// 依角色限制路由 (UX 用; 真正把關靠資料庫 RLS)
export default function RoleGate({ allow, children }) {
  const { role, loading } = useAuth()
  if (loading) return null
  if (!role || !allow.includes(role)) return <Navigate to="/" replace />
  return children
}
