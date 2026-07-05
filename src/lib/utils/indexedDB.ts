const DB_NAME = "awayinvault-db";
const STORE_NAME = "biometrics";
const KEY_CRED_ID = "credential_id";
const KEY_ENCRYPTED_KEY = "encrypted_key";

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
	credentialId: string,
	encryptedKey: string,
): Promise<void> {
	const db = await getDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		store.put(credentialId, KEY_CRED_ID);
		store.put(encryptedKey, KEY_ENCRYPTED_KEY);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function getBiometricCredentials(): Promise<{
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
			const reqId = store.get(KEY_CRED_ID);
			const reqKey = store.get(KEY_ENCRYPTED_KEY);

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

export async function clearBiometricCredentials(): Promise<void> {
	const db = await getDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		store.delete(KEY_CRED_ID);
		store.delete(KEY_ENCRYPTED_KEY);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}
