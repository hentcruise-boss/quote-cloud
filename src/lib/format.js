export const TAX_RATE = 0.05

export const nt = (n) => 'NT$ ' + Math.round(Number(n) || 0).toLocaleString('en-US')

export const addTax = (amount) => Math.round((Number(amount) || 0) * (1 + TAX_RATE))

export const taxOf = (amount) => Math.round((Number(amount) || 0) * TAX_RATE)

export const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt)) return '—'
  return dt.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export const fmtDateTime = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt)) return '—'
  return dt.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
