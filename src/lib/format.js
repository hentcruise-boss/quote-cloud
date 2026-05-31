// 共用格式化工具

export const num = (v) => Number(v || 0).toLocaleString()
export const nt  = (v) => 'NT$ ' + num(v)
export const marginPct = (price, cost) => (Number(price) > 0 ? ((price - cost) / price) * 100 : 0)

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('zh-TW', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : ''

export const fmtDateFull = (d) =>
  d ? new Date(d).toLocaleString('zh-TW') : ''

// 相對時間 (e.g. 3 分鐘前)
export const fromNow = (d) => {
  if (!d) return ''
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60) return '剛剛'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`
  return fmtDate(d)
}

export const initials = (name) =>
  (name || '?').trim().slice(0, 2) || '?'
