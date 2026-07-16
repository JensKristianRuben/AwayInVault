<script lang="ts">
	import { onMount } from "svelte";
	import { supabase } from "$lib/utils/supabaseClient";
	import { toast } from "svelte-sonner";
	import type { VaultItem } from "$lib/types/vault";

	import CreatePasswordModal from "$lib/components/passwords/CreatePasswordModal.svelte";
	import PasswordListCard from "$lib/components/passwords/PasswordListCard.svelte";

	// Data states
	let items = $state<VaultItem[]>([]);
	let isLoading = $state(true);
	let showCreateModal = $state(false);

	// Search state
	let searchQuery = $state("");

	// Load items from Supabase. Titles & websites aren't encrypted, so no
	// master password / decryption is needed just to list them.
	async function loadVaultItems() {
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

			items = data || [];
		} catch (err: any) {
			console.error("Error fetching vault_items:", err);
			toast.error("Could not fetch your passwords: " + err.message);
		} finally {
			isLoading = false;
		}
	}

	function handleCreateSuccess() {
		showCreateModal = false;
		loadVaultItems();
	}

	// Computed filter of items based on search query (title/website only —
	// username/password stay encrypted until an item is opened)
	let filteredItems = $derived(
		items.filter((item) => {
			const query = searchQuery.toLowerCase();
			const titleMatch = item.title?.toLowerCase().includes(query);
			const websiteMatch = item.website?.toLowerCase().includes(query);
			return titleMatch || websiteMatch;
		}),
	);

	onMount(() => {
		loadVaultItems();
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
					placeholder="Search for service or URL..."
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
				<p class="text-xs tracking-wide">Fetching your passwords...</p>
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
			<div class="space-y-3">
				{#each filteredItems as item (item.id)}
					<PasswordListCard {item} />
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Modal for creating a new vault item -->
{#if showCreateModal}
	<CreatePasswordModal onClose={() => (showCreateModal = false)} onSuccess={handleCreateSuccess} />
{/if}
