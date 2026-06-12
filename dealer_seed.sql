-- =====================================================================
--  C 入庫代管 · 下單系統  —  種子資料（Demo）
--  先在 Supabase SQL Editor 跑完 dealer_schema.sql，再跑本檔。
--  價格皆為「未稅」牌價，經銷商實際看到的價 = 牌價 × 該等級 price_rate。
-- =====================================================================

-- 1. 定價等級 -----------------------------------------------------------
insert into public.pricing_tiers (id, name, price_rate, note) values
  ('A', '經銷 A 級（核心）', 0.70, '長期合作 / 量大'),
  ('B', '經銷 B 級', 0.80, '一般經銷'),
  ('C', '經銷 C 級（入庫代管）', 0.88, 'C 入庫代管檔客戶')
on conflict (id) do update set name = excluded.name, price_rate = excluded.price_rate, note = excluded.note;

-- 2. 對外品項（木美家 demo，placeholder 圖）---------------------------------
insert into public.dealer_products (sku, name, series, category, description, spec, material, base_price, image_url, qty_tiers, is_active, sort_order) values
  ('MM-SOFA-01', '北歐三人布沙發', '客廳系列', '沙發', '可拆洗布套，獨立筒坐墊，附抱枕 ×2。', 'W2000×D900×H850', '實木框＋高密度泡棉＋布面', 32000, 'https://placehold.co/600x450/EAE6DD/8A7A5C?text=MM-SOFA-01', '[{"min_qty":5,"rate":0.97},{"min_qty":10,"rate":0.94}]', true, 10),
  ('MM-SOFA-02', 'L 型機能沙發', '客廳系列', '沙發', '左右可換向，附儲物腳凳。', 'W2600×D1600×H850', '實木框＋科技布', 46000, 'https://placehold.co/600x450/EAE6DD/8A7A5C?text=MM-SOFA-02', '[{"min_qty":5,"rate":0.96}]', true, 20),
  ('MM-TBL-01', '橡木餐桌（1.6m）', '餐廳系列', '餐桌', '實木貼皮，耐刮防潑水。', 'W1600×D900×H750', '橡木實木貼皮', 18000, 'https://placehold.co/600x450/E6E0D4/8A7A5C?text=MM-TBL-01', '[{"min_qty":10,"rate":0.95}]', true, 30),
  ('MM-CHR-01', '餐椅（單張）', '餐廳系列', '餐椅', '人體工學椅背，可堆疊。', 'W480×D520×H880', '實木腳＋PU 坐墊', 3200, 'https://placehold.co/600x450/E6E0D4/8A7A5C?text=MM-CHR-01', '[{"min_qty":20,"rate":0.92},{"min_qty":50,"rate":0.88}]', true, 40),
  ('MM-BED-01', '雙人床架（5 尺）', '臥室系列', '床架', '簡約床頭，免螺絲快組。', 'W152×D200×H100 cm', '實木＋金屬五金', 24000, 'https://placehold.co/600x450/E3DFD6/8A7A5C?text=MM-BED-01', '[]', true, 50),
  ('MM-WRD-01', '系統衣櫃（2 門）', '臥室系列', '衣櫃', '滑門設計，內附吊桿與層板。', 'W1200×D600×H2000', '系統板材', 21000, 'https://placehold.co/600x450/E3DFD6/8A7A5C?text=MM-WRD-01', '[]', true, 60),
  ('MM-TV-01', '懸浮電視櫃（1.8m）', '客廳系列', '電視櫃', '懸空設計好清潔，附線材收納孔。', 'W1800×D400×H300', '木心板＋鋼刷面', 12500, 'https://placehold.co/600x450/EAE6DD/8A7A5C?text=MM-TV-01', '[{"min_qty":10,"rate":0.95}]', true, 70),
  ('MM-DESK-01', '兒童成長書桌', '兒童系列', '書桌', '可調高度與桌面傾角。', 'W1000×D600×H540~760', '環保板材＋金屬', 9800, 'https://placehold.co/600x450/E1DCCF/8A7A5C?text=MM-DESK-01', '[{"min_qty":10,"rate":0.93}]', true, 80),
  ('MM-SHELF-01', '開放式書架（5 層）', '收納系列', '書架', '可單獨或並排使用。', 'W800×D300×H1800', '木心板', 6800, 'https://placehold.co/600x450/E1DCCF/8A7A5C?text=MM-SHELF-01', '[]', true, 90),
  ('MM-RUG-01', '手工羊毛地毯（2×3m）', '軟裝系列', '地毯', '低甲醛，止滑底。', '200×300 cm', '紐西蘭羊毛', 14000, 'https://placehold.co/600x450/E8E2D6/8A7A5C?text=MM-RUG-01', '[]', true, 100)
