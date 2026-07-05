<script lang="ts">
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import BoidsSimulation from "$lib/components/landingpage/BoidsSimulation.svelte";
	import { fade } from "svelte/transition";

	// Statuskode og fejlmeddelelse
	const status = $derived(page.status || 404);
	const message = $derived(page.error?.message || "Siden blev ikke fundet");

	function goBack() {
		if (
			typeof document !== "undefined" &&
			document.referrer &&
			document.referrer.startsWith(window.location.origin)
		) {
			window.history.back();
		} else {
			goto("/");
		}
	}
</script>

<svelte:head>
	<title>{status} - Side ikke fundet | AwayInVault</title>
</svelte:head>

<main
	class="relative w-screen h-screen overflow-hidden bg-bg-main flex items-center justify-center font-sans text-text-base"
>
	<!-- Partikelsimulationen kører i baggrunden -->
	<div class="absolute inset-0 pointer-events-none">
		<BoidsSimulation mode="flock" />
	</div>

	<!-- Glassmorphism Container -->
	<div
		class="relative z-10 max-w-md w-full mx-4 p-8 rounded-2xl bg-bg-sidebar/75 backdrop-blur-md border border-border-subtle shadow-2xl text-center flex flex-col items-center gap-6"
		in:fade={{ duration: 300 }}
	>
		<!-- Statuskode cirkel -->
		<div
			class="w-20 h-20 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent text-3xl font-extrabold shadow-inner"
		>
			{status}
		</div>

		<!-- Tekster -->
		<div class="space-y-2">
			<h1 class="text-2xl font-bold tracking-tight text-text-base">
				{status === 404 ? "Siden kunne ikke findes" : "Der opstod en fejl"}
			</h1>
			<p class="text-sm text-text-muted leading-relaxed">
				{status === 404
					? "Boid-partiklerne søgte overalt i boksen, men denne sti eksisterer ikke."
					: message}
			</p>
		</div>

		<!-- Knap til at gå tilbage -->
		<button id="back-button" class="btn-back mt-2" onclick={goBack}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="w-4 h-4 mr-2"
			>
				<line x1="19" y1="12" x2="5" y2="12"></line>
				<polyline points="12 19 5 12 12 5"></polyline>
			</svg>
			Tag mig tilbage
		</button>
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: var(--color-bg-main);
	}

	.btn-back {
		font-size: 13px;
		font-weight: 600;
		padding: 10px 24px;
		border-radius: 8px;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
		border: 1px solid var(--color-accent);
		background-color: var(--color-accent);
		color: #ffffff;
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
		outline: none;
	}

	.btn-back:hover {
		background-color: #059669;
		border-color: #059669;
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(16, 185, 129, 0.25);
	}
</style>
