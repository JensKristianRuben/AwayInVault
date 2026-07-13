-- Migration: Fix team_members RLS policy recursion
-- Created at: 2026-07-12T11:42:00Z

-- 1. Drop old recursive policies
drop policy if exists "Members can view teams" on public.teams;
drop policy if exists "Owners can manage teams" on public.teams;
drop policy if exists "Owners can update teams" on public.teams;
drop policy if exists "Owners can delete teams" on public.teams;
drop policy if exists "Members can view team members" on public.team_members;
drop policy if exists "Owners can add members, users can self-add on creation" on public.team_members;
drop policy if exists "Members can update their own status or owners can manage roles" on public.team_members;
drop policy if exists "Owners can remove members, members can leave" on public.team_members;
drop policy if exists "Members can view team projects" on public.shared_projects;
drop policy if exists "Owners/admins can manage projects" on public.shared_projects;
drop policy if exists "Members can insert project keys" on public.project_keys;
drop policy if exists "Members can view project items" on public.project_vault_items;
drop policy if exists "Members can manage project items" on public.project_vault_items;
drop policy if exists "Users can view their own invites, owners can view team invites" on public.team_invitations;
drop policy if exists "Owners can invite members" on public.team_invitations;
drop policy if exists "Owners and invitees can delete invitations" on public.team_invitations;

-- 2. Create security definer helper functions
create or replace function public.is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean
security definer
set search_path = ''
language plpgsql
as $$
begin
  return exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = p_user_id
  );
end;
$$;

create or replace function public.get_team_member_role(p_team_id uuid, p_user_id uuid)
returns text
security definer
set search_path = ''
language plpgsql
as $$
declare
  v_role text;
begin
  select role into v_role
  from public.team_members
  where team_id = p_team_id and user_id = p_user_id;
  return v_role;
end;
$$;

create or replace function public.get_team_member_status(p_team_id uuid, p_user_id uuid)
returns text
security definer
set search_path = ''
language plpgsql
as $$
declare
  v_status text;
begin
  select status into v_status
  from public.team_members
  where team_id = p_team_id and user_id = p_user_id;
  return v_status;
end;
$$;

-- 3. Create the updated, recursion-free policies

-- TEAMS POLICIES
create policy "Members can view teams"
  on public.teams for select to authenticated
  using (
    public.is_team_member(id, (select auth.uid()))
  );

create policy "Owners can update teams"
  on public.teams for update to authenticated
  using (
    public.get_team_member_role(id, (select auth.uid())) = 'owner'
  );

create policy "Owners can delete teams"
  on public.teams for delete to authenticated
  using (
    public.get_team_member_role(id, (select auth.uid())) = 'owner'
  );


-- TEAM MEMBERS POLICIES
create policy "Members can view team members"
  on public.team_members for select to authenticated
  using (
    public.is_team_member(team_id, (select auth.uid()))
  );

create policy "Owners can add members, users can self-add on creation"
  on public.team_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    or public.get_team_member_role(team_id, (select auth.uid())) = 'owner'
  );

create policy "Members can update their own status or owners can manage roles"
  on public.team_members for update to authenticated
  using (
    user_id = (select auth.uid())
    or public.get_team_member_role(team_id, (select auth.uid())) = 'owner'
  );

create policy "Owners can remove members, members can leave"
  on public.team_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or public.get_team_member_role(team_id, (select auth.uid())) = 'owner'
  );

-- SHARED PROJECTS POLICIES
create policy "Members can view team projects"
  on public.shared_projects for select to authenticated
  using (
    public.is_team_member(team_id, (select auth.uid()))
  );

create policy "Owners/admins can manage projects"
  on public.shared_projects for all to authenticated
  using (
    public.get_team_member_role(team_id, (select auth.uid())) in ('owner', 'admin')
  );

-- PROJECT KEYS POLICIES
create policy "Members can insert project keys"
  on public.project_keys for insert to authenticated
  with check (
    exists (
      select 1 from public.shared_projects sp
      where sp.id = project_id and public.is_team_member(sp.team_id, (select auth.uid()))
    )
  );

-- PROJECT VAULT ITEMS POLICIES
create policy "Members can view project items"
  on public.project_vault_items for select to authenticated
  using (
    exists (
      select 1 from public.shared_projects sp
      where sp.id = project_id
      and public.get_team_member_status(sp.team_id, (select auth.uid())) = 'active'
    )
  );

create policy "Members can manage project items"
  on public.project_vault_items for all to authenticated
  using (
    exists (
      select 1 from public.shared_projects sp
      where sp.id = project_id
      and public.get_team_member_status(sp.team_id, (select auth.uid())) = 'active'
    )
  );

-- TEAM INVITATIONS POLICIES
create policy "Users can view their own invites, owners can view team invites"
  on public.team_invitations for select to authenticated
  using (
    email = (select auth.jwt() ->> 'email')
    or public.get_team_member_role(team_id, (select auth.uid())) = 'owner'
  );

create policy "Owners can invite members"
  on public.team_invitations for insert to authenticated
  with check (
    public.get_team_member_role(team_id, (select auth.uid())) = 'owner'
  );

create policy "Owners and invitees can delete invitations"
  on public.team_invitations for delete to authenticated
  using (
    email = (select auth.jwt() ->> 'email')
    or public.get_team_member_role(team_id, (select auth.uid())) = 'owner'
  );
