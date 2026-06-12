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

// 下單方式（對應 dealer_migration_v2 / v3 的 orders.order_mode）
export const ORDER_MODES = [
  { key: 'cash',      label: '現金提貨',        depositRate: 1.0, priceRate: 1.0,  useFutures: false, prep: '1 天備貨',  note: '一次付清，最快取貨' },
  { key: 'lock10',    label: '10% 鎖單',       depositRate: 0.1, priceRate: 0.9,  useFutures: false, prep: '3 天備貨',  note: '付 10% 定金鎖單，享現貨價 9 折' },
  { key: 'lock30',    label: '現貨 30% 鎖單',   depositRate: 0.3, priceRate: 0.85, useFutures: false, prep: '依排程備貨', note: '付 30% 定金鎖單，享現貨價 85 折' },
  { key: 'futures30', label: '期貨 30% 鎖單',   depositRate: 0.3, priceRate: 1.0,  useFutures: true,  prep: '依船期備貨', note: '付 30% 定金，享期貨牌價' },
]
export const orderModeLabel = (k) => (ORDER_MODES.find(x => x.key === k) || {}).label || k

// 配送服務
export const DELIVERY_SERVICES = [
  { key: 'self',     label: '自行運輸安裝', extra: 0,    note: '由您自行安排運送與安裝' },
  { key: 'assembly', label: '預約組配服務', extra: 3000, note: '訂單未稅 6 萬以下加 3,000；超過免費' },
]
export const deliveryLabel = (k) => (DELIVERY_SERVICES.find(x => x.key === k) || {}).label || k

// 組配費規則：未稅小計 < 60,000 → 加 3,000，否則 0
export const computeAssemblyFee = (subtotalExTax) => Number(subtotalExTax) < 60000 ? 3000 : 0

// 會員類型
export const MEMBER_TYPES = [
  { key: 'distribution', label: '經銷會員' },
  { key: 'core',         label: '核心會員' },
]
export const memberTypeLabel = (k) => (MEMBER_TYPES.find(x => x.key === k) || {}).label || k
