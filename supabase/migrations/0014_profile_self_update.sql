-- Lets a user edit their own name/avatar (profiles already has both
-- columns, from the OAuth signup backfill in 0004 - this just opens up
-- self-service writes to them, which nothing has needed until now).
create policy "users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Storage for profile pictures. Public bucket (avatars are meant to be
-- visible to anyone who can see the user, same as everywhere else in the
-- app), but unlike document-images, uploads/updates/deletes are restricted
-- to files under the user's own id-prefixed folder path - a document's
-- embedded image URL is only ever reached by someone with legitimate
-- access to that document, but every member sees every other member's
-- avatar, so this needs the extra restriction to stop one user from
-- overwriting another's avatar file.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can update their own avatar"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own avatar"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "anyone can view avatars"
on storage.objects for select
to public
using (bucket_id = 'avatars');
