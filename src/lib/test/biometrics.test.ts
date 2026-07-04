import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import {
	getBiometricMasterKey,
	deriveKey,
	encryptLocal,
	generateSalt,
	type AppUserMetadata,
} from "../utils/crypto";

// --- Mocking Setup ---

// In-memory store for simulating localStorage
const localStorageStore: Record<string, string> = {};

const localStorageMock = {
	getItem: vi.fn((key: string) => localStorageStore[key] || null),
	setItem: vi.fn((key: string, value: string) => {
		localStorageStore[key] = value.toString();
	}),
	removeItem: vi.fn((key: string) => {
		delete localStorageStore[key];
	}),
	clear: vi.fn(() => {
		for (const key in localStorageStore) {
			delete localStorageStore[key];
		}
	}),
};

const credentialsMock = {
	get: vi.fn(),
	create: vi.fn(),
};

const navigatorMock = {
	credentials: credentialsMock,
	userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
};

beforeAll(() => {
	// Stub globals for Vitest Node.js environment
	vi.stubGlobal("localStorage", localStorageMock);
	vi.stubGlobal("navigator", navigatorMock);
});

afterEach(() => {
	vi.clearAllMocks();
	localStorageMock.clear();
});

// --- Virtual Authenticator Helper ---

interface MockAuthenticatorConfig {
	expectedCredentialId?: string; // Base64
	returnedPrfKey?: Uint8Array; // 32 bytes raw key
	shouldSupportPrf?: boolean;
	shouldUserCancel?: boolean;
	customAssertionId?: string; // Used to simulate a mismatch credential ID
}

function setupVirtualAuthenticator(config: MockAuthenticatorConfig) {
	config.shouldSupportPrf = config.shouldSupportPrf ?? true;

	credentialsMock.get.mockImplementation(async (options: CredentialRequestOptions) => {
		const pk = options.publicKey;
		if (!pk) throw new Error("Invalid options: publicKey is required");

		// 1. Validate challenge (must be 32 bytes)
		if (!pk.challenge || pk.challenge.byteLength !== 32) {
			throw new Error("Security Error: WebAuthn challenge must be exactly 32 bytes");
		}

		// 2. Validate PRF extension inputs
		const prfEval = (pk.extensions as any)?.prf?.eval?.first;
		if (!prfEval || prfEval.byteLength !== 32) {
			throw new Error("Specification Error: PRF extension with a 32-byte salt is required");
		}

		// 3. Simulate user canceling the biometric verification
		if (config.shouldUserCancel) {
			throw new DOMException("The operation was aborted.", "NotAllowedError");
		}

		// 4. Determine what credential ID is returned by the device
		let returnedIdBase64 = config.expectedCredentialId;

		if (config.customAssertionId) {
			returnedIdBase64 = config.customAssertionId;
		} else if (!returnedIdBase64 && pk.allowCredentials && pk.allowCredentials.length > 0) {
			const firstAllowed = pk.allowCredentials[0];
			const allowedIdBytes = new Uint8Array(firstAllowed.id as ArrayBuffer);
			returnedIdBase64 = btoa(String.fromCharCode(...allowedIdBytes));
		}

		if (!returnedIdBase64) {
			throw new Error("No credential ID available to return from virtual authenticator");
		}

		const rawId = Uint8Array.from(atob(returnedIdBase64), (c) => c.charCodeAt(0)).buffer;

		// 5. Construct client extension results
		const prfResults = config.shouldSupportPrf
			? {
					prf: {
						enabled: true,
						results: {
							first: (config.returnedPrfKey || new Uint8Array(32)).buffer,
						},
					},
				}
			: {};

		// 6. Return the simulated PublicKeyCredential assertion
		return {
			id: returnedIdBase64,
			rawId,
			type: "public-key",
			getClientExtensionResults: () => prfResults,
		} as unknown as PublicKeyCredential;
	});
}

// --- Test Suite ---

