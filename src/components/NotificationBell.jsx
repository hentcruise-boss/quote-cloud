import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/api'
import { supabase } from '../supabase'
import { fromNow } from '../lib/format'

export default function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)

  const load = async () => { const { data } = await api.listNotifications(); setItems(data || []) }
  useEffect(() => {
    if (!user) return
    load()
    const ch = supabase.channel('rt-notif')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user?.id])

  const unread = items.filter(n => !n.is_read).length

  const openNotif = async (n) => {
    setOpen(false)
    if (!n.is_read) { await api.markNotificationRead(n.id); load() }
    if (n.case_id) navigate(`/cases/${n.case_id}`)
  }
  const markAll = async () => { await api.markAllNotificationsRead(); load() }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
        <Bell className="w-4 h-4"/>
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)}/>
          <div className="absolute right-0 mt-1 w-80 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">通知</span>
              {unread > 0 && <button onClick={markAll} className="text-xs text-indigo-600 hover:underline">全部已讀</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 && <div className="py-10 text-center text-slate-300 text-sm">尚無通知</div>}
              {items.map(n => (
                <button key={n.id} onClick={() => openNotif(n)} className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 ${n.is_read ? '' : 'bg-indigo-50/40'}`}>
                  <div className="text-sm flex items-start gap-2">
                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0"/>}
                    <span className={n.is_read ? 'text-slate-500' : 'text-slate-700 font-medium'}>{n.message}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 ml-3.5">{fromNow(n.created_at)}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
