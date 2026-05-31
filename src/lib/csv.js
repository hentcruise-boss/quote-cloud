// 通用 CSV 匯出(含 BOM,Excel 可正確顯示中文)
export function downloadCSV(filename, rows) {
  const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const csv = '﻿' + rows.map(r => r.map(esc).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
}
