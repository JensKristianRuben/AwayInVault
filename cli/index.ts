#!/usr/bin/env node

import { Command } from "commander";
import prompts from "prompts";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import http from "http";
import { exec, spawn } from "child_process";

// Create ESM-compatible paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let projectRoot = path.resolve(__dirname, "..");
if (
	!fs.existsSync(path.join(projectRoot, ".env")) &&
	fs.existsSync(path.resolve(__dirname, "../..", ".env"))
) {
	projectRoot = path.resolve(__dirname, "../..");
}

// Load .env from project root
dotenv.config({ path: path.join(projectRoot, ".env") });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	console.error(
		"❌ Error: Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY in your .env file.",
	);
	process.exit(1);
}

// Reuse existing crypto logic
import { verifyMasterPassword, encryptLocal, decryptLocal } from "../src/lib/utils/crypto.js";

// Session cache configurations
const SESSION_DIR = path.join(os.homedir(), ".awayinvault");
const SESSION_FILE = process.env.AWAYINVAULT_SESSION_FILE || path.join(SESSION_DIR, "session.json");

function saveSession(session: any) {
	const dir = path.dirname(SESSION_FILE);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
		if (process.platform !== "win32") {
			try {
				fs.chmodSync(dir, 0o700);
			} catch {}
		}
	}
	fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), {
		mode: 0o600,
		encoding: "utf-8",
	});
}

function loadSession() {
	if (fs.existsSync(SESSION_FILE)) {
		try {
			return JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
		} catch {
			return null;
		}
	}
	return null;
}

function clearSession() {
	if (fs.existsSync(SESSION_FILE)) {
		fs.unlinkSync(SESSION_FILE);
	}
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
	auth: {
		persistSession: false,
		autoRefreshToken: false,
	},
});

// Listen to auth changes (save session on updates or sign out)
supabase.auth.onAuthStateChange((event, session) => {
	if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
		if (session) saveSession(session);
	} else if (event === "SIGNED_OUT") {
		clearSession();
	}
});

// Helper function to restore and validate session
async function requireAuth() {
	const session = loadSession();
	if (!session) {
		console.error("❌ Error: You must be logged in to perform this action.");
		process.exit(1);
	}

	const { data, error } = await supabase.auth.setSession({
		access_token: session.access_token,
		refresh_token: session.refresh_token,
	});

	if (error || !data.user) {
		console.error("❌ Error: Your session is expired or invalid. Please log in again.");
		clearSession();
		process.exit(1);
	}

	return data.user;
}

// Password Generator helper
function generatePassword(length = 16, includeNumbers = true, includeSymbols = true): string {
	let charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	if (includeNumbers) charset += "0123456789";
	if (includeSymbols) charset += "!@#$%^&*()_+~`|}{[]:;?><,./-=";

	let password = "";
	const randomValues = new Uint32Array(length);
	crypto.getRandomValues(randomValues);
	for (let i = 0; i < length; i++) {
		password += charset[randomValues[i] % charset.length];
	}
	return password;
}

