<script>
  import { Router, Route } from "svelte-routing";
  import { onMount } from "svelte";
  import { user, redirectAfterLogin } from "./stores/clientAuth";
  import { get } from "svelte/store";
  import LoginAndRegisterPage from "./pages/LoginAndRegisterPage/LoginAndRegisterPage.svelte";
  import SuccesPage from "./pages/SuccessPage/SuccesPage.svelte";
  import PasswordPage from './pages/PasswordPage/PasswordPage.svelte'

  onMount(async () => {
    try {
      const res = await fetch("http://localhost:8080/api/session", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        user.set(data.user);
        console.log("All good");
      } else {
        user.set(null);
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
      user.set(null);
    }
  });

  async function guard(path) {
    if (!get(user)) {
      const res = await fetch("http://localhost:8080/api/session", {
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
  <!-- <Route path="/">
    <LoginAndRegisterPage />
  </Route> -->

  <Route path="/">
    <LoginAndRegisterPage
      {mode}
      on:goLogin={goToLogin}
      on:goRegister={goToRegister}
    />
  </Route>

  <Route path="/succes">
    {#if guard("/succes")}
      <SuccesPage />
    {/if}
  </Route>

  <Route path="/passwords">
    {#if guard("/passwords")}
      <PasswordPage />
    {/if}
  </Route>
</Router>
