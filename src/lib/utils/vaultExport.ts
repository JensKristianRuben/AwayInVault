// Scope-agnostic core for import/export: works the same whether the caller is
// operating on the personal vault (vault_items + the personal DEK) or a team project
// (project_vault_items + that project's unwrapped symmetric key) - callers resolve the
// right table/key and pass already-decrypted plaintext items in and out of here.
import { deriveKey, generateSalt, encryptLocal, decryptLocal } from "./crypto";

export interface DecryptedItem {
	title: string;
	website: string | null;
	username: string | null;
	password: string;
	notes: string | null;
}

// Normalizes a website for duplicate matching: case-insensitive, ignores the protocol,
// a leading "www.", and trailing slashes, so "https://Google.com" and "google.com/"
// are recognized as the same site even though CSV sources format URLs differently.
export function normalizeWebsite(website: string | null): string {
	if (!website) return "";
	let value = website.trim().toLowerCase();
	value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
	value = value.replace(/^www\./, "");
	value = value.replace(/\/+$/, "");
	return value;
}

export function normalizeUsername(username: string | null): string {
	return (username ?? "").trim().toLowerCase();
}

function matchKey(website: string | null, username: string | null): string {
	return `${normalizeWebsite(website)}|${normalizeUsername(username)}`;
}

export type ImportCategory = "new" | "duplicate" | "conflict";

export interface CategorizedItem {
	item: DecryptedItem;
	category: ImportCategory;
	// The existing item this one matched against (same normalized website + username).
	// Present for "duplicate" and "conflict", absent for "new".
	matchedExisting?: DecryptedItem;
}

// Classifies each incoming (e.g. freshly-parsed CSV or decrypted backup) item against
// the vault's existing items:
//   - "new": no existing item shares its normalized website + username.
//   - "duplicate": an existing item matches AND has the exact same password - safe to
//     pre-uncheck in the import preview.
//   - "conflict": an existing item matches but the password differs - this must be
//     flagged and require an explicit user choice (keep existing / overwrite / import
//     as new), since silently skipping it could discard a password changed elsewhere.
export function categorizeIncomingItems(
	existing: DecryptedItem[],
	incoming: DecryptedItem[],
): CategorizedItem[] {
	const existingByKey = new Map<string, DecryptedItem[]>();
	for (const item of existing) {
		const key = matchKey(item.website, item.username);
		const bucket = existingByKey.get(key);
		if (bucket) bucket.push(item);
		else existingByKey.set(key, [item]);
	}

	return incoming.map((item) => {
		const key = matchKey(item.website, item.username);
		const candidates = existingByKey.get(key);
		if (!candidates || candidates.length === 0) {
			return { item, category: "new" };
		}

		const identical = candidates.find((existingItem) => existingItem.password === item.password);
		if (identical) {
			return { item, category: "duplicate", matchedExisting: identical };
		}

		return { item, category: "conflict", matchedExisting: candidates[0] };
	});
}

const BACKUP_VERSION = 1;
const BACKUP_KDF = "PBKDF2-SHA256-600000";

interface EncryptedBackupEnvelope {
	version: number;
	kdf: string;
	salt: string;
	payload: string;
}

// Builds the encrypted backup file contents. Deliberately encrypted with a passphrase
// distinct from the account's Master Password (a fresh random salt + a passphrase the
// user chooses at export time): a stolen backup file would otherwise be an unlimited
// offline brute-force target against the same password that unlocks the live vault,
// which is strictly worse than today's online, rate-limited exposure.
export async function buildEncryptedBackup(
	items: DecryptedItem[],
	passphrase: string,
): Promise<string> {
	const salt = generateSalt();
	const key = await deriveKey(passphrase, salt);
	const payload = await encryptLocal(JSON.stringify(items), key);
	const envelope: EncryptedBackupEnvelope = {
		version: BACKUP_VERSION,
		kdf: BACKUP_KDF,
		salt,
		payload,
	};
	return JSON.stringify(envelope, null, 2);
}

// Reverses buildEncryptedBackup. Returns plaintext items ready to feed into
// categorizeIncomingItems, exactly like a freshly-parsed CSV import.
export async function parseEncryptedBackup(
	fileContents: string,
	passphrase: string,
): Promise<DecryptedItem[]> {
	let envelope: EncryptedBackupEnvelope;
	try {
		envelope = JSON.parse(fileContents);
	} catch {
		throw new Error("This file is not a valid AwayInVault backup.");
	}

	if (
		envelope.version !== BACKUP_VERSION ||
		typeof envelope.salt !== "string" ||
		typeof envelope.payload !== "string"
	) {
		throw new Error("This file is not a valid AwayInVault backup.");
	}

	const key = await deriveKey(passphrase, envelope.salt);
	let json: string;
	try {
		json = await decryptLocal(envelope.payload, key);
	} catch {
		throw new Error("Incorrect backup passphrase.");
	}

	let items: unknown;
	try {
		items = JSON.parse(json);
	} catch {
		throw new Error("This file is not a valid AwayInVault backup.");
	}
	if (!Array.isArray(items)) {
		throw new Error("This file is not a valid AwayInVault backup.");
	}

	return items as DecryptedItem[];
}
