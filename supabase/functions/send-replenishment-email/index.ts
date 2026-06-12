// Supabase Edge Function：寄送補倉訂單 email 給供應商（透過 Resend）
//
// 部署：supabase functions deploy send-replenishment-email
// 環境變數（supabase secrets set）：
//   RESEND_API_KEY            必填，Resend API key（re_...）
//   RESEND_FROM_EMAIL         寄件地址（須為 Resend 已驗證網域；測試可用 onboarding@resend.dev）
//   RESEND_FROM_NAME          寄件人顯示名稱（預設「木美家」）
//   REPLENISHMENT_CC_EMAIL    （選）副本給此地址，例如採購信箱
//
// 呼叫方式：
//   POST /functions/v1/send-replenishment-email   { "replenishment_id": "uuid" }
//   POST /functions/v1/send-replenishment-email   { "send_all_pending": true }
//
// 成功會把 replenishment_orders.status 更新為 'sent'、寫 sent_at。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM     = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev'
const RESEND_FROM_NAME = Deno.env.get('RESEND_FROM_NAME') ?? '木美家'
const CC_ADMIN        = Deno.env.get('REPLENISHMENT_CC_EMAIL') ?? ''

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!RESEND_API_KEY) return json({ ok: false, error: 'RESEND_API_KEY not set' }, 500)

  try {
    const body = await req.json().catch(() => ({}))
    let ids: string[] = []

    if (body.replenishment_id) {
      ids = [body.replenishment_id]
    } else if (body.send_all_pending) {
      const { data } = await supabase
        .from('replenishment_orders')
        .select('id, supplier:suppliers(email)')
        .eq('status', 'pending')
      ids = (data || []).filter((r: any) => r.supplier?.email).map((r: any) => r.id)
    } else {
      return json({ ok: false, error: 'Provide replenishment_id or send_all_pending' }, 400)
    }

    if (ids.length === 0) return json({ ok: true, sent: 0, results: [], message: '沒有可寄送的補倉單' })

    const results: any[] = []
    for (const id of ids) {
      try { results.push({ id, ok: true, ...(await sendOne(id)) }) }
      catch (e: any) { results.push({ id, ok: false, error: String(e?.message || e) }) }
    }
    return json({ ok: true, sent: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results })
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, 500)
  }
})

async function sendOne(id: string) {
  const { data: order, error } = await supabase
    .from('replenishment_orders')
    .select('*, supplier:suppliers(*)')
    .eq('id', id)
    .single()
  if (error || !order) throw new Error('找不到補倉單')
  if (!order.supplier) throw new Error('此補倉單未設定供應商')
  if (!order.supplier.email) throw new Error(`供應商「${order.supplier.name}」未設定 email`)

  const { data: items } = await supabase
    .from('replenishment_items').select('*').eq('replenishment_id', id)
  const html = buildHtml(order, items || [])
  const subject = `[補倉訂單] ${order.replenishment_no} — 共 ${(items || []).length} 個品項`

  const payload: any = {
    from: `${RESEND_FROM_NAME} <${RESEND_FROM}>`,
    to: order.supplier.email,
    subject,
    html,
  }
  if (CC_ADMIN) payload.cc = CC_ADMIN

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`Resend API ${resp.status}: ${txt}`)
  }
  const respData = await resp.json()

  await supabase
    .from('replenishment_orders')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)

  return { to: order.supplier.email, subject, resend_id: respData?.id }
}

function buildHtml(order: any, items: any[]) {
  const date = new Date(order.generated_at).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const totalQty = items.reduce((s, i) => s + Number(i.qty || 0), 0)
  const rows = items.map(it => `
    <tr>
      <td style="padding:10px 12px; border-bottom:1px solid #e7e5e4; font-family:'JetBrains Mono','Courier New',monospace; font-size:12px; color:#44403c;">${esc(it.sku)}</td>
      <td style="padding:10px 12px; border-bottom:1px solid #e7e5e4; font-size:14px; color:#1c1917;">${esc(it.name || '')}</td>
      <td style="padding:10px 12px; border-bottom:1px solid #e7e5e4; text-align:right; font-family:'JetBrains Mono','Courier New',monospace; font-weight:bold; color:#1c1917;">×${it.qty}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(order.replenishment_no)}</title></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'PingFang TC','Microsoft JhengHei',sans-serif;color:#1c1917;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <div style="background:#0f766e;color:#fff;padding:24px;border-radius:16px 16px 0 0;">
      <div style="font-size:12px;opacity:0.85;letter-spacing:0.05em;">木美家 · REPLENISHMENT ORDER</div>
      <div style="font-size:28px;font-weight:800;font-family:'JetBrains Mono','Courier New',monospace;margin-top:6px;letter-spacing:0.02em;">${esc(order.replenishment_no)}</div>
      <div style="font-size:12px;opacity:0.85;margin-top:4px;">產生日期：${date}</div>
    </div>

    <div style="background:#fff;padding:24px;border-radius:0 0 16px 16px;border:1px solid #e7e5e4;border-top:0;">
      <div style="margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid #f5f5f4;">
        <div style="font-size:11px;color:#a8a29e;text-transform:uppercase;letter-spacing:0.08em;">致 / Supplier</div>
        <div style="font-size:18px;font-weight:bold;margin-top:6px;color:#1c1917;">${esc(order.supplier?.name || '')}</div>
        ${order.supplier?.contact_name ? `<div style="font-size:13px;color:#78716c;margin-top:2px;">聯絡人：${esc(order.supplier.contact_name)}</div>` : ''}
      </div>

      <p style="margin:0 0 18px 0;color:#44403c;line-height:1.7;font-size:14px;">
        您好，茲附上本期補倉訂單，請依下列品項與數量備貨。如有任何疑問，請聯繫木美家採購窗口。
      </p>

      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead>
          <tr style="background:#fafaf9;">
            <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#78716c;border-bottom:2px solid #e7e5e4;width:120px;">SKU</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#78716c;border-bottom:2px solid #e7e5e4;">品名</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#78716c;border-bottom:2px solid #e7e5e4;width:80px;">數量</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="3" style="padding:14px 12px 0 12px;text-align:right;font-size:13px;color:#57534e;">
            共 <strong style="color:#1c1917;">${items.length}</strong> 個品項，合計 <strong style="color:#0f766e;font-family:'JetBrains Mono','Courier New',monospace;">${totalQty}</strong> 件
          </td></tr>
        </tfoot>
      </table>

      ${order.note ? `<div style="margin-top:18px;padding:12px 14px;background:#fef3c7;border-radius:8px;font-size:13px;color:#78350f;border-left:3px solid #f59e0b;"><strong>備註：</strong>${esc(order.note)}</div>` : ''}

      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #f5f5f4;font-size:12px;color:#78716c;line-height:1.7;">
        <strong style="color:#1c1917;font-size:13px;">木美家創意家具有限公司</strong><br>
        新北市樹林區佳園路 3 段 101 巷 62 弄 52-20 號<br>
        電話：8671-6341 · 傳真：8671-6343
      </div>
    </div>

    <div style="margin-top:14px;text-align:center;font-size:11px;color:#a8a29e;line-height:1.6;">
      此為系統自動發送之補倉訂單。請以此單為備貨依據；如有錯漏請主動回信告知。
    </div>
  </div>
</body></html>`
}

function esc(s: any): string {
  return String(s ?? '').replace(/[<>&"']/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' } as any)[c])
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}
