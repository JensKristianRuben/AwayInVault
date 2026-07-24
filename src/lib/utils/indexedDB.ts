const DB_NAME = "awayinvault-db";
const STORE_NAME = "biometrics";

// Biometric credentials are scoped per user id. IndexedDB is per browser origin, not per
// account, so several users can share one browser (common in development). Keying the
// records by user id stops one account's stored credential from being read for another --
// which previously made the onboarding gate think a brand-new user had already set up a
// Master Password. See getBiometricCredentials.
function credIdKey(userId: string): string {
	return `credential_id::${userId}`;
}
function encKeyKey(userId: string): string {
	return `encrypted_key::${userId}`;
}

// The original, unscoped keys. Kept only so leftover records written before per-user
// scoping existed can be cleaned up; they are never read anymore.
const LEGACY_KEY_CRED_ID = "credential_id";
const LEGACY_KEY_ENCRYPTED_KEY = "encrypted_key";

function getDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export async function setBiometricCredentials(
	userId: string,
	credentialId: string,
	encryptedKey: string,
): Promise<void> {
	const db = await getDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		store.put(credentialId, credIdKey(userId));
		store.put(encryptedKey, encKeyKey(userId));
		// Opportunistically drop any pre-scoping records so they can never be misread.
		store.delete(LEGACY_KEY_CRED_ID);
		store.delete(LEGACY_KEY_ENCRYPTED_KEY);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function getBiometricCredentials(userId: string): Promise<{
	credentialId: string;
	encryptedKey: string;
} | null> {
	// Safely return null if indexedDB is not available (e.g. server-side rendering)
	if (typeof indexedDB === "undefined") {
		return null;
	}
	try {
		const db = await getDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readonly");
			const store = tx.objectStore(STORE_NAME);
			const reqId = store.get(credIdKey(userId));
			const reqKey = store.get(encKeyKey(userId));

			tx.oncomplete = () => {
				if (reqId.result && reqKey.result) {
					resolve({ credentialId: reqId.result, encryptedKey: reqKey.result });
				} else {
					resolve(null);
				}
			};
			tx.onerror = () => reject(tx.error);
		});
	} catch (err) {
		console.error("IndexedDB error:", err);
		return null;
	}
}

export async function clearBiometricCredentials(userId: string): Promise<void> {
	const db = await getDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		store.delete(credIdKey(userId));
		store.delete(encKeyKey(userId));
		// Also remove any leftover unscoped records from before per-user scoping.
		store.delete(LEGACY_KEY_CRED_ID);
		store.delete(LEGACY_KEY_ENCRYPTED_KEY);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}
