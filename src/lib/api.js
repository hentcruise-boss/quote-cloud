import { supabase } from '../supabase'

// 統一資料存取層。為避免依賴 PostgREST 的外鍵嵌入名稱,
// 關聯名稱 (客戶/負責人/留言者) 一律在頁面以 map 解析。

// ── products ────────────────────────────────────────────────
export const listProducts  = () => supabase.from('products').select('*').order('sku')
export const upsertProduct = (p) => supabase.from('products').upsert(p, { onConflict:'sku' })
export const deleteProduct = (sku) => supabase.from('products').delete().eq('sku', sku)

// ── scenes ──────────────────────────────────────────────────
export const listScenes  = () => supabase.from('scenes').select('*')
export const addScene    = (s) => supabase.from('scenes').insert(s)
export const upsertScene = (s) => supabase.from('scenes').upsert(s, { onConflict:'id' })
export const deleteScene = (id) => supabase.from('scenes').delete().eq('id', id)

// ── customers ───────────────────────────────────────────────
export const listCustomers  = () => supabase.from('customers').select('*').order('name')
export const createCustomer = (c) => supabase.from('customers').insert(c).select().single()

// ── cases ───────────────────────────────────────────────────
export const listCases  = () => supabase.from('cases').select('*').order('updated_at', { ascending:false })
export const getCase    = (id) => supabase.from('cases').select('*').eq('id', id).single()
export const createCase = (c) => supabase.from('cases').insert(c).select().single()
export const updateCase = (id, patch) => supabase.from('cases').update(patch).eq('id', id)

// ── quotes ──────────────────────────────────────────────────
export const getQuotesForCase = (caseId) =>
  supabase.from('quotes').select('*').eq('case_id', caseId).order('created_at')
export const createQuote = (q) => supabase.from('quotes').insert(q).select().single()
export const updateQuote = (id, patch) => supabase.from('quotes').update(patch).eq('id', id)

// ── quote_items (欄位不變, 只改以 quote_id 查詢) ─────────────
export const listQuoteItems  = (quoteId) =>
  supabase.from('quote_items').select('*').eq('quote_id', quoteId).order('sort_order')
export const insertQuoteItems = (items) => supabase.from('quote_items').insert(items)
export const updateQuoteItem  = (id, patch) => supabase.from('quote_items').update(patch).eq('id', id)
export const deleteQuoteItem  = (id) => supabase.from('quote_items').delete().eq('id', id)

// ── case_events (時間軸) ────────────────────────────────────
export const listEvents = (caseId) =>
  supabase.from('case_events').select('*').eq('case_id', caseId).order('created_at', { ascending:false })
export const addEvent = (e) => supabase.from('case_events').insert(e)

// ── comments ────────────────────────────────────────────────
export const listComments = (caseId) =>
  supabase.from('comments').select('*').eq('case_id', caseId).order('created_at', { ascending:false })
export const addComment = (c) => supabase.from('comments').insert(c)

// ── attachments ─────────────────────────────────────────────
export const listAttachments = (caseId) =>
  supabase.from('attachments').select('*').eq('case_id', caseId).order('created_at', { ascending:false })
export const addAttachment    = (a) => supabase.from('attachments').insert(a)
export const deleteAttachment = (id) => supabase.from('attachments').delete().eq('id', id)

// ── profiles ────────────────────────────────────────────────
export const listProfiles      = () => supabase.from('profiles').select('*').order('full_name')
export const updateProfileRole = (id, role) => supabase.from('profiles').update({ role }).eq('id', id)

// ── export history (改以 case 為範圍) ───────────────────────
export const listHistory  = (caseId) =>
  supabase.from('export_history').select('*').eq('case_id', caseId).order('exported_at', { ascending:false })
export const addHistory    = (h) => supabase.from('export_history').insert(h)
export const deleteHistory = (id) => supabase.from('export_history').delete().eq('id', id)

// ── 第二階段:對外可讀的視圖與參與者 ───────────────────────
// 公開姓名 (只露 id, full_name) — 外部也能解析留言者名字
export const listPublicProfiles = () => supabase.from('public_profiles').select('*')
// 對外乾淨報價 (無成本/廠商/毛利;僅客戶參與者讀得到)
export const listPublicQuoteItems = (caseId) =>
  supabase.from('quote_items_public').select('*').eq('case_id', caseId).order('sort_order')

// case_participants (內部管理)
export const listParticipants  = (caseId) => supabase.from('case_participants').select('*').eq('case_id', caseId)
export const addParticipant    = (p) => supabase.from('case_participants').insert(p)
export const removeParticipant = (caseId, profileId) =>
  supabase.from('case_participants').delete().eq('case_id', caseId).eq('profile_id', profileId)

// 工具: 把 profiles 陣列轉成 id → 顯示名稱 map
export const profileNameMap = (profiles) =>
  Object.fromEntries((profiles || []).map(p => [p.id, p.full_name || p.email || '未知']))

// ── 第三階段:生產 / QC / 交貨 ──────────────────────────────
// 生產排程
export const listProductionTasks = (caseId) =>
  supabase.from('production_tasks').select('*').eq('case_id', caseId).order('sort_order').order('created_at')
export const addProductionTask    = (t) => supabase.from('production_tasks').insert(t)
export const updateProductionTask = (id, patch) => supabase.from('production_tasks').update(patch).eq('id', id)
export const deleteProductionTask = (id) => supabase.from('production_tasks').delete().eq('id', id)

