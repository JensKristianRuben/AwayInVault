import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptLocal, encryptLocal, generateProjectKey, importProjectKey } from "./crypto.js";

// Fetches and unwraps the caller's personal vault key (DEK) using their already-derived
// Master Key (KEK), upgrading legacy accounts (no encrypted_vault_key yet) on the fly.
// Takes the caller's own authenticated Supabase client (web app singleton, CLI client, or
// test client) rather than importing one, since auth.uid() inside the migration RPC must
// resolve to whichever session actually made the call.
export async function resolveVaultKey(
	client: SupabaseClient,
	userId: string,
	kek: CryptoKey,
): Promise<CryptoKey> {
	const { data: profile } = await client
		.from("profiles")
		.select("encrypted_vault_key")
		.eq("id", userId)
		.single();

	if (profile?.encrypted_vault_key) {
		const vaultKeyBase64 = await decryptLocal(profile.encrypted_vault_key, kek);
		return await importProjectKey(vaultKeyBase64);
	}

	return await migrateAccountToVaultKey(client, userId, kek);
}

interface LegacyVaultItemRow {
	id: string;
	username_encrypted: string | null;
	password_encrypted: string;
	notes_encrypted: string | null;
}

// One-time upgrade for accounts created before the Vault Key (DEK) architecture:
// their vault_items are still encrypted directly with the Master Key (KEK). Decrypts
// every field with the KEK, re-encrypts with a freshly generated DEK, and persists both
// the rewritten items and the KEK-wrapped DEK atomically via the migrate_vault_items_to_dek
// RPC. Aborts (throws) before any write happens if a single row fails to decrypt, since a
// partially migrated account would leave items on two different, indistinguishable schemes.
export async function migrateAccountToVaultKey(
	client: SupabaseClient,
	userId: string,
	kek: CryptoKey,
): Promise<CryptoKey> {
	const { data: rows, error: fetchError } = await client
		.from("vault_items")
		.select("id, username_encrypted, password_encrypted, notes_encrypted")
		.eq("user_id", userId);

	if (fetchError) throw fetchError;

	const vaultKeyBase64 = generateProjectKey();
	const vaultKeyObj = await importProjectKey(vaultKeyBase64);

	const reencryptedItems = await Promise.all(
		((rows ?? []) as LegacyVaultItemRow[]).map(async (row) => {
			const usernameEncrypted =
				row.username_encrypted !== null
					? await encryptLocal(await decryptLocal(row.username_encrypted, kek), vaultKeyObj)
					: null;
			const passwordEncrypted = await encryptLocal(
				await decryptLocal(row.password_encrypted, kek),
				vaultKeyObj,
			);
			const notesEncrypted =
				row.notes_encrypted !== null
					? await encryptLocal(await decryptLocal(row.notes_encrypted, kek), vaultKeyObj)
					: null;

			return {
				id: row.id,
				username_encrypted: usernameEncrypted,
				password_encrypted: passwordEncrypted,
				notes_encrypted: notesEncrypted,
			};
		}),
	);

	const encryptedVaultKey = await encryptLocal(vaultKeyBase64, kek);

	const { error: rpcError } = await client.rpc("migrate_vault_items_to_dek", {
		p_user_id: userId,
		p_items: reencryptedItems,
		p_encrypted_vault_key: encryptedVaultKey,
	});

	if (rpcError) throw rpcError;

	return vaultKeyObj;
}
