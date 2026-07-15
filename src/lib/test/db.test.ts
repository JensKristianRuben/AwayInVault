import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type { VaultItem } from "../types/vault";

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const userAEmail = process.env.TEST_USER_A_EMAIL;
const userAPassword = process.env.TEST_USER_A_PASSWORD;
const userBEmail = process.env.TEST_USER_B_EMAIL;
const userBPassword = process.env.TEST_USER_B_PASSWORD;

describe("Supabase RLS Policies Integration Test", () => {
	let clientA: ReturnType<typeof createClient>;
	let clientB: ReturnType<typeof createClient>;
	let userAId: string;
	let userBId: string;

	beforeAll(async () => {
		expect(supabaseUrl).toBeDefined();
		expect(supabaseAnonKey).toBeDefined();
		expect(userAEmail).toBeDefined();
		expect(userAPassword).toBeDefined();
		expect(userBEmail).toBeDefined();
		expect(userBPassword).toBeDefined();

		// Initialize two separate Supabase clients representing different users
		clientA = createClient(supabaseUrl!, supabaseAnonKey!);
		clientB = createClient(supabaseUrl!, supabaseAnonKey!);

		// Sign in User A
		const { data: authA, error: errA } = await clientA.auth.signInWithPassword({
			email: userAEmail!,
			password: userAPassword!,
		});
		if (errA) throw new Error(`Could not sign in User A: ${errA.message}`);
		userAId = authA.user.id;

		// Sign in User B
		const { data: authB, error: errB } = await clientB.auth.signInWithPassword({
			email: userBEmail!,
			password: userBPassword!,
		});
		if (errB) throw new Error(`Could not sign in User B: ${errB.message}`);
		userBId = authB.user.id;
	});

	it("should allow User A to create, read, update, and delete their own vault items", async () => {
		const title = `Test Item ${Date.now()}`;

		// 1. CREATE (Insert own item)
		const { data: insertData, error: insertError } = (await clientA
			.from("vault_items")
			.insert({
				user_id: userAId,
				title,
				password_encrypted: "encrypted_pass_A",
			} as never)
			.select()
			.single()) as { data: VaultItem | null; error: any };

		expect(insertError).toBeNull();
		expect(insertData).not.toBeNull();
		if (!insertData) throw new Error("insertData is null");
		expect(insertData.title).toBe(title);
		const itemId = insertData.id;

		// 2. READ (Select own item)
		const { data: selectData, error: selectError } = (await clientA
			.from("vault_items")
			.select("*")
			.eq("id", itemId)
			.single()) as { data: VaultItem | null; error: any };

		expect(selectError).toBeNull();
		expect(selectData).not.toBeNull();
		if (!selectData) throw new Error("selectData is null");
		expect(selectData.title).toBe(title);

		// 3. UPDATE (Update own item)
		const { data: updateData, error: updateError } = (await clientA
			.from("vault_items")
			.update({ title: `${title} Updated` } as never)
			.eq("id", itemId)
			.select()
			.single()) as { data: VaultItem | null; error: any };

		expect(updateError).toBeNull();
		expect(updateData).not.toBeNull();
		if (!updateData) throw new Error("updateData is null");
		expect(updateData.title).toBe(`${title} Updated`);

		// 4. DELETE (Delete own item)
		const { error: deleteError } = (await clientA
			.from("vault_items")
			.delete()
			.eq("id", itemId)) as { error: any };

		expect(deleteError).toBeNull();

		// Verify item is deleted
		const { data: verifyData } = (await clientA
			.from("vault_items")
			.select("*")
			.eq("id", itemId)) as { data: VaultItem[] | null };
		expect(verifyData).toHaveLength(0);
	}, 15000);

	it("should block User B from reading, updating, or deleting User A's vault items", async () => {
		const title = `Private Item ${Date.now()}`;

		// 1. User A creates a private item
		const { data: itemA, error: createError } = (await clientA
			.from("vault_items")
			.insert({
				user_id: userAId,
				title,
				password_encrypted: "encrypted_pass_A",
			} as never)
			.select()
			.single()) as { data: VaultItem | null; error: any };

		expect(createError).toBeNull();
		expect(itemA).not.toBeNull();
		if (!itemA) throw new Error("itemA is null");
		const itemId = itemA.id;

		try {
			// 2. User B tries to read it (SELECT should return an empty list under RLS)
			const { data: selectData, error: selectError } = (await clientB
				.from("vault_items")
				.select("*")
				.eq("id", itemId)) as { data: VaultItem[] | null; error: any };

			expect(selectError).toBeNull();
			expect(selectData).toHaveLength(0);

			// 3. User B tries to update it (UPDATE should return an empty list or not update)
			const { data: updateData, error: updateError } = (await clientB
				.from("vault_items")
				.update({ title: "Hacked Title" } as never)
				.eq("id", itemId)
				.select()) as { data: VaultItem[] | null; error: any };

			expect(updateError).toBeNull();
			expect(updateData).toHaveLength(0);

			// 4. User B tries to delete it (DELETE should return empty list or not delete)
			const { data: deleteData, error: deleteError } = (await clientB
				.from("vault_items")
				.delete()
				.eq("id", itemId)
				.select()) as { data: VaultItem[] | null; error: any };

			expect(deleteError).toBeNull();
			expect(deleteData).toHaveLength(0);

			// Verify the item remains unchanged for User A
			const { data: verifyData, error: verifyError } = (await clientA
				.from("vault_items")
				.select("*")
				.eq("id", itemId)
				.single()) as { data: VaultItem | null; error: any };

			expect(verifyError).toBeNull();
			expect(verifyData).not.toBeNull();
			if (!verifyData) throw new Error("verifyData is null");
			expect(verifyData.title).toBe(title);
		} finally {
			// Cleanup: Delete the item using User A's client
			await clientA.from("vault_items").delete().eq("id", itemId);
		}
	});

	it("should block User A from inserting a vault item with User B's user_id", async () => {
		// User A tries to insert a row where user_id = User B's id
		const { error: insertError } = (await clientA.from("vault_items").insert({
			user_id: userBId,
			title: "Malicious Insert",
			password_encrypted: "malicious_pass",
		} as never)) as { error: any };

		// This should violate the INSERT RLS policy
		expect(insertError).toBeDefined();
		expect(insertError!.message).toContain("row-level security policy");
	});
});
