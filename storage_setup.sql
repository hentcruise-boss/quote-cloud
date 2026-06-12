-- =====================================================================
--  Supabase Storage 設定 — 產品圖片
--  在 Supabase SQL Editor 執行（可重複執行）。
--  bucket 名稱：product-images（public，任何人可看，admin 才能上傳/刪除）
-- =====================================================================

-- 1. 建立 public bucket（5MB 上限，限常見圖檔）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'product-images',
    'product-images',
    true,
    5242880,  -- 5 MB
    array['image/jpeg','image/jpg','image/png','image/webp','image/gif']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. RLS：任何人可讀；只有管理員可上傳 / 更新 / 刪除
drop policy if exists "product images public read" on storage.objects;
create policy "product images public read"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "product images admin write" on storage.objects;
create policy "product images admin write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
