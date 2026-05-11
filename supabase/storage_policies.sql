-- Storage policies (paste into Supabase SQL Editor)
-- Buckets required: meal-images, step-proofs

alter table storage.objects enable row level security;

-- meal-images
create policy "meal_images_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'meal-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "meal_images_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'meal-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- step-proofs
create policy "step_proofs_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'step-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "step_proofs_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'step-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);
