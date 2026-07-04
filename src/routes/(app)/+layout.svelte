<script lang="ts">
	import favicon from "$lib/assets/favicon.png";
	import ThemeToggle from "$lib/components/ThemeToggle.svelte";
	import MasterPasswordModal from "$lib/components/MasterPasswordModal.svelte";
	import { enhance } from "$app/forms";
	import { onMount } from "svelte";
	import { page } from "$app/state";

	// Web Crypto & Supabase Session Imports
	import { supabase } from "$lib/utils/supabaseClient";
	import { cryptoSession } from "$lib/stores/cryptoSession.svelte";

	let { children } = $props();

	let currentPath = $derived(page.url.pathname);
	const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + "/");

	// Local state variables for the modal
	let showModal = $state(false);
	let isNewUser = $state(false);
	let userMetadata = $state<any>(null);

	onMount(() => {
		// Lyt efter logout/sessionsudløb og ryd nøglen med det samme
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event) => {
			if (event === "SIGNED_OUT") {
				cryptoSession.clearSession();
				showModal = true;
			}
		});

		async function initSession() {
			// 1. Tjek om vi allerede har en aktiv nøgle i vores in-memory store
			if (cryptoSession.cryptoKey) {
				return;
			}

			// 2. Hent den aktuelle bruger
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) return;

			userMetadata = user.user_metadata;

			// 3. Tjek om brugeren har sat et Master Password før (salt og verifier gemt i metadata)
			if (!userMetadata?.salt || !userMetadata?.verifier_ciphertext) {
				isNewUser = true;
			} else {
				isNewUser = false;
			}

			showModal = true;
		}

		initSession();

		return () => {
			subscription.unsubscribe();
		};
	});
</script>

<nav
	class="fixed left-0 top-0 h-screen w-16 bg-bg-sidebar transition-all duration-300 ease-in-out hover:w-64
      z-50 overflow-hidden shadow-xl border-r border-border-subtle flex flex-col items-center py-4 group"
>
	<!-- Logo/Top ikon (Micro-animation on hover) -->
	<div class="h-16 flex items-center justify-center w-full flex-shrink-0 mb-8">
		<img
			src={favicon}
			alt="Awayinvault Logo"
			class="w-10 h-10 object-contain transition-transform duration-500 group-hover:rotate-[360deg]"
		/>
	</div>

	<!-- Menu Links -->
	<div class="flex-1 flex flex-col w-full px-2 gap-y-2">
		<!-- Passwords Link -->
		<a
			href="/passwords"
			class="relative flex items-center p-3 rounded-lg transition-all duration-200
             {isActive('/passwords')
				? 'bg-accent/10 text-accent font-semibold'
				: 'text-text-muted hover:bg-accent/5 hover:text-text-base'}"
		>
			<!-- Active indicator line -->
			{#if isActive("/passwords")}
				<div class="absolute left-0 top-1/4 bottom-1/4 w-1 bg-accent rounded-r-md"></div>
			{/if}

			<div class="w-10 flex-shrink-0 flex justify-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="w-6 h-6"
				>
					<circle cx="7.5" cy="15.5" r="5.5" />
					<path d="m21 2-9.6 9.6" />
					<path d="m15.5 7.5 3 3" />
					<path d="M18 4.8 20 7" />
				</svg>
			</div>
			<span
				class="ml-4 text-text-base font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
				>Passwords</span
			>
		</a>

		<!-- Notes Link -->
		<a
			href="/notes"
			class="relative flex items-center p-3 rounded-lg transition-all duration-200
             {isActive('/notes')
				? 'bg-accent/10 text-accent font-semibold'
				: 'text-text-muted hover:bg-accent/5 hover:text-text-base'}"
		>
			<!-- Active indicator line -->
			{#if isActive("/notes")}
				<div class="absolute left-0 top-1/4 bottom-1/4 w-1 bg-accent rounded-r-md"></div>
			{/if}

			<div class="w-10 flex-shrink-0 flex justify-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="w-6 h-6"
				>
					<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
					<polyline points="14 2 14 8 20 8" />
					<line x1="16" x2="8" y1="13" y2="13" />
					<line x1="16" x2="8" y1="17" y2="17" />
					<line x1="10" x2="8" y1="9" y2="9" />
				</svg>
			</div>
			<span
				class="ml-4 text-text-base font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
				>Notes</span
			>
		</a>

		<!-- About Link -->
		<a
			href="/about"
			class="relative flex items-center p-3 rounded-lg transition-all duration-200
             {isActive('/about')
				? 'bg-accent/10 text-accent font-semibold'
				: 'text-text-muted hover:bg-accent/5 hover:text-text-base'}"
		>
			<!-- Active indicator line -->
			{#if isActive("/about")}
				<div class="absolute left-0 top-1/4 bottom-1/4 w-1 bg-accent rounded-r-md"></div>
			{/if}

			<div class="w-10 flex-shrink-0 flex justify-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="w-6 h-6"
				>
					<circle cx="12" cy="12" r="10" />
					<path d="M12 16v-4" />
					<path d="M12 8h.01" />
				</svg>
			</div>
			<span
				class="ml-4 text-text-base font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
				>About</span
			>
		</a>

		<!-- Settings Link -->
		<a
			href="/settings"
			class="relative flex items-center p-3 rounded-lg transition-all duration-200
             {isActive('/settings')
				? 'bg-accent/10 text-accent font-semibold'
				: 'text-text-muted hover:bg-accent/5 hover:text-text-base'}"
		>
			<!-- Active indicator line -->
			{#if isActive("/settings")}
				<div class="absolute left-0 top-1/4 bottom-1/4 w-1 bg-accent rounded-r-md"></div>
			{/if}

			<div class="w-10 flex-shrink-0 flex justify-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="w-6 h-6"
				>
					<path
						d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
					/>
					<circle cx="12" cy="12" r="3" />
				</svg>
			</div>
			<span
				class="ml-4 text-text-base font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
				>Settings</span
			>
		</a>
	</div>

	<!-- Bottom Actions (Theme toggle + destructive Logout) -->
	<div class="w-full px-2 mt-auto gap-y-2 flex flex-col">
		<ThemeToggle />

		<form method="POST" action="/login?/logout" use:enhance class="w-full">
			<button
				type="submit"
				class="flex items-center w-full p-3 rounded-lg hover:bg-red-500/10 transition-colors duration-200 group/logoutbtn text-text-muted hover:text-red-500 focus:outline-none cursor-pointer"
				aria-label="Logout"
			>
				<div class="w-10 flex-shrink-0 flex justify-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="w-6 h-6"
					>
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
						<polyline points="16 17 21 12 16 7" />
						<line x1="21" x2="9" y1="12" y2="12" />
					</svg>
				</div>
				<span
					class="ml-4 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
				>
					Log ud
				</span>
			</button>
		</form>
	</div>
</nav>

<main class="ml-16 min-h-screen w-full bg-bg-primary">
	{@render children()}
</main>

<!-- 4. BLOCKING MASTER PASSWORD MODAL -->
{#if showModal}
	<MasterPasswordModal {isNewUser} {userMetadata} onSuccess={() => (showModal = false)} />
{/if}
