<script lang="ts">
	import { goto } from "$app/navigation";
	import type { VaultItem } from "$lib/types/vault";
	import { getDomain } from "$lib/utils/url";
	import { makeItemSlug } from "$lib/utils/slug";

	let { item } = $props<{
		item: VaultItem;
	}>();

	let imageFailed = $state(false);

	$effect(() => {
		// Reset image failure state if the website changes
		item.website;
		imageFailed = false;
	});

	function openItem() {
		goto(`/passwords/${makeItemSlug(item)}`);
	}
</script>

<div
	role="button"
	tabindex="0"
	onclick={openItem}
	onkeydown={(e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			openItem();
		}
	}}
	class="bg-bg-sidebar border border-border-subtle p-4 hover:border-accent/40 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.06)] transition-all duration-300 flex items-center gap-3 group cursor-pointer focus:outline-none focus:border-accent"
>
	<!-- Favicon or Fallback Icon -->
	<div
		class="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-bg-primary border border-border-subtle/50 rounded-sm overflow-hidden"
	>
		{#if item.website && getDomain(item.website) && !imageFailed}
			<img
				src="https://www.google.com/s2/favicons?sz=64&domain={getDomain(item.website)}"
				alt=""
				class="w-full h-full object-contain p-1"
				onerror={() => {
					imageFailed = true;
				}}
			/>
		{:else}
			<!-- Globe/Website SVG Fallback -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="w-4 h-4 text-text-muted"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="2" y1="12" x2="22" y2="12" />
				<path
					d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
				/>
			</svg>
		{/if}
	</div>

	<!-- Title & Website -->
	<div class="min-w-0 flex-1 space-y-0.5">
		<h3 class="text-text-base font-semibold truncate text-sm tracking-tight">{item.title}</h3>
		{#if item.website}
			<a
				href={item.website.startsWith("http") ? item.website : `https://${item.website}`}
				target="_blank"
				rel="noopener noreferrer"
				onclick={(e) => e.stopPropagation()}
				class="text-xs text-accent/80 hover:text-accent hover:underline inline-flex items-center gap-1 truncate max-w-full"
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
					<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
				</svg>
			</a>
		{/if}
	</div>

	<!-- Affordance chevron -->
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="w-4 h-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all flex-shrink-0"
	>
		<polyline points="9 18 15 12 9 6" />
	</svg>
</div>
