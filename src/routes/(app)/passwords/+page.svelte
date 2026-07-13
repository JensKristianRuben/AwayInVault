<script lang="ts">
	import { onMount } from "svelte";
	import { supabase } from "$lib/utils/supabaseClient";
	import { cryptoSession } from "$lib/stores/cryptoSession.svelte";
	import { decryptLocal, getBiometricMasterKey, verifyMasterPassword } from "$lib/utils/crypto";
	import { getBiometricCredentials } from "$lib/utils/indexedDB";
	import { toast } from "svelte-sonner";
	import type { VaultItem } from "$lib/types/vault";

	import CreatePasswordModal from "$lib/components/passwords/CreatePasswordModal.svelte";
	import PasswordCard from "$lib/components/passwords/PasswordCard.svelte";

	// Data states
	let decryptedItems = $state<VaultItem[]>([]);
	let isLoading = $state(true);
	let showCreateModal = $state(false);

	// Search state
	let searchQuery = $state("");

	// Load items from Supabase and decrypt them locally
	async function loadAndDecryptVaultItems() {
		isLoading = true;
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				isLoading = false;
				return;
			}

			const { data, error } = await supabase
				.from("vault_items")
				.select("*")
				.order("created_at", { ascending: false });

			if (error) {
				throw error;
			}

			const key = cryptoSession.cryptoKey;
			if (!key) {
				// Vault is locked (e.g. modal is open), display encrypted placeholders
				decryptedItems = (data || []).map((item) => ({
					...item,
					username: "(locked)",
					password: "(locked - encrypted in database)",
					isDecrypted: false,
				}));
				return;
			}

			// Decrypt items
			const decrypted = await Promise.all(
				(data || []).map(async (item) => {
					let username = "";
					let password = "";
					let isDecrypted = false;
					try {
						username = await decryptLocal(item.username_encrypted, key);
						password = await decryptLocal(item.password_encrypted, key);
						isDecrypted = true;
					} catch (err) {
						console.error("Error decrypting item:", item.id, err);
						username = "(decryption error)";
						password = "(decryption error)";
					}
					return {
						...item,
						username,
						password,
						isDecrypted,
					};
				}),
			);

			decryptedItems = decrypted;
		} catch (err: any) {
			console.error("Error fetching vault_items:", err);
			toast.error("Could not fetch or decrypt your passwords: " + err.message);
		} finally {
			isLoading = false;
		}
	}

	let hasBiometrics = $state(false);

	// Password prompt modal states
	let showPasswordPrompt = $state(false);
	let masterPasswordPromptInput = $state("");
	let itemToUnlock = $state<VaultItem | null>(null);
	let onPromptSubmit = $state<((password: string) => void) | null>(null);
	let onPromptCancel = $state<(() => void) | null>(null);

	function promptForMasterPassword(
		item: VaultItem,
		onSubmit: (password: string) => void,
		onCancel: () => void,
	) {
		itemToUnlock = item;
		masterPasswordPromptInput = "";
		onPromptSubmit = onSubmit;
		onPromptCancel = onCancel;
		showPasswordPrompt = true;
	}

	function handlePromptSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!masterPasswordPromptInput) {
			toast.error("Please enter your Master Password.");
			return;
		}
		const submitCb = onPromptSubmit;
		showPasswordPrompt = false;
		if (submitCb) submitCb(masterPasswordPromptInput);
	}

	function handlePromptCancel() {
		showPasswordPrompt = false;
		const cancelCb = onPromptCancel;
		if (cancelCb) cancelCb();
	}

	function handleUnlockItem(item: VaultItem): Promise<boolean> {
		return new Promise<boolean>(async (resolve) => {
			// 1. Try biometrics if enabled
			if (hasBiometrics) {
				try {
					const {
						data: { user },
						error,
					} = await supabase.auth.getUser();
					if (error || !user) throw new Error("Not logged in.");

					const key = await getBiometricMasterKey(user.user_metadata);
					if (key) {
						const decryptedUsername = await decryptLocal(item.username_encrypted, key);
						const decryptedPassword = await decryptLocal(item.password_encrypted, key);

						decryptedItems = decryptedItems.map((d) => {
							if (d.id === item.id) {
								return {
									...d,
									username: decryptedUsername,
									password: decryptedPassword,
									isDecrypted: true,
								};
							}
							return d;
						});

						toast.success("Item decrypted with biometrics!");
						resolve(true);
						return;
					}
				} catch (err) {
					console.warn("Biometric unlock aborted or failed. Trying password...", err);
				}
			}

			// 2. Fallback to prompting for Master Password
			promptForMasterPassword(
				item,
				async (password) => {
					try {
						const {
							data: { user },
						} = await supabase.auth.getUser();
						if (!user) throw new Error("You must be logged in.");

						const key = await verifyMasterPassword(password, user.user_metadata);
						if (!key) {
							toast.error("Incorrect Master Password.");
							resolve(false);
							return;
						}

						const decryptedUsername = await decryptLocal(item.username_encrypted, key);
						const decryptedPassword = await decryptLocal(item.password_encrypted, key);

						decryptedItems = decryptedItems.map((d) => {
							if (d.id === item.id) {
								return {
									...d,
									username: decryptedUsername,
									password: decryptedPassword,
									isDecrypted: true,
								};
							}
							return d;
						});

						toast.success("Item decrypted!");
						resolve(true);
					} catch (err: any) {
						toast.error("Could not decrypt: " + err.message);
						resolve(false);
					}
				},
				() => {
					resolve(false);
				},
			);
		});
	}

	// Delete an item with sonner confirmation toast styled to match theme
	function handleDelete(item: VaultItem) {
		toast(`Do you want to permanently delete the password for "${item.title}"?`, {
			description: "This action cannot be undone.",
			action: {
				label: "Delete permanently",
				onClick: async () => {
					try {
						const { error } = await supabase.from("vault_items").delete().eq("id", item.id);

						if (error) throw error;

						toast.success(`"${item.title}" was deleted!`);
						await loadAndDecryptVaultItems();
					} catch (err: any) {
						console.error("Error during deletion:", err);
						toast.error("Could not delete item: " + err.message);
					}
				},
			},
			cancel: {
				label: "Cancel",
				onClick: () => {},
			},
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

	function handleCreateSuccess() {
		showCreateModal = false;
		loadAndDecryptVaultItems();
	}

	// Computed filter of items based on search query
	let filteredItems = $derived(
		decryptedItems.filter((item) => {
			const query = searchQuery.toLowerCase();
			const titleMatch = item.title?.toLowerCase().includes(query);
			const websiteMatch = item.website?.toLowerCase().includes(query);
			const usernameMatch = item.username?.toLowerCase().includes(query);
			return titleMatch || websiteMatch || usernameMatch;
		}),
	);

	// Watch for changes in the key state to re-run decryption
	$effect(() => {
		if (cryptoSession.cryptoKey) {
			loadAndDecryptVaultItems();
		}
	});

	onMount(async () => {
		const credentials = await getBiometricCredentials();
		const localBio = !!credentials;

		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			const dbBio = (user?.user_metadata?.biometric_credentials || []).length > 0;
			hasBiometrics = localBio || dbBio;
		} catch (err) {
			console.error("Failed to load user biometric metadata:", err);
			hasBiometrics = localBio;
		}

		loadAndDecryptVaultItems();
	});
</script>

<div class="p-8 max-w-4xl mx-auto space-y-8">
	<!-- Header with signature key/vault status -->
	<div
		class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-border-subtle"
	>
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-text-base">Passwords</h1>
		</div>

		<div class="flex items-center gap-3">
			<!-- Add Password Button -->
			<button
				onclick={() => (showCreateModal = true)}
				class="py-2 px-4 border-2 border-accent text-accent font-semibold text-xs rounded-none hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer flex items-center gap-1.5"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					class="w-3.5 h-3.5"
				>
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				Add password
			</button>
		</div>
	</div>

	<!-- Search & Content Section -->
	<div class="space-y-6">
		<!-- Search Bar -->
		<div class="flex items-center bg-bg-sidebar border border-border-subtle p-3 shadow-sm">
			<div class="relative flex-1">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2"
				>
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<input
					type="text"
					placeholder="Search for service, URL, or username..."
					bind:value={searchQuery}
					class="w-full pl-9 pr-4 py-2 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent transition-all placeholder:text-text-base/20"
				/>
			</div>
		</div>

		<!-- Items list -->
		{#if isLoading}
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
				<p class="text-xs tracking-wide">Fetching and decrypting items...</p>
			</div>
		{:else if filteredItems.length === 0}
			<div
				class="flex flex-col items-center justify-center py-20 bg-bg-sidebar border border-border-subtle text-text-muted text-center p-6 space-y-2"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					class="w-7 h-7 text-text-muted"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="8" y1="12" x2="16" y2="12" />
				</svg>
				<p class="text-xs font-medium">No passwords found</p>
				{#if searchQuery}
					<p class="text-[10px] text-text-muted">Try searching for other words.</p>
				{/if}
			</div>
		{:else}
			<div class="space-y-4">
				{#each filteredItems as item (item.id)}
					<PasswordCard {item} onDelete={handleDelete} onUnlock={handleUnlockItem} />
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Modal for creating a new vault item -->
{#if showCreateModal}
	<CreatePasswordModal onClose={() => (showCreateModal = false)} onSuccess={handleCreateSuccess} />
{/if}

<!-- Inline modal for password fallback decryption -->
{#if showPasswordPrompt}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
		<div
			class="bg-bg-sidebar border border-border-subtle p-6 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
		>
			<h3 class="text-sm font-bold text-text-base mb-1">Unlock</h3>
			<p class="text-[11px] text-text-muted mb-4">
				Enter your Master Password to decrypt the password for "{itemToUnlock?.title}".
			</p>

			<form onsubmit={handlePromptSubmit} class="space-y-4">
				<div class="space-y-1.5">
					<label
						for="modal-master-password"
						class="text-[9px] font-semibold uppercase tracking-widest text-text-muted ml-1"
					>
						Master Password
					</label>
					<input
						id="modal-master-password"
						type="password"
						bind:value={masterPasswordPromptInput}
						placeholder="Enter password"
						class="w-full px-4 py-2.5 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent transition-all placeholder:text-text-base/20"
						required
						autofocus
					/>
				</div>

				<div class="flex justify-end gap-3 pt-2">
					<button
						type="button"
						onclick={handlePromptCancel}
						class="px-4 py-2 text-xs border border-border-subtle text-text-muted hover:text-text-base transition-colors duration-200 cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-4 py-2 text-xs border-2 border-accent text-accent font-semibold hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer"
					>
						Confirm
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
