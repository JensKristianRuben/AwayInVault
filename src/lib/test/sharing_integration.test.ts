import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import {
	deriveKey,
	encryptLocal,
	decryptLocal,
	generateSharingKeyPair,
	exportPublicKey,
	exportPrivateKey,
	importPublicKey,
	importPrivateKey,
	generateProjectKey,
	wrapProjectKey,
	unwrapProjectKey,
	importProjectKey,
	encryptData,
	generateSalt,
} from "../utils/crypto";

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const userAEmail = process.env.TEST_USER_A_EMAIL;
const userAPassword = process.env.TEST_USER_A_PASSWORD;
const userBEmail = process.env.TEST_USER_B_EMAIL;
const userBPassword = process.env.TEST_USER_B_PASSWORD;

describe("Team Sharing & Zero-Knowledge Key Wrapping Integration Test", () => {
	let clientA: any;
	let clientB: any;

	let userAId: string;
	let userBId: string;

	let userAMasterKey: CryptoKey;
	let userBMasterKey: CryptoKey;

	let teamId: string;
	let projectId: string;

	beforeAll(async () => {
		expect(supabaseUrl).toBeDefined();
		expect(supabaseAnonKey).toBeDefined();
		expect(userAEmail).toBeDefined();
		expect(userAPassword).toBeDefined();
		expect(userBEmail).toBeDefined();
		expect(userBPassword).toBeDefined();

		// 1. Initialize Supabase Clients for User A and User B
		clientA = createClient(supabaseUrl!, supabaseAnonKey!) as any;
		clientB = createClient(supabaseUrl!, supabaseAnonKey!) as any;

		// 2. Setup/Login User A
		const { data: authA, error: authErrorA } = await clientA.auth.signInWithPassword({
			email: userAEmail!,
			password: userAPassword!,
		});
		if (authErrorA) throw new Error(`Could not sign in User A: ${authErrorA.message}`);
		userAId = authA.user.id;

		userAMasterKey = await ensureUserMetadataAndDeriveKey(clientA, authA.user, userAPassword!);

		// 3. Setup/Login User B
		const { data: authB, error: authErrorB } = await clientB.auth.signInWithPassword({
			email: userBEmail!,
			password: userBPassword!,
		});
		if (authErrorB) throw new Error(`Could not sign in User B: ${authErrorB.message}`);
		userBId = authB.user.id;

		userBMasterKey = await ensureUserMetadataAndDeriveKey(clientB, authB.user, userBPassword!);

		// 4. Ensure both profiles have sharing keys (generate and upsert if missing)
		await ensureUserSharingKeys(clientA, userAId, userAEmail!, userAMasterKey);
		await ensureUserSharingKeys(clientB, userBId, userBEmail!, userBMasterKey);
	});

	afterAll(async () => {
		// Clean up created team (cascades to members, projects, keys, items)
		if (teamId) {
			await clientA.from("teams").delete().eq("id", teamId);
		}
	});

	async function ensureUserMetadataAndDeriveKey(
		client: any,
		user: any,
		password: string,
	): Promise<CryptoKey> {
		const meta = user.user_metadata;
		if (meta?.salt && meta?.verifier_ciphertext) {
			return await deriveKey(password, meta.salt);
		}

		// Salt and verifier are missing, let's create and upload them
		const salt = generateSalt();
		const key = await deriveKey(password, salt);
		const verifier = await encryptData(
			"vaulten-er-lukket-og-du-kan-ikke-komme-ind-uden-masterpassword",
			key,
		);

		const { error } = await client.auth.updateUser({
			data: {
				salt: salt,
				verifier_ciphertext: verifier.ciphertext,
				verifier_iv: verifier.iv,
			},
		});

		if (error) throw new Error(`Failed to update user metadata: ${error.message}`);
		return key;
	}

	async function ensureUserSharingKeys(
		client: any,
		userId: string,
		email: string,
		masterKey: CryptoKey,
	) {
		const { data: profile } = await client
			.from("profiles")
			.select("public_key, encrypted_private_key")
			.eq("id", userId)
			.maybeSingle();

		if (!profile?.public_key || !profile?.encrypted_private_key) {
			const keyPair = await generateSharingKeyPair();
			const pubKeyBase64 = await exportPublicKey(keyPair.publicKey);
			const privKeyBase64 = await exportPrivateKey(keyPair.privateKey);
			const encPrivKeyBase64 = await encryptLocal(privKeyBase64, masterKey);

			const { error } = await client.from("profiles").upsert({
				id: userId,
				email: email,
				public_key: pubKeyBase64,
				encrypted_private_key: encPrivKeyBase64,
			});
			if (error) throw new Error(`Failed to upsert profiles for ${email}: ${error.message}`);
		}
	}

	it("should perform zero-knowledge team creation, sharing key wrapping, and decryption across members", async () => {
		// 1. User A creates a team via RPC
		const teamName = `Integration Test Team - ${Date.now()}`;
		const { data: team, error: teamErr } = await clientA.rpc("create_team", {
			team_name: teamName,
		});
		expect(teamErr).toBeNull();
		expect(team).toBeDefined();
		if (!team) throw new Error("team is null");
		teamId = team.id;

		// Verify User A was added as owner in team_members
		const { data: memberA } = await clientA
			.from("team_members")
			.select("*")
			.eq("team_id", teamId)
			.eq("user_id", userAId)
			.single();
		expect(memberA).toBeDefined();
		if (!memberA) throw new Error("memberA is null");
		expect(memberA.role).toBe("owner");
		expect(memberA.status).toBe("active");

		// 2. User A adds User B directly to the team as a member
		const { error: memberBErr } = await clientA.from("team_members").insert({
			team_id: teamId,
			user_id: userBId,
			role: "member",
			status: "active",
		});
		expect(memberBErr).toBeNull();

		// 3. User A creates a shared project in the team
		const projectName = "Secrets Vault";
		const { data: project, error: projErr } = await clientA
			.from("shared_projects")
			.insert({
				team_id: teamId,
				name: projectName,
			})
			.select()
			.single();
		expect(projErr).toBeNull();
		expect(project).toBeDefined();
		if (!project) throw new Error("project is null");
		projectId = project.id;

		// 4. User A generates symmetric project key and wraps it for themselves
		const rawProjKeyBase64 = generateProjectKey();

		// Fetch User A's sharing public key
		const { data: profileA } = await clientA
			.from("profiles")
			.select("public_key")
			.eq("id", userAId)
			.single();
		expect(profileA).toBeDefined();
		if (!profileA) throw new Error("profileA is null");
		const pubKeyA = await importPublicKey(profileA.public_key);
		const wrappedKeyA = await wrapProjectKey(rawProjKeyBase64, pubKeyA);

		// Insert User A's project key row
		const { error: keyAErr } = await clientA.from("project_keys").insert({
			project_id: projectId,
			user_id: userAId,
			encrypted_key: wrappedKeyA,
		});
		expect(keyAErr).toBeNull();

		// 5. User A proactively wraps the project key for User B
		const { data: profileB } = await clientA
			.from("public_profiles")
			.select("public_key")
			.eq("id", userBId)
			.single();
		expect(profileB).toBeDefined();
		if (!profileB) throw new Error("profileB is null");
		expect(profileB.public_key).toBeDefined();

		const pubKeyB = await importPublicKey(profileB.public_key);
		const wrappedKeyB = await wrapProjectKey(rawProjKeyBase64, pubKeyB);

		// Insert User B's project key row (proactive wrapping)
		const { error: keyBErr } = await clientA.from("project_keys").insert({
			project_id: projectId,
			user_id: userBId,
			encrypted_key: wrappedKeyB,
		});
		expect(keyBErr).toBeNull();

		// 6. User A encrypts a credential with the project key and inserts it
		const rawTitle = "Database Password";
		const rawUsername = "root";
		const rawPassword = "ultra-secret-postgres-pass-2026";

		const projKeyObj = await importProjectKey(rawProjKeyBase64);
		const usernameEnc = await encryptLocal(rawUsername, projKeyObj);
		const passwordEnc = await encryptLocal(rawPassword, projKeyObj);

		const { data: vaultItem, error: itemErr } = await clientA
			.from("project_vault_items")
			.insert({
				project_id: projectId,
				title: rawTitle,
				username_encrypted: usernameEnc,
				password_encrypted: passwordEnc,
			})
			.select()
			.single();
		expect(itemErr).toBeNull();
		expect(vaultItem).toBeDefined();
		if (!vaultItem) throw new Error("vaultItem is null");

		// 7. User B fetches their wrapped project key and unwraps it locally
		const { data: keyRowB } = await clientB
			.from("project_keys")
			.select("encrypted_key")
			.eq("project_id", projectId)
			.eq("user_id", userBId)
			.single();
		expect(keyRowB).toBeDefined();
		if (!keyRowB) throw new Error("keyRowB is null");

		// Fetch User B's encrypted private key
		const { data: profileBDetails } = await clientB
			.from("profiles")
			.select("encrypted_private_key")
			.eq("id", userBId)
			.single();
		expect(profileBDetails).toBeDefined();
		if (!profileBDetails) throw new Error("profileBDetails is null");

		const decryptedPrivateB = await decryptLocal(
			profileBDetails.encrypted_private_key,
			userBMasterKey,
		);
		const privKeyBObj = await importPrivateKey(decryptedPrivateB);

		// Unwrap the project key
		const unwrappedProjKeyBBase64 = await unwrapProjectKey(keyRowB.encrypted_key, privKeyBObj);
		expect(unwrappedProjKeyBBase64).toBe(rawProjKeyBase64);

		// 8. User B loads the project vault item and decrypts it
		const { data: itemBRow } = await clientB
			.from("project_vault_items")
			.select("*")
			.eq("id", vaultItem.id)
			.single();
		expect(itemBRow).toBeDefined();
		if (!itemBRow) throw new Error("itemBRow is null");

		const projKeyBObj = await importProjectKey(unwrappedProjKeyBBase64);
		const decryptedUserB = await decryptLocal(itemBRow.username_encrypted, projKeyBObj);
		const decryptedPassB = await decryptLocal(itemBRow.password_encrypted, projKeyBObj);

		// Assertions: User B successfully decrypted User A's shared password!
		expect(decryptedUserB).toBe(rawUsername);
		expect(decryptedPassB).toBe(rawPassword);
	}, 20000);

	it("should verify that User B cannot decrypt passwords until User A distributes/upserts the project key", async () => {
		// 1. User A creates a team
		const teamName = `Distribute Test Team - ${Date.now()}`;
		const { data: team, error: teamErr } = await clientA.rpc("create_team", {
			team_name: teamName,
		});
		expect(teamErr).toBeNull();
		const testTeamId = team.id;

		// Cleanup tracker
		const cleanupNeeded = true;

		try {
			// 2. User A adds User B as a member
			const { error: memberBErr } = await clientA.from("team_members").insert({
				team_id: testTeamId,
				user_id: userBId,
				role: "member",
				status: "active",
			});
			expect(memberBErr).toBeNull();

			// 3. User A creates a shared project in the team
			const { data: project, error: projErr } = await clientA
				.from("shared_projects")
				.insert({
					team_id: testTeamId,
					name: "Delayed Sharing Project",
				})
				.select()
				.single();
			expect(projErr).toBeNull();
			const testProjId = project.id;

			// 4. User A generates symmetric project key and wraps it only for User A
			const rawProjKeyBase64 = generateProjectKey();
			const { data: profileA } = await clientA
				.from("profiles")
				.select("public_key")
				.eq("id", userAId)
				.single();
			const pubKeyA = await importPublicKey(profileA.public_key);
			const wrappedKeyA = await wrapProjectKey(rawProjKeyBase64, pubKeyA);

			// Insert User A's project key row (User B is NOT added!)
			const { error: keyAErr } = await clientA.from("project_keys").insert({
				project_id: testProjId,
				user_id: userAId,
				encrypted_key: wrappedKeyA,
			});
			expect(keyAErr).toBeNull();

			// 5. User A creates a password item in the project
			const rawTitle = "Secret DB Pass";
			const rawPassword = "my-secret-password-123";
			const projKeyObj = await importProjectKey(rawProjKeyBase64);
			const passwordEnc = await encryptLocal(rawPassword, projKeyObj);

			const { data: vaultItem, error: itemErr } = await clientA
				.from("project_vault_items")
				.insert({
					project_id: testProjId,
					title: rawTitle,
					password_encrypted: passwordEnc,
				})
				.select()
				.single();
			expect(itemErr).toBeNull();

			// 6. Verify User B CANNOT see any project key for this project
			const { data: keyRowBBefore, error: keyErrBBefore } = await clientB
				.from("project_keys")
				.select("encrypted_key")
				.eq("project_id", testProjId)
				.eq("user_id", userBId)
				.maybeSingle();
			expect(keyErrBBefore).toBeNull();
			expect(keyRowBBefore).toBeNull(); // No key row exists yet!

			// 7. User A now distributes/upserts the project key for User B
			const { data: profileB } = await clientA
				.from("public_profiles")
				.select("public_key")
				.eq("id", userBId)
				.single();
			const pubKeyB = await importPublicKey(profileB.public_key);
			const wrappedKeyB = await wrapProjectKey(rawProjKeyBase64, pubKeyB);

			// Perform upsert (mimicking the new upsert logic in "Distribute keys" button)
			const { error: upsertErr } = await clientA.from("project_keys").upsert(
				{
					project_id: testProjId,
					user_id: userBId,
					encrypted_key: wrappedKeyB,
				},
				{ onConflict: "project_id,user_id" },
			);
			expect(upsertErr).toBeNull();

			// 8. Verify User B CAN now fetch the project key and decrypt the password!
			const { data: keyRowBAfter } = await clientB
				.from("project_keys")
				.select("encrypted_key")
				.eq("project_id", testProjId)
				.eq("user_id", userBId)
				.single();
			expect(keyRowBAfter).toBeDefined();

			// Decrypt User B's sharing private key
			const { data: profileBDetails } = await clientB
				.from("profiles")
				.select("encrypted_private_key")
				.eq("id", userBId)
				.single();
			const decryptedPrivateB = await decryptLocal(
				profileBDetails.encrypted_private_key,
				userBMasterKey,
			);
			const privKeyBObj = await importPrivateKey(decryptedPrivateB);

			// Unwrap the project key using User B's private key
			const unwrappedProjKeyBBase64 = await unwrapProjectKey(
				keyRowBAfter.encrypted_key,
				privKeyBObj,
			);
			expect(unwrappedProjKeyBBase64).toBe(rawProjKeyBase64);

			// Load the vault item and decrypt
			const { data: itemBRow } = await clientB
				.from("project_vault_items")
				.select("*")
				.eq("id", vaultItem.id)
				.single();

			const projKeyBObj = await importProjectKey(unwrappedProjKeyBBase64);
			const decryptedPassB = await decryptLocal(itemBRow.password_encrypted, projKeyBObj);
			expect(decryptedPassB).toBe(rawPassword);
		} finally {
			if (cleanupNeeded) {
				await clientA.from("teams").delete().eq("id", testTeamId);
			}
		}
	}, 20000);
});
