import { supabase } from '../supabase'

// ---- 公告 / Banner ---------------------------------------------------
export async function fetchAnnouncements() {
  const { data } = await supabase.from('announcements').select('*')
    .order('sort_order').order('created_at', { ascending: false })
  return data || []
}

// ---- 系統設定（key-value）--------------------------------------------
export async function fetchAppSettings() {
  const { data } = await supabase.from('app_settings').select('*')
  return Object.fromEntries((data || []).map(r => [r.key, r.value]))
}

export async function saveAppSettings(obj) {
  const rows = Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }))
  const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' })
  if (error) throw error
}

// ---- 併櫃截單節奏（每周一櫃 → 截單倒數）--------------------------------
export const WEEKDAY_LABELS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']

// 下一個截單時間點。weekday 1..7（一..日）、hour 0..23
export function nextCutoff(settings = {}, from = new Date()) {
  const wd = Number(settings.container_cutoff_weekday ?? 4)
  const hour = Number(settings.container_cutoff_hour ?? 17)
  const d = new Date(from)
  d.setHours(hour, 0, 0, 0)
  const cur = ((d.getDay() + 6) % 7) + 1   // JS 日=0 → 1..7（一..日）
  let diff = wd - cur
  if (diff < 0 || (diff === 0 && d <= from)) diff += 7
  d.setDate(d.getDate() + diff)
  return d
}

export function etaFromCutoff(cutoff, settings = {}) {
  const days = Number(settings.container_lead_days ?? 28)
  const d = new Date(cutoff)
  d.setDate(d.getDate() + days)
  return d
}

export function countdownParts(target, from = new Date()) {
  let ms = target - from
  if (ms < 0) ms = 0
  return {
    days:  Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    mins:  Math.floor((ms % 3600000) / 60000),
  }
}

export const weekdayLabel = (d) => WEEKDAY_LABELS[((d.getDay() + 6) % 7)]

// ---- 新品標籤（上架 30 天內）-------------------------------------------
export function isNew(product, days = 30, now = new Date()) {
  if (!product?.created_at) return false
  return (now - new Date(product.created_at)) < days * 86400000
}
