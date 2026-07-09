<script lang="ts">
	interface Props {
		title: string;
		paragraphs: string[];
		onBack: () => void;
	}

	let { title, paragraphs, onBack }: Props = $props();
</script>

<main
	class="min-h-screen w-full bg-bg-primary text-text-base flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden text-center"
>
	<!-- Ambient glow in background -->
	<div
		class="absolute w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
	></div>

	<!-- Back Button in top left corner (using callback for routing delegation) -->
	<div class="absolute top-20 left-20 md:top-28 md:left-28 z-20">
		<button
			onclick={onBack}
			class="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-accent transition-colors group bg-transparent border-none cursor-pointer"
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
		</button>
	</div>

	<div class="max-w-2xl w-full flex flex-col items-center relative z-10">
		<!-- Content -->
		<h1
			class="text-4xl md:text-5xl font-bold tracking-tight mb-8 bg-gradient-to-r from-text-base to-accent bg-clip-text text-transparent"
		>
			{title}
		</h1>

		<div class="space-y-6 text-text-muted leading-relaxed text-sm md:text-base">
			{#each paragraphs as paragraph}
				<p>{paragraph}</p>
			{/each}
		</div>
	</div>
</main>
