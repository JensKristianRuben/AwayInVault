class CryptoSession {
	#cryptoKey = $state<CryptoKey | null>(null);
	#salt = $state<string | null>(null);
	#sharingPrivateKey = $state<CryptoKey | null>(null);
	#sharingPublicKey = $state<CryptoKey | null>(null);

	get cryptoKey() {
		return this.#cryptoKey;
	}

	get salt() {
		return this.#salt;
	}

	get sharingPrivateKey() {
		return this.#sharingPrivateKey;
	}

	get sharingPublicKey() {
		return this.#sharingPublicKey;
	}

	setSession(key: CryptoKey, salt: string) {
		this.#cryptoKey = key;
		this.#salt = salt;
	}

	setSharingKeys(privateKey: CryptoKey, publicKey: CryptoKey) {
		this.#sharingPrivateKey = privateKey;
		this.#sharingPublicKey = publicKey;
	}

	clearSession() {
		this.#cryptoKey = null;
		this.#salt = null;
		this.#sharingPrivateKey = null;
		this.#sharingPublicKey = null;
	}
}
export const cryptoSession = new CryptoSession();
