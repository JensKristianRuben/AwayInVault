import { describe, it, expect } from "vitest";
import {
	generateSalt,
	deriveKey,
	encryptLocal,
	decryptLocal,
	generateProjectKey,
	importProjectKey,
	generateSharingKeyPair,
	exportPrivateKey,
	importPrivateKey,
	wrapProjectKey,
	unwrapProjectKey,
} from "../utils/crypto";

describe("Vault Key (DEK) architecture", () => {
	it("wraps a freshly generated DEK with the KEK, and unwraps it back to the same key", async () => {
		const salt = generateSalt();
		const kek = await deriveKey("a-strong-master-password", salt);

		const vaultKeyBase64 = generateProjectKey();
		const vaultKey = await importProjectKey(vaultKeyBase64);

		const encryptedVaultKey = await encryptLocal(vaultKeyBase64, kek);
		const unwrappedVaultKeyBase64 = await decryptLocal(encryptedVaultKey, kek);
		expect(unwrappedVaultKeyBase64).toBe(vaultKeyBase64);

		// A vault item encrypted with the DEK round-trips correctly.
		const plaintext = "correct horse battery staple";
		const encrypted = await encryptLocal(plaintext, vaultKey);
		const decrypted = await decryptLocal(
			encrypted,
			await importProjectKey(unwrappedVaultKeyBase64),
		);
		expect(decrypted).toBe(plaintext);
	});

	it("re-wraps the DEK with a new KEK on password change without changing the DEK itself", async () => {
		// Old Master Password state
		const oldSalt = generateSalt();
		const oldKek = await deriveKey("old-master-password", oldSalt);

		const vaultKeyBase64 = generateProjectKey();
		const vaultKey = await importProjectKey(vaultKeyBase64);
		const encryptedVaultKeyOld = await encryptLocal(vaultKeyBase64, oldKek);

		// An item encrypted with the DEK before the password change.
		const plaintext = "some existing vault item password";
		const encryptedItem = await encryptLocal(plaintext, vaultKey);

		// --- Password change: re-wrap only the DEK, never touch the item ---
		const unwrappedBase64 = await decryptLocal(encryptedVaultKeyOld, oldKek);

		const newSalt = generateSalt();
		const newKek = await deriveKey("new-master-password", newSalt);
		const encryptedVaultKeyNew = await encryptLocal(unwrappedBase64, newKek);

		// The old wrapping no longer unwraps with the new KEK...
		await expect(decryptLocal(encryptedVaultKeyNew, oldKek)).rejects.toThrow();

		// ...but the new wrapping does, and yields the exact same DEK.
		const reUnwrappedBase64 = await decryptLocal(encryptedVaultKeyNew, newKek);
		expect(reUnwrappedBase64).toBe(vaultKeyBase64);

		// The pre-existing item - never re-encrypted - still decrypts correctly with the
		// (unchanged) DEK. This is the whole point of the two-layer design: a password
		// change never has to touch vault_items.
		const decryptedItem = await decryptLocal(
			encryptedItem,
			await importProjectKey(reUnwrappedBase64),
		);
		expect(decryptedItem).toBe(plaintext);
	});

	it("keeps a team member's wrapped project key valid after the owner's password change", async () => {
		// User A's RSA sharing keypair - the public key is what other team members wrap
		// project keys against, and it never changes on a Master Password change.
		const keyPairA = await generateSharingKeyPair();
		const privKeyBase64A = await exportPrivateKey(keyPairA.privateKey);

		// A teammate wraps a shared project key against User A's public key (this
		// happens once, independent of User A's Master Password).
		const projectKeyBase64 = generateProjectKey();
		const wrappedForA = await wrapProjectKey(projectKeyBase64, keyPairA.publicKey);

		// User A's private key is wrapped with their KEK, same as encrypted_private_key.
		const oldSalt = generateSalt();
		const oldKek = await deriveKey("old-master-password", oldSalt);
		const encryptedPrivateKeyOld = await encryptLocal(privKeyBase64A, oldKek);

		// --- Password change: re-wrap only the private key, never touch project_keys or
		// the public key ---
		const unwrappedPrivKeyBase64 = await decryptLocal(encryptedPrivateKeyOld, oldKek);
		const newSalt = generateSalt();
		const newKek = await deriveKey("new-master-password", newSalt);
		const encryptedPrivateKeyNew = await encryptLocal(unwrappedPrivKeyBase64, newKek);

		// User A unlocks with the new password, unwraps their private key...
		const privKeyBase64AfterChange = await decryptLocal(encryptedPrivateKeyNew, newKek);
		const privateKeyAfterChange = await importPrivateKey(privKeyBase64AfterChange);

		// ...and can still unwrap the project key that was wrapped to their (unchanged)
		// public key before the password change ever happened.
		const unwrappedProjectKeyBase64 = await unwrapProjectKey(wrappedForA, privateKeyAfterChange);
		expect(unwrappedProjectKeyBase64).toBe(projectKeyBase64);
	});
});
