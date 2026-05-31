-- =====================================================================
--  第二期種子（Demo 庫存）—— 跑完 dealer_schema_p2.sql 後執行。
--  需先建立 dealer-c@mm-demo.com 帳號並完成綁定（見 dealer_seed.sql 說明）。
--  幫「日好生活（C 級）」放幾筆樹林倉的代管庫存。
-- =====================================================================

do $$
declare did uuid;
begin
  select id into did from public.dealers where email = 'dealer-c@mm-demo.com';
  if did is null then
    raise notice '找不到 dealer-c@mm-demo.com，請先建立帳號並綁定後再執行本檔';
    return;
  end if;

  -- 以 RPC 入庫（會同時寫異動紀錄）
  perform public.inventory_adjust(did, 'MM-SOFA-01', '北歐三人布沙發', 'W2000×D900×H850', '樹林倉', 8,  '期初入庫');
  perform public.inventory_adjust(did, 'MM-CHR-01',  '餐椅（單張）',     'W480×D520×H880',  '樹林倉', 40, '期初入庫');
  perform public.inventory_adjust(did, 'MM-TV-01',   '懸浮電視櫃（1.8m）','W1800×D400×H300', '樹林倉', 5,  '期初入庫');
  perform public.inventory_adjust(did, 'MM-RUG-01',  '手工羊毛地毯（2×3m）','200×300 cm',     '樹林倉', 12, '期初入庫');
end $$;
