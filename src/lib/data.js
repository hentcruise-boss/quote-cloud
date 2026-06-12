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
// orderMode: 'cash' | 'lock10' | 'futures30'
// deliveryService: 'self' | 'assembly'
// assemblyFee: 未稅組配費（前端依規則算好傳入）
// depositRate: 0~1（依下單方式：cash=1 / lock10=0.1 / futures30=0.3）
export async function createOrder({ dealerId, recipient, phone, address, note,
                                    items, orderMode = 'cash', deliveryService = 'self',
                                    assemblyFee = 0, depositRate = 1 }) {
  const itemsSub = items.reduce((s, i) => s + Number(i.unitPrice) * Number(i.qty), 0)
  const subtotal = itemsSub + Number(assemblyFee)
  const tax = Math.round(subtotal * TAX_RATE)
  const total = subtotal + tax
  const deposit = Math.round(total * Number(depositRate))
  const balance = total - deposit
  const order = {
    order_no: orderNo(),
    dealer_id: dealerId,
    status: 'awaiting_payment',
    subtotal, tax, total,
    order_mode: orderMode,
    delivery_service: deliveryService,
    assembly_fee: assemblyFee,
    deposit_amount: deposit,
    balance_amount: balance,
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

// ============ 匯款憑證上傳（payment-proofs bucket）============
// 上傳到私有 bucket，回傳路徑（不是 public URL）；之後讀檔用 signed URL
export async function uploadPaymentProof(orderId, file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `${orderId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('payment-proofs').upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  await supabase.from('orders').update({ payment_proof: path }).eq('id', orderId)
  return path
}

export async function paymentProofSignedUrl(path, expiresIn = 600) {
  if (!path) return null
  const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(path, expiresIn)
  return data?.signedUrl || null
}

// ============ 定制詢價（custom_requests）============
const customNo = () => {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `CR-${ymd}-${String(Math.floor(1000 + Math.random() * 9000))}`
}

export async function fetchCustomRequests(dealerId) {
  let q = supabase.from('custom_requests').select('*').order('created_at', { ascending: false })
  if (dealerId) q = q.eq('dealer_id', dealerId)
  const { data } = await q
  return data || []
}

export async function createCustomRequest({ dealerId, title, description, qty, budget, isRush, desiredDate }) {
  const row = {
    request_no: customNo(), dealer_id: dealerId,
    title, description, qty: Number(qty) || 1,
    budget: budget ? Number(budget) : null,
    is_rush: !!isRush,
    desired_date: desiredDate || null,
  }
  const { data, error } = await supabase.from('custom_requests').insert(row).select().single()
  if (error) throw error
  return data
}

export async function customRequestDecide(id, decision) {
  // decision: 'confirmed' | 'rejected'
  await supabase.from('custom_requests')
    .update({ status: decision, decided_at: new Date().toISOString() })
    .eq('id', id)
}

// ============ 供應商 / 補倉系統（admin）============
export async function fetchSuppliers() {
  const { data } = await supabase.from('suppliers').select('*').order('name')
  return data || []
}

export async function fetchReplenishments() {
  const { data } = await supabase.from('replenishment_orders').select('*').order('generated_at', { ascending: false })
  return data || []
}

export async function fetchReplenishmentItems(repId) {
  const { data } = await supabase.from('replenishment_items').select('*').eq('replenishment_id', repId)
  return data || []
}

export async function generateReplenishments() {
  const { data, error } = await supabase.rpc('generate_replenishments')
  if (error) throw error
  return data
}

export async function replenishmentReceive(id) {
  const { error } = await supabase.rpc('replenishment_receive', { p_id: id })
  if (error) throw error
}

// ============ 經銷商 Dashboard 統計 ============
export async function fetchDealerDashboard(dealerId) {
  if (!dealerId) return null
  const [{ data: orders }, { data: statements }, { data: inv }] = await Promise.all([
    supabase.from('orders').select('id, total, status, order_mode, created_at, deposit_amount, balance_amount').eq('dealer_id', dealerId),
    supabase.from('statements').select('outstanding').eq('dealer_id', dealerId),
    supabase.from('inventory').select('qty').eq('dealer_id', dealerId).gt('qty', 0),
  ])

  const now = new Date()
  const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`
  const thisM = monthKey(now)
  const lastM = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))

  const valid = (orders || []).filter(o => o.status !== 'cancelled')
  const inMonth = (o, m) => monthKey(new Date(o.created_at)) === m

  const thisMonth = valid.filter(o => inMonth(o, thisM))
  const lastMonth = valid.filter(o => inMonth(o, lastM))
  const awaiting  = valid.filter(o => o.status === 'awaiting_payment')
  const readyPickup = valid.filter(o => o.status === 'ready_pickup')

  const modeBreakdown = {}
  thisMonth.forEach(o => { modeBreakdown[o.order_mode || 'cash'] = (modeBreakdown[o.order_mode || 'cash'] || 0) + 1 })

  const sumTotal = (arr) => arr.reduce((s, o) => s + Number(o.total || 0), 0)
  const sumDeposit = (arr) => arr.reduce((s, o) => s + Number(o.deposit_amount || o.total || 0), 0)

  return {
    thisMonth: { count: thisMonth.length, total: sumTotal(thisMonth) },
    lastMonth: { count: lastMonth.length, total: sumTotal(lastMonth) },
    awaitingPayment: { count: awaiting.length, total: sumDeposit(awaiting) },
    readyPickup:     { count: readyPickup.length },
    outstanding:     (statements || []).reduce((s, x) => s + Number(x.outstanding || 0), 0),
    inventory:       { skuCount: inv?.length || 0, totalQty: (inv || []).reduce((s, x) => s + Number(x.qty), 0) },
    modeBreakdown,
  }
}
