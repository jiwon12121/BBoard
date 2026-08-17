-- Creates the workspace and its owner membership atomically, so a failure
-- partway through can't leave a workspace with no owner able to see it.
create function create_workspace(workspace_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  insert into workspaces (name, owner_id)
  values (workspace_name, auth.uid())
  returning id into new_workspace_id;

  insert into workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, auth.uid(), 'owner');

  return new_workspace_id;
end;
$$;
