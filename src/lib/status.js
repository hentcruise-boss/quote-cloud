// 訂單狀態（與 dealer_migration_v3 的 status_label 對應）
export const STATUS_LABEL = {
  awaiting_payment: '待收款',
  paid:             '已收款',
  ready_pickup:     '待提貨',
  placed:           '已成立',
  production:       '生產',
  shipping:         '海運',
  arrived:          '到台',
  stored:           '入庫',
  delivered:        '已交付/出庫',
  cancelled:        '已取消',
}
export const statusLabel = (k) => STATUS_LABEL[k] || k

// 依「下單方式」的狀態流程
// cash / lock10 / lock30：待收款 → 已收款 → 待提貨 → 已交付
// futures30：待收款 → 已收款 → 生產 → 海運 → 到台 → 入庫 → 已交付
export const FLOWS = {
  cash:      ['awaiting_payment', 'paid', 'ready_pickup', 'delivered'],
  lock10:    ['awaiting_payment', 'paid', 'ready_pickup', 'delivered'],
  lock30:    ['awaiting_payment', 'paid', 'ready_pickup', 'delivered'],
  futures30: ['awaiting_payment', 'paid', 'production', 'shipping', 'arrived', 'stored', 'delivered'],
}

export function flowFor(orderMode) {
  return (FLOWS[orderMode] || FLOWS.cash).map(k => ({ key: k, label: STATUS_LABEL[k] }))
}

export function statusIndexInFlow(status, orderMode) {
  return flowFor(orderMode).findIndex(s => s.key === status)
}

export function nextStatusInFlow(status, orderMode) {
  const flow = flowFor(orderMode)
  const i = flow.findIndex(s => s.key === status)
  return i >= 0 && i < flow.length - 1 ? flow[i + 1].key : null
}

// ----- 以下為向後相容（舊頁面引用）------------------------------------
export const ORDER_FLOW = FLOWS.futures30.map(k => ({ key: k, label: STATUS_LABEL[k] }))
export const statusIndex = (k) => ORDER_FLOW.findIndex(s => s.key === k)
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

// 定制詢價狀態
export const CUSTOM_STATUS = {
  submitted: '待回覆', quoted: '已報價', confirmed: '客戶已確認', rejected: '客戶拒絕', closed: '已結案',
}
export const customLabel = (k) => CUSTOM_STATUS[k] || k

// 補倉單狀態
export const REPLENISHMENT_STATUS = {
  pending: '待發送', sent: '已發送', received: '已入庫', cancelled: '已取消',
}
export const replenishmentLabel = (k) => REPLENISHMENT_STATUS[k] || k
