<script lang="ts">
	import "../app.css";
	import favicon from "$lib/assets/favicon.png";
	import { Toaster } from "svelte-sonner";
	import { onMount } from "svelte";

	let { children } = $props();

	let toasterTheme = $state<"dark" | "light">("dark");

	onMount(() => {
		const updateTheme = () => {
			toasterTheme = document.documentElement.classList.contains("light") ? "light" : "dark";
		};

		updateTheme();

		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.attributeName === "class") {
					updateTheme();
				}
			}
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		return () => {
			observer.disconnect();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Awayinvault</title>
</svelte:head>
<Toaster richColors position="bottom-right" theme={toasterTheme} />

<div class="w-full">
	<!-- Main Content -->
	{@render children()}
</div>
