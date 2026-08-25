-- Per-user "즐겨찾기" (favorite) flag on documents, from the sidebar's "..." menu.
create table document_favorites (
  user_id uuid not null references profiles (id) on delete cascade,
  document_id uuid not null references documents (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, document_id)
);

alter table document_favorites enable row level security;

create policy "users manage their own favorites"
  on document_favorites for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
