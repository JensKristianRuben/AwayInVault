<script lang="ts">
	import { toast } from "svelte-sonner";
	import { goto } from "$app/navigation";
	import { supabase } from "$lib/utils/supabaseClient";
	import { verifyMasterPassword } from "$lib/utils/crypto";
	import { deleteOwnAccount } from "$lib/utils/accountDeletion";
	import { cryptoSession } from "$lib/stores/cryptoSession.svelte";
	import type { AppUserMetadata } from "$lib/types";

	let { userMetadata, userEmail } = $props<{
		userMetadata: AppUserMetadata;
		userEmail: string;
	}>();

	let isDeleteAccountOpen = $state(false);
	let confirmEmailInput = $state("");
	let confirmPasswordInput = $state("");
	let isDeleting = $state(false);

	function openDeleteAccount() {
		confirmEmailInput = "";
		confirmPasswordInput = "";
		isDeleteAccountOpen = true;
	}

	async function confirmDeleteAccount() {
		if (confirmEmailInput !== userEmail) {
			toast.error("Email confirmation does not match.");
			return;
		}

		isDeleting = true;
		try {
			// Zero-knowledge design: the server never sees the Master Password, so this
			// check is necessarily client-side only. It exists to stop someone deleting
			// the vault from a session left unlocked on an unattended machine.
			const key = await verifyMasterPassword(confirmPasswordInput, userMetadata);
			if (!key) {
				toast.error("Incorrect Master Password.");
				return;
			}

			await deleteOwnAccount(supabase);

			cryptoSession.clearSession();
			await supabase.auth.signOut();
			toast.success("Your account and all of its data have been permanently deleted.");
			goto("/login");
		} catch (err: any) {
			// Leaves the modal open so the user can act on the message (e.g. hand over
			// team ownership) without losing what they already typed.
			toast.error(err.message);
		} finally {
			isDeleting = false;
		}
	}
</script>

<!-- DANGER ZONE SECTION -->
<div class="bg-bg-sidebar border border-border-subtle p-6 space-y-6">
	<div>
		<h2 class="text-lg font-semibold text-red-400">Danger Zone</h2>
		<p class="text-xs text-text-muted mt-1 font-light">Irreversible actions for your account.</p>
	</div>

	<div class="border-t border-border-subtle pt-6">
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<h3 class="text-sm font-semibold text-text-base">Delete Account</h3>
				<p class="text-xs text-text-muted mt-1 font-light max-w-lg">
					Permanently delete your account and everything in it. All of your passwords, notes,
					sharing keys, and team memberships will be erased. This cannot be undone.
				</p>
			</div>
			<button
				onclick={openDeleteAccount}
				class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
			>
				Delete Account
			</button>
		</div>
	</div>
</div>

<!-- Modal: Delete Account Confirmation -->
{#if isDeleteAccountOpen}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
		<div class="bg-bg-sidebar border border-border-subtle p-6 max-w-md w-full space-y-4">
			<div>
				<h3 class="text-lg font-bold text-text-base">Delete Account</h3>
				<p class="text-xs text-text-muted mt-2 leading-relaxed">
					This action cannot be undone. To permanently delete your account, including every password
					and note in your vault, type your email address <strong class="text-text-base"
						>{userEmail}</strong
					> below and confirm with your Master Password:
				</p>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					confirmDeleteAccount();
				}}
				class="space-y-4"
			>
				<input
					type="email"
					placeholder="Type your email to confirm"
					bind:value={confirmEmailInput}
					required
					autofocus
					class="w-full px-3 py-2 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-red-500 transition-colors"
				/>

				<input
					type="password"
					placeholder="Enter Master Password"
					bind:value={confirmPasswordInput}
					required
					class="w-full px-3 py-2 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-red-500 transition-colors"
				/>

				<div class="flex justify-end gap-3 pt-2">
					<button
						type="button"
						onclick={() => (isDeleteAccountOpen = false)}
						disabled={isDeleting}
						class="px-4 py-2 border border-border-subtle text-text-base text-xs font-semibold hover:bg-bg-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={confirmEmailInput !== userEmail || !confirmPasswordInput || isDeleting}
						class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all cursor-pointer"
					>
						{isDeleting ? "Deleting..." : "Delete Account"}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
