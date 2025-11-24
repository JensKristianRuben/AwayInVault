<script>
  import { Router, Route } from "svelte-routing";
  import { onMount } from "svelte";
  import { user } from "./stores/clientAuth";
  import { get } from "svelte/store";
  import LoginAndRegisterPage from "./pages/LoginAndRegisterPage/LoginAndRegisterPage.svelte";
  import PasswordPage from "./pages/PasswordPage/PasswordPage.svelte";
  import ActivationPage from "./pages/ActivationPage/ActivationPage.svelte";
  import toastr from "toastr";

  onMount(async () => {
    try {
      const res = await fetch("/api/session", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        toastr.success("You have a SESSION my friend");
        user.set(data.user);
      } else {
        user.set(null);
        toastr.error("you DO NOT have a SESSION my friend");
      }
    } catch (err) {
      toastr.error("you DO NOT have a SESSION my friend");
      console.error("Failed to fetch session:", err);
      user.set(null);
    }
  });

  async function guard(path) {
    if (!get(user)) {
      const res = await fetch("/api/session", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        user.set(data.user);
      }
    }

    if (!get(user)) {
      window.location.href = "/#login";
      return false;
    }

    return true;
  }

  let mode = "login";

  function goToLogin() {
    mode = "login";
    window.history.replaceState(null, "", "/#login");
  }

  function goToRegister() {
    mode = "register";
    window.history.replaceState(null, "", "/#register");
  }
</script>

<Router>
  <Route path="/">
    <LoginAndRegisterPage
    {mode}
    on:goLogin={goToLogin}
    on:goRegister={goToRegister}
    />
  </Route>
  
  <Route path="/activation">
    <ActivationPage />
  </Route>

  <Route path="/passwords">
    <!-- {#if guard("/passwords")} -->
      <PasswordPage />
    <!-- {/if} -->
  </Route>

</Router>
