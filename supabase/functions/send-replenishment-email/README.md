# send-replenishment-email — 補倉訂單自動寄信

把 `replenishment_orders` 一張單組成漂亮 HTML，透過 [Resend](https://resend.com) 寄給供應商，並把該單狀態更新為 `sent`。

## 一次性設定（5 分鐘）

### 1. 開 Resend 帳號 + 拿 API key
1. 去 [resend.com](https://resend.com) → Sign up（免費 100 封/天）
2. **API Keys** → Create API Key → 名稱填 `quote-cloud` → 複製 `re_...` 開頭那串
3. （可選但建議）**Domains** → Add Domain → 填你自己的網域（如 `mumeijia.com`）→ 照畫面去 DNS 加 3 筆紀錄驗證；驗完才能用 `orders@mumeijia.com` 之類的寄件位址。**沒驗證**也能寄，但只能用 `onboarding@resend.dev`，且**只能寄給 Resend 帳號註冊的 email**（測試夠用）

### 2. 設定 Supabase secrets
裝 Supabase CLI：[官方安裝指南](https://supabase.com/docs/guides/cli)，登入後在專案根目錄：

```bash
supabase login
supabase link --project-ref cibwkvgaiclmrbujgios
supabase secrets set RESEND_API_KEY="re_你的key"
# 以下選填：
supabase secrets set RESEND_FROM_EMAIL="orders@mumeijia.com"    # 已驗證網域才能用
supabase secrets set RESEND_FROM_NAME="木美家"
supabase secrets set REPLENISHMENT_CC_EMAIL="purchase@mumeijia.com"
```

### 3. 部署 Edge Function
```bash
supabase functions deploy send-replenishment-email --no-verify-jwt
```
> 加 `--no-verify-jwt` 是讓 pg_cron 也能呼叫；如果只想從前端呼叫，可以拿掉這個 flag。

部署完成後，後台「補倉」分頁的「寄送全部待發送」「寄 email 給供應商」按鈕就能直接用。

---

## （選用）每週一自動產生補倉單 + 寄送

需要先在 Supabase Dashboard → Database → Extensions 啟用 `pg_cron` 與 `pg_net`，然後跑：

```sql
-- 每週一 10:00 UTC（= 18:00 台灣）：產生補倉單 + 寄信
select cron.schedule(
  'weekly-replenishment-and-email',
  '0 10 * * 1',
  $$
  do $body$
  declare cnt int;
  begin
    cnt := public.generate_replenishments();
    if cnt > 0 then
      perform net.http_post(
        url := 'https://cibwkvgaiclmrbujgios.supabase.co/functions/v1/send-replenishment-email',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('send_all_pending', true)
      );
    end if;
  end $body$;
  $$
);

-- 解除排程：
-- select cron.unschedule('weekly-replenishment-and-email');
```

---

## 故障排除

| 症狀 | 原因 / 解法 |
|---|---|
| 按鈕按下後跳「RESEND_API_KEY not set」 | secrets 未設或未重新部署，重跑 `supabase functions deploy` |
| Resend 回 `Domain not verified` | 用 `onboarding@resend.dev` 當寄件地址；或去 Resend 驗證自家網域 |
| 收信地址收不到 | 用 `onboarding@resend.dev` 時，收信人**必須**是 Resend 帳號註冊那個 email；正式上線請驗證自家網域 |
| 函式呼叫 401/403 | Edge Function 預設要 JWT；部署時加 `--no-verify-jwt` 或從前端用 `supabase.functions.invoke()` |
| pg_cron 沒跑 | Dashboard → Database → Extensions 確認啟用；`select * from cron.job;` 查排程；`select * from cron.job_run_details order by start_time desc limit 5;` 看執行紀錄 |
