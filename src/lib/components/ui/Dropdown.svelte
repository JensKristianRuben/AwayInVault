<script lang="ts">
	import { onMount } from "svelte";

	interface Option {
		value: string;
		label: string;
	}

	let {
		value = $bindable(""),
		options = [],
		placeholder = "Select...",
		showCreateOption = false,
		createLabel = "+ Create New...",
		onSelect,
		onCreate,
	}: {
		value?: string;
		options: Option[];
		placeholder?: string;
		showCreateOption?: boolean;
		createLabel?: string;
		onSelect?: (value: string) => void;
		onCreate?: () => void;
	} = $props();

	let isOpen = $state(false);
	let dropdownRef = $state<HTMLElement | null>(null);

	// Get current active label
	let selectedLabel = $derived(() => {
		const found = options.find((opt) => opt.value === value);
		return found ? found.label : placeholder;
	});

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	function handleSelect(val: string) {
		value = val;
		isOpen = false;
		if (onSelect) onSelect(val);
	}

	function handleCreate() {
		isOpen = false;
		if (onCreate) onCreate();
	}

	// Close on click outside
	function handleClickOutside(event: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
			isOpen = false;
		}
	}

	onMount(() => {
		document.addEventListener("click", handleClickOutside);
		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	});
</script>

<div class="relative inline-block w-full" bind:this={dropdownRef}>
	<!-- Select Box -->
	<button
		type="button"
		onclick={toggleDropdown}
		class="w-full bg-bg-sidebar border border-border-subtle hover:border-accent text-text-base text-sm px-3 py-2 rounded-none flex items-center justify-between focus:outline-none transition-colors cursor-pointer"
		aria-haspopup="listbox"
		aria-expanded={isOpen}
	>
		<span class="truncate">{selectedLabel()}</span>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="w-4 h-4 text-text-muted transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
		>
			<polyline points="6 9 12 15 18 9" />
		</svg>
	</button>

	<!-- Options List -->
	{#if isOpen}
		<div
			class="absolute right-0 left-0 mt-1 bg-bg-sidebar border border-border-subtle shadow-lg z-50 max-h-60 overflow-y-auto focus:outline-none rounded-none"
			role="listbox"
		>
			<div class="py-1">
				{#each options as opt}
					<button
						type="button"
						onclick={() => handleSelect(opt.value)}
						class="w-full text-left px-3 py-2 text-sm text-text-base hover:bg-accent hover:text-bg-sidebar transition-colors cursor-pointer truncate {value ===
						opt.value
							? 'bg-accent/10 text-accent font-semibold'
							: ''}"
						role="option"
						aria-selected={value === opt.value}
					>
						{opt.label}
					</button>
				{/each}

				{#if showCreateOption}
					<div class="border-t border-border-subtle my-1"></div>
					<button
						type="button"
						onclick={handleCreate}
						class="w-full text-left px-3 py-2 text-sm text-accent hover:bg-accent hover:text-bg-sidebar transition-colors font-medium cursor-pointer truncate"
						role="option"
						aria-selected="false"
					>
						{createLabel}
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
