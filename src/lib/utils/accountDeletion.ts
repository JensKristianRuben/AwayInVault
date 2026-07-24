import type { SupabaseClient } from "@supabase/supabase-js";

// Raised by the delete_own_account RPC when the caller still solely owns a team that
// other people are active in. Deleting them would strand that team without an owner,
// so the RPC refuses and they have to hand over ownership first.
const SOLE_OWNER_ERROR = "sole_owner_of_team_with_members";

const SOLE_OWNER_MESSAGE =
	"You are the only owner of a team that still has other members. " +
	"Transfer ownership or remove the other members before deleting your account.";

// Permanently erases the caller's account and all of their data. Takes the caller's own
// authenticated Supabase client rather than importing one, since auth.uid() inside the
// RPC must resolve to whichever session actually made the call. The RPC does everything
// in a single transaction, so a failure here means nothing was deleted.
export async function deleteOwnAccount(client: SupabaseClient): Promise<void> {
	const { error } = await client.rpc("delete_own_account");
	if (!error) return;

	if (error.message.includes(SOLE_OWNER_ERROR)) {
		throw new Error(SOLE_OWNER_MESSAGE);
	}
	throw new Error(`Could not delete account: ${error.message}`);
}
