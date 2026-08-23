-- Shareable invite links. Anyone holding the token can join at the role it
-- grants; the token itself is the only gate, so it's never exposed via a
-- direct SELECT policy — only through accept_invite(), which runs as the
-- table owner and can see rows RLS would otherwise hide from a non-member.
create table workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  role workspace_role not null default 'editor' check (role in ('editor', 'viewer')),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

alter table workspace_invites enable row level security;

create policy "owner can view workspace invites"
  on workspace_invites for select
  to authenticated
  using (workspace_role_of(workspace_id) = 'owner');

create policy "owner can create invites"
  on workspace_invites for insert
  to authenticated
  with check (workspace_role_of(workspace_id) = 'owner' and created_by = auth.uid());

create policy "owner can delete invites"
  on workspace_invites for delete
  to authenticated
  using (workspace_role_of(workspace_id) = 'owner');

create function accept_invite(invite_token text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  target workspace_invites;
begin
  select * into target
  from workspace_invites
  where token = invite_token;

  if not found then
    raise exception 'invalid_invite';
  end if;

  insert into workspace_members (workspace_id, user_id, role)
  values (target.workspace_id, auth.uid(), target.role)
  on conflict (workspace_id, user_id) do update set role = excluded.role;

  return target.workspace_id;
end;
$$;
