-- Vault Key (DEK) architecture: personal vault items are encrypted with a random
-- per-user symmetric key (the "vault key"), itself wrapped with the user's KEK
-- (derived from their Master Password) and stored here, mirroring how
-- encrypted_private_key already wraps the RSA sharing key with the same KEK.
-- This decouples vault_items encryption from the Master Password, so changing
-- the Master Password only needs to re-wrap this one column, not every vault item.
alter table public.profiles
  add column encrypted_vault_key text; -- iv:ciphertext, AES-GCM 256, wrapped with KEK via encryptLocal
