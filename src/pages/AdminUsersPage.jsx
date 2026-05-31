import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { useSync } from '../contexts/SyncContext'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/api'
import { ROLES } from '../lib/constants'

export default function AdminUsersPage() {
  const { run } = useSync()
  const { profile } = useAuth()
  const [profiles, setProfiles] = useState([])

  const load = async () => { const { data } = await api.listProfiles(); if (data) setProfiles(data) }
  useEffect(() => { load() }, [])

  const changeRole = (id, role) => run(async () => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, role } : p))
    await api.updateProfileRole(id, role)
    await load()
  })

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500"/>使用者與角色</h1>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-3 text-left font-semibold">姓名</th>
            <th className="px-4 py-3 text-left font-semibold">Email</th>
            <th className="px-4 py-3 text-left font-semibold">公司/單位</th>
            <th className="px-4 py-3 text-left font-semibold w-40">角色</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {profiles.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-800">{p.full_name || '—'}{p.id === profile?.id && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">你</span>}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.email}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.company || '—'}</td>
                <td className="px-4 py-3">
                  <select value={p.role} onChange={e => changeRole(p.id, e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                    {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {profiles.length === 0 && <tr><td colSpan="4" className="py-12 text-center text-slate-400 text-sm">尚無使用者</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">第一階段:「管理員 / 內部員工」可使用全部功能。客戶 / 供應商 / 現場人員的對外登入將於第二階段開放。</p>
    </div>
  )
}
