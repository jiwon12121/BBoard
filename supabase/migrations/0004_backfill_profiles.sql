-- Users who signed up before the handle_new_user trigger existed (or before
-- any future trigger hiccup) have no profiles row. Backfill them; safe to
-- rerun since it only inserts users missing a profile.
insert into public.profiles (id, email, name, avatar_url)
select
  u.id,
  u.email,
  u.raw_user_meta_data ->> 'full_name',
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
