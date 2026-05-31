import { supabase } from '../supabase'

export const BUCKET = 'case-files'

// 上傳檔案到 case-files/case/<caseId>/<uuid>-<檔名>, 回傳 storage path
export async function uploadCaseFile(caseId, file) {
  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `case/${caseId}/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error
  return path
}

// 私有 bucket → 取得有時效的簽名網址 (顯示縮圖 / 下載)
export async function signedUrl(path, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error) return null
  return data?.signedUrl || null
}

export async function removeCaseFile(path) {
  return supabase.storage.from(BUCKET).remove([path])
}
