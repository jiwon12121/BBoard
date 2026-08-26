-- "개인 문서" becomes real inside team workspaces too: a document a member
-- creates for themselves is invisible to everyone else - including the
-- workspace owner - unless explicitly shared via a document invite, same
-- mechanism personal-kind workspaces already use for their documents.
alter table documents add column is_personal boolean not null default false;

create function is_personal_document_owner(target_document_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from documents
    where id = target_document_id and created_by = auth.uid() and is_personal
  );
$$;

drop policy "members can view documents" on documents;
create policy "members can view documents"
  on documents for select
  to authenticated
  using (
    (not is_personal and is_workspace_member(workspace_id))
    or (is_personal and created_by = auth.uid())
    or exists (select 1 from document_members where document_id = documents.id and user_id = auth.uid())
  );

drop policy "editors and owners can update documents" on documents;
create policy "editors and owners can update documents"
  on documents for update
  to authenticated
  using (
    (not is_personal and workspace_role_of(workspace_id) in ('owner', 'editor'))
    or (is_personal and created_by = auth.uid())
    or exists (
      select 1 from document_members
      where document_id = documents.id and user_id = auth.uid() and role = 'editor'
    )
  );

drop policy "owner can delete documents" on documents;
create policy "owner can delete documents"
  on documents for delete
  to authenticated
  using (
    workspace_role_of(workspace_id) = 'owner'
    or (is_personal and created_by = auth.uid())
  );

-- A personal document's own creator manages its sharing the same way a
-- personal-kind workspace's owner manages theirs.
drop policy "self or workspace owner can view document members" on document_members;
create policy "self or workspace owner can view document members"
  on document_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or document_workspace_owner(document_id) = auth.uid()
    or is_personal_document_owner(document_id)
  );

drop policy "workspace owner can remove document members" on document_members;
create policy "workspace owner can remove document members"
  on document_members for delete
  to authenticated
  using (
    document_workspace_owner(document_id) = auth.uid()
    or is_personal_document_owner(document_id)
  );

drop policy "workspace owner can view document invites" on document_invites;
create policy "workspace owner can view document invites"
  on document_invites for select
  to authenticated
  using (
    document_workspace_owner(document_id) = auth.uid()
    or is_personal_document_owner(document_id)
  );

drop policy "workspace owner can create document invites" on document_invites;
create policy "workspace owner can create document invites"
  on document_invites for insert
  to authenticated
  with check (
    (document_workspace_owner(document_id) = auth.uid() or is_personal_document_owner(document_id))
    and created_by = auth.uid()
  );

drop policy "workspace owner can delete document invites" on document_invites;
create policy "workspace owner can delete document invites"
  on document_invites for delete
  to authenticated
  using (
    document_workspace_owner(document_id) = auth.uid()
    or is_personal_document_owner(document_id)
  );
