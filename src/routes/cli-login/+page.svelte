<script lang="ts">
	import { onMount } from "svelte";
	import { supabase } from "$lib/utils/supabaseClient";

	let session = $state<any>(null);
	let loading = $state(true);
	let errorText = $state("");
	let port = $state("54321");
	let isApproved = $state(false);

	onMount(async () => {
		try {
			port = new URLSearchParams(window.location.search).get("port") || "54321";

			// Hent den nuværende session
			const { data, error } = await supabase.auth.getSession();
			if (error) throw error;

			session = data.session;

			// Hvis der ikke er nogen session, redirecter vi til GitHub SSO med det samme
			if (!session) {
				const currentUrl = window.location.pathname + window.location.search;
				const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(currentUrl)}`;

				await supabase.auth.signInWithOAuth({
					provider: "github",
					options: {
						redirectTo,
					},
				});
				return;
			}
		} catch (err: any) {
			errorText = "Fejl under autentificering: " + (err.message || err);
		} finally {
			loading = false;
		}
	});

	function handleApprove() {
		if (!session) return;
		isApproved = true;
		// Send tokens tilbage til den lokale CLI server
		const redirectUrl = `http://localhost:${port}/callback?access_token=${session.access_token}&refresh_token=${session.refresh_token}&expires_at=${session.expires_at}`;
		window.location.href = redirectUrl;
	}

	function handleDeny() {
		// Send dem tilbage til adgangskoderne
		window.location.href = "/passwords";
	}
</script>

<svelte:head>
	<title>Godkend CLI adgang - AwayInVault</title>
</svelte:head>

<div
	class="min-h-screen w-full flex items-center justify-center bg-bg-primary text-text-base relative overflow-hidden"
>
	<!-- Baggrunds-glød -->
	<div
		class="absolute w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
	></div>

	<div
		class="max-w-md w-full p-8 bg-bg-sidebar border border-border-subtle shadow-2xl relative z-10 text-center"
	>
		<div class="flex justify-center mb-6">
			<!-- Terminal Ikon -->
			<div
				class="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-500"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="w-8 h-8 {isApproved ? 'animate-bounce' : 'animate-pulse'}"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
					/>
				</svg>
			</div>
		</div>

		<h1 class="text-2xl font-bold tracking-tight mb-2">Forbind terminalen</h1>

		{#if loading}
			<p class="text-text-base/80 text-sm mb-4">Verificerer din session...</p>
			<div class="flex justify-center gap-1.5 mt-2">
				<div
					class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce"
					style="animation-delay: 0ms"
				></div>
				<div
					class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce"
					style="animation-delay: 150ms"
				></div>
				<div
					class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce"
					style="animation-delay: 300ms"
				></div>
			</div>
		{:else if errorText}
			<p class="text-red-500 text-sm">{errorText}</p>
			<button
				onclick={() => window.location.reload()}
				class="mt-4 inline-block px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all font-medium text-sm cursor-pointer"
			>
				Prøv igen
			</button>
		{:else if isApproved}
			<p class="text-emerald-400 text-sm mb-4">Overfører login-nøgler til din terminal...</p>
			<div class="flex justify-center gap-1.5 mt-2">
				<div
					class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce"
					style="animation-delay: 0ms"
				></div>
				<div
					class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce"
					style="animation-delay: 150ms"
				></div>
				<div
					class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce"
					style="animation-delay: 300ms"
				></div>
			</div>
		{:else}
			<p class="text-text-base/80 text-sm mb-6 leading-relaxed">
				CLI-værktøjet på din computer anmoder om adgang til dine krypterede data. Godkend kun, hvis
				du startede denne anmodning fra din egen terminal.
			</p>

			<div class="bg-bg-primary/50 border border-border-subtle/50 p-4 mb-6 rounded-none text-left">
				<div class="text-xs text-text-muted uppercase tracking-wider mb-1 font-semibold">
					Logget ind som
				</div>
				<div class="text-sm font-medium text-emerald-400 truncate">{session?.user?.email}</div>
			</div>

			<div class="space-y-3">
				<button
					onclick={handleApprove}
					class="w-full py-3 px-4 bg-emerald-500 text-bg-primary font-bold hover:bg-emerald-400 transition-all duration-300 cursor-pointer text-sm shadow-[0_0_20px_rgba(16,185,129,0.2)]"
				>
					Godkend og giv adgang
				</button>

				<button
					onclick={handleDeny}
					class="w-full py-3 px-4 border border-border-subtle text-text-base hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all duration-300 cursor-pointer text-sm font-medium"
				>
					Afvis anmodning
				</button>
			</div>
		{/if}
	</div>
</div>
