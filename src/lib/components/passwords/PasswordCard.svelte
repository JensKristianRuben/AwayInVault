<script lang="ts">
	import { toast } from "svelte-sonner";
	import type { VaultItem } from "$lib/types/vault";

	let { item, onDelete, onUnlock } = $props<{
		item: VaultItem;
		onDelete: (item: VaultItem) => void;
		onUnlock: (item: VaultItem) => Promise<boolean>;
	}>();

	let isPasswordVisible = $state(false);

	function copyText(text: string, label: string) {
		if (!text) return;
		navigator.clipboard.writeText(text);
		toast.success(`${label} kopieret til udklipsholder!`);
	}

	async function handleAction(action: "show" | "copy_username" | "copy_password") {
		if (!item.isDecrypted) {
			const success = await onUnlock(item);
			if (!success) return;
		}

		if (item.isDecrypted) {
			if (action === "show") {
				isPasswordVisible = !isPasswordVisible;
			} else if (action === "copy_username") {
				copyText(item.username, "Brugernavn");
			} else if (action === "copy_password") {
				copyText(item.password, "Adgangskode");
			}
		}
	}
</script>

<div
	class="bg-bg-sidebar border border-border-subtle p-5 hover:border-accent/40 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.06)] transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
>
	<!-- Main Info Section -->
	<div class="space-y-1 min-w-0 flex-1">
		<!-- Header: Title & Website URL Link -->
		<div class="flex items-center gap-3">
			<h3 class="text-text-base font-semibold truncate text-sm tracking-tight">{item.title}</h3>
			{#if item.website}
				<a
					href={item.website.startsWith("http") ? item.website : `https://${item.website}`}
					target="_blank"
					rel="noopener noreferrer"
					class="text-xs text-accent/80 hover:text-accent hover:underline flex items-center gap-1 truncate"
				>
					{item.website.replace(/^https?:\/\//, "")}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="w-3 h-3 flex-shrink-0"
					>
						<path
							d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"
						/>
					</svg>
				</a>
			{/if}
		</div>

		<!-- Decrypted Credentials Grid -->
		<div
			class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 mt-3 pt-3 border-t border-border-subtle/40"
		>
			<!-- Username -->
			<div class="flex items-center justify-between gap-2 text-xs">
				<span class="text-text-muted font-light">Brugernavn:</span>
				<div class="flex items-center gap-2 min-w-0">
					<span class="text-text-base truncate font-medium max-w-[150px] md:max-w-[200px]">
						{#if !item.isDecrypted}
							<span class="text-text-muted font-mono tracking-widest text-[8px] select-none"
								>••••••••</span
							>
						{:else}
							{item.username || "(ingen)"}
						{/if}
					</span>
					<button
						onclick={() => handleAction("copy_username")}
						class="p-1 hover:text-accent text-text-muted transition-colors cursor-pointer"
						title="Kopier brugernavn"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							class="w-3.5 h-3.5"
						>
							<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
							<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Password -->
			<div class="flex items-center justify-between gap-2 text-xs">
				<span class="text-text-muted font-light">Adgangskode:</span>
				<div class="flex items-center gap-2 min-w-0">
					{#if !item.isDecrypted || !isPasswordVisible}
						<span class="text-text-muted font-mono tracking-widest text-[8px] select-none">
							••••••••••••••••
						</span>
					{:else}
						<span class="text-text-base font-mono tracking-wide font-medium">
							{item.password}
						</span>
					{/if}

					<!-- Toggle Visibility Button -->
					<button
						onclick={() => handleAction("show")}
						class="p-1 hover:text-accent text-text-muted transition-colors cursor-pointer"
						title={isPasswordVisible ? "Skjul adgangskode" : "Vis adgangskode"}
					>
						{#if isPasswordVisible && item.isDecrypted}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								class="w-3.5 h-3.5"
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
								class="w-3.5 h-3.5"
							>
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
								<circle cx="12" cy="12" r="3" />
							</svg>
						{/if}
					</button>

					<!-- Copy Password Button -->
					<button
						onclick={() => handleAction("copy_password")}
						class="p-1 hover:text-accent text-text-muted transition-colors cursor-pointer"
						title="Kopier adgangskode"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							class="w-3.5 h-3.5"
						>
							<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
							<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Actions Column -->
	<div
		class="flex items-center gap-2 self-end md:self-center opacity-70 group-hover:opacity-100 transition-opacity"
	>
		<button
			onclick={() => onDelete(item)}
			class="p-2 border border-border-subtle text-text-muted hover:text-red-500 hover:border-red-500/30 transition-all duration-200 cursor-pointer"
			title="Slet"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="w-4 h-4"
			>
				<polyline points="3 6 5 6 21 6" />
				<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
				<line x1="10" y1="11" x2="10" y2="17" />
				<line x1="14" y1="11" x2="14" y2="17" />
			</svg>
		</button>
	</div>
</div>
