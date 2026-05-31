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

// 工具: 把 profiles 陣列轉成 id → 顯示名稱 map
export const profileNameMap = (profiles) =>
  Object.fromEntries((profiles || []).map(p => [p.id, p.full_name || p.email || '未知']))
