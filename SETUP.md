# 上線設定步驟清單(給管理者)

從目前狀態到「整套平臺可用」,**你需要親自做的事**。由上而下照順序做即可。
打勾代表完成。大多是一次性設定。

---

## 0. 部署前端(讓網站是新版)

- [ ] **方式 A(正式上線)**:在 GitHub 把 PR #2 合併到 `main`。Vercel 會自動把 `main` 部署到正式網址。
- [ ] **方式 B(先試用)**:直接用 PR 的 Vercel 預覽網址測試(已自動部署)。

> 前端不需要設定任何環境變數;Supabase 連線金鑰已內建(公開金鑰,安全由資料庫 RLS 把關)。

---

## 1. 執行資料庫遷移(最重要)

在 [Supabase Dashboard](https://supabase.com/dashboard) → 你的專案 → **SQL Editor**,
把 `db/` 資料夾裡的檔案**依序**貼上並 Run(每個檔都可重複執行,安全):

- [ ] `001_schema.sql`
- [ ] `002_backfill.sql`(把舊的報價專案搬成「案件」)
- [ ] `003_rls.sql` ← **執行後舊的免登入頁面會停用,改為需登入**
- [ ] `004_phase2_rls.sql`
- [ ] `005_phase3.sql`
- [ ] `006_phase4_tickets.sql`
- [ ] `007_phase6_notifications.sql`
- [ ] `008_phase8_feedback.sql`
- [ ] `009_phase9_billing.sql`
- [ ] `010_phase9_inventory.sql`
- [ ] `011_phase10_warehouses.sql`
- [ ] `012_phase10_billing_visibility.sql`
- [ ] `013_phase11_transfers.sql`
- [ ] `014_phase11_bom.sql`
- [ ] `015_phase12_stock_guard.sql`
- [ ] `016_phase12_purchasing.sql`
- [ ] `017_phase12_member_scope.sql` ← **執行後員工只看得到自己負責/被指派的案**
- [ ] `018_phase13_cost.sql`
- [ ] `019_phase13_batch.sql`
- [ ] `020_phase14_dashboard_prefs.sql`

> 產品/場景資料若是全新專案才需要跑 `seed.sql`;你現有專案已有資料,**不用**再跑。

---

## 2.(建議)關閉 Email 驗證,讓註冊後立即可登入

- [ ] Supabase Dashboard → **Authentication → Providers → Email** → 關閉「Confirm email」。

> 不關的話,每個新帳號註冊後要先收信點驗證連結才能登入。內部使用建議先關。

---

## 3. 建立你的管理員帳號

- [ ] 打開網站 → 「**建立新帳號**」,用你的 email/密碼註冊。
- [ ] 回 Supabase **SQL Editor**,把自己升為管理員:
  ```sql
  update profiles set role = 'admin' where email = '你的email@example.com';
  ```
- [ ] 重新整理網站 → 你現在是管理員,看得到全部。

---

## 4. 設定團隊與角色

- [ ] **內部同事**:請他們各自到網站註冊 → 你在「**使用者**」頁把他們設為 `內部員工`。
- [ ] **客戶 / 供應商 / 現場人員**:請他們各自註冊 → 你在「**使用者**」頁設定對應角色
      (客戶 / 供應商 / 現場)。
- [ ] 要讓某人看到某個案件:進該案件 → 右側「**參與者**」面板把他加入。
      - 客戶 → 關係選「客戶」(可看唯讀報價與付款進度)。
      - 供應商/現場 → 對應關係(可看、留言、上傳)。
      - **要讓另一位內部同事也看某案** → 也用參與者面板加入(關係選「旁觀 watcher」)。

---

## 5. 設定倉庫與基礎資料

- [ ] 「**庫存 → 倉庫管理**(齒輪,限管理員)」:確認/調整倉庫的**公司歸屬**
      (祥鼎倉、木美家一/二倉已預設;**清遠倉預設未指定公司**,請設定)。可新增/停用倉。
- [ ] (選用)「**產品資料庫**」維護產品、成本;「**BOM 物料表**」設定產品的組成物料
      (要用「生產完工扣料」才需要)。
- [ ] (選用)各倉初始庫存:到「**庫存**」用「調整」入庫,或用「**採購單 → 收貨入庫**」建立。

---

## 6. 指派舊案件的負責人(跑完 017 後必做)

- [ ] 跑完 `017` 後,**員工只看得到自己負責或被指派的案件**。
      由 `002` 從舊資料搬進來的案件**沒有負責人**,所以**只有管理員看得到**。
- [ ] 用管理員身分逐一打開這些舊案件 → 標頭的「**負責人**」下拉,指派給對應同事。
      (新建的案件會自動以建立者為負責人,不受影響。)

---

## 7.(選用)接上 Email / LINE 外部推播

站內通知(鈴鐺)不需這步就能用。要外推 Email/LINE 才需要,**在你自己電腦**執行:

- [ ] 安裝並登入 CLI、連結專案、設定金鑰、部署函式:
  ```bash
  npm i -g supabase
  supabase login
  supabase link --project-ref kozmkcnmwylidrcrhyjx
  supabase secrets set RESEND_API_KEY=re_你的金鑰 \
    EMAIL_FROM="祥鼎案件平臺 <noreply@你的已驗證網域>" APP_URL="https://你的網址"
  supabase functions deploy notify-push
  ```
- [ ] Supabase Dashboard → **Database → Webhooks** → 新增:
      Table `notifications`、Event `INSERT`、Type `Supabase Edge Functions`、Function `notify-push`。
- [ ] (要 Email)先到 [Resend](https://resend.com) 開帳號、驗證寄件網域、拿 API 金鑰。
- [ ] (要 LINE)另需 LINE 官方帳號 + Messaging API token,並在 `profiles` 加 `line_user_id`(詳見 `supabase/functions/README.md`)。

---

## 8. 安全驗收(上線前務必做一次)

- [ ] 另開一個**客戶測試帳號**登入,確認:
      ① 只看得到「被加入的案件」、② 看得到唯讀報價/付款進度、
      ③ **任何畫面與網路封包都看不到成本/廠商/毛利**。
- [ ] 用一個**員工測試帳號**登入,確認只看得到自己負責/被指派的案件。

---

完成以上,平臺即可正式營運:報價(多版本)→ 簽約/請款 → 生產(BOM 扣料)→
交貨(出貨扣庫存)→ QC → 售後 → 滿意度,搭配多倉/調撥/採購、報表、通知與權限控管。
