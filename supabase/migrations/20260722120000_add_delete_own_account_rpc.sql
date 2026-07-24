-- Permanently deletes the calling user's account and all of their data (GDPR
-- "right to be forgotten"). This has to be a security definer function because
-- auth.users is not an RLS-governed table: no policy can ever let an anon-key
-- client delete from it. Running as the owner (the migration role, which already
-- owns the trigger on auth.users) is the only way to reach it without a
-- service-role key, and this app has no backend to hold one.
--
-- Every delete happens in one transaction so we can never end up with a
-- half-erased account. The deletes are also written out explicitly rather than
-- relying on the on-delete-cascade from auth.users: vault_items was created
-- outside the migrations directory and its FK behavior is not verifiable from
-- this repo, so we do not depend on it.
--
-- Teams are the one shared resource that needs care. Removing the last active
-- member of a team would otherwise strand the teams row -- with its projects and
-- shared items -- permanently ownerless and undeletable through RLS. So: if the
-- user is the sole owner of a team that still has other active members, we refuse
-- and tell them to hand over ownership first; if a team is left with no active
-- members at all, we delete it and let the cascades clear its projects, keys,
-- shared items and invitations.
create or replace function public.delete_own_account()
returns void
security definer
set search_path = ''
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_ids uuid[];
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Refuse while the user still solely owns a team other people are active in.
  -- 'sole_owner_of_team_with_members' is a stable sentinel the client matches on.
  if exists (
    select 1
    from public.team_members as owned
    where owned.user_id = v_user_id
      and owned.role = 'owner'
      and exists (
        select 1
        from public.team_members as others
        where others.team_id = owned.team_id
          and others.user_id is distinct from v_user_id
          and others.status = 'active'
      )
  ) then
    raise exception 'sole_owner_of_team_with_members';
  end if;

  -- Remember the teams they belonged to before we drop the memberships, so we
  -- can tell afterwards which ones were left empty.
  select coalesce(array_agg(team_id), '{}')
  into v_team_ids
  from public.team_members
  where user_id = v_user_id;

  delete from public.vault_items where user_id = v_user_id;
  delete from public.project_keys where user_id = v_user_id;
  delete from public.team_invitations where invited_by = v_user_id;
  delete from public.team_members where user_id = v_user_id;

  delete from public.teams as t
  where t.id = any(v_team_ids)
    and not exists (
      select 1
      from public.team_members as m
      where m.team_id = t.id
        and m.status = 'active'
    );

  delete from public.profiles where id = v_user_id;

  delete from auth.users where id = v_user_id;
end;
$$;

grant execute on function public.delete_own_account() to authenticated;
