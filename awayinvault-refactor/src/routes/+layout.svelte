<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.png';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<div class="flex">
<nav class="fixed left-0 top-0 h-screen w-16 bg-bg-sidebar transition-all duration-300 ease-in-out hover:w-64
      z-50 overflow-hidden shadow-xl">
		<a href="/passwords">Passwords</a>
</nav>
</div>