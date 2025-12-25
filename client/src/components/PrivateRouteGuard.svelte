<script>
  import { user, redirectAfterLogin } from "../stores/clientAuth.js";
  import { navigate, Route } from "svelte-routing";


  let { path, component: Component } = $props();

  $effect(() => {
    if ($user === null) {
      redirectAfterLogin.set(path)
      navigate("/", {replace: true})
    }
  })

</script>

<Route {path} >
  {#if $user}
    <Component/>
  {/if}
</Route>
