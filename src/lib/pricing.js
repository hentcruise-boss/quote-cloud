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

export function tierUnitPrice({ product, tier, override }) {
  if (override != null && override !== '') return Number(override)
  const rate = tier ? Number(tier.price_rate) : 1
  return Number(product.base_price) * rate
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
