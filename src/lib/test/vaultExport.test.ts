import { describe, it, expect } from "vitest";
import {
	normalizeWebsite,
	normalizeUsername,
	categorizeIncomingItems,
	buildEncryptedBackup,
	parseEncryptedBackup,
	type DecryptedItem,
} from "../utils/vaultExport";

function item(overrides: Partial<DecryptedItem> = {}): DecryptedItem {
	return {
		title: "GitHub",
		website: "https://github.com",
		username: "me@example.com",
		password: "hunter2",
		notes: null,
		...overrides,
	};
}

describe("vaultExport", () => {
	describe("normalizeWebsite / normalizeUsername", () => {
		it("strips protocol, www, and trailing slashes, and lowercases", () => {
			expect(normalizeWebsite("https://www.Google.com/")).toBe("google.com");
			expect(normalizeWebsite("http://Example.com")).toBe("example.com");
			expect(normalizeWebsite("Example.com//")).toBe("example.com");
		});

		it("returns an empty string for null/empty websites", () => {
			expect(normalizeWebsite(null)).toBe("");
			expect(normalizeWebsite("")).toBe("");
		});

		it("lowercases and trims usernames", () => {
			expect(normalizeUsername("  Me@Example.com  ")).toBe("me@example.com");
			expect(normalizeUsername(null)).toBe("");
		});
	});

	describe("categorizeIncomingItems", () => {
		it("classifies a brand-new item as new", () => {
			const existing = [item({ website: "https://github.com", username: "me" })];
			const incoming = [item({ website: "https://gitlab.com", username: "me" })];
			const result = categorizeIncomingItems(existing, incoming);
			expect(result).toHaveLength(1);
			expect(result[0].category).toBe("new");
			expect(result[0].matchedExisting).toBeUndefined();
		});

		it("classifies an identical item (same normalized identity + password) as a duplicate", () => {
			const existing = [
				item({
					website: "https://www.Google.com/",
					username: "Me@Example.com",
					password: "hunter2",
				}),
			];
			const incoming = [
				item({ website: "google.com", username: "me@example.com", password: "hunter2" }),
			];
			const result = categorizeIncomingItems(existing, incoming);
			expect(result[0].category).toBe("duplicate");
			expect(result[0].matchedExisting).toEqual(existing[0]);
		});

		it("classifies a same-identity-different-password item as a conflict, not a duplicate", () => {
			const existing = [item({ website: "github.com", username: "me", password: "old-password" })];
			const incoming = [item({ website: "github.com", username: "me", password: "new-password" })];
			const result = categorizeIncomingItems(existing, incoming);
			expect(result[0].category).toBe("conflict");
			expect(result[0].matchedExisting).toEqual(existing[0]);
		});

		it("does not silently drop a conflict just because notes differ", () => {
			const existing = [item({ password: "same-pw", notes: "old note" })];
			const incoming = [item({ password: "same-pw", notes: "new note" })];
			const result = categorizeIncomingItems(existing, incoming);
			// Password matches -> duplicate, even though notes differ (notes are not part
			// of the identity/conflict comparison).
			expect(result[0].category).toBe("duplicate");
		});
	});

	describe("encrypted backup envelope", () => {
		it("round-trips items through buildEncryptedBackup/parseEncryptedBackup", async () => {
			const items = [
				item(),
				item({ title: "GitLab", website: "gitlab.com", password: "another-secret" }),
			];
			const fileContents = await buildEncryptedBackup(items, "correct-backup-passphrase");
			const restored = await parseEncryptedBackup(fileContents, "correct-backup-passphrase");
			expect(restored).toEqual(items);
		});

		it("never stores plaintext passwords in the backup file contents", async () => {
			const items = [item({ password: "super-secret-plaintext-password" })];
			const fileContents = await buildEncryptedBackup(items, "correct-backup-passphrase");
			expect(fileContents).not.toContain("super-secret-plaintext-password");
		});

		it("rejects the wrong backup passphrase", async () => {
			const items = [item()];
			const fileContents = await buildEncryptedBackup(items, "correct-backup-passphrase");
			await expect(parseEncryptedBackup(fileContents, "wrong-passphrase")).rejects.toThrow(
				"Incorrect backup passphrase.",
			);
		});

		it("rejects a file that is not valid JSON", async () => {
			await expect(parseEncryptedBackup("not json at all", "any-passphrase")).rejects.toThrow(
				"This file is not a valid AwayInVault backup.",
			);
		});

		it("rejects a JSON file that isn't a recognizable backup envelope", async () => {
			await expect(
				parseEncryptedBackup(JSON.stringify({ hello: "world" }), "any-passphrase"),
			).rejects.toThrow("This file is not a valid AwayInVault backup.");
		});

		it("uses a fresh random salt on every export, not a fixed/reused one", async () => {
			const items = [item()];
			const fileContentsA = await buildEncryptedBackup(items, "same-passphrase");
			const fileContentsB = await buildEncryptedBackup(items, "same-passphrase");
			const saltA = JSON.parse(fileContentsA).salt;
			const saltB = JSON.parse(fileContentsB).salt;
			expect(saltA).not.toBe(saltB);
		});
	});
});
