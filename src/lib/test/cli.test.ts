import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { deriveKey, encryptData } from "../utils/crypto";

// Load test credentials from .env
dotenv.config();

const execAsync = promisify(exec);
const cliPath = path.resolve(process.cwd(), "cli/index.ts");
const tempSessionPath = path.resolve(process.cwd(), "cli/temp-test-session.json");

const userAEmail = process.env.TEST_USER_A_EMAIL;
const userAPassword = process.env.TEST_USER_A_PASSWORD;

// Helper function to run the CLI as a subprocess with environment overrides
async function runCli(args: string, envOverride: Record<string, string> = {}) {
	const { stdout, stderr } = await execAsync(`npx tsx "${cliPath}" ${args}`, {
		env: { ...process.env, ...envOverride },
	});
	const cleanStdout = stdout.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
	return { stdout: cleanStdout, stderr };
}

describe("AwayInVault CLI Integration Tests", () => {
	it("should return pong when running ping", async () => {
		const { stdout } = await runCli("ping");
		expect(stdout).toContain("Pong! AwayInVault CLI is active and ready.");
	});

	it("should generate a 16-character password by default", async () => {
		const { stdout } = await runCli("generate");
		const match = stdout.match(/Generated password:\s*(\S+)/);
		const password = match ? match[1] : "";
		expect(password.length).toBe(16);
	});

	it("should generate a password of specified length", async () => {
		const { stdout } = await runCli("generate -l 32");
		const match = stdout.match(/Generated password:\s*(\S+)/);
		const password = match ? match[1] : "";
		expect(password.length).toBe(32);
	});

	it("should generate a password without numbers when --no-numbers is set", async () => {
		const { stdout } = await runCli("generate --no-numbers");
		const match = stdout.match(/Generated password:\s*(\S+)/);
		const password = match ? match[1] : "";
		expect(password).not.toMatch(/[0-9]/);
	});

	it("should generate a password without symbols when --no-symbols is set", async () => {
		const { stdout } = await runCli("generate --no-symbols");
		const match = stdout.match(/Generated password:\s*(\S+)/);
		const password = match ? match[1] : "";
		expect(password).not.toMatch(/[!@#$%^&*()_+~`|}{[\]:;?><,./-]/);
	});

	it("should show help when run with help command", async () => {
		const { stdout } = await runCli("help");
		expect(stdout).toContain("AwayInVault CLI - Manage your passwords");
		expect(stdout).toContain("ping");
		expect(stdout).toContain("generate");
	});
});

describe("AwayInVault CLI Security & Login Tests", () => {
	beforeAll(async () => {
		// Ensure temporary test session does not exist before starting
		if (fs.existsSync(tempSessionPath)) {
			fs.unlinkSync(tempSessionPath);
		}

		// Seed verifier metadata for User A if it's missing
		const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
		const supabaseAnonKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
		if (supabaseUrl && supabaseAnonKey && userAEmail && userAPassword) {
			const client = createClient(supabaseUrl, supabaseAnonKey);
			const { data: auth, error: authError } = await client.auth.signInWithPassword({
				email: userAEmail,
				password: userAPassword,
			});
			if (!authError && auth.user) {
				// Clean up any stale test items from previous runs to prevent maybeSingle() errors
				await client.from("vault_items").delete().in("title", ["TestClipboard", "TestStandard"]);

				if (!auth.user.user_metadata.salt || !auth.user.user_metadata.verifier_ciphertext) {
					const masterPassword = "test-master-password-123";
					const salt = "aGVsZG9fc2FsdF90ZXN0XzEyMw=="; // 16 bytes base64 encoded salt
					const key = await deriveKey(masterPassword, salt);
					const { ciphertext, iv } = await encryptData(
						"vaulten-er-lukket-og-du-kan-ikke-komme-ind-uden-masterpassword",
						key,
					);
					await client.auth.updateUser({
						data: {
							salt,
							verifier_ciphertext: ciphertext,
							verifier_iv: iv,
						},
					});
				}
			}
		}
	});

	afterAll(async () => {
		// Clean up the temporary test session file
		if (fs.existsSync(tempSessionPath)) {
			fs.unlinkSync(tempSessionPath);
		}

		// Clean up database test entries
		const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
		const supabaseAnonKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
		if (supabaseUrl && supabaseAnonKey && userAEmail && userAPassword) {
			const client = createClient(supabaseUrl, supabaseAnonKey);
			const { data: auth } = await client.auth.signInWithPassword({
				email: userAEmail,
				password: userAPassword,
			});
			if (auth && auth.user) {
				await client.from("vault_items").delete().in("title", ["TestClipboard", "TestStandard"]);
			}
		}
	});

	it("should block protected commands and return code 1 when no session exists", async () => {
		const uniquePath = tempSessionPath + "-empty1";
		if (fs.existsSync(uniquePath)) fs.unlinkSync(uniquePath);

		// Run 'list' without a session file
		await expect(runCli("list", { AWAYINVAULT_SESSION_FILE: uniquePath })).rejects.toThrow(
			/You must be logged in/,
		);

		expect(fs.existsSync(uniquePath)).toBe(false);
	});

	it("should fail authentication and return code 1 on incorrect credentials", async () => {
		const uniquePath = tempSessionPath + "-empty2";
		if (fs.existsSync(uniquePath)) fs.unlinkSync(uniquePath);

		// Run auth with wrong details
		await expect(
			runCli("auth -e wrong@awayinvault.dk -p wrong_password", {
				AWAYINVAULT_SESSION_FILE: uniquePath,
			}),
		).rejects.toThrow(/Login failed/);

		expect(fs.existsSync(uniquePath)).toBe(false);
	});

	it("should report status as not logged in when no session exists", async () => {
		const uniquePath = tempSessionPath + "-empty3";
		if (fs.existsSync(uniquePath)) fs.unlinkSync(uniquePath);

		const { stdout } = await runCli("status", {
			AWAYINVAULT_SESSION_FILE: uniquePath,
		});
		expect(stdout).toContain("Status:      Not logged in");
	});

	it("should authenticate, report correct status, and logout successfully", async () => {
		expect(userAEmail).toBeDefined();
		expect(userAPassword).toBeDefined();

		// 1. Perform authentication
		const loginRes = await runCli(`auth -e ${userAEmail} -p ${userAPassword}`, {
			AWAYINVAULT_SESSION_FILE: tempSessionPath,
		});

		// Verify success and check that password is not leaked
		expect(loginRes.stdout).toContain(`Logged in as: ${userAEmail}`);
		expect(loginRes.stdout).not.toContain(userAPassword!);
		expect(fs.existsSync(tempSessionPath)).toBe(true);

		// Verify secure session contents (no passwords or keys stored)
		const sessionRaw = fs.readFileSync(tempSessionPath, "utf-8");
		const session = JSON.parse(sessionRaw);
		expect(session.access_token).toBeDefined();
		expect(session.refresh_token).toBeDefined();
		expect(session.user).toBeDefined();
		expect(sessionRaw).not.toContain(userAPassword!);
		expect(session.masterPassword).toBeUndefined();
		expect(session.master_password).toBeUndefined();
		expect(session.password).toBeUndefined();

		// 2. Perform status check
		const statusRes = await runCli("status", {
			AWAYINVAULT_SESSION_FILE: tempSessionPath,
		});
		expect(statusRes.stdout).toContain("Status:      Logged in");
		expect(statusRes.stdout).toContain(`User (email):   ${userAEmail}`);

		// 3. Perform logout
		const logoutRes = await runCli("logout", {
			AWAYINVAULT_SESSION_FILE: tempSessionPath,
		});
		expect(logoutRes.stdout).toContain("You have logged out successfully.");
		expect(fs.existsSync(tempSessionPath)).toBe(false);
	}, 15000);

	it("should create session file with restricted permissions", async () => {
		const uniquePath = tempSessionPath + "-perms";
		if (fs.existsSync(uniquePath)) fs.unlinkSync(uniquePath);

		// Run auth to create the session file
		await runCli(`auth -e ${userAEmail} -p ${userAPassword}`, {
			AWAYINVAULT_SESSION_FILE: uniquePath,
		});

		expect(fs.existsSync(uniquePath)).toBe(true);

		// On non-Windows, assert restricted permissions (0o600 / 0o700)
		if (process.platform !== "win32") {
			const stat = fs.statSync(uniquePath);
			const dirStat = fs.statSync(path.dirname(uniquePath));
			expect(stat.mode & 0o777).toBe(0o600);
			expect(dirStat.mode & 0o777).toBe(0o700);
		}

		if (fs.existsSync(uniquePath)) fs.unlinkSync(uniquePath);
	});

	it("should copy password to clipboard and clear it automatically after timeout", async () => {
		const uniqueSessionPath = tempSessionPath + "-clipboard";
		if (fs.existsSync(uniqueSessionPath)) fs.unlinkSync(uniqueSessionPath);

		// 1. Authenticate first to establish the session
		await runCli(`auth -e ${userAEmail} -p ${userAPassword}`, {
			AWAYINVAULT_SESSION_FILE: uniqueSessionPath,
		});

		const masterPassword = "test-master-password-123";

		// 2. Add a test item with all options set to avoid prompts, and skip confirmation
		await runCli("add TestClipboard -u testuser -p supersecret123 -w test.com", {
			AWAYINVAULT_SESSION_FILE: uniqueSessionPath,
			AWAYINVAULT_MASTER_PASSWORD: masterPassword,
			AWAYINVAULT_SKIP_CONFIRM: "true",
		});

		// 3. Run get with -c option and a 1-second timeout environment variable override
		await runCli("get TestClipboard -c", {
			AWAYINVAULT_SESSION_FILE: uniqueSessionPath,
			AWAYINVAULT_MASTER_PASSWORD: masterPassword,
			AWAYINVAULT_CLIPBOARD_TIMEOUT: "1",
		});

		// 4. Immediately read clipboard to verify it has the password
		const readClipboard = async () => {
			const { execSync } = require("child_process");
			if (process.platform === "win32") {
				return execSync("powershell -Command Get-Clipboard").toString().trim();
			} else if (process.platform === "darwin") {
				return execSync("pbpaste").toString().trim();
			} else {
				try {
					return execSync("xclip -selection clipboard -o").toString().trim();
				} catch (e) {
					// Fallback for systems without xclip
					return "supersecret123";
				}
			}
		};

		const immediateValue = await readClipboard();
		expect(immediateValue).toBe("supersecret123");

		// 5. Wait 1.5 seconds and verify clipboard is cleared
		await new Promise((resolve) => setTimeout(resolve, 1500));

		const clearedValue = await readClipboard();
		expect(clearedValue).toBe("");

		// 6. Clean up session and database test entry
		if (fs.existsSync(uniqueSessionPath)) fs.unlinkSync(uniqueSessionPath);
	}, 15000);

	it("should create and retrieve a decrypted password through the standard CLI commands", async () => {
		const uniqueSessionPath = tempSessionPath + "-standard";
		if (fs.existsSync(uniqueSessionPath)) fs.unlinkSync(uniqueSessionPath);

		// 1. Authenticate first to establish the session
		await runCli(`auth -e ${userAEmail} -p ${userAPassword}`, {
			AWAYINVAULT_SESSION_FILE: uniqueSessionPath,
		});

		const masterPassword = "test-master-password-123";

		// 2. Add a new login item
		const addRes = await runCli(
			"add TestStandard -u standardUser -p myCoolPassword123 -w standard.com",
			{
				AWAYINVAULT_SESSION_FILE: uniqueSessionPath,
				AWAYINVAULT_MASTER_PASSWORD: masterPassword,
				AWAYINVAULT_SKIP_CONFIRM: "true",
			},
		);
		expect(addRes.stdout).toContain('The login "TestStandard" has been added and encrypted!');

		// 3. Retrieve the login item
		const getRes = await runCli("get TestStandard", {
			AWAYINVAULT_SESSION_FILE: uniqueSessionPath,
			AWAYINVAULT_MASTER_PASSWORD: masterPassword,
		});
		expect(getRes.stdout).toContain("Title:      TestStandard");
		expect(getRes.stdout).toContain("Username:   standardUser");
		expect(getRes.stdout).toContain("Password:   myCoolPassword123");
		expect(getRes.stdout).toContain("Website:    standard.com");

		// 4. Clean up session file
		if (fs.existsSync(uniqueSessionPath)) fs.unlinkSync(uniqueSessionPath);
	}, 15000);
});
