import { STAGE_MAP } from '../lib/constants'

export default function StageBadge({ stage, className = '' }) {
  const s = STAGE_MAP[stage] || { label: stage, badge: 'bg-slate-50 text-slate-600 border-slate-200' }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${s.badge} ${className}`}>
      {s.label}
    </span>
  )
}
