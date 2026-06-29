class CryptoSession {
	#cryptoKey = $state<CryptoKey | null>(null);
	#salt = $state<string | null>(null);

	get cryptoKey() {
		return this.#cryptoKey;
	}

	get salt() {
		return this.#salt;
	}

	setSession(key: CryptoKey, salt: string) {
		this.#cryptoKey = key;
		this.#salt = salt;
	}

	clearSession() {
		this.#cryptoKey = null;
		this.#salt = null;
	}
}
export const cryptoSession = new CryptoSession();
