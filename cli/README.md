# aiv CLI

The aiv CLI is a command-line interface for managing and accessing your passwords directly from the terminal. It replicates the zero-knowledge local encryption system used by the aiv web application.

---

## Security & Architecture

- **Zero-Knowledge Local Cryptography:** All sensitive data (passwords, usernames) is encrypted locally using AES-GCM and PBKDF2 derived keys before being uploaded to the database. Plaintext secrets and your Master Password are never transmitted over the network.
- **No Secret Storage on Disk:** The local cache file (session.json) only retains temporary Supabase authentication tokens (access_token, refresh_token). Your Master Password and derived encryption keys are kept solely in process RAM and discarded immediately upon command completion.
- **Owner-Only File Permissions:** The CLI automatically configures file permissions on Unix-like operating systems (chmod 600 on the session file, chmod 700 on its parent directory) to prevent other local users on shared machines from reading your session cache.
- **Secure Clipboard Piping & Auto-Clear:** When copying secrets with the -c flag, the password is piped directly into the OS clipboard utility's standard input to prevent shell history leaks. A detached background process is automatically spawned to wipe the clipboard clean after 30 seconds.

---

## Prerequisites

- Node.js (v18.0.0 or higher)
- A Supabase database instance (uses the default production instance by default, or can be customized).

---

## Supabase Configuration

By default, the CLI connects to the official production database. If you want to point the CLI to a custom Supabase instance (e.g. staging or local development), it resolves configuration in the following order:

1. Environment variables (`PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY`) in the current shell or a local `.env` file in your current working directory.
2. Global configuration file located at `~/.awayinvault/config.json`.
3. Default production database keys.

---

## Getting Started

To execute the CLI tool from the project root, run:

```bash
npx tsx cli/index.ts <command> [options]
```

---

## Command Reference

### 1. Initialize Configuration (init)

Configures a custom Supabase database URL and Anon Key for the CLI, saving them to `~/.awayinvault/config.json`.

```bash
npx tsx cli/index.ts init
```

### 2. Authentication (auth)

Logs you into your aiv account.

```bash
npx tsx cli/index.ts auth [options]
```

- **Options:**
  - -e, --email <email>: Login email address.
  - -p, --password <password>: Login account password.
  - --sso: Triggers GitHub OAuth single sign-on via local browser integration.

### 3. Status (status)

Displays your current authentication status, active user email, user ID, and last sign-in timestamp formatted inside a clean box-drawing layout.

```bash
npx tsx cli/index.ts status
```

### 4. List Logins (list)

Lists all logins stored in your vault.

```bash
npx tsx cli/index.ts list
```

### 5. Fetch & Decrypt Login (get)

Retrieves and decrypts a specific login by its title. You will be prompted to securely type your Master Password.

```bash
npx tsx cli/index.ts get <title> [options]
```

- **Options:**
  - -c, --copy: Safely copies the decrypted password to your clipboard and schedules it to be cleared automatically after 30 seconds. The password is not printed to the screen.

### 6. Create & Encrypt Login (add)

Adds a new encrypted login to your vault. If run without options, it prompts you interactively for each field, shows a recap of your input (masking the password), and asks for final confirmation before saving.

```bash
npx tsx cli/index.ts add [title] [options]
```

- **Options:**
  - -u, --username <username>: Username or email for the service.
  - -p, --password <password>: Password for the service.
  - -w, --website <website>: Website URL (optional).

### 7. Generate Password (generate)

Generates a random password.

```bash
npx tsx cli/index.ts generate [options]
```

- **Options:**
  - -l, --length <number>: Length of the generated password (default: 16).
  - --no-numbers: Generate without numbers.
  - --no-symbols: Generate without symbols.

### 8. Logout (logout)

Clears your local session data and logs out from Supabase.

```bash
npx tsx cli/index.ts logout
```

### 9. Ping (ping)

Tests connection and verifies CLI tool responsiveness.

```bash
npx tsx cli/index.ts ping
```

---

## Automation & Scripting

For non-interactive scripting, CI/CD pipelines, or automation scripts, you can bypass interactive prompts by using the following environment variables:

1. **AWAYINVAULT_MASTER_PASSWORD**: If set, the CLI skips the Master Password prompt and automatically uses this value to encrypt or decrypt secrets.
2. **AWAYINVAULT_SKIP_CONFIRM=true**: If set, the CLI bypasses the interactive recap confirmation prompt when running the add command.
3. **AWAYINVAULT_CLIPBOARD_TIMEOUT**: Set this to a custom value in seconds (e.g. 5 or 1) to override the default 30-second clipboard clearing duration (useful for automated testing).

### Example Scripting Usage:

```bash
# Add a password silently in one command
AWAYINVAULT_MASTER_PASSWORD="your-master-password" AWAYINVAULT_SKIP_CONFIRM="true" \
npx tsx cli/index.ts add "GitHub" -u "myuser" -p "securepass123" -w "github.com"
```
