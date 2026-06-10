# 外部推播(Email / LINE)— 需你部署啟用

站內通知(鈴鐺)在第六階段已可運作。**外推到 Email / LINE** 需要部署一個 Edge Function
並設定金鑰——這部分必須由你操作(牽涉外部服務帳號與密鑰),程式碼已寫好在
[`notify-push/index.ts`](notify-push/index.ts)。

## 一、部署函式

需先安裝 [Supabase CLI](https://supabase.com/docs/guides/cli) 並 `supabase login`、`supabase link`:

```bash
supabase functions deploy notify-push
```

## 二、設定金鑰

**Email(建議,最快可動)** — 用 [Resend](https://resend.com)(或改寫成 SendGrid 等):

```bash
supabase secrets set \
  RESEND_API_KEY=re_xxxxx \
  EMAIL_FROM="案件平臺 <noreply@你的已驗證網域>" \
  APP_URL="https://你的網站網址"
```

> `SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY` 在 Edge Functions 環境會自動帶入,免設。

**LINE(可選)**:

```bash
supabase secrets set LINE_CHANNEL_TOKEN=你的channel access token
```

並執行下列 SQL 讓使用者可綁定 LINE userId:

```sql
alter table profiles add column if not exists line_user_id text;
```

（之後需各使用者把自己的 LINE userId 填入其 `profiles.line_user_id`;
取得 userId 通常透過 LINE Login 或官方帳號 webhook。)

## 三、啟用觸發(擇一)

**A. Database Webhook(推薦,免寫 SQL)**
Dashboard → Database → Webhooks → Create:
- Table:`notifications`，Events:`INSERT`
- Type:`Supabase Edge Functions`，Function:`notify-push`

**B. pg_net DB trigger(進階)**
若偏好純 DB 觸發,啟用 `pg_net` 後加上(URL/anon key 換成你的):

```sql
create extension if not exists pg_net;

create or replace function trg_notification_push()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url     := 'https://<PROJECT_REF>.functions.supabase.co/notify-push',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer <ANON_OR_SERVICE_KEY>'),
    body    := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end; $$;

drop trigger if exists trg_notification_push on notifications;
create trigger trg_notification_push after insert on notifications
  for each row execute function trg_notification_push();
```

## 運作流程

`案件事件 / 留言 / 工單` → DB trigger 寫入 `notifications`(第六階段)
→ Webhook/pg_net 觸發 `notify-push` → 依收件人 `profiles.email` / `line_user_id` 外推。

> 函式對未設定的管道會自動略過(no-op),所以只設 Email 也能單獨運作。
