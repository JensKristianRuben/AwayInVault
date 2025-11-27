<script>
  import { Router, Route } from "svelte-routing";
  import { onMount } from "svelte";
  import { user } from "./stores/clientAuth";
  import LoginAndRegisterPage from "./pages/LoginAndRegisterPage/LoginAndRegisterPage.svelte";
  import PasswordPage from "./pages/PasswordPage/PasswordPage.svelte";
  import ActivationPage from "./pages/ActivationPage/ActivationPage.svelte";
  import toastr from "toastr";
  import PrivateRouteGuard from "./components/PrivateRouteGuard.svelte";

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

  <PrivateRouteGuard path="/passwords" component={PasswordPage} />
  
  <!-- <Route path="/passwords">
    <PasswordPage />
  </Route> -->
</Router>
