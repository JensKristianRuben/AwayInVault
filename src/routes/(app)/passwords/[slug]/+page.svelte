<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { supabase } from "$lib/utils/supabaseClient";
	import { decryptLocal, getBiometricMasterKey, verifyMasterPassword } from "$lib/utils/crypto";
	import { resolveVaultKey } from "$lib/utils/vaultMigration";
	import { getBiometricCredentials } from "$lib/utils/indexedDB";
	import { toast } from "svelte-sonner";
	import type { VaultItem } from "$lib/types/vault";
	import { getDomain } from "$lib/utils/url";
	import { extractIdFromSlug } from "$lib/utils/slug";

	// This page never trusts a previously-unlocked session: every visit
	// re-authenticates from scratch and nothing decrypted here is cached.
	let itemId = $derived(extractIdFromSlug(page.params.slug ?? ""));

	// "loading": fetching the item + checking for biometrics
	// "authenticating": auto-triggered biometric prompt in flight
	// "password-prompt": biometrics unavailable/failed — master password fallback
	// "unlocked": decrypted and visible
	// "not-found": item couldn't be loaded
	let phase = $state<"loading" | "authenticating" | "password-prompt" | "unlocked" | "not-found">(
		"loading",
	);
	let item = $state<VaultItem | null>(null);

	let isUnlocking = $state(false);
	let isPasswordVisible = $state(true);
	let username = $state("");
	let password = $state("");

	let hasBiometrics = $state(false);
	let masterPasswordInput = $state("");

	async function loadItem() {
		try {
			const { data, error } = await supabase
				.from("vault_items")
				.select("*")
				.eq("id", itemId)
				.single();

			if (error || !data) {
				phase = "not-found";
				return;
			}
			item = data;
		} catch (err: any) {
			console.error("Error fetching vault item:", err);
			phase = "not-found";
		}
	}

	async function unlockWithKey(vaultKey: CryptoKey) {
		if (!item) return;
		username = await decryptLocal(item.username_encrypted, vaultKey);
		password = await decryptLocal(item.password_encrypted, vaultKey);
		phase = "unlocked";
	}

	// `auto` = triggered automatically on page load, so a cancelled/unavailable
	// passkey silently falls back to the password prompt instead of erroring.
	async function tryBiometricUnlock(auto: boolean) {
		if (!item) return;
		try {
			const {
				data: { user },
				error,
			} = await supabase.auth.getUser();
			if (error || !user) throw new Error("Not logged in.");

			const key = await getBiometricMasterKey(user.user_metadata, user.id);
			if (!key) throw new Error("Biometric unlock unavailable.");

			const vaultKey = await resolveVaultKey(supabase, user.id, key);
			await unlockWithKey(vaultKey);
			toast.success("Item decrypted with biometrics!");
		} catch (err) {
			console.warn("Biometric unlock aborted or failed.", err);
			if (auto) {
				phase = "password-prompt";
			} else {
				toast.error("Biometric unlock failed or was cancelled.");
			}
		}
	}

	async function handlePasswordSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!masterPasswordInput || !item) return;

		isUnlocking = true;
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error("You must be logged in.");

			const key = await verifyMasterPassword(masterPasswordInput, user.user_metadata);
			if (!key) {
				toast.error("Incorrect Master Password.");
				return;
			}

			const vaultKey = await resolveVaultKey(supabase, user.id, key);
			await unlockWithKey(vaultKey);
			toast.success("Item decrypted!");
		} catch (err: any) {
			toast.error("Could not decrypt: " + err.message);
		} finally {
			masterPasswordInput = "";
			isUnlocking = false;
		}
	}

	function copyText(text: string, label: string) {
		if (!text) return;
		navigator.clipboard.writeText(text);
		toast.success(`${label} copied to clipboard!`);
	}

	function handleEdit() {
		toast("Editing isn't implemented yet", {
			description: "Tracked as a GitHub issue — coming in a future update.",
		});
	}

	function handleDelete() {
		if (!item) return;
		toast(`Do you want to permanently delete the password for "${item.title}"?`, {
			description: "This action cannot be undone.",
			action: {
				label: "Delete permanently",
				onClick: async () => {
					try {
						const { error } = await supabase.from("vault_items").delete().eq("id", item!.id);
						if (error) throw error;
						toast.success(`"${item!.title}" was deleted!`);
						goto("/passwords");
					} catch (err: any) {
						console.error("Error during deletion:", err);
						toast.error("Could not delete item: " + err.message);
					}
				},
			},
			cancel: { label: "Cancel", onClick: () => {} },
			classes: {
				toast:
					"!bg-bg-sidebar !border !border-border-subtle !rounded-none !text-text-base !p-4 !shadow-2xl !flex !flex-col !gap-3 !items-start",
				title: "!text-sm !font-semibold !text-text-base",
				description: "!text-xs !text-text-muted",
				actionButton:
					"!bg-red-500 hover:!bg-red-600 !text-white !text-xs !px-3 !py-1.5 !font-semibold !rounded-none !transition-colors !cursor-pointer",
				cancelButton:
					"!bg-transparent !border !border-border-subtle hover:!border-text-base/30 !text-text-muted hover:!text-text-base !text-xs !px-3 !py-1.5 !font-semibold !rounded-none !transition-all !cursor-pointer",
			},
		});
	}

	onMount(async () => {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			const localBio = user ? !!(await getBiometricCredentials(user.id)) : false;
			const dbBio = (user?.user_metadata?.biometric_credentials || []).length > 0;
			hasBiometrics = localBio || dbBio;
		} catch (err) {
			console.error("Failed to load user biometric metadata:", err);
			hasBiometrics = false;
		}

		await loadItem();
		if (!item) return;

		if (hasBiometrics) {
			// Go straight to the passkey challenge — never flash the master
			// password form first when a passkey is available.
			phase = "authenticating";
			await tryBiometricUnlock(true);
		} else {
			phase = "password-prompt";
		}
	});