// Clipboard Helper
function copyToClipboard(text: string): Promise<void> {
	return new Promise((resolve, reject) => {
		let command = "";
		let args: string[] = [];

		if (process.platform === "win32") {
			command = "clip";
		} else if (process.platform === "darwin") {
			command = "pbcopy";
		} else {
			// Linux/WSL fallback
			command = "xclip";
			args = ["-selection", "clipboard"];
		}

		const proc = spawn(command, args);

		proc.on("error", (err) => {
			reject(err);
		});

		proc.stdin.write(text);
		proc.stdin.end();

		proc.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Clipboard process exited with code ${code}`));
			}
		});
	});
}

// Clipboard Clearer Helper (Detached Background Process)
function spawnClipboardClearer(seconds: number = 30) {
	const timeoutSeconds = process.env.AWAYINVAULT_CLIPBOARD_TIMEOUT
		? parseInt(process.env.AWAYINVAULT_CLIPBOARD_TIMEOUT, 10)
		: seconds;

	const cmd =
		process.platform === "win32" ? "clip" : process.platform === "darwin" ? "pbcopy" : "xclip";
	const args =
		process.platform !== "win32" && process.platform !== "darwin"
			? ["-selection", "clipboard"]
			: [];

	// Inline JS code to execute in background node process
	const jsCode = `
		setTimeout(() => {
			const proc = require('child_process').spawn('${cmd}', ${JSON.stringify(args)});
			proc.stdin.write('');
			proc.stdin.end();
		}, ${timeoutSeconds * 1000});
	`;

	const child = spawn(process.execPath, ["-e", jsCode], {
		detached: true,
		stdio: "ignore",
	});
	child.unref();
}

// Box-drawing Helper
function drawBox(title: string, lines: string[]): string {
	const cleanLines = lines.map((line) => line.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, ""));
	const maxLineLength = Math.max(...cleanLines.map((line) => line.length));
	const width = Math.max(50, maxLineLength + 4);

	const titleStr = ` ${title} `;
	const titlePadding = 3;
	const leftBorder = "┌" + "─".repeat(titlePadding) + titleStr;
	const rightBorderLength = Math.max(0, width - leftBorder.length - 1);
	const top = leftBorder + "─".repeat(rightBorderLength) + "┐";

	const body = lines
		.map((line) => {
			const cleanLine = line.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
			const padLength = Math.max(0, width - 4 - cleanLine.length);
			return `│ ${line}${" ".repeat(padLength)} │`;
		})
		.join("\n");

	const bottom = "└" + "─".repeat(width - 2) + "┘";

	return `${top}\n${body}\n${bottom}`;
}

// Define Commander Program
const program = new Command();

program
	.name("awayinvault")
	.description("AwayInVault CLI - Manage your passwords directly from the terminal")
	.version("1.0.0");

// 1. ping
program
	.command("ping")
	.description("Check if the CLI connection is active")
	.action(() => {
		console.log("Pong! AwayInVault CLI is active and ready. 🚀");
	});

// 2. generate
program
	.command("generate")
	.description("Generate a strong random password")
	.option("-l, --length <number>", "Length of the password", "16")
	.option("--no-numbers", "Exclude numbers")
	.option("--no-symbols", "Exclude symbols")
	.action((options) => {
		const length = parseInt(options.length, 10);
		if (isNaN(length) || length < 4) {
			console.error("❌ Error: Password length must be a number of at least 4.");
			process.exit(1);
		}
		const password = generatePassword(length, options.numbers !== false, options.symbols !== false);
		console.log(`\n🔑 Generated password: \x1b[32m${password}\x1b[0m\n`);
	});

// 3. auth
program
	.command("auth")
	.description("Log in to your AwayInVault Supabase account")
	.option("-e, --email <email>", "Your email address")
	.option("-p, --password <password>", "Your password")
	.option("--sso", "Log in with GitHub / SSO via your browser")
	.action(async (options) => {
		if (options.sso) {
			const port = 54321;
			const server = http.createServer((req, res) => {
				const urlObj = new URL(req.url || "", `http://localhost:${port}`);
				if (urlObj.pathname === "/callback") {
					const accessToken = urlObj.searchParams.get("access_token");
					const refreshToken = urlObj.searchParams.get("refresh_token");
					const expiresAt = urlObj.searchParams.get("expires_at");

					if (accessToken && refreshToken) {
						saveSession({
							access_token: accessToken,
							refresh_token: refreshToken,
							expires_at: expiresAt ? parseInt(expiresAt, 10) : undefined,
						});

						res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
						res.end(`
							<html>
								<body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #0d0e12; color: #fff;">
									<div style="border: 1px solid #10b981; padding: 2rem; border-radius: 8px; background-color: #151821; text-align: center; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.15);">
										<h1 style="color: #10b981; margin-top: 0;">Login Complete!</h1>
										<p>You have successfully logged in to the AwayInVault CLI via your browser.</p>
										<p style="color: #888;">You can close this window now.</p>
									</div>
								</body>
							</html>
						`);

						console.log("\n✅ Received login token from browser.");
						server.close();
						process.exit(0);
					} else {
						res.writeHead(400, { "Content-Type": "text/plain" });
						res.end("Missing tokens");
					}
				} else {
					res.writeHead(404, { "Content-Type": "text/plain" });
					res.end("Not Found");
				}
			});

			server.listen(port, () => {
				console.log(`\n🌐 Starting local server at http://localhost:${port}...`);
				console.log("Opening browser to authorize via your AwayInVault instance...");

				const loginUrl = `http://localhost:5173/cli-login?port=${port}`;
				let cmd = "";
				if (process.platform === "win32") {
					cmd = `start "" "${loginUrl}"`;
				} else if (process.platform === "darwin") {
					cmd = `open "${loginUrl}"`;
				} else {
					cmd = `xdg-open "${loginUrl}"`;
				}

				exec(cmd, (err) => {
					if (err) {
						console.log(
							`Could not open the browser automatically. Please navigate to: ${loginUrl}`,
						);
					}
				});
			});
			return;
		}

		let email = options.email;
		let password = options.password;

		// Prompt if email is missing
		if (!email) {
			const res = await prompts({
				type: "text",
				name: "email",
				message: "Enter your email:",
				validate: (val) => (val.includes("@") ? true : "Invalid email address"),
			});
			email = res.email;
		}

		// Prompt if password is missing
		if (!password && email) {
			const res = await prompts({
				type: "password",
				name: "password",
				message: "Enter your password:",
			});
			password = res.password;
		}

		if (!email || !password) {
			console.log("Login cancelled.");
			process.exit(0);
		}

		console.log("Logging in...");
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			console.error("❌ Login failed:", error.message);
			process.exit(1);
		}

		console.log(`✅ Logged in as: \x1b[36m${data.user?.email}\x1b[0m`);
	});

