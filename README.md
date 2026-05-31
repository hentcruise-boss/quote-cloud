# 木美家 · C 入庫代管網頁下單系統

給 C 級經銷商的自助下單平台 —— 不必屯貨、不必養倉，就能做生意。
經銷商可自助**選品、看專屬價、下單、追蹤進度**；後台可管理經銷商、產品、定價與訂單。

> 本 repo 同時保留既有的「祥鼎辦公家具報價系統」於 `/internal` 路徑，兩套互不影響。

---

## 路由總覽

| 路徑 | 對象 | 說明 |
|------|------|------|
| `/login` | 全部 | Email + 密碼登入（Supabase Auth） |
| `/`、`/catalog`、`/product/:sku`、`/cart`、`/orders`、`/orders/:id`、`/favorites` | 經銷商 | 手機優先（RWD）前台 |
| `/admin`、`/admin/dealers`、`/admin/products`、`/admin/pricing` | 管理員 | 後台 |
| `/internal` | 內部 | 既有祥鼎報價系統（原樣保留） |

登入後依身分自動導向：管理員 → `/admin`，經銷商 → `/`。

---

## 開發 / 建置

```bash
npm install
npm run dev        # 本機開發
npm run build      # 產出 dist/
npm run preview    # 預覽 production build
```

Supabase 連線資訊在 `src/supabase.js`。

---

## 首次部署（重要）

### 1. 建立資料表
在 Supabase → SQL Editor 依序執行：

1. `dealer_schema.sql` —— 建立資料表、RLS、觸發器（可重複執行）
2. `dealer_seed.sql` —— 定價等級、Demo 產品與選配

### 2. 建立登入帳號
資料表的 `dealers` / `admins` 需綁定一個 Supabase Auth 使用者。
本系統內建**自動綁定**機制：只要 Auth 帳號的 Email 與資料列相符即會自動連結。

操作：
1. Supabase → Authentication → Users → **Add user**，逐一建立並設密碼
   （建議勾選 Auto Confirm，省去 Email 驗證）：
   - `admin@mm-demo.com`（管理員）
   - `dealer-a@mm-demo.com`、`dealer-b@mm-demo.com`、`dealer-c@mm-demo.com`（經銷商）
2. 回到 SQL Editor 執行 `dealer_seed.sql` 末段的連結 INSERT
   （以 Email 自動帶出 `auth_user_id`）。
3. 之後請把 Demo 帳號換成正式 Email / 密碼。

> 新增經銷商的日常流程：後台「經銷商」頁先建好資料（含 Email）→ 到 Supabase Auth
> 用**相同 Email** 建帳號設密碼 → 觸發器自動綁定 → 經銷商即可登入。

### 3. 靜態部署
專案為純前端 SPA，已附 `vercel.json` 與 `public/_redirects` 處理深層連結 fallback，
可直接部署到 Vercel / Netlify（build 指令 `npm run build`，輸出 `dist`）。

---

## 計價邏輯

所有金額以**未稅**運算，顯示時才依切換加 5% 營業稅。

```
專屬單價 = 覆寫價（若有） 或 牌價 × 等級乘數
         + 選配加價總和
         ，再乘上符合數量的階梯折扣
```

- 等級乘數：`pricing_tiers.price_rate`（如 0.70 = 牌價 7 折）
- 覆寫價：`dealer_price_overrides`（特定經銷商 × 特定品項的固定價）
- 數量階梯：`dealer_products.qty_tiers`，如 `[{"min_qty":10,"rate":0.95}]`

RLS 確保每位經銷商只讀得到**自己的等級價、覆寫價、訂單與收藏**。

---

## MVP 範圍（已完成）

模組 1 選品 · 2 即時報價 · 3 線上下單 · 4 進度追蹤（生產→海運→到台→入庫→出庫）
＋ 站內通知、常用清單、聯絡專員入口、最小後台（經銷商／產品／定價／訂單）。

### 尚未涵蓋（第二期 / 待串接）
- 模組 5 庫存代管查詢、模組 6 對帳中心（schema 預留，UI 未做）
- 推播 / 簡訊通知（目前為站內通知；Email 走 Supabase Auth）
- 產品真實圖片與品項（現為 placeholder，待批次匯入）

---

## 技術

React 18 · Vite · React Router · Tailwind CSS · Supabase（Postgres + Auth + RLS）
