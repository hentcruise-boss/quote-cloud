# 資料庫遷移 (第一階段)

在 [Supabase SQL Editor](https://supabase.com/dashboard) 依序貼上並執行:

1. **`001_schema.sql`** — 建立 `profiles / customers / cases / quotes / case_events / comments / attachments / case_participants`,並為 `quote_items` 加上 `quote_id`、`export_history` 加上 `case_id`。
2. **`002_backfill.sql`** — 把既有 `projects` 搬遷成 `cases`(每案一筆 `quote`),既有報價清單改掛 `quote_id`。原 `projects` 保留不刪(回滾用)。
3. **`003_rls.sql`** — 開啟 RLS 與 Storage,**關閉匿名外網**,資料自此需登入存取。

> 每個檔案都可重複執行(idempotent)。

## 建立第一個管理員

`001` 的 trigger 會在使用者註冊時自動建立 `profiles`,預設角色 `staff`(內部員工)。
請在 App 用 email/密碼註冊第一個帳號後,於 SQL Editor 把自己升為 `admin`:

```sql
update profiles set role = 'admin' where email = '你的email@example.com';
```

之後就能在 App 的「使用者」頁面管理其他人的角色。

## 角色說明(第一階段)

| 角色 | 說明 | 第一階段可見範圍 |
|------|------|------------------|
| `admin` | 管理員 | 全部 + 使用者管理 |
| `staff` | 內部員工 | 全部案件、報價、產品、場景 |
| `customer` / `supplier` / `field` | 客戶 / 供應商 / 現場 | 第二階段才開放登入(schema 已預留) |

## 第二階段(尚未執行)

之後會加入 `is_internal()` + `can_see_case()` 的細緻 RLS、`quote_items_public` 乾淨視圖
(對外移除成本/廠商/毛利欄位),以及客戶/供應商/現場登入。
