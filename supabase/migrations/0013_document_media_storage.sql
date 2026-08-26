-- Storage for images embedded in document content. Public bucket with
-- random UUID-based file paths (not derivable from workspace/document id) -
-- the URL is only ever seen by someone who already has legitimate access to
-- view the document it's embedded in (that's the only place it appears), so
-- this trades strict access control for simplicity: embedded image URLs are
-- permanent, no signed-URL refresh/expiry to deal with when rendering.
insert into storage.buckets (id, name, public)
values ('document-images', 'document-images', true)
on conflict (id) do nothing;

create policy "authenticated users can upload document images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'document-images');

create policy "anyone can view document images"
on storage.objects for select
to public
using (bucket_id = 'document-images');