on conflict (sku) do update set
  name = excluded.name, series = excluded.series, category = excluded.category,
  description = excluded.description, spec = excluded.spec, material = excluded.material,
  base_price = excluded.base_price, image_url = excluded.image_url,
  qty_tiers = excluded.qty_tiers, is_active = excluded.is_active, sort_order = excluded.sort_order;

-- 3. 選配（示範：沙發顏色、餐桌尺寸、床架配件）-------------------------------
delete from public.product_options where sku in ('MM-SOFA-01','MM-SOFA-02','MM-TBL-01','MM-BED-01','MM-DESK-01');
insert into public.product_options (sku, group_name, label, price_delta, is_default, sort_order) values
  ('MM-SOFA-01', '顏色', '米灰', 0, true, 1),
  ('MM-SOFA-01', '顏色', '墨綠', 1500, false, 2),
  ('MM-SOFA-01', '顏色', '焦糖棕', 1500, false, 3),
  ('MM-SOFA-01', '配件', '加購腳凳', 4500, false, 4),
  ('MM-SOFA-02', '顏色', '淺灰', 0, true, 1),
  ('MM-SOFA-02', '顏色', '深藍', 2000, false, 2),
  ('MM-TBL-01', '尺寸', '1.6m', 0, true, 1),
  ('MM-TBL-01', '尺寸', '1.8m（加長）', 3000, false, 2),
  ('MM-TBL-01', '尺寸', '2.0m（加長）', 6000, false, 3),
  ('MM-BED-01', '尺寸', '標準雙人 5 尺', 0, true, 1),
  ('MM-BED-01', '尺寸', '雙人加大 6 尺', 2500, false, 2),
  ('MM-BED-01', '配件', '加購床底收納抽屜', 3800, false, 3),
  ('MM-DESK-01', '顏色', '原木', 0, true, 1),
  ('MM-DESK-01', '顏色', '白', 0, false, 2);

-- =====================================================================
--  4. 建立 Demo 帳號（管理員 + 3 位經銷商）
--  ─────────────────────────────────────────────────────────────────
--  帳號需先在 Supabase Auth 建立，再回來執行下面的連結 SQL。
--
--  步驟：
--   (1) Supabase 後台 → Authentication → Users → Add user，
--       逐一建立並設定密碼（記得勾 Auto confirm / 或關閉 email 驗證）：
--         admin@mm-demo.com          （管理員）
--         dealer-a@mm-demo.com       （A 級經銷商）
--         dealer-b@mm-demo.com       （B 級經銷商）
--         dealer-c@mm-demo.com       （C 級 · 入庫代管）
--   (2) 回到 SQL Editor，執行下方 INSERT（用 email 自動帶出 auth_user_id）。
--   (3) 之後請把這些 demo email / 密碼換成你自己的正式帳號。
-- =====================================================================

-- 管理員
insert into public.admins (auth_user_id, name)
select id, '系統管理員' from auth.users where email = 'admin@mm-demo.com'
on conflict (auth_user_id) do nothing;

-- 經銷商 A
insert into public.dealers (auth_user_id, company, contact_name, phone, email, pricing_tier_id, rep_name, rep_phone, is_active)
select id, '大器家居（demo）', '王大器', '0912-000-001', email, 'A', '林專員', '02-1234-5678', true
from auth.users where email = 'dealer-a@mm-demo.com'
on conflict (auth_user_id) do nothing;

-- 經銷商 B
insert into public.dealers (auth_user_id, company, contact_name, phone, email, pricing_tier_id, rep_name, rep_phone, is_active)
select id, '溫居選物（demo）', '陳溫居', '0912-000-002', email, 'B', '林專員', '02-1234-5678', true
from auth.users where email = 'dealer-b@mm-demo.com'
on conflict (auth_user_id) do nothing;

-- 經銷商 C（入庫代管）
insert into public.dealers (auth_user_id, company, contact_name, phone, email, pricing_tier_id, rep_name, rep_phone, is_active)
select id, '日好生活（demo）', '李日好', '0912-000-003', email, 'C', '林專員', '02-1234-5678', true
from auth.users where email = 'dealer-c@mm-demo.com'
on conflict (auth_user_id) do nothing;
