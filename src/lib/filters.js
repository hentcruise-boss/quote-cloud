// 產品篩選用常數（交期 / 場景）

export const LEAD_TIME = [
  { key: 'stock',  label: '現貨',     color: 'emerald' },
  { key: 'fast',   label: '快速交付', color: 'amber' },
  { key: 'normal', label: '正常交期', color: 'stone' },
]

export const leadTimeLabel = (k) =>
  (LEAD_TIME.find(x => x.key === k) || {}).label || k

// 標籤底色 class（給卡片上的小標籤用）
export const leadTimeBadgeClass = (k) => {
  switch (k) {
    case 'stock': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'fast':  return 'bg-amber-50 text-amber-700 border-amber-200'
    default:      return 'bg-stone-100 text-stone-500 border-stone-200'
  }
}

// 後台「場景」勾選的預設清單（DB 是 text[]，所以可自由擴充）
export const SCENES_PRESET = [
  '客廳', '餐廳', '臥室', '書房', '兒童房', '收納', '軟裝', '公共區', '商業空間',
]
