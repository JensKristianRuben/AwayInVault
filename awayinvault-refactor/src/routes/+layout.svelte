<script lang="ts">
  import "../app.css";
  import favicon from "$lib/assets/favicon.png";
  import { Toaster } from "svelte-sonner";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>Awayinvault</title>
</svelte:head>
<Toaster richColors position="bottom-right" />

<div class="flex">
  <!-- Main Content -->
  <main class="ml-16 min-h-screen w-full">
    {@render children()}
  </main>
</div>
