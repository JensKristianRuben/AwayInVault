import { describe, it, expect } from 'vitest';
import { generateSalt, deriveKey, encryptData, decryptData } from './crypto';

describe('crypto utils', () => {
  it('should generate a 16-byte base64 salt', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).toBeDefined();
    expect(salt1).not.toBe(salt2);
    // Base64 regex check
    expect(salt1).toMatch(/^[A-Za-z0-9+/=]+$/);
    // 16 bytes encoded in base64 should be 24 chars long
    expect(salt1.length).toBe(24);
  });

  it('should derive a CryptoKey from master password and salt', async () => {
    const password = 'my-super-secret-master-password';
    const salt = generateSalt();
    
    const key = await deriveKey(password, salt);
    expect(key).toBeInstanceOf(CryptoKey);
    expect(key.type).toBe('secret');
    expect(key.algorithm.name).toBe('AES-GCM');
    // @ts-ignore
    expect(key.algorithm.length).toBe(256);
    expect(key.extractable).toBe(false);
  });

  it('should derive the same key for the same input, and different key for different salt', async () => {
    const password = 'my-super-secret-master-password';
    const salt1 = generateSalt();
    const salt2 = generateSalt();

    const key1 = await deriveKey(password, salt1);
    const key1_again = await deriveKey(password, salt1);
    const key2 = await deriveKey(password, salt2);

    // Note: Web Crypto doesn't let us compare CryptoKey objects directly via `===` if they are non-extractable,
    // but we can verify by encrypting with one and decrypting with the other.
    const plaintext = 'hello world';
    const encrypted = await encryptData(plaintext, key1);
    
    // Decrypting with the same key should work
    const decrypted = await decryptData(encrypted.ciphertext, key1_again, encrypted.iv);
    expect(decrypted).toBe(plaintext);

    // Decrypting with key2 should fail and throw an error
    await expect(decryptData(encrypted.ciphertext, key2, encrypted.iv)).rejects.toThrow();
  });

  it('should encrypt and decrypt data successfully', async () => {
    const password = 'secure-password';
    const salt = generateSalt();
    const key = await deriveKey(password, salt);
    const plaintext = 'This is a secret note!';

    const result = await encryptData(plaintext, key);
    expect(result.ciphertext).toBeDefined();
    expect(result.iv).toBeDefined();
    expect(result.ciphertext).not.toBe(plaintext);

    const decrypted = await decryptData(result.ciphertext, key, result.iv);
    expect(decrypted).toBe(plaintext);
  });

  it('should throw an error if decryption fails due to wrong key', async () => {
    const salt = generateSalt();
    const key1 = await deriveKey('correct-password', salt);
    const key2 = await deriveKey('wrong-password', salt);
    const plaintext = 'secret message';

    const result = await encryptData(plaintext, key1);
    
    await expect(decryptData(result.ciphertext, key2, result.iv)).rejects.toThrow();
  });
});
