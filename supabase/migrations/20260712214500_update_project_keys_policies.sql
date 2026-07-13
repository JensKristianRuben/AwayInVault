-- Allow team members to view all project keys of the projects they are in
drop policy if exists "Users can view their own project keys" on public.project_keys;

create policy "Members can view project keys"
  on public.project_keys for select to authenticated
  using (
    exists (
      select 1 from public.shared_projects sp
      where sp.id = project_id and public.is_team_member(sp.team_id, (select auth.uid()))
    )
  );

-- Allow team members to update project keys of the projects they are in
create policy "Members can update project keys"
  on public.project_keys for update to authenticated
  using (
    exists (
      select 1 from public.shared_projects sp
      where sp.id = project_id and public.is_team_member(sp.team_id, (select auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.shared_projects sp
      where sp.id = project_id and public.is_team_member(sp.team_id, (select auth.uid()))
    )
  );

-- Allow team members to delete project keys of the projects they are in
create policy "Members can delete project keys"
  on public.project_keys for delete to authenticated
  using (
    exists (
      select 1 from public.shared_projects sp
      where sp.id = project_id and public.is_team_member(sp.team_id, (select auth.uid()))
    )
  );
