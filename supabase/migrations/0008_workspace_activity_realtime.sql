-- Right sidebar activity feed: needs Postgres change events over Realtime for
-- documents (created/edited) and workspace_members (new member joined).
-- RLS already scopes these to workspace members, same as regular selects.

-- Full row on UPDATE so the client can tell a real content/title edit apart
-- from a metadata-only change (e.g. someone resizing their own column width).
alter table documents replica identity full;

alter publication supabase_realtime add table documents;
alter publication supabase_realtime add table workspace_members;