</script>

<div class="min-h-[calc(100vh-4rem)] flex items-start justify-center p-8">
	<div class="w-full max-w-md space-y-6">
		<!-- Back link -->
		<a
			href="/passwords"
			class="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-base transition-colors"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="w-3.5 h-3.5"
			>
				<polyline points="15 18 9 12 15 6" />
			</svg>
			Back to passwords
		</a>

		{#if phase === "loading" || phase === "authenticating"}
			<div
				class="flex flex-col items-center justify-center py-20 bg-bg-sidebar border border-border-subtle text-text-muted space-y-4"
			>
				<svg
					class="animate-spin h-7 w-7 text-accent"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				{#if phase === "authenticating"}
					<p class="text-xs tracking-wide">Waiting for biometric confirmation…</p>
				{/if}
			</div>
		{:else if phase === "not-found" || !item}
			<div
				class="flex flex-col items-center justify-center py-20 bg-bg-sidebar border border-border-subtle text-text-muted text-center p-6 space-y-2"
			>
				<p class="text-xs font-medium">This password could not be found.</p>
			</div>
		{:else}
			<!-- Header: favicon, title, website -->
			<div class="flex items-center gap-3">
				<div
					class="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-bg-sidebar border border-border-subtle/50 rounded-sm overflow-hidden"
				>
					{#if item.website && getDomain(item.website)}
						<img
							src="https://www.google.com/s2/favicons?sz=64&domain={getDomain(item.website)}"
							alt=""
							class="w-full h-full object-contain p-1.5"
						/>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							class="w-5 h-5 text-text-muted"
						>
							<circle cx="12" cy="12" r="10" />
							<line x1="2" y1="12" x2="22" y2="12" />
							<path
								d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
							/>
						</svg>
					{/if}
				</div>
				<div class="min-w-0">
					<h1 class="text-xl font-bold tracking-tight text-text-base truncate">{item.title}</h1>
					{#if item.website}
						<a
							href={item.website.startsWith("http") ? item.website : `https://${item.website}`}
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs text-accent/80 hover:text-accent hover:underline truncate block"
						>
							{item.website.replace(/^https?:\/\//, "")}
						</a>
					{/if}
				</div>
			</div>

			{#if phase === "password-prompt"}
				<!-- Re-authentication required every visit; nothing decrypted is cached -->
				<div class="bg-bg-sidebar border border-border-subtle p-6 space-y-4">
					<div>
						<h2 class="text-sm font-bold text-text-base mb-1">Unlock</h2>
						<p class="text-[11px] text-text-muted">
							Enter your Master Password to view the decrypted details for "{item.title}".
						</p>
					</div>

					<form onsubmit={handlePasswordSubmit} class="space-y-4">
						<div class="space-y-1.5">
							<label
								for="detail-master-password"
								class="text-[9px] font-semibold uppercase tracking-widest text-text-muted ml-1"
							>
								Master Password
							</label>
							<input
								id="detail-master-password"
								type="password"
								bind:value={masterPasswordInput}
								placeholder="Enter password"
								class="w-full px-4 py-2.5 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent transition-all placeholder:text-text-base/20"
								required
								autofocus
							/>
						</div>

						<div class="flex items-center gap-3">
							{#if hasBiometrics}
								<button
									type="button"
									onclick={() => tryBiometricUnlock(false)}
									class="px-4 py-2 text-xs border border-border-subtle text-text-muted hover:text-text-base transition-colors duration-200 cursor-pointer"
								>
									Try biometrics again
								</button>
							{/if}
							<button
								type="submit"
								disabled={isUnlocking}
								class="flex-1 px-4 py-2 text-xs border-2 border-accent text-accent font-semibold hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isUnlocking ? "Unlocking..." : "Unlock"}
							</button>
						</div>
					</form>
				</div>
			{:else if phase === "unlocked"}
				<!-- Decrypted details -->
				<div class="bg-bg-sidebar border border-border-subtle p-6 space-y-5">
					<!-- Username -->
					<div class="space-y-1.5">
						<span class="text-[9px] font-semibold uppercase tracking-widest text-text-muted"
							>Username</span
						>
						<div class="flex items-center gap-2">
							<span class="flex-1 min-w-0 break-all text-text-base font-mono text-sm">
								{username || "(none)"}
							</span>
							<button
								onclick={() => copyText(username, "Username")}
								class="p-1.5 hover:text-accent text-text-muted transition-colors cursor-pointer flex-shrink-0"
								title="Copy username"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									class="w-4 h-4"
								>
									<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
									<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
								</svg>
							</button>
						</div>
					</div>

					<!-- Password -->
					<div class="space-y-1.5">
						<span class="text-[9px] font-semibold uppercase tracking-widest text-text-muted"
							>Password</span
						>
						<div class="flex items-center gap-2">
							<span class="flex-1 min-w-0 break-all text-text-base font-mono text-sm">
								{#if isPasswordVisible}
									{password}
								{:else}
									<span class="tracking-widest text-text-muted select-none">••••••••••••</span>
								{/if}
							</span>
							<button
								onclick={() => (isPasswordVisible = !isPasswordVisible)}
								class="p-1.5 hover:text-accent text-text-muted transition-colors cursor-pointer flex-shrink-0"
								title={isPasswordVisible ? "Hide password" : "Show password"}
							>
								{#if isPasswordVisible}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										class="w-4 h-4"
									>
										<path
											d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-10-7-10-7a13.19 13.19 0 0 1 2.18-3.18L2 2l22 22-2.06-2.06"
										/>
										<path
											d="M6.61 6.61A13.52 13.52 0 0 1 12 5c7 0 10 7 10 7a13.17 13.17 0 0 1-2.18 3.18"
										/>
										<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
										<line x1="2" y1="2" x2="22" y2="22" />
									</svg>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										class="w-4 h-4"
									>
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
										<circle cx="12" cy="12" r="3" />
									</svg>
								{/if}
							</button>
							<button
								onclick={() => copyText(password, "Password")}
								class="p-1.5 hover:text-accent text-text-muted transition-colors cursor-pointer flex-shrink-0"
								title="Copy password"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									class="w-4 h-4"
								>
									<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
									<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
								</svg>
							</button>
						</div>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex items-center gap-3">
					<button
						onclick={handleEdit}
						class="flex-1 py-2 px-4 border border-border-subtle text-text-muted hover:text-text-base hover:border-text-base/30 font-semibold text-xs transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							class="w-3.5 h-3.5"
						>
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
						</svg>
						Edit
					</button>
					<button
						onclick={handleDelete}
						class="py-2 px-4 border border-border-subtle text-text-muted hover:text-red-500 hover:border-red-500/30 font-semibold text-xs transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="w-3.5 h-3.5"
						>
							<polyline points="3 6 5 6 21 6" />
							<path
								d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
							/>
							<line x1="10" y1="11" x2="10" y2="17" />
							<line x1="14" y1="11" x2="14" y2="17" />
						</svg>
						Delete
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>
