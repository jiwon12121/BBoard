-- Workspace kind: personal workspaces additionally support inviting someone
-- to just one document, without making them a workspace member at all.
-- Team workspaces only support workspace-wide invites, as before.
create type workspace_kind as enum ('personal', 'team');
alter table workspaces add column kind workspace_kind not null default 'team';

create or replace function create_workspace(workspace_name text, workspace_kind_param workspace_kind default 'team')
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  insert into workspaces (name, owner_id, kind)
  values (workspace_name, auth.uid(), workspace_kind_param)
  returning id into new_workspace_id;

  insert into workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, auth.uid(), 'owner');

  return new_workspace_id;
end;
$$;

-- "viewer" -> "guest": clearer against the new document-level role, and
-- matches what the invite UI calls it.
alter table workspace_invites drop constraint workspace_invites_role_check;
alter type workspace_role rename value 'viewer' to 'guest';
alter table workspace_invites add constraint workspace_invites_role_check check (role in ('editor', 'guest'));

-- Document-level access: grants a specific document without workspace
-- membership. Only meaningful for personal-kind workspaces, but not
-- enforced at the schema level - the app only offers the "share this
-- document" control there.
create type document_role as enum ('editor', 'guest');

create function document_workspace_owner(target_document_id uuid)
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select w.owner_id from documents d
  join workspaces w on w.id = d.workspace_id
  where d.id = target_document_id;
$$;

create table document_members (
  document_id uuid not null references documents (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role document_role not null default 'guest',
  created_at timestamptz not null default now(),
  primary key (document_id, user_id)
);

alter table document_members enable row level security;

create policy "self or workspace owner can view document members"
  on document_members for select
  to authenticated
  using (user_id = auth.uid() or document_workspace_owner(document_id) = auth.uid());

create policy "workspace owner can remove document members"
  on document_members for delete
  to authenticated
  using (document_workspace_owner(document_id) = auth.uid());

-- Shareable per-document invite links, same shape/pattern as workspace_invites.
create table document_invites (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  role document_role not null default 'guest',
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

alter table document_invites enable row level security;

create policy "workspace owner can view document invites"
  on document_invites for select
  to authenticated
  using (document_workspace_owner(document_id) = auth.uid());

create policy "workspace owner can create document invites"
  on document_invites for insert
  to authenticated
  with check (document_workspace_owner(document_id) = auth.uid() and created_by = auth.uid());

create policy "workspace owner can delete document invites"
  on document_invites for delete
  to authenticated
  using (document_workspace_owner(document_id) = auth.uid());

create function accept_document_invite(invite_token text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  target document_invites;
begin
  select * into target
  from document_invites
  where token = invite_token;

  if not found then
    raise exception 'invalid_invite';
  end if;

  insert into document_members (document_id, user_id, role)
  values (target.document_id, auth.uid(), target.role)
  on conflict (document_id, user_id) do update set role = excluded.role;

  return target.document_id;
end;
$$;

-- Extend visibility: a document-level member can see the parent workspace
-- (just enough to render the app shell) and the one document they were
-- granted, without being a workspace_members row.
drop policy "members can view their workspaces" on workspaces;
create policy "members can view their workspaces"
  on workspaces for select
  to authenticated
  using (
    is_workspace_member(id)
    or exists (
      select 1 from document_members dm
      join documents d on d.id = dm.document_id
      where d.workspace_id = workspaces.id and dm.user_id = auth.uid()
    )
  );

drop policy "members can view documents" on documents;
create policy "members can view documents"
  on documents for select
  to authenticated
  using (
    is_workspace_member(workspace_id)
    or exists (select 1 from document_members where document_id = documents.id and user_id = auth.uid())
  );

drop policy "editors and owners can update documents" on documents;
create policy "editors and owners can update documents"
  on documents for update
  to authenticated
  using (
    workspace_role_of(workspace_id) in ('owner', 'editor')
    or exists (
      select 1 from document_members
      where document_id = documents.id and user_id = auth.uid() and role = 'editor'
    )
  );
