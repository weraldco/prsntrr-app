-- Public bucket for slide images (viewers load via public URL).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'slide-assets',
  'slide-assets',
  true,
  20971520,
  array['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read slide-assets" on storage.objects;

create policy "Public read slide-assets"
on storage.objects for select
to public
using (bucket_id = 'slide-assets');

-- Authenticated presenters could upload via client later; server uses service role and bypasses RLS.
