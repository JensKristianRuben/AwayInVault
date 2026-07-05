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
		<BoidsSimulation mode="flock" numBoids={80} />
	</div>

	<!-- Minimalistisk indhold uden baggrundsbokse -->
	<div
		class="relative z-10 text-center flex flex-col items-center select-none px-4"
		in:fade={{ duration: 300 }}
	>
		<h1 class="text-8xl font-light tracking-[6px] text-text-base select-all">
			{status}
		</h1>
		<p class="text-lg text-text-muted mt-4 font-medium">
			{status === 404 ? "Siden blev ikke fundet" : message}
		</p>

		<button
			id="back-button"
			onclick={goBack}
			class="group inline-flex items-center gap-2 text-text-muted hover:text-text-base transition-colors duration-200 font-semibold text-sm mt-8 cursor-pointer bg-transparent border-none p-0 outline-none"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-200"
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
</style>
