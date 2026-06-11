<script>
  import { user, redirectAfterLogin } from "../stores/clientAuth.js";
  import { navigate, Route, useLocation } from "svelte-routing";

  let { path, component: Component } = $props();

  const location = useLocation();

  $effect(() => {    
    if ($user === null && $location.pathname === path) {
      redirectAfterLogin.set(path);
      navigate("/", { replace: true });
    }
  });
</script>

<Route {path}>
  {#if $user}
    <Component />
  {/if}
</Route>