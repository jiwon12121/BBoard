-- Persists what the right sidebar's "활동" feed shows, instead of living
-- only in client-side React state (which a page refresh wiped). Populated
-- entirely by triggers (security definer) so every code path that creates
-- a document, renames one, or adds a member is covered automatically,
-- rather than relying on every server action to remember to log it.
create table workspace_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

alter table workspace_activity enable row level security;

create policy "members can view workspace activity"
  on workspace_activity for select
  to authenticated
  using (is_workspace_member(workspace_id));

alter publication supabase_realtime add table workspace_activity;

-- Personal documents are private to their creator (not even the workspace
-- owner can see them) - logging their creation/rename to the shared
-- workspace-wide feed would leak their existence to everyone, so those are
-- skipped via the trigger's WHEN clause below.

create function log_document_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into workspace_activity (workspace_id, message)
  values (new.workspace_id, format('"%s" 문서가 생성되었습니다', coalesce(new.title, '제목 없음')));
  return new;
end;
$$;

create trigger documents_log_created
  after insert on documents
  for each row
  when (not new.is_personal)
  execute function log_document_created();

create function log_document_renamed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.title is distinct from old.title then
    insert into workspace_activity (workspace_id, message)
    values (new.workspace_id, format('문서 제목이 "%s"(으)로 변경되었습니다', coalesce(new.title, '제목 없음')));
  end if;
  return new;
end;
$$;

create trigger documents_log_renamed
  after update on documents
  for each row
  when (not new.is_personal)
  execute function log_document_renamed();

create function log_member_joined()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  member_name text;
begin
  if new.role = 'owner' then
    return new; -- skip logging the workspace creator's own initial membership
  end if;

  select coalesce(name, email) into member_name from profiles where id = new.user_id;

  insert into workspace_activity (workspace_id, message)
  values (new.workspace_id, format('%s님이 합류했습니다', coalesce(member_name, '새 멤버')));

  return new;
end;
$$;

create trigger workspace_members_log_joined
  after insert on workspace_members
  for each row execute function log_member_joined();
