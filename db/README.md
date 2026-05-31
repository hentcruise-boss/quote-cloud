# 資料庫遷移 (第一階段)

在 [Supabase SQL Editor](https://supabase.com/dashboard) 依序貼上並執行:

1. **`001_schema.sql`** — 建立 `profiles / customers / cases / quotes / case_events / comments / attachments / case_participants`,並為 `quote_items` 加上 `quote_id`、`export_history` 加上 `case_id`。
2. **`002_backfill.sql`** — 把既有 `projects` 搬遷成 `cases`(每案一筆 `quote`),既有報價清單改掛 `quote_id`。原 `projects` 保留不刪(回滾用)。
3. **`003_rls.sql`** — 開啟 RLS 與 Storage,**關閉匿名外網**,資料自此需登入存取。
4. **`004_phase2_rls.sql`**(第二階段)— 開放客戶/供應商/現場依「參與者」存取,並建立 `quote_items_public` 乾淨視圖(對外不含成本)。
5. **`005_phase3.sql`**(第三階段)— 生產排程 / QC 檢查 / 交貨簽收三個模組(參與者可讀、內部可寫)。
6. **`006_phase4_tickets.sql`**(第四階段)— 售後 / 保固工單(參與者可讀、可建立報修;內部管理狀態)。
7. **`007_phase6_notifications.sql`**(站內通知)— `notifications` 表 + trigger:事件/留言自動通知「參與者+負責人」。
8. **`008_phase8_feedback.sql`**(滿意度回饋)— `feedback` 表(客戶評分 1–5★ + 留言;參與者可讀、客戶可提交)。
9. **`009_phase9_billing.sql`**(合約/請款)— `contracts` / `invoices`(財務資料,內部限定)。
10. **`010_phase9_inventory.sql`**(庫存)— `inventory` / `stock_movements`(出入庫異動結算在庫量,內部限定)。

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
| `customer` / `supplier` / `field` | 客戶 / 供應商 / 現場 | (執行 004 後)只看被指派的案件、留言、上傳;**看不到成本** |

## 第二階段(004,對外開放)

`004_phase2_rls.sql` 加入 `can_see_case()` 細緻 RLS、`quote_items_public` / `public_profiles`
視圖(對外移除成本/廠商/毛利)、附件→事件 trigger,以及 Storage 參與者政策。

外部帳號採「輕量版邀請」:對方自行用 email/密碼**註冊一次** → 管理員在「使用者」頁設定其角色
(客戶/供應商/現場)、在案件詳情的「**參與者**」面板把他加入指定案件 → 他登入後只看得到那些案件。
