import { getBiometricCredentials, setBiometricCredentials } from "./indexedDB.js";
import type { AppUserMetadata } from "../types/index.js";

function bytesToBase64(bytes: Uint8Array): string {
	return btoa(String.fromCodePoint(...bytes));
}

function base64ToBytes(base64: string): Uint8Array {
	return Uint8Array.from(atob(base64), (m) => m.codePointAt(0)!);
}

export function generateSalt(bytesLength = 16): string {
	const bytes = crypto.getRandomValues(new Uint8Array(bytesLength));
	return bytesToBase64(bytes);
}

export async function deriveKey(masterPassword: string, saltBase64: string): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const password = encoder.encode(masterPassword);
	const saltBytes = base64ToBytes(saltBase64);

	const baseKey = await crypto.subtle.importKey("raw", password, "PBKDF2", false, ["deriveKey"]);

	const derivedKey = await crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt: saltBytes as unknown as ArrayBuffer,
			iterations: 600000,
			hash: "SHA-256",
		},
		baseKey,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);

	return derivedKey;
}

export async function encryptData(
	plainText: string,
	key: CryptoKey,
): Promise<{ ciphertext: string; iv: string }> {
	const iv = crypto.getRandomValues(new Uint8Array(12));

	const encoder = new TextEncoder();
	const plainTextBytes = encoder.encode(plainText);

	const cipherTextBuffer = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv },
		key,
		plainTextBytes,
	);

	const cipherTextBufferBytesTobase64 = {
		ciphertext: bytesToBase64(new Uint8Array(cipherTextBuffer)),
		iv: bytesToBase64(iv),
	};

	return cipherTextBufferBytesTobase64;
}

export async function decryptData(
	ciphertextBase64: string,
	key: CryptoKey,
	ivBase64: string,
): Promise<string> {
	const ciphertextBytes = base64ToBytes(ciphertextBase64);
	const ivbytes = base64ToBytes(ivBase64);

	const decryptedBuffer = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: ivbytes as unknown as ArrayBuffer },
		key,
		ciphertextBytes as unknown as ArrayBuffer,
	);

	const decoder = new TextDecoder();
	const decodedDecryptedBuffer = decoder.decode(decryptedBuffer);

	return decodedDecryptedBuffer;
}

export async function encryptLocal(plainText: string, key: CryptoKey): Promise<string> {
	const { ciphertext, iv } = await encryptData(plainText, key);
	return `${iv}:${ciphertext}`;
}

export async function decryptLocal(encryptedValue: string | null, key: CryptoKey): Promise<string> {
	if (!encryptedValue) return "";
	const parts = encryptedValue.split(":");
	if (parts.length !== 2) {
		throw new Error("Invalid encrypted format");
	}
	const [iv, ciphertext] = parts;
	return await decryptData(ciphertext, key, iv);
}

export async function verifyMasterPassword(
	masterPasswordInput: string,
	userMetadata: AppUserMetadata,
): Promise<CryptoKey | null> {
	try {
		const { salt, verifier_ciphertext, verifier_iv } = userMetadata;
		if (!salt || !verifier_ciphertext || !verifier_iv) {
			throw new Error("Missing verification metadata");
		}

		const key = await deriveKey(masterPasswordInput, salt);
		const decryptedVal = await decryptData(verifier_ciphertext, key, verifier_iv);

		if (decryptedVal === "vaulten-er-lukket-og-du-kan-ikke-komme-ind-uden-masterpassword") {
			return key;
		}

		throw new Error("Verification value mismatch");
	} catch (err) {
		console.error("Master password verification failed:", err);
		return null;
	}
}

export async function getBiometricMasterKey(
	userMetadata: AppUserMetadata,
): Promise<CryptoKey | null> {
	try {
		const credentials = await getBiometricCredentials();
		let credentialId = credentials?.credentialId || null;
		let encryptedKey = credentials?.encryptedKey || null;

		const dbCredentials = userMetadata?.biometric_credentials || [];
		let selectedCred: any = null;
		let rawPrfKey: ArrayBuffer | null = null;

		// Setup PRF details
		const challenge = crypto.getRandomValues(new Uint8Array(32));
		const prfSalt = new Uint8Array(32);
		const encoder = new TextEncoder();
		const saltSource = encoder.encode("awayinvault-biometric-salt-v1-key");
		prfSalt.set(saltSource.slice(0, 32));

		if (credentialId && encryptedKey) {
			// Standard flow: we have it locally
			const credIdBytes = Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0));
			const options: CredentialRequestOptions = {
				publicKey: {
					challenge,
					allowCredentials: [{ type: "public-key", id: credIdBytes }],
					userVerification: "required",
					extensions: {
						prf: { eval: { first: prfSalt } },
					} as any,
				},
			};

			const assertion = (await navigator.credentials.get(options)) as PublicKeyCredential;
			if (!assertion) return null;

			const extensionResults = assertion.getClientExtensionResults() as any;
			rawPrfKey = extensionResults.prf?.results?.first;
			selectedCred = { credential_id: credentialId, encrypted_key: encryptedKey };
		} else if (dbCredentials.length > 0) {
			// Fallback: Restore from Supabase metadata
			const allowCredentials = dbCredentials.map((c: any) => ({
				type: "public-key" as const,
				id: Uint8Array.from(atob(c.credential_id), (x) => x.charCodeAt(0)),
			}));

			const options: CredentialRequestOptions = {
				publicKey: {
					challenge,
					allowCredentials,
					userVerification: "required",
					extensions: {
						prf: { eval: { first: prfSalt } },
					} as any,
				},
			};

			const assertion = (await navigator.credentials.get(options)) as PublicKeyCredential;
			if (!assertion) return null;

			const selectedIdBase64 = btoa(String.fromCharCode(...new Uint8Array(assertion.rawId)));
			const matched = dbCredentials.find((c: any) => c.credential_id === selectedIdBase64);
			if (!matched) {
				throw new Error("Selected credential not registered in user metadata");
			}

			const extensionResults = assertion.getClientExtensionResults() as any;
			rawPrfKey = extensionResults.prf?.results?.first;
			selectedCred = matched;

			// Restore to local cache (IndexedDB)
			await setBiometricCredentials(matched.credential_id, matched.encrypted_key);
		} else {
			throw new Error("Biometric unlock is not configured");
		}

		if (!rawPrfKey || !selectedCred) {
			throw new Error("Failed to retrieve biometric PRF key or credentials");
		}

		const biometricKey = await crypto.subtle.importKey(
			"raw",
			rawPrfKey,
			{ name: "AES-GCM" },
			false,
			["decrypt"],
		);

		const masterPassword = await decryptLocal(selectedCred.encrypted_key, biometricKey);
		const salt = userMetadata?.salt;
		if (!salt) {
			throw new Error("Salt not found in user metadata");
		}

		return await deriveKey(masterPassword, salt);
	} catch (err) {
		console.error("Biometric master key derivation failed:", err);
		return null;
	}
}
