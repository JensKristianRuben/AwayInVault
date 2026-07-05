export interface BiometricCredential {
	credential_id: string;
	encrypted_key: string;
	device_name: string;
}

export interface AppUserMetadata {
	salt?: string;
	verifier_ciphertext?: string;
	verifier_iv?: string;
	biometric_credentials?: BiometricCredential[];
	[key: string]: any;
}
