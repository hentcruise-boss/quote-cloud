// 訂單狀態流程（與 dealer_schema.sql 的 status_label 對應）
export const ORDER_FLOW = [
  { key: 'placed',     label: '已成立' },
  { key: 'production', label: '生產' },
  { key: 'shipping',   label: '海運' },
  { key: 'arrived',    label: '到台' },
  { key: 'stored',     label: '入庫' },
  { key: 'delivered',  label: '出庫' },
]

export const STATUS_LABEL = {
  ...Object.fromEntries(ORDER_FLOW.map(s => [s.key, s.label])),
  cancelled: '已取消',
}

export const statusLabel = (k) => STATUS_LABEL[k] || k

// 取得目前狀態在流程中的索引（cancelled / 未知 回傳 -1）
export const statusIndex = (k) => ORDER_FLOW.findIndex(s => s.key === k)

// 下一個狀態（推進用），已到最後或已取消則回傳 null
export const nextStatus = (k) => {
  const i = statusIndex(k)
  return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1].key : null
}

// 出庫申請狀態（模組 5）
export const RELEASE_STATUS = {
  pending: '待處理', approved: '已核准出庫', rejected: '已拒絕', cancelled: '已取消',
}
export const releaseLabel = (k) => RELEASE_STATUS[k] || k

// 對帳單狀態（模組 6）
export const STATEMENT_STATUS = {
  open: '未結', partial: '部分付款', paid: '已結清',
}
export const statementLabel = (k) => STATEMENT_STATUS[k] || k
