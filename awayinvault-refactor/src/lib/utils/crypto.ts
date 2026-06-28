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

export async function deriveKey(
  masterPassword: string,
  saltBase64: string,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const password = encoder.encode(masterPassword);
  const saltBytes = base64ToBytes(saltBase64);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    password,
    "PBKDF2",
    false,
    ["deriveKey"],
  );

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

    const decryptedBuffer = await crypto.subtle.decrypt({name: "AES-GCM", iv: ivbytes as unknown as ArrayBuffer}, key, ciphertextBytes as unknown as ArrayBuffer);

    const decoder = new TextDecoder();
    const decodedDecryptedBuffer = decoder.decode(decryptedBuffer);

    return decodedDecryptedBuffer;

}
