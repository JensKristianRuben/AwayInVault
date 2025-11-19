<script>
  import { user, redirectAfterLogin } from "../stores/clientAuth.js";
  import { get } from "svelte/store";
  import { navigate } from "svelte-routing";
  
  export let path;
  export let component;

  const currentUser = get(user);

  if (!currentUser) {
    redirectAfterLogin.set(path);

    navigate("/", { replace: true });
  }
</script>

{#if get(user)}
  <svelte:component this="{component}" />
{/if}
