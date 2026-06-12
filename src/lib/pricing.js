// 計價邏輯（全部以「未稅」金額運算，含稅與否由顯示層決定）
//
//  專屬單價 = base（覆寫價，或牌價 × 等級乘數）
//           + 選配加價總和
//           ，再乘上符合數量的階梯折扣
//
// product : dealer_products 一列（含 base_price, qty_tiers）
// tier    : pricing_tiers 一列（price_rate），可為 null（= 1.0）
// override: dealer_price_overrides.price，可為 null
// options : 已選選配陣列 [{ price_delta }]
// qty     : 數量

// 促銷價是否生效（sale_until 為含當日的到期日）
export function saleActive(product, now = new Date()) {
  const sp = product?.sale_price
  if (sp == null || sp === '' || Number(sp) <= 0) return false
  if (product.sale_until) {
    const end = new Date(String(product.sale_until).length === 10
      ? product.sale_until + 'T23:59:59' : product.sale_until)
    if (end < now) return false
  }
  return true
}

// 現貨計價基準：促銷生效用促銷價，否則牌價
export function effectiveBase(product) {
  return saleActive(product) ? Number(product.sale_price) : Number(product.base_price)
}

export function tierUnitPrice({ product, tier, override }) {
  if (override != null && override !== '') return Number(override)
  const rate = tier ? Number(tier.price_rate) : 1
  return effectiveBase(product) * rate
}

export function optionsDelta(options = []) {
  return options.reduce((s, o) => s + (Number(o.price_delta) || 0), 0)
}

// 符合數量的最佳階梯折扣（取門檻最高的一檔）
export function qtyRate(product, qty) {
  const tiers = (product?.qty_tiers || [])
    .filter(t => Number(qty) >= Number(t.min_qty))
    .sort((a, b) => Number(b.min_qty) - Number(a.min_qty))
  return tiers.length ? Number(tiers[0].rate) : 1
}

// 含選配、未含數量折扣的單價（加入購物車時鎖存這個）
export function unitPriceWithOptions({ product, tier, override, options = [] }) {
  return Math.round(tierUnitPrice({ product, tier, override }) + optionsDelta(options))
}

// 最終單價（含數量階梯）
export function finalUnitPrice({ product, tier, override, options = [], qty = 1 }) {
  const base = tierUnitPrice({ product, tier, override }) + optionsDelta(options)
  return Math.round(base * qtyRate(product, qty))
}

// 依「下單方式」算單價：期貨用 futures_price、鎖單再打折
// mode: ORDER_MODES 的一筆
export function modeUnitPrice({ product, tier, override, mode }) {
  const baseRef = mode?.useFutures && product.futures_price != null
    ? Number(product.futures_price)
    : effectiveBase(product)
  const tierRate = tier ? Number(tier.price_rate) : 1
  const tierPrice = override != null && override !== '' ? Number(override) : baseRef * tierRate
  return Math.round(tierPrice * (mode?.priceRate ?? 1))
}

// 該產品可用的下單方式（陣列）
// 規則：現貨 stock_qty>0 → cash + lock10；有 futures_price → futures30
export function availableModesFor(product, ORDER_MODES) {
  const out = []
  const hasStock = Number(product.stock_qty || 0) > 0
  const hasFutures = product.futures_price != null && Number(product.futures_price) > 0
  for (const m of ORDER_MODES) {
    if (m.useFutures && hasFutures) out.push(m)
    if (!m.useFutures && hasStock) out.push(m)
  }
  return out
}