// 4. logout
program
	.command("logout")
	.description("Log out of your account and clear local session")
	.action(async () => {
		await supabase.auth.signOut();
		console.log("✅ You have logged out successfully.");
	});

// 5. list
program
	.command("list")
	.description("List all saved logins in your vault (encrypted)")
	.action(async () => {
		await requireAuth();

		console.log("Fetching your saved logins...");
		const { data, error } = await supabase
			.from("vault_items")
			.select("id, title, website, created_at")
			.order("title", { ascending: true });

		if (error) {
			console.error("❌ Error fetching logins:", error.message);
			process.exit(1);
		}

		if (!data || data.length === 0) {
			console.log("Your vault is empty. Use the 'add' command to add a login.");
			return;
		}

		console.log("\n=== Your Saved Logins ===");
		data.forEach((item, index) => {
			const num = index + 1;
			const site = item.website ? `(${item.website})` : "";
			console.log(`[${num}] \x1b[36m${item.title}\x1b[0m ${site}`);
		});
		console.log(`\n(Use 'get <title>' to view and decrypt a specific login)\n`);
	});

// 6. get
program
	.command("get")
	.description("Fetch and decrypt a login by title")
	.argument("<title>", "The title of the login (e.g. Google, Facebook)")
	.option("-c, --copy", "Copy the password to the clipboard instead of printing it")
	.action(async (title, options) => {
		const user = await requireAuth();

		// Find item
		const { data, error } = await supabase
			.from("vault_items")
			.select("*")
			.eq("title", title)
			.maybeSingle();

		if (error) {
			console.error("❌ Database error:", error.message);
			process.exit(1);
		}

		if (!data) {
			console.error(`❌ Error: Could not find any login with title "${title}".`);
			process.exit(1);
		}

		// Prompt for master password if not provided
		let masterPassword = process.env.AWAYINVAULT_MASTER_PASSWORD;
		if (!masterPassword) {
			const res = await prompts({
				type: "password",
				name: "masterPassword",
				message: "Enter your Master Password:",
			});
			masterPassword = res.masterPassword;
		}

		if (!masterPassword) {
			console.log("Cancelled.");
			process.exit(0);
		}

		console.log("Verifying Master Password...");
		const key = await verifyMasterPassword(masterPassword, user.user_metadata);
		if (!key) {
			console.error("❌ Error: Incorrect Master Password.");
			process.exit(1);
		}

		console.log("Decrypting...");
		try {
			const username = data.username_encrypted
				? await decryptLocal(data.username_encrypted, key)
				: "(no username)";
			const password = await decryptLocal(data.password_encrypted, key);

			if (options.copy) {
				await copyToClipboard(password);
				spawnClipboardClearer(30);
				console.log("\n==================================");
				console.log(`Title:      \x1b[36m${data.title}\x1b[0m`);
				if (data.website) console.log(`Website:    ${data.website}`);
				console.log(`Username:   \x1b[32m${username}\x1b[0m`);
				console.log(
					"Password:   \x1b[32m[COPIED TO CLIPBOARD] (will clear in 30 seconds) 📋\x1b[0m",
				);
				console.log("==================================\n");
			} else {
				console.log("\n==================================");
				console.log(`Title:      \x1b[36m${data.title}\x1b[0m`);
				if (data.website) console.log(`Website:    ${data.website}`);
				console.log(`Username:   \x1b[32m${username}\x1b[0m`);
				console.log(`Password:   \x1b[32m${password}\x1b[0m`);
				console.log("==================================\n");
			}
		} catch (err: any) {
			console.error("❌ Decryption failed:", err.message || err);
			process.exit(1);
		}
	});

