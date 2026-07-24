import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { deleteOwnAccount } from "../utils/accountDeletion";

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// The throwaway account this suite operates on. It deletes the account outright, so it
// cannot use the shared A/B fixtures that db.test.ts and sharing_integration.test.ts
// depend on. Every case re-creates the account from these fixed credentials rather than
// assuming the previous run left it behind.
const throwawayEmail = process.env.TEST_THROWAWAY_EMAIL;
const throwawayPassword = process.env.TEST_THROWAWAY_PASSWORD;

// User B is borrowed as "some other person" for the team-ownership guard. It is never
// deleted -- only added to, and removed from, a throwaway team.
const userBEmail = process.env.TEST_USER_B_EMAIL;
const userBPassword = process.env.TEST_USER_B_PASSWORD;

// Test-only credential. It exists purely so admin.createUser can mint the throwaway
// account with email_confirm: true, which keeps this suite fully automatic while the
// project keeps email confirmation switched on for real users. It bypasses all RLS, so
// it must never be imported outside test files, and must never gain a PUBLIC_ prefix --
// that would bundle it into client JS.
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

// Never used to exercise the behaviour under test: the deletion itself always goes
// through the ordinary user-scoped client, so the RPC's own auth.uid() checks and the
// RLS it has to survive are genuinely covered.
function adminClient(): SupabaseClient {
	return createClient(supabaseUrl!, supabaseSecretKey!, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}

async function findThrowawayUserId(admin: SupabaseClient): Promise<string | null> {
	const { data, error } = await admin.auth.admin.listUsers();
	if (error) throw new Error(`Could not list users: ${error.message}`);
	return data.users.find((u) => u.email === throwawayEmail)?.id ?? null;
}

// Mints the throwaway account pre-confirmed and returns a normal anon-key session for it.
// Deletes any leftover from a run that died midway first, so each case starts from a
// clean account with no stale teams or vault items.
async function createThrowawayUser(): Promise<{ client: SupabaseClient; id: string }> {
	const admin = adminClient();

	const leftoverId = await findThrowawayUserId(admin);
	if (leftoverId) await admin.auth.admin.deleteUser(leftoverId);

	const { error: createError } = await admin.auth.admin.createUser({
		email: throwawayEmail!,
		password: throwawayPassword!,
		email_confirm: true,
	});
	if (createError) {
		throw new Error(`Could not create the throwaway account: ${createError.message}`);
	}

	const client = createClient(supabaseUrl!, supabaseAnonKey!);
	const { data, error } = await client.auth.signInWithPassword({
		email: throwawayEmail!,
		password: throwawayPassword!,
	});
	if (error) throw new Error(`Could not sign in the throwaway account: ${error.message}`);
	return { client, id: data.user.id };
}

async function signInUserB(): Promise<{ client: SupabaseClient; id: string }> {
	const client = createClient(supabaseUrl!, supabaseAnonKey!);
	const { data, error } = await client.auth.signInWithPassword({
		email: userBEmail!,
		password: userBPassword!,
	});
	if (error) throw new Error(`Could not sign in User B: ${error.message}`);
	return { client, id: data.user.id };
}

describe("delete_own_account RPC integration test", () => {
	let throwaway: { client: SupabaseClient; id: string };

	beforeAll(() => {
		expect(supabaseUrl).toBeDefined();
		expect(supabaseAnonKey).toBeDefined();
		expect(throwawayEmail).toBeDefined();
		expect(throwawayPassword).toBeDefined();
		expect(userBEmail).toBeDefined();
		expect(userBPassword).toBeDefined();
		expect(
			supabaseSecretKey,
			"SUPABASE_SECRET_KEY is required to create the pre-confirmed throwaway account",
		).toBeDefined();
	});

	// Removes a throwaway account that survived a failing case, so its teams and vault
	// items cannot leak into the next run.
	afterEach(async () => {
		try {
			const admin = adminClient();
			const leftoverId = await findThrowawayUserId(admin);
			if (leftoverId) await admin.auth.admin.deleteUser(leftoverId);
		} catch {
			// Best effort; createThrowawayUser clears leftovers again before the next case.
		}
	});

	it("permanently deletes the account and its vault data", async () => {
		throwaway = await createThrowawayUser();

		const { error: insertError } = await throwaway.client.from("vault_items").insert({
			user_id: throwaway.id,
			title: "Item to be erased",
			password_encrypted: "ciphertext-placeholder",
		});
		expect(insertError).toBeNull();

		await expect(deleteOwnAccount(throwaway.client)).resolves.toBeUndefined();

		// Checked with the admin client so the assertion cannot be a false pass caused by
		// RLS merely hiding rows from an ordinary caller.
		const admin = adminClient();
		expect(await findThrowawayUserId(admin)).toBeNull();

		const { data: profiles } = await admin.from("profiles").select("id").eq("id", throwaway.id);
		expect(profiles ?? []).toHaveLength(0);

		const { data: items } = await admin
			.from("vault_items")
			.select("id")
			.eq("user_id", throwaway.id);
		expect(items ?? []).toHaveLength(0);
	}, 30000);

	it("refuses to delete a sole owner of a team that still has active members", async () => {
		throwaway = await createThrowawayUser();
		const userB = await signInUserB();

		const { data: team, error: teamError } = await throwaway.client.rpc("create_team", {
			team_name: `Delete Guard Team ${Date.now()}`,
		});
		expect(teamError).toBeNull();
		const teamId = (team as { id: string }).id;

		const { error: memberError } = await throwaway.client.from("team_members").insert({
			team_id: teamId,
			user_id: userB.id,
			role: "member",
			status: "active",
		});
		expect(memberError).toBeNull();

		await expect(deleteOwnAccount(throwaway.client)).rejects.toThrow(/only owner of a team/i);

		// The RPC is one transaction, so the refusal must have left the account untouched.
		const admin = adminClient();
		expect(await findThrowawayUserId(admin)).not.toBeNull();

		// Removing the other member unblocks deletion, which takes the now-empty team with
		// it -- so user B is never left holding a membership in a deleted team.
		await throwaway.client
			.from("team_members")
			.delete()
			.eq("team_id", teamId)
			.eq("user_id", userB.id);
		await expect(deleteOwnAccount(throwaway.client)).resolves.toBeUndefined();

		const { data: teams } = await admin.from("teams").select("id").eq("id", teamId);
		expect(teams ?? []).toHaveLength(0);
	}, 60000);

	it("deletes a team left with no active members along with its owner", async () => {
		throwaway = await createThrowawayUser();

		const { data: team, error: teamError } = await throwaway.client.rpc("create_team", {
			team_name: `Solo Team ${Date.now()}`,
		});
		expect(teamError).toBeNull();
		const teamId = (team as { id: string }).id;

		await expect(deleteOwnAccount(throwaway.client)).resolves.toBeUndefined();

		const admin = adminClient();
		const { data: teams } = await admin.from("teams").select("id").eq("id", teamId);
		expect(teams ?? []).toHaveLength(0);

		const { data: members } = await admin.from("team_members").select("id").eq("team_id", teamId);
		expect(members ?? []).toHaveLength(0);
	}, 60000);
});
