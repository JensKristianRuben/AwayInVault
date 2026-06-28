import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { deriveKey, encryptData, decryptData } from "../utils/crypto";

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const userAEmail = process.env.TEST_USER_A_EMAIL;
const userAPassword = process.env.TEST_USER_A_PASSWORD;

describe("Passwords Local Encryption & Database Integration Test", () => {
  let client: ReturnType<typeof createClient>;
  let userId: string;

  beforeAll(async () => {
    expect(supabaseUrl).toBeDefined();
    expect(supabaseAnonKey).toBeDefined();
    expect(userAEmail).toBeDefined();
    expect(userAPassword).toBeDefined();

    // Initialize Supabase Client
    client = createClient(supabaseUrl!, supabaseAnonKey!);

    // Sign in Test User A
    const { data: auth, error: authError } = await client.auth.signInWithPassword({
      email: userAEmail!,
      password: userAPassword!,
    });
    if (authError) throw new Error(`Could not sign in User A: ${authError.message}`);
    userId = auth.user.id;
  });

  // Helper to encrypt a field returning 'iv:ciphertext'
  async function encryptField(plainText: string, key: CryptoKey): Promise<string> {
    const { ciphertext, iv } = await encryptData(plainText, key);
    return `${iv}:${ciphertext}`;
  }

  // Helper to decrypt a field of format 'iv:ciphertext'
  async function decryptField(encryptedValue: string | null, key: CryptoKey): Promise<string> {
    if (!encryptedValue) return "";
    const parts = encryptedValue.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted format");
    }
    const [iv, ciphertext] = parts;
    return await decryptData(ciphertext, key, iv);
  }

  it("should encrypt credentials, insert to Supabase, select them back, and decrypt successfully", async () => {
    // 1. Setup mock credentials and derive master key
    const masterPassword = "super-secret-master-password-123!";
    const salt = "aGVsZG9fc2FsdF90ZXN0XzEyMw=="; // 16 bytes base64 encoded salt
    const key = await deriveKey(masterPassword, salt);

    const rawWebsite = "https://test-service.com";
    const rawTitle = "Test Service Title";
    const rawUsername = "test_user_account";
    const rawPassword = "HighlySecureRandomPassword99$$";

    // 2. Encrypt sensitive fields locally in the test
    const usernameEncrypted = await encryptField(rawUsername, key);
    const passwordEncrypted = await encryptField(rawPassword, key);

    expect(usernameEncrypted).toContain(":");
    expect(passwordEncrypted).toContain(":");

    // 3. Write to Supabase vault_items table
    const { data: insertData, error: insertError } = await client
      .from("vault_items")
      .insert({
        user_id: userId,
        title: rawTitle,
        website: rawWebsite,
        username_encrypted: usernameEncrypted,
        password_encrypted: passwordEncrypted,
      })
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(insertData).toBeDefined();
    const itemId = insertData.id;

    try {
      // 4. Retrieve back from Supabase
      const { data: selectData, error: selectError } = await client
        .from("vault_items")
        .select("*")
        .eq("id", itemId)
        .single();

      expect(selectError).toBeNull();
      expect(selectData.title).toBe(rawTitle);
      expect(selectData.website).toBe(rawWebsite);

      // Verify database stored values are encrypted and do not match raw values
      expect(selectData.username_encrypted).not.toBe(rawUsername);
      expect(selectData.password_encrypted).not.toBe(rawPassword);

      // 5. Decrypt fields locally using the derived key
      const decryptedUsername = await decryptField(selectData.username_encrypted, key);
      const decryptedPassword = await decryptField(selectData.password_encrypted, key);

      // 6. Assert decrypted matches raw plaintext
      expect(decryptedUsername).toBe(rawUsername);
      expect(decryptedPassword).toBe(rawPassword);

    } finally {
      // 7. Cleanup inserted test item
      const { error: deleteError } = await client
        .from("vault_items")
        .delete()
        .eq("id", itemId);
      
      expect(deleteError).toBeNull();
    }
  });
});