describe("Biometric Master Key Retrieval Tests", () => {
	const masterPassword = "my-secure-vault-master-password";
	const salt = generateSalt();
	let derivedMasterKey: CryptoKey;

	// Simulated PRF derived key (32 bytes)
	const dummyPrfKey = new Uint8Array(32);
	crypto.getRandomValues(dummyPrfKey);

	beforeAll(async () => {
		derivedMasterKey = await deriveKey(masterPassword, salt);
	});

	it("1. should successfully retrieve master key via local cache (Happy Path)", async () => {
		// Prepare local storage key: encrypt masterPassword using the PRF-derived key
		const prfCryptoKey = await crypto.subtle.importKey(
			"raw",
			dummyPrfKey,
			{ name: "AES-GCM" },
			false,
			["encrypt"],
		);
		const encryptedKey = await encryptLocal(masterPassword, prfCryptoKey);
		const credentialId = btoa("cred-id-12345");

		localStorageMock.setItem("awayinvault_bio_credential_id", credentialId);
		localStorageMock.setItem("awayinvault_bio_encrypted_key", encryptedKey);

		// Setup Virtual Authenticator
		setupVirtualAuthenticator({
			expectedCredentialId: credentialId,
			returnedPrfKey: dummyPrfKey,
		});

		const userMetadata: AppUserMetadata = { salt };
		const resultKey = await getBiometricMasterKey(userMetadata);

		expect(resultKey).not.toBeNull();
		expect(resultKey).toBeInstanceOf(CryptoKey);

		// Verify the returned key is indeed equivalent to our derivedMasterKey
		// (We test this by encrypting with one and decrypting with the other)
		const testText = "secret-payload";
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const ciphertext = await crypto.subtle.encrypt(
			{ name: "AES-GCM", iv },
			resultKey!,
			new TextEncoder().encode(testText),
		);
		const decrypted = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv },
			derivedMasterKey,
			ciphertext,
		);
		expect(new TextDecoder().decode(decrypted)).toBe(testText);

		// Verify navigator.credentials.get was called with the correct parameters
		expect(credentialsMock.get).toHaveBeenCalledTimes(1);
		const callOptions = credentialsMock.get.mock.calls[0][0];
		expect(callOptions.publicKey.allowCredentials[0].id).toEqual(
			Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0)),
		);
	});

	it("2. should successfully retrieve master key via database fallback and update local cache (Happy Path)", async () => {
		const prfCryptoKey = await crypto.subtle.importKey(
			"raw",
			dummyPrfKey,
			{ name: "AES-GCM" },
			false,
			["encrypt"],
		);
		const encryptedKey = await encryptLocal(masterPassword, prfCryptoKey);
		const credentialId = btoa("cred-id-db-fallback");

		// LocalStorage is empty
		expect(localStorageMock.getItem("awayinvault_bio_credential_id")).toBeNull();

		// Supabase metadata fallback configured
		const userMetadata: AppUserMetadata = {
			salt,
			biometric_credentials: [
				{
					credential_id: credentialId,
					encrypted_key: encryptedKey,
					device_name: "Test Device",
				},
			],
		};

		setupVirtualAuthenticator({
			expectedCredentialId: credentialId,
			returnedPrfKey: dummyPrfKey,
		});

		const resultKey = await getBiometricMasterKey(userMetadata);

		expect(resultKey).not.toBeNull();
		expect(resultKey).toBeInstanceOf(CryptoKey);

		// Verify local storage was populated/restored
		expect(localStorageMock.getItem("awayinvault_bio_credential_id")).toBe(credentialId);
		expect(localStorageMock.getItem("awayinvault_bio_encrypted_key")).toBe(encryptedKey);
	});

	it("3. should handle user cancellation gracefully and return null", async () => {
		const credentialId = btoa("cred-id-cancel");
		localStorageMock.setItem("awayinvault_bio_credential_id", credentialId);
		localStorageMock.setItem("awayinvault_bio_encrypted_key", "dummy-encrypted-key");

		setupVirtualAuthenticator({
			shouldUserCancel: true,
		});

		const userMetadata: AppUserMetadata = { salt };
		const resultKey = await getBiometricMasterKey(userMetadata);

		expect(resultKey).toBeNull();
	});

	it("4. should return null when PRF extension is not supported by the authenticator", async () => {
		const credentialId = btoa("cred-id-no-prf");
		localStorageMock.setItem("awayinvault_bio_credential_id", credentialId);
		localStorageMock.setItem("awayinvault_bio_encrypted_key", "dummy-encrypted-key");

		setupVirtualAuthenticator({
			expectedCredentialId: credentialId,
			shouldSupportPrf: false, // Turn off PRF support
		});

		const userMetadata: AppUserMetadata = { salt };
		const resultKey = await getBiometricMasterKey(userMetadata);

		expect(resultKey).toBeNull();
	});

	it("5. should return null when the returned credential ID does not match any registered credential in metadata", async () => {
		const dbCredentialId = btoa("registered-cred-id");
		const wrongReturnedId = btoa("unregistered-cred-id-from-device");

		const userMetadata: AppUserMetadata = {
			salt,
			biometric_credentials: [
				{
					credential_id: dbCredentialId,
					encrypted_key: "dummy-key",
					device_name: "Test Device",
				},
			],
		};

		setupVirtualAuthenticator({
			customAssertionId: wrongReturnedId, // Authenticator returns wrong ID
			returnedPrfKey: dummyPrfKey,
		});

		const resultKey = await getBiometricMasterKey(userMetadata);

		expect(resultKey).toBeNull();
		// LocalStorage should not have been updated
		expect(localStorageMock.getItem("awayinvault_bio_credential_id")).toBeNull();
	});

	it("6. should successfully match and retrieve key when user has multiple registered credentials in database metadata", async () => {
		const prfCryptoKey = await crypto.subtle.importKey(
			"raw",
			dummyPrfKey,
			{ name: "AES-GCM" },
			false,
			["encrypt"],
		);
		const encryptedKey1 = await encryptLocal("wrong-password", prfCryptoKey);
		const credentialId1 = btoa("cred-id-device-1");

		const encryptedKey2 = await encryptLocal(masterPassword, prfCryptoKey);
		const credentialId2 = btoa("cred-id-device-2"); // This is the active device

		const userMetadata: AppUserMetadata = {
			salt,
			biometric_credentials: [
				{
					credential_id: credentialId1,
					encrypted_key: encryptedKey1,
					device_name: "Macbook TouchID",
				},
				{
					credential_id: credentialId2,
					encrypted_key: encryptedKey2,
					device_name: "Windows Hello PC",
				},
			],
		};

		// Authenticator returns Device 2 credentials
		setupVirtualAuthenticator({
			expectedCredentialId: credentialId2,
			returnedPrfKey: dummyPrfKey,
		});

		const resultKey = await getBiometricMasterKey(userMetadata);

		expect(resultKey).not.toBeNull();
		expect(resultKey).toBeInstanceOf(CryptoKey);

		// LocalStorage should have updated cache specifically for Device 2
		expect(localStorageMock.getItem("awayinvault_bio_credential_id")).toBe(credentialId2);
		expect(localStorageMock.getItem("awayinvault_bio_encrypted_key")).toBe(encryptedKey2);
	});
});
