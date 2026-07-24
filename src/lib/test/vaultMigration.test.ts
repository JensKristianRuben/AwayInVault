import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import {
	deriveKey,
	encryptLocal,
	decryptLocal,
	generateSalt,
	encryptData,
	verifyMasterPassword,
} from "../utils/crypto";
import { migrateAccountToVaultKey } from "../utils/vaultMigration";

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const userAEmail = process.env.TEST_USER_A_EMAIL;
const userAPassword = process.env.TEST_USER_A_PASSWORD;

// The vault Master Password is intentionally independent of the Supabase Auth login
// password (TEST_USER_A_PASSWORD is only used to sign in below) - it is its own,
// separately-verified secret. This fixed value is the one cli.test.ts already
// establishes/expects for this shared account. Deriving a key from any other guessed
// password and persisting it (via the migration RPC) would silently overwrite the
// account's real encrypted_vault_key with one wrapped under the wrong key, breaking
// every other test/tool that relies on the real Master Password - so this file must
// always go through verifyMasterPassword (a real check) rather than a blind deriveKey.
const TEST_VAULT_MASTER_PASSWORD = "test-master-password-123";

describe("Legacy Vault Key (DEK) Migration", () => {
	let client: ReturnType<typeof createClient>;
	let userId: string;
	let kek: CryptoKey;
	let itemId: string | null = null;

	beforeAll(async () => {
		expect(supabaseUrl).toBeDefined();
		expect(supabaseAnonKey).toBeDefined();
		expect(userAEmail).toBeDefined();
		expect(userAPassword).toBeDefined();

		client = createClient(supabaseUrl!, supabaseAnonKey!);

		const { data: auth, error: authError } = await client.auth.signInWithPassword({
			email: userAEmail!,
			password: userAPassword!,
		});
		if (authError) throw new Error(`Could not sign in User A: ${authError.message}`);
		userId = auth.user.id;

		const meta = auth.user.user_metadata;
		if (meta?.salt && meta?.verifier_ciphertext) {
			const verifiedKey = await verifyMasterPassword(TEST_VAULT_MASTER_PASSWORD, meta);
			if (!verifiedKey) {
				throw new Error(
					`TEST_USER_A's stored vault Master Password does not match the expected test ` +
						`fixture password ("${TEST_VAULT_MASTER_PASSWORD}"). Refusing to proceed: deriving ` +
						`a key from a guessed password and persisting it would corrupt the shared ` +
						`account's encrypted_vault_key for other tests/tools (e.g. cli.test.ts).`,
				);
			}
			kek = verifiedKey;
		} else {
			// First run for this account: set up salt/verifier once, using the same
			// Master Password cli.test.ts relies on for this shared fixture.
			const salt = generateSalt();
			kek = await deriveKey(TEST_VAULT_MASTER_PASSWORD, salt);
			const verifier = await encryptData(
				"vaulten-er-lukket-og-du-kan-ikke-komme-ind-uden-masterpassword",
				kek,
			);
			const { error } = await client.auth.updateUser({
				data: { salt, verifier_ciphertext: verifier.ciphertext, verifier_iv: verifier.iv },
			});
			if (error) throw new Error(`Failed to update user metadata: ${error.message}`);
		}
	});

	afterEach(async () => {
		if (itemId) {
			await client.from("vault_items").delete().eq("id", itemId);
			itemId = null;
		}
	});

	it("re-encrypts legacy KEK-encrypted items with a freshly generated DEK, and persists it", async () => {
		// 1. Simulate a legacy account: no vault key yet.
		const { error: resetError } = await client
			.from("profiles")
			.update({ encrypted_vault_key: null } as never)
			.eq("id", userId);
		expect(resetError).toBeNull();

		// 2. Insert an item encrypted directly with the KEK - the pre-migration scheme.
		const rawUsername = "legacy_user";
		const rawPassword = "legacy-super-secret-password";
		const usernameEncrypted = await encryptLocal(rawUsername, kek);
		const passwordEncrypted = await encryptLocal(rawPassword, kek);

		const { data: insertData, error: insertError } = (await client
			.from("vault_items")
			.insert({
				user_id: userId,
				title: "Vault Key Migration Test Item",
				username_encrypted: usernameEncrypted,
				password_encrypted: passwordEncrypted,
			} as never)
			.select()
			.single()) as { data: { id: string } | null; error: any };
		expect(insertError).toBeNull();
		expect(insertData).not.toBeNull();
		itemId = insertData!.id;

		// 3. Run the migration.
		const vaultKey = await migrateAccountToVaultKey(client, userId, kek);
		expect(vaultKey).toBeInstanceOf(CryptoKey);

		// 4. The wrapped DEK is now persisted on profiles.
		const { data: profileAfter } = (await client
			.from("profiles")
			.select("encrypted_vault_key")
			.eq("id", userId)
			.single()) as { data: { encrypted_vault_key: string | null } | null };
		expect(profileAfter?.encrypted_vault_key).toBeTruthy();

		// 5. The item now decrypts with the new DEK...
		const { data: itemAfter } = (await client
			.from("vault_items")
			.select("username_encrypted, password_encrypted")
			.eq("id", itemId)
			.single()) as { data: { username_encrypted: string; password_encrypted: string } | null };
		expect(itemAfter).not.toBeNull();

		const decryptedUsername = await decryptLocal(itemAfter!.username_encrypted, vaultKey);
		const decryptedPassword = await decryptLocal(itemAfter!.password_encrypted, vaultKey);
		expect(decryptedUsername).toBe(rawUsername);
		expect(decryptedPassword).toBe(rawPassword);

		// ...and no longer decrypts with the old KEK (proves it was actually rewrapped,
		// not just wrapped additively).
		await expect(decryptLocal(itemAfter!.password_encrypted, kek)).rejects.toThrow();
	}, 20000);

	it("persists a vault key even when there are no legacy items to migrate", async () => {
		const { error: resetError } = await client
			.from("profiles")
			.update({ encrypted_vault_key: null } as never)
			.eq("id", userId);
		expect(resetError).toBeNull();

		const vaultKey = await migrateAccountToVaultKey(client, userId, kek);
		expect(vaultKey).toBeInstanceOf(CryptoKey);

		const { data: profileAfter } = (await client
			.from("profiles")
			.select("encrypted_vault_key")
			.eq("id", userId)
			.single()) as { data: { encrypted_vault_key: string | null } | null };
		expect(profileAfter?.encrypted_vault_key).toBeTruthy();
	}, 20000);
});
