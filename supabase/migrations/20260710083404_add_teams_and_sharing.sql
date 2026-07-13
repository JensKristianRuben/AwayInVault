-- 1. Profiles (user sharing identities)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  public_key text, -- SPKI format, Base64 encoded
  encrypted_private_key text, -- Encrypted PKCS8 with user's master key (iv:ciphertext)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger to automatically create a profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Teams
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Team Members
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('owner', 'admin', 'member')) default 'member',
  status text not null check (status in ('active', 'invited')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (team_id, user_id)
);

-- 4. Shared Projects
create table public.shared_projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Project Keys (wrapped symmetric keys)
create table public.project_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.shared_projects on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  encrypted_key text not null, -- Project's symmetric key encrypted with user's public key
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (project_id, user_id)
);

-- 6. Project Vault Items (shared credentials)
create table public.project_vault_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.shared_projects on delete cascade not null,
  title text not null,
  website text,
  username_encrypted text,
  password_encrypted text not null,
  notes_encrypted text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Team Invitations (for offline/pending invites)
create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'member')) default 'member',
  invited_by uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (team_id, email)
);

-- Database function to atomically create a team and assign owner (bypasses RLS select)
create or replace function public.create_team(team_name text)
returns public.teams
security definer
set search_path = ''
language plpgsql
as $$
declare
  v_team public.teams;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Insert the team
  insert into public.teams (name)
  values (team_name)
  returning * into v_team;

  -- 2. Insert the owner into team_members
  insert into public.team_members (team_id, user_id, role, status)
  values (v_team.id, v_user_id, 'owner', 'active');

  return v_team;
end;
$$;

-- Helper functions to avoid RLS infinite recursion
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

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.shared_projects enable row level security;
alter table public.project_keys enable row level security;
alter table public.project_vault_items enable row level security;
alter table public.team_invitations enable row level security;

-- Force RLS
alter table public.profiles force row level security;
alter table public.teams force row level security;
alter table public.team_members force row level security;
alter table public.shared_projects force row level security;
alter table public.project_keys force row level security;
alter table public.project_vault_items force row level security;
alter table public.team_invitations force row level security;

-- =========================================================================
-- PROFILES POLICIES
-- =========================================================================

-- Any authenticated user can look up profiles to invite them or share keys
create policy "Profiles are readable by authenticated users"
  on public.profiles for select to authenticated
  using (true);

-- Users can only update their own profiles (e.g. set public/private keys)
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Users can insert their own profiles (for backward compatibility on old accounts)
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);


-- =========================================================================
-- TEAMS POLICIES
-- =========================================================================

-- View teams where the user is an active or invited member
create policy "Members can view teams"
  on public.teams for select to authenticated
  using (
    public.is_team_member(id, (select auth.uid()))
  );

-- Any authenticated user can create a team
create policy "Authenticated users can create teams"
  on public.teams for insert to authenticated
  with check (true);

-- Only owners can update teams
create policy "Owners can update teams"
  on public.teams for update to authenticated
  using (
    public.get_team_member_role(id, (select auth.uid())) = 'owner'
  );

-- Only owners can delete teams
create policy "Owners can delete teams"
  on public.teams for delete to authenticated
  using (
    public.get_team_member_role(id, (select auth.uid())) = 'owner'
  );


-- =========================================================================
-- TEAM MEMBERS POLICIES
-- =========================================================================

-- View team members of teams the user belongs to
create policy "Members can view team members"
  on public.team_members for select to authenticated
  using (
    public.is_team_member(team_id, (select auth.uid()))
  );

-- Owners can add team members, or users can insert themselves when creating a team
create policy "Owners can add members, users can self-add on creation"
  on public.team_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    or public.get_team_member_role(team_id, (select auth.uid())) = 'owner'
  );

-- Members can accept/reject invites (update status) or owners can change roles
create policy "Members can update their own status or owners can manage roles"
  on public.team_members for update to authenticated
  using (
    user_id = (select auth.uid())
    or public.get_team_member_role(team_id, (select auth.uid())) = 'owner'
  );

-- Owners can remove members, or members can leave (delete themselves)
create policy "Owners can remove members, members can leave"
  on public.team_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or public.get_team_member_role(team_id, (select auth.uid())) = 'owner'
  );

-- =========================================================================
-- SHARED PROJECTS POLICIES
-- =========================================================================

-- Members can view projects in their teams
create policy "Members can view team projects"
  on public.shared_projects for select to authenticated
  using (
    public.is_team_member(team_id, (select auth.uid()))
  );

-- Owners and admins can create/update/delete projects
create policy "Owners/admins can manage projects"
  on public.shared_projects for all to authenticated
  using (
    public.get_team_member_role(team_id, (select auth.uid())) in ('owner', 'admin')
  );

-- =========================================================================
-- PROJECT KEYS POLICIES
-- =========================================================================

-- Users can only read project keys encrypted specifically for them
create policy "Users can view their own project keys"
  on public.project_keys for select to authenticated
  using ((select auth.uid()) = user_id);

-- Team members can insert project keys for other team members
create policy "Members can insert project keys"
  on public.project_keys for insert to authenticated
  with check (
    exists (
      select 1 from public.shared_projects sp
      where sp.id = project_id and public.is_team_member(sp.team_id, (select auth.uid()))
    )
  );

-- =========================================================================
-- PROJECT VAULT ITEMS POLICIES
-- =========================================================================

-- Active team members can read/write items belonging to their project
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

-- =========================================================================
-- TEAM INVITATIONS POLICIES
-- =========================================================================

-- Invitees can view their own invites (matched by email) or owners can view team invites
create policy "Users can view their own invites, owners can view team invites"
  on public.team_invitations for select to authenticated
  using (
    email = (select auth.jwt() ->> 'email')
    or public.get_team_member_role(team_id, (select auth.uid())) = 'owner'
  );

-- Only owners can invite
create policy "Owners can invite members"
  on public.team_invitations for insert to authenticated
  with check (
    public.get_team_member_role(team_id, (select auth.uid())) = 'owner'
  );

-- Owners can delete invitations (cancel them) or invitees can delete them (decline/accept)
create policy "Owners and invitees can delete invitations"
  on public.team_invitations for delete to authenticated
  using (
    email = (select auth.jwt() ->> 'email')
    or public.get_team_member_role(team_id, (select auth.uid())) = 'owner'
  );

-- =========================================================================
-- INDEXES
-- =========================================================================
create index team_members_user_id_idx on public.team_members (user_id);
create index team_members_team_id_idx on public.team_members (team_id);
create index shared_projects_team_id_idx on public.shared_projects (team_id);
create index project_keys_user_id_idx on public.project_keys (user_id);
create index project_keys_project_id_idx on public.project_keys (project_id);
create index project_vault_items_project_id_idx on public.project_vault_items (project_id);
create index team_invitations_team_id_idx on public.team_invitations (team_id);
create index team_invitations_email_idx on public.team_invitations (email);

