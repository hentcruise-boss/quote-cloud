import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ship } from 'lucide-react'
import { fetchAppSettings, nextCutoff, etaFromCutoff, countdownParts, weekdayLabel } from '../lib/marketing'

const two = (n) => String(n).padStart(2, '0')
const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`

// 「每周一櫃」截單倒數。compact=true 用於購物車內嵌。
export default function ContainerCountdown({ compact = false, linkToCatalog = false }) {
  const [settings, setSettings] = useState(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    fetchAppSettings().then(setSettings)
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  if (!settings) return null
  const cutoff = nextCutoff(settings, now)
  const eta = etaFromCutoff(cutoff, settings)
  const { days, hours, mins } = countdownParts(cutoff, now)

  const body = (
    <div className={`flex items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-700 to-teal-700 text-white ${compact ? 'px-4 py-2.5' : 'p-4'}`}>
      <Ship className={`flex-shrink-0 ${compact ? 'h-5 w-5' : 'h-6 w-6'}`} />
      <div className="min-w-0 flex-1">
        <div className={`font-bold ${compact ? 'text-xs' : 'text-sm'}`}>
          本週櫃截單倒數　<span className="font-mono">{days} 天 {two(hours)} 時 {two(mins)} 分</span>
        </div>
        <div className={`text-sky-100 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {md(cutoff)}（{weekdayLabel(cutoff)}）{two(cutoff.getHours())}:00 前下單併入本櫃 · 預計 {md(eta)} 到台
        </div>
      </div>
    </div>
  )

  return linkToCatalog ? <Link to="/catalog" className="block">{body}</Link> : body
}