// 7. add
program
	.command("add")
	.description("Create and encrypt a new login in your vault")
	.argument("[title]", "Title of the new login (e.g. Netflix)")
	.option("-u, --username <username>", "Username or email")
	.option("-p, --password <password>", "Password for the service")
	.option("-w, --website <website>", "Website URL")
	.action(async (titleArg, options) => {
		const user = await requireAuth();

		let title = titleArg;
		let username = options.username;
		let password = options.password;
		let website = options.website;

		// 1. Prompt for title if missing
		if (!title) {
			const res = await prompts({
				type: "text",
				name: "title",
				message: "Enter the title for this login (e.g. Netflix, Google):",
				validate: (val) => (val.trim() ? true : "Title cannot be empty"),
			});
			title = res.title;
		}

		if (!title) {
			console.log("Cancelled.");
			process.exit(0);
		}

		// 2. Prompt for username if missing
		if (username === undefined) {
			const res = await prompts({
				type: "text",
				name: "username",
				message: "Enter username / email (optional):",
			});
			username = res.username;
		}

		// 3. Prompt for website if missing
		if (website === undefined) {
			const res = await prompts({
				type: "text",
				name: "website",
				message: "Enter website URL (optional):",
			});
			website = res.website;
		}

		// 4. Prompt for password if missing
		if (!password) {
			const res = await prompts({
				type: "password",
				name: "password",
				message: "Enter password:",
			});
			password = res.password;
		}

		if (username === undefined || !password) {
			console.log("Cancelled.");
			process.exit(0);
		}

		// 5. Prompt for Master Password if missing
		let masterPassword = process.env.AWAYINVAULT_MASTER_PASSWORD;
		if (!masterPassword) {
			const res = await prompts({
				type: "password",
				name: "masterPassword",
				message: "Enter your Master Password (to encrypt this login):",
			});
			masterPassword = res.masterPassword;
		}

		if (!masterPassword) {
			console.log("Cancelled.");
			process.exit(0);
		}

		// 6. Recap and Confirm step
		const recapLines = [
			`Title:    \x1b[36m${title.trim()}\x1b[0m`,
			`Username: \x1b[32m${username.trim() || "(empty)"}\x1b[0m`,
		];
		if (website && website.trim()) {
			recapLines.push(`Website:  ${website.trim()}`);
		}
		recapLines.push(`Password: \x1b[33m********\x1b[0m (hidden for security)`);

		console.log("\n" + drawBox("RECAP: ADD NEW LOGIN", recapLines) + "\n");

		let confirmValue = true;
		if (process.env.AWAYINVAULT_SKIP_CONFIRM !== "true") {
			const confirmRes = await prompts({
				type: "confirm",
				name: "value",
				message: "Do you want to encrypt and save this login?",
				initial: true,
			});
			confirmValue = confirmRes.value;
		}

		if (!confirmValue) {
			console.log("Cancelled.");
			process.exit(0);
		}

		console.log("Verifying Master Password...");
		const key = await verifyMasterPassword(masterPassword, user.user_metadata);
		if (!key) {
			console.error("❌ Error: Incorrect Master Password.");
			process.exit(1);
		}

		console.log("Encrypting data...");
		const usernameEncrypted = username.trim() ? await encryptLocal(username.trim(), key) : null;
		const passwordEncrypted = await encryptLocal(password, key);

		console.log("Saving to database...");
		const { error } = await supabase.from("vault_items").insert({
			user_id: user.id,
			title: title.trim(),
			website: website ? website.trim() : null,
			username_encrypted: usernameEncrypted,
			password_encrypted: passwordEncrypted,
		});

		if (error) {
			console.error("❌ Error creating login:", error.message);
			process.exit(1);
		}

		console.log(`\n✅ The login "${title.trim()}" has been added and encrypted!\n`);
	});

// 8. status
program
	.command("status")
	.description("Show current login status and user details")
	.action(async () => {
		const session = loadSession();
		if (!session) {
			const statusLines = [`Status:      \x1b[31mNot logged in\x1b[0m`];
			console.log("\n" + drawBox("AUTH STATUS", statusLines) + "\n");
			console.log("Run 'npx tsx cli/index.ts auth' to log in.\n");
			return;
		}

		console.log("Validating your session with Supabase...");
		const { data, error } = await supabase.auth.setSession({
			access_token: session.access_token,
			refresh_token: session.refresh_token,
		});

		if (error || !data.user) {
			const statusLines = [`Status:      \x1b[31mInvalid or expired session\x1b[0m`];
			console.log("\n" + drawBox("AUTH STATUS", statusLines) + "\n");
			console.log("Please log in again using 'npx tsx cli/index.ts auth'.\n");
			clearSession();
			return;
		}

		const user = data.user;
		const statusLines = [
			`Status:      \x1b[32mLogged in\x1b[0m`,
			`User (email):   \x1b[36m${user.email}\x1b[0m`,
			`User ID:        ${user.id}`,
		];
		if (user.last_sign_in_at) {
			statusLines.push(`Last sign-in:   ${new Date(user.last_sign_in_at).toLocaleString("en-US")}`);
		}

		console.log("\n" + drawBox("AUTH STATUS", statusLines) + "\n");
	});

program.parse(process.argv);
