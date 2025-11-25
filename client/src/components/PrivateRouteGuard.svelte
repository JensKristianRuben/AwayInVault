<script>
  import { user, redirectAfterLogin } from "../stores/clientAuth.js";
  import { navigate } from "svelte-routing";

  export let path;
  export let component;

  $: if ($user === null) {
    redirectAfterLogin.set(path);
    navigate("/", { replace: true });
  }
  
</script>

{#if $user}
  <svelte:component this={component} />
{:else if $user === undefined}
  <div>Loading…</div>
{/if}
