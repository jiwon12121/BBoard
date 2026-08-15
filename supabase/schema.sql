-- BBoard initial schema
-- Scope: workspace-level RBAC (owner/editor/viewer), no per-page permission tree yet.
-- Document body is not stored here — Yjs owns live state; this is a periodic snapshot for
-- durability/history, written from the Cloudflare sync layer.

create extension if not exists pgcrypto;

-- One row per auth.users, holds display info we don't want to keep re-reading from auth schema.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create type workspace_role as enum ('owner', 'editor', 'viewer');

create table workspace_members (
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role workspace_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  title text not null default 'Untitled',
  yjs_state bytea,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Keep documents.updated_at honest without relying on every caller to set it.
create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_set_updated_at
  before update on documents
  for each row execute function set_updated_at();

-- Row Level Security

alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table documents enable row level security;

create function is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

create function workspace_role_of(target_workspace_id uuid)
returns workspace_role
language sql
security definer set search_path = public
stable
as $$
  select role from workspace_members
  where workspace_id = target_workspace_id
    and user_id = auth.uid();
$$;

-- profiles: readable by any signed-in user (needed to show teammate names/avatars),
-- writable only by the owning user.
create policy "profiles are readable by authenticated users"
  on profiles for select
  to authenticated
  using (true);

create policy "users manage their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid());

-- workspaces: visible to members; creatable by any signed-in user; only the owner can change/delete it.
create policy "members can view their workspaces"
  on workspaces for select
  to authenticated
  using (is_workspace_member(id));

create policy "authenticated users can create workspaces"
  on workspaces for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "owner can update workspace"
  on workspaces for update
  to authenticated
  using (owner_id = auth.uid());

create policy "owner can delete workspace"
  on workspaces for delete
  to authenticated
  using (owner_id = auth.uid());

-- workspace_members: visible to fellow members; only the workspace owner manages membership.
create policy "members can view workspace membership"
  on workspace_members for select
  to authenticated
  using (is_workspace_member(workspace_id));

create policy "owner can add members"
  on workspace_members for insert
  to authenticated
  with check (workspace_role_of(workspace_id) = 'owner' or user_id = auth.uid());

create policy "owner can change member roles"
  on workspace_members for update
  to authenticated
  using (workspace_role_of(workspace_id) = 'owner');

create policy "owner can remove members, members can leave"
  on workspace_members for delete
  to authenticated
  using (workspace_role_of(workspace_id) = 'owner' or user_id = auth.uid());

-- documents: any member can view; editors and owners can write; viewers are read-only.
create policy "members can view documents"
  on documents for select
  to authenticated
  using (is_workspace_member(workspace_id));

create policy "editors and owners can create documents"
  on documents for insert
  to authenticated
  with check (workspace_role_of(workspace_id) in ('owner', 'editor'));

create policy "editors and owners can update documents"
  on documents for update
  to authenticated
  using (workspace_role_of(workspace_id) in ('owner', 'editor'));

create policy "owner can delete documents"
  on documents for delete
  to authenticated
  using (workspace_role_of(workspace_id) = 'owner');
