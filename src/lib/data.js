import { supabase } from '../supabase'
import { TAX_RATE } from './format'

// ---- 產品目錄 -------------------------------------------------------
export async function fetchProducts() {
  const { data } = await supabase.from('dealer_products').select('*').eq('is_active', true).order('sort_order')
  return data || []
}

export async function fetchProduct(sku) {
  const { data } = await supabase.from('dealer_products').select('*').eq('sku', sku).maybeSingle()
  return data || null
}

export async function fetchOptions(sku) {
  const { data } = await supabase.from('product_options').select('*').eq('sku', sku).order('sort_order')
  return data || []
}

// ---- 專屬覆寫價：回傳 { sku: price } -----------------------------------
export async function fetchOverrides(dealerId) {
  if (!dealerId) return {}
  const { data } = await supabase.from('dealer_price_overrides').select('sku, price').eq('dealer_id', dealerId)
  return Object.fromEntries((data || []).map(r => [r.sku, Number(r.price)]))
}

// ---- 收藏 -----------------------------------------------------------
export async function fetchFavorites(dealerId) {
  if (!dealerId) return []
  const { data } = await supabase.from('favorites').select('sku').eq('dealer_id', dealerId)
  return (data || []).map(r => r.sku)
}

export async function toggleFavorite(dealerId, sku, on) {
  if (on) await supabase.from('favorites').insert({ dealer_id: dealerId, sku })
  else await supabase.from('favorites').delete().eq('dealer_id', dealerId).eq('sku', sku)
}

// ---- 訂單 -----------------------------------------------------------
const orderNo = () => {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = String(Math.floor(1000 + Math.random() * 9000))
  return `MM-${ymd}-${rand}`
}

// items: [{ sku, name, spec, options, unitPrice, qty }]（unitPrice 為未稅、含選配、含數量折扣）
export async function createOrder({ dealerId, recipient, phone, address, note, items }) {
  const subtotal = items.reduce((s, i) => s + Number(i.unitPrice) * Number(i.qty), 0)
  const tax = Math.round(subtotal * TAX_RATE)
  const total = subtotal + tax
  const order = {
    order_no: orderNo(),
    dealer_id: dealerId,
    status: 'placed',
    subtotal, tax, total,
    recipient, phone, address, note,
  }
  const { data: created, error } = await supabase.from('orders').insert(order).select().single()
  if (error) throw error
  const rows = items.map(i => ({
    order_id: created.id,
    sku: i.sku, name: i.name, spec: i.spec,
    options: i.options || [],
    unit_price: Number(i.unitPrice),
    qty: Number(i.qty),
    subtotal: Number(i.unitPrice) * Number(i.qty),
  }))
  const { error: e2 } = await supabase.from('order_items').insert(rows)
  if (e2) throw e2
  return created
}

export async function fetchOrders(dealerId) {
  let q = supabase.from('orders').select('*').order('created_at', { ascending: false })
  if (dealerId) q = q.eq('dealer_id', dealerId)
  const { data } = await q
  return data || []
}

export async function fetchOrder(id) {
  const { data: order } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
  if (!order) return null
  const { data: items } = await supabase.from('order_items').select('*').eq('order_id', id)
  const { data: events } = await supabase.from('order_status_events').select('*').eq('order_id', id).order('created_at')
  return { order, items: items || [], events: events || [] }
}

// ---- 通知 -----------------------------------------------------------
export async function fetchNotifications(dealerId) {
  if (!dealerId) return []
  const { data } = await supabase.from('notifications').select('*').eq('dealer_id', dealerId)
    .order('created_at', { ascending: false }).limit(50)
  return data || []
}

export async function markNotificationRead(id) {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id)
}

// ============ 第二期：庫存代管（模組 5）============
export async function fetchInventory(dealerId) {
  if (!dealerId) return []
  const { data } = await supabase.from('inventory').select('*').eq('dealer_id', dealerId).gt('qty', 0).order('name')
  return data || []
}

export async function fetchMovements(dealerId) {
  if (!dealerId) return []
  const { data } = await supabase.from('inventory_movements').select('*').eq('dealer_id', dealerId)
    .order('created_at', { ascending: false }).limit(100)
  return data || []
}

export async function fetchReleaseRequests(dealerId) {
  let q = supabase.from('release_requests').select('*').order('created_at', { ascending: false })
  if (dealerId) q = q.eq('dealer_id', dealerId)
  const { data } = await q
  return data || []
}

export async function fetchReleaseItems(requestId) {
  const { data } = await supabase.from('release_request_items').select('*').eq('request_id', requestId)
  return data || []
}

const releaseNo = () => {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `RL-${ymd}-${String(Math.floor(1000 + Math.random() * 9000))}`
}

// items: [{ sku, name, qty }]
export async function createReleaseRequest({ dealerId, recipient, phone, address, note, items }) {
  const { data: req, error } = await supabase.from('release_requests')
    .insert({ request_no: releaseNo(), dealer_id: dealerId, status: 'pending', recipient, phone, address, note })
    .select().single()
  if (error) throw error
  const rows = items.map(i => ({ request_id: req.id, sku: i.sku, name: i.name, qty: Number(i.qty) }))
  const { error: e2 } = await supabase.from('release_request_items').insert(rows)
  if (e2) throw e2
  return req
}

export async function cancelReleaseRequest(id) {
  await supabase.from('release_requests').update({ status: 'cancelled' }).eq('id', id)
}

// ============ 第二期：對帳中心（模組 6）============
export async function fetchStatements(dealerId) {
  let q = supabase.from('statements').select('*').order('period', { ascending: false })
  if (dealerId) q = q.eq('dealer_id', dealerId)
  const { data } = await q
  return data || []
}

export async function fetchStatement(id) {
  const { data: statement } = await supabase.from('statements').select('*').eq('id', id).maybeSingle()
  if (!statement) return null
  const { data: items } = await supabase.from('statement_items').select('*').eq('statement_id', id)
  const { data: payments } = await supabase.from('payments').select('*').eq('statement_id', id).order('paid_at')
  return { statement, items: items || [], payments: payments || [] }
}
