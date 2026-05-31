import { RefreshCw, Wifi, WifiOff } from 'lucide-react'

export default function SyncBadge({ status }) {
  if (status === 'syncing') return <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full"><RefreshCw className="w-3 h-3 animate-spin"/>同步中</span>
  if (status === 'error')   return <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full"><WifiOff className="w-3 h-3"/>連線失敗</span>
  return <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><Wifi className="w-3 h-3"/>已同步</span>
}