// QC 檢查
export const listQcChecks  = (caseId) =>
  supabase.from('qc_checks').select('*').eq('case_id', caseId).order('sort_order').order('created_at')
export const addQcChecks   = (rows) => supabase.from('qc_checks').insert(rows)
export const updateQcCheck = (id, patch) => supabase.from('qc_checks').update(patch).eq('id', id)
export const deleteQcCheck = (id) => supabase.from('qc_checks').delete().eq('id', id)

// 交貨簽收
export const listDeliveries = (caseId) =>
  supabase.from('delivery_records').select('*').eq('case_id', caseId).order('created_at')
export const addDelivery    = (d) => supabase.from('delivery_records').insert(d).select().single()
export const updateDelivery = (id, patch) => supabase.from('delivery_records').update(patch).eq('id', id)
export const deleteDelivery = (id) => supabase.from('delivery_records').delete().eq('id', id)

// ── 第四階段:售後工單 ──────────────────────────────────────
export const listTickets  = (caseId) =>
  supabase.from('tickets').select('*').eq('case_id', caseId).order('created_at', { ascending: false })
export const addTicket    = (t) => supabase.from('tickets').insert(t).select().single()
export const updateTicket = (id, patch) => supabase.from('tickets').update(patch).eq('id', id)
export const deleteTicket = (id) => supabase.from('tickets').delete().eq('id', id)

// ── 第五階段:儀表板彙整查詢 (內部) ─────────────────────────
export const listAllTickets         = () => supabase.from('tickets').select('*')
export const listAllProductionTasks = () => supabase.from('production_tasks').select('*')
export const listAllDeliveries      = () => supabase.from('delivery_records').select('*')
export const listRecentEvents       = (limit = 20) =>
  supabase.from('case_events').select('*').order('created_at', { ascending: false }).limit(limit)

// ── 第六階段:站內通知 ──────────────────────────────────────
export const listNotifications        = () =>
  supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30)
export const markNotificationRead     = (id) => supabase.from('notifications').update({ is_read: true }).eq('id', id)
export const markAllNotificationsRead = () => supabase.from('notifications').update({ is_read: true }).eq('is_read', false)

// ── 第八階段:滿意度回饋 ────────────────────────────────────
export const listFeedback    = (caseId) =>
  supabase.from('feedback').select('*').eq('case_id', caseId).order('created_at', { ascending: false })
export const addFeedback     = (f) => supabase.from('feedback').insert(f)
export const listAllFeedback = () => supabase.from('feedback').select('rating')

// ── 第九階段:合約 / 請款 (內部) ────────────────────────────
export const listContracts  = (caseId) => supabase.from('contracts').select('*').eq('case_id', caseId).order('created_at')
export const createContract = (c) => supabase.from('contracts').insert(c).select().single()
export const updateContract = (id, patch) => supabase.from('contracts').update(patch).eq('id', id)
export const listInvoices   = (caseId) =>
  supabase.from('invoices').select('*').eq('case_id', caseId).order('due_date', { nullsFirst: true }).order('created_at')
export const addInvoice     = (v) => supabase.from('invoices').insert(v)
export const updateInvoice  = (id, patch) => supabase.from('invoices').update(patch).eq('id', id)
export const deleteInvoice  = (id) => supabase.from('invoices').delete().eq('id', id)
export const listAllInvoices = () => supabase.from('invoices').select('amount,status')

// ── 第九階段:庫存 (內部) ──────────────────────────────────
export const listInventory      = (warehouseId) => supabase.from('inventory').select('*').eq('warehouse_id', warehouseId)
export const addStockMovement   = (m) => supabase.from('stock_movements').insert(m)
export const upsertReorderPoint = (sku, warehouseId, reorder_point) =>
  supabase.from('inventory').upsert({ sku, warehouse_id: warehouseId, reorder_point }, { onConflict: 'sku,warehouse_id' })

// ── 第十一階段:報表 ───────────────────────────────────────
export const listPaidInvoices        = () => supabase.from('invoices').select('amount, paid_at').eq('status', 'paid')
export const listAcceptedQuotes      = () => supabase.from('quotes').select('id, created_at').eq('status', 'accepted')
export const listQuoteItemsForQuotes = (ids) => supabase.from('quote_items').select('quote_id, price, cost, qty').in('quote_id', ids)

// ── 第十一階段:BOM ────────────────────────────────────────
export const listBom       = (productSku) => supabase.from('bom_items').select('*').eq('product_sku', productSku)
export const addBomItem    = (b) => supabase.from('bom_items').insert(b)
export const deleteBomItem = (id) => supabase.from('bom_items').delete().eq('id', id)

// ── 第十一階段:倉間調撥 ───────────────────────────────────
export const listTransfers   = () => supabase.from('transfers').select('*').order('created_at', { ascending: false }).limit(50)
export const executeTransfer = (p_from, p_to, p_items, p_note, p_actor) =>
  supabase.rpc('execute_transfer', { p_from, p_to, p_items, p_note, p_actor })

// ── 第十階段:多公司 / 多倉 ────────────────────────────────
export const listCompanies   = () => supabase.from('companies').select('*').order('name')
export const createCompany   = (c) => supabase.from('companies').insert(c).select().single()
export const listWarehouses  = () => supabase.from('warehouses').select('*').order('name')
export const createWarehouse = (w) => supabase.from('warehouses').insert(w).select().single()
export const updateWarehouse = (id, patch) => supabase.from('warehouses').update(patch).eq('id', id)
