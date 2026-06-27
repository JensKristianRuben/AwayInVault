function bytesToBase64(bytes: Uint8Array): string {
  // TODO: Implementer konvertering ved hjælp af btoa og String.fromCodePoint;
  return "hej";
}

function base64ToBytes(base64: string): Uint8Array {
  // TODO: Implementer konvertering ved hjælp af atob og Uint8Array.from;
}

export function generateSalt(bytesLength = 16): string {

    return "123";
}

export async function deriveKey(masterPassword: string, saltBase64: string): Promise<CryptoKey> {

    const encoder = new TextEncoder();
    const password = encoder.encode(masterPassword);
    const saltBytes = base64ToBytes(saltBase64);


}

export async function encryptData(plainText: string, key: CryptoKey): Promise<{cipherText: string; iv: string}> {

}

export async function decryptData(ciphertextBase64: string, key: CryptoKey, ivBase64: string): Promise<string> {
    
}
