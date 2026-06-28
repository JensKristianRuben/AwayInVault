export interface VaultItem {
  id: string;
  user_id: string;
  title: string;
  website: string | null;
  username_encrypted: string | null;
  password_encrypted: string;
  notes_encrypted: string | null;
  created_at: string;
  updated_at: string;
  
  // Decrypted fields added locally in the browser
  username?: string;
  password?: string;
  isDecrypted?: boolean;
}
