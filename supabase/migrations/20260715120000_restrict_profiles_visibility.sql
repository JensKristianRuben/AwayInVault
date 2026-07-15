-- Restrict full profile rows (including encrypted_private_key) to the owning user,
-- and expose a minimal public view for team invite lookups / member-list rendering.

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;

create policy "Users can view their own full profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

-- security definer so the view can return other users' rows despite the
-- own-row-only policy above; only non-sensitive columns are exposed
create or replace function public._public_profiles()
returns table (id uuid, email text, public_key text)
language sql
security definer
set search_path = ''
stable
as $$
  select id, email, public_key from public.profiles;
$$;

create or replace view public.public_profiles as
select * from public._public_profiles();

grant select on public.public_profiles to authenticated;
