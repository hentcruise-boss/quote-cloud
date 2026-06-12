-- =====================================================================
--  Storage 第二期：匯款憑證 bucket
--    bucket：payment-proofs（private；經銷商可上傳/讀自己訂單的；admin 全部）
--    路徑慣例：payment-proofs/{order_id}/{timestamp}.{ext}
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'payment-proofs',
    'payment-proofs',
    false,                              -- 私有 bucket，必須用 signed URL 讀
    5242880,                            -- 5 MB
    array['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 讀：admin 全部；非 admin 限自己訂單
drop policy if exists "payment proofs read" on storage.objects;
create policy "payment proofs read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-proofs' and (
      public.is_admin() or exists (
        select 1 from public.orders o
        where o.id::text = (storage.foldername(name))[1]
          and o.dealer_id = public.current_dealer_id()
      )
    )
  );

-- 寫：經銷商只能寫到自己訂單的資料夾；admin 也可
drop policy if exists "payment proofs insert" on storage.objects;
create policy "payment proofs insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-proofs' and (
      public.is_admin() or exists (
        select 1 from public.orders o
        where o.id::text = (storage.foldername(name))[1]
          and o.dealer_id = public.current_dealer_id()
      )
    )
  );

-- 刪：admin 才能
drop policy if exists "payment proofs delete" on storage.objects;
create policy "payment proofs delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'payment-proofs' and public.is_admin());
