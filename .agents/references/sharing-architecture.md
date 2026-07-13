# Zero-Knowledge Sharing Architecture (aiv)

This document provides a technical reference for developers and agentic AI systems working on the database, cryptography, or frontend sharing features of AwayInVault (aiv).

## Architectural Overview

aiv implements a zero-knowledge sharing system using hybrid cryptography (asymmetric and symmetric encryption). The database server hosts the sharing structure, but lacks access to the plain text credentials or keys.

- **Personal Sharing Identity:** Each user has an RSA-OAEP 2048-bit keypair. The public key is stored in plaintext on the server (`profiles.public_key`). The private key is encrypted client-side using the user's master key (AES-GCM) and stored on the server (`profiles.encrypted_private_key`).
- **Project Keys:** Each shared project has an AES-GCM 256-bit symmetric key (project-key). This key is encrypted (wrapped) separately for each team member using their personal RSA public key and stored in `project_keys.encrypted_key`.
- **Shared Credentials:** Credentials belong to a project and are encrypted with the project-key using AES-GCM. They are stored in `project_vault_items`.

---

## Database Schema Reference

For full schemas, triggers, RLS policies, and indexes, refer to the migrations folder:

- [supabase/migrations/](file:///C:/Users/Jensk/node-js-projects/awayinVault/supabase/migrations/)

### Tables Summary

1. **`profiles`**: Extends `auth.users` with sharing public key and encrypted private key.
2. **`teams`**: Identifies team instances.
3. **`team_members`**: Links users to teams with role (`owner`, `admin`, `member`) and status (`active`, `invited`).
4. **`shared_projects`**: Projects created within a team.
5. **`project_keys`**: Wrapped project symmetric keys (one record per project per user).
6. **`project_vault_items`**: Credentials encrypted using the project-key.
7. **`team_invitations`**: Tracks pending invites sent to unregistered or offline e-mails.

---

## Cryptographic Workflows

### 1. User Initialization (Master Password Setup)

During master password creation or recovery:

1. Client generates RSA-OAEP 2048-bit keypair.
2. Client exports public key (SPKI base64) -> writes to `profiles.public_key`.
3. Client exports private key (PKCS8 base64) -> encrypts it using the user's derived master key (AES-GCM) -> writes to `profiles.encrypted_private_key`.

### 2. Project Creation

When an active team member creates a shared project:

1. Client generates a random 256-bit AES key (project-key).
2. Client encrypts the project-key with their own RSA public key.
3. Client inserts project into `shared_projects`, and the wrapped key into `project_keys`.

### 3. Invitation and Key Wrapping

- **Registered User Invite:** The inviter fetches the invitee's public key by e-mail from `profiles`, encrypts all project-keys in the team with the public key, and inserts them into `project_keys` immediately.
- **Unregistered User Invite:** The inviter inserts a record in `team_invitations`. When the invitee registers, they accept the invite, entering `team_members` as `active`. Because their keys were not encrypted during invite, they lack entries in `project_keys` (implicit key request).

### 4. Background Key Resolution (Fallback)

To resolve missing project keys automatically:

- When an active member who already has project access logs into the teams dashboard, an effect queries for team members who lack a `project_keys` record for each project.
- The client fetches the missing members' public keys, decrypts the project-key in memory using their own private key, encrypts it for the target members, and uploads them to `project_keys`.
- This ensures unregistered users automatically receive access once an active member logs in.

---

## Source Code References

- [src/lib/utils/crypto.ts](file:///C:/Users/Jensk/node-js-projects/awayinVault/src/lib/utils/crypto.ts): Asymmetric key generation, import, export, wrapping, and unwrapping.
- [src/lib/stores/cryptoSession.svelte.ts](file:///C:/Users/Jensk/node-js-projects/awayinVault/src/lib/stores/cryptoSession.svelte.ts): Stores decrypted asymmetric private key and public key in RAM.
- [src/routes/(app)/teams/+page.svelte](<file:///C:/Users/Jensk/node-js-projects/awayinVault/src/routes/(app)/teams/+page.svelte>): Teams UI and background key wrapping synchronization logic.
