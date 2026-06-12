# 產品 CSV 上架說明

兩個檔，照順序匯入：

1. **`products.csv`** —— 主產品（必）
2. **`product_options.csv`** —— 選配（選填，例如沙發顏色、餐桌尺寸）

匯入完之後，產品就自動上架到經銷商前台。

---

## products.csv 欄位

| 欄位 | 必填 | 說明 | 範例 |
|---|---|---|---|
| `sku` | ✅ | 唯一編號（英數字＋連字號），上架後不要改 | `MM-SOFA-01` |
| `name` | ✅ | 產品名稱（前台顯示） | `北歐三人布沙發` |
| `series` | — | 系列名（前台會顯示在卡片上） | `客廳系列` |
| `category` | — | 類型（前台選品頁的篩選用） | `沙發` |
| `description` | — | 簡短描述 | `可拆洗布套；獨立筒坐墊…` |
| `spec` | — | 規格 / 尺寸 | `W2000×D900×H850` |
| `material` | — | 材質 | `實木框＋高密度泡棉＋布面` |
| `base_price` | ✅ | **牌價（未稅）**，整數 | `32000` |
| `image_url` | — | 圖片網址（公開可取）；留空會顯示「無圖片」 | `https://...jpg` |
| `qty_tiers` | — | 數量階梯（JSON 字串），沒有就填 `[]` | `[{"min_qty":10,"rate":0.95}]` |
| `is_active` | — | 是否上架，預設 `TRUE` | `TRUE` / `FALSE` |
| `sort_order` | — | 排序（小的在前），預設 `0` | `10` |

### `qty_tiers` JSON 寫法

| 想要 | 寫法 |
|---|---|
| 沒有數量折扣 | `[]` |
| 滿 10 件打 95 折 | `[{"min_qty":10,"rate":0.95}]` |
| 滿 10 件 95 折、滿 20 件 9 折 | `[{"min_qty":10,"rate":0.95},{"min_qty":20,"rate":0.9}]` |

> ⚠️ Excel 存 CSV 會把 `"` 變成 `""`，這是對的，不用手動修。

---

## product_options.csv 欄位

| 欄位 | 必填 | 說明 |
|---|---|---|
| `sku` | ✅ | 對應到 `products.csv` 的 SKU |
| `group_name` | ✅ | 選配群組（顏色／尺寸／配件…） |
| `label` | ✅ | 選項名稱（米灰／墨綠／加購腳凳…） |
| `price_delta` | — | 加價（未稅，可負），預設 0 |
| `is_default` | — | 是否為該群組預設選項，預設 `FALSE`，**同一群組只能有一個 TRUE** |
| `sort_order` | — | 排序，預設 0 |

---

## 上架步驟（Supabase Table Editor）

### 1. 匯入主產品
1. Supabase → **Table Editor** → 左側選 `dealer_products`
2. 右上角 **Insert → Import data from CSV**
3. 選你填好的 `products.csv`
4. **欄位對應**會自動配；確認 `base_price` 是 numeric、`qty_tiers` 是 jsonb、`is_active` 是 bool
5. **Import** → 看到 `imported N rows`

### 2. 匯入選配（如有）
跟上面一樣，選 `product_options` 表，匯入 `product_options.csv`。

### 3. 看前台
打開預覽網址 → 經銷商帳號登入 → 選品 → 應該看到新品項。

---

## 常見問題

| 症狀 | 解法 |
|---|---|
| Excel 開 CSV 中文亂碼 | 我們已加 UTF-8 BOM，正常 Excel 直接打開即可。若仍亂碼，改用 Google Sheets 開→「另存為 CSV」 |
| 匯入時 `duplicate key value: sku` | 該 SKU 已存在；要更新請到後台「產品」頁直接編輯，或先 DELETE 該列再匯入 |
| 圖片開不出來 | URL 必須是公開可取（直接貼到瀏覽器能看到）；最簡單：用後台「產品」直接上傳到 Supabase Storage（見下方） |
| 已上架但前台看不到 | 檢查 `is_active` 是否為 `TRUE` |
| 想暫時下架 | 後台「產品」頁點眼睛圖示，或直接改 `is_active = FALSE` |

---

## 圖片：用 Supabase Storage 自家託管（推薦）

CSV 匯入時，`image_url` 留空沒關係；之後到後台「產品」→ 點該產品 → 在「圖片」區直接**選檔上傳**，
系統會自動傳到 Supabase Storage 的 `product-images` bucket，並回填公開網址。

啟用步驟（一次性）：
1. 先到 SQL Editor 跑 `storage_setup.sql`（會建好 bucket 與權限：任何人可看、admin 才能上傳）
2. 之後後台「產品」的圖片區就能直接上傳；管理員以外的人完全動不到 Storage

> 也可手動填 image_url（Imgur / 自家 CDN / Google Drive 公開連結），那種方式比較不建議——連結容易失效。

---

## 大量品項：用 Google Sheets 編輯更舒服

1. 把 `products.csv` 上傳到 Google Drive → 用 Google Sheets 開
2. 在 Sheets 編輯／填料（中文不會亂碼）
3. 完成後 **檔案 → 下載 → 逗號分隔值 (.csv)**
4. 直接拿去 Supabase 匯入
