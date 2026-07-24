-- Atomically migrates a legacy account's vault_items from being encrypted directly
-- with the Master Key (KEK) to being encrypted with a per-user Vault Key (DEK), and
-- persists the KEK-wrapped DEK on profiles in the same transaction. Client-side code
-- decrypts every field with the KEK and re-encrypts with a freshly generated DEK
-- (plaintext never leaves the browser), then sends the already re-encrypted payload
-- here. Doing both writes in one transaction removes the "items re-encrypted but
-- wrapped DEK not persisted" race a pair of sequential client-side updates would have:
-- either both happen, or neither does.
create or replace function public.migrate_vault_items_to_dek(
  p_user_id uuid,
  p_items jsonb,
  p_encrypted_vault_key text
)
returns void
security definer
set search_path = ''
language plpgsql
as $$
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Not authorized';
  end if;

  update public.vault_items as v
  set
    username_encrypted = i.username_encrypted,
    password_encrypted = i.password_encrypted,
    notes_encrypted = i.notes_encrypted,
    updated_at = timezone('utc'::text, now())
  from jsonb_to_recordset(p_items) as i(
    id uuid,
    username_encrypted text,
    password_encrypted text,
    notes_encrypted text
  )
  where v.id = i.id and v.user_id = p_user_id;

  update public.profiles
  set encrypted_vault_key = p_encrypted_vault_key
  where id = p_user_id;
end;
$$;

grant execute on function public.migrate_vault_items_to_dek(uuid, jsonb, text) to authenticated;
