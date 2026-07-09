<script lang="ts">
	import { goto } from "$app/navigation";
</script>

<svelte:head>
	<title>How it Works - AwayInVault</title>
</svelte:head>

<main
	class="min-h-screen w-full bg-bg-primary text-text-base flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden text-center"
>
	<!-- Ambient glow in background -->
	<div
		class="absolute w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
	></div>

	<div class="max-w-2xl w-full flex flex-col items-center relative z-10">
		<!-- Back Button -->
		<div class="mb-10">
			<a
				href="/"
				class="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-accent transition-colors group"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="w-4 h-4 transform group-hover:-translate-x-1 transition-transform"
				>
					<polyline points="15 18 9 12 15 6" />
				</svg>
				Back to Landing Page
			</a>
		</div>

		<!-- Content -->
		<h1
			class="text-4xl md:text-5xl font-bold tracking-tight mb-8 bg-gradient-to-r from-text-base to-accent bg-clip-text text-transparent"
		>
			How the WWW Works
		</h1>

		<div class="space-y-6 text-text-muted leading-relaxed text-sm md:text-base">
			<p>
				The World Wide Web (WWW) is basically a massive, global network of servers talking to each
				other using standardized languages and protocols. It's the ultimate open highway.
			</p>
			<p>
				When you sync your data in <span class="text-text-base font-semibold">aiv</span>, we don't
				spin up a secret telepathic link between your laptop and your phone. We just use standard
				HTTP requests to store your securely encrypted credentials in the cloud database.
			</p>
			<p>
				Because the web is open and unified, any of your authorized devices can fetch those
				encrypted payloads from anywhere on Earth. We didn't build the internet - we just use its
				beautiful architecture to keep your passwords secure and accessible.
			</p>
		</div>

		<div
			class="mt-12 pt-6 border-t border-border-subtle/50 w-full flex justify-between items-center text-xs text-text-muted"
		>
			<span>AwayInVault &copy; 2026</span>
			<span class="font-semibold text-accent uppercase tracking-wider">Zero-Knowledge</span>
		</div>
	</div>
</main>
