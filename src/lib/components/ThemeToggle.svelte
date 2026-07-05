<script lang="ts">
	import { onMount } from "svelte";
	import { supabase } from "$lib/utils/supabaseClient";

	let isDark = $state(true);

	onMount(() => {
		const checkTheme = () => {
			isDark = !document.documentElement.classList.contains("light");
		};

		checkTheme();

		const observer = new MutationObserver(checkTheme);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		return () => {
			observer.disconnect();
		};
	});

	async function toggleTheme() {
		isDark = !isDark;
		const newTheme = isDark ? "dark" : "light";

		localStorage.setItem("theme", newTheme);
		if (isDark) {
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
		}

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (user) {
			await supabase.auth.updateUser({
				data: { theme: newTheme },
			});
		}
	}
</script>

<button
	onclick={toggleTheme}
	class="flex items-center w-full p-3 rounded-lg hover:bg-accent/10 transition-colors duration-200 group/toggle text-text-base focus:outline-none cursor-pointer"
	aria-label="Toggle dark mode"
>
	<div class="w-10 flex-shrink-0 flex justify-center text-accent">
		{#if isDark}
			<!-- Moon Icon -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="w-6 h-6"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
				/>
			</svg>
		{:else}
			<!-- Sun Icon -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="w-6 h-6"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M12 3v2.25m0 13.5V21m8.966-8.966h-2.25m-13.5 0h-2.25m15.356-6.356l-1.591 1.591M6.783 17.217l-1.591 1.591m12.728 0l-1.591-1.591M6.783 6.783L5.192 5.192M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
				/>
			</svg>
		{/if}
	</div>
	<span
		class="ml-4 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-text-base"
	>
		{isDark ? "Dark" : "Light"}
	</span>
</button>
