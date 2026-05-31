// ============================================================
// Supabase Edge Function: notify-push
// 由「notifications INSERT」的 Database Webhook 觸發,把站內通知
// 外推成 Email(可選 LINE)。本檔已寫好,但需你部署 + 設定金鑰才會生效。
//
// 部署:
//   supabase functions deploy notify-push
// 設定密鑰(至少設 Email 二項):
//   supabase secrets set RESEND_API_KEY=re_xxx \
//     EMAIL_FROM="案件平臺 <noreply@你的網域>" APP_URL="https://你的網址"
//   # 可選 LINE:supabase secrets set LINE_CHANNEL_TOKEN=xxx
// 啟用觸發(擇一):
//   A. Dashboard → Database → Webhooks → 新增:table=notifications,
//      events=INSERT,type=Supabase Edge Functions,function=notify-push
//   B. 進階:用 pg_net 從 DB trigger 呼叫本函式 URL(見 ../README.md)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY')
const EMAIL_FROM      = Deno.env.get('EMAIL_FROM') ?? 'noreply@example.com'
const LINE_CHANNEL_TOKEN = Deno.env.get('LINE_CHANNEL_TOKEN')
const APP_URL         = Deno.env.get('APP_URL') ?? ''

const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

async function sendEmail(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, text }),
  })
}

// 可選:需在 profiles 加 line_user_id 欄位,並讓使用者綁定 LINE
async function sendLine(lineUserId: string, text: string) {
  if (!LINE_CHANNEL_TOKEN || !lineUserId) return
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LINE_CHANNEL_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: lineUserId, messages: [{ type: 'text', text }] }),
  })
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const rec = payload.record ?? payload // Supabase webhook 的 record;或直接傳 notification
    if (!rec?.user_id) return new Response('no recipient', { status: 200 })

    const { data: profile } = await admin
      .from('profiles').select('*').eq('id', rec.user_id).maybeSingle()

    const link = rec.case_id && APP_URL ? `\n\n${APP_URL}/cases/${rec.case_id}` : ''
    const body = `${rec.message ?? '您有一則新的案件通知'}${link}`

    if (profile?.email)         await sendEmail(profile.email, '【案件平臺】新通知', body)
    if (profile?.line_user_id)  await sendLine(profile.line_user_id, body)

    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response('error', { status: 200 }) // 回 200 避免 webhook 重試風暴
  }
})
