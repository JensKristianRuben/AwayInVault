<script lang="ts">
	import "../app.css";
	import favicon from "$lib/assets/favicon.png";
	import { Toaster } from "svelte-sonner";
	import { onMount } from "svelte";
	import { onNavigate } from "$app/navigation";

	let { children } = $props();

	let toasterTheme = $state<"dark" | "light">("dark");

	onNavigate((navigation) => {
		if (!(document as any).startViewTransition) return;

		const from = navigation.from?.route.id;
		const to = navigation.to?.route.id;

		// Determine slide direction
		let isBack = false;
		if (to === "/" && (from === "/www" || from === "/biometric" || from === "/zero-knowledge")) {
			isBack = true;
		}

		if (isBack) {
			document.documentElement.classList.add("view-transition-back");
			document.documentElement.classList.remove("view-transition-forward");
		} else {
			document.documentElement.classList.add("view-transition-forward");
			document.documentElement.classList.remove("view-transition-back");
		}

		return new Promise<void>((resolve) => {
			(document as any).startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

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
