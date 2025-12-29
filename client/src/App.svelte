<script>
  import { Router, Route, navigate } from "svelte-routing";
  import { onMount } from "svelte";
  import { user } from "./stores/clientAuth";
  import LoginAndRegisterPage from "./pages/LoginAndRegisterPage/LoginAndRegisterPage.svelte";
  import PasswordPage from "./pages/PasswordPage/PasswordPage.svelte";
  import ActivationPage from "./pages/ActivationPage/ActivationPage.svelte";
  import toastr from "toastr";
  import PrivateRouteGuard from "./components/PrivateRouteGuard.svelte";
  import PasswordGeneratorPage from "./pages/PasswordGeneratorPage/PasswordGeneratorPage.svelte";
  import SecurityRapportPage from "./pages/SecurityRapportPage/SecurityRapportPage.svelte";
  import TwoFactorAuthModal from "./components/LoginAndRegisterPage/TwoFactorAuthModal.svelte";
  import TwofactorAuthentication from "./pages/TwoFactorAuthentication/TwofactorAuthentication.svelte";

  onMount(async () => {
    try {
      const res = await fetch("http://localhost:8080/api/session", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        user.set(data.user);

        if (window.location.pathname === "/") {
          navigate("/passwords", {replace: true})
        }
      } else {
        user.set(null);
      }
    } catch (err) {
      toastr.error("you DO NOT have a SESSION my friend");
      console.error("Failed to fetch session:", err);
      user.set(null);
    }
  });

  let mode = $state("login");

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


  <Route path="/activation"><ActivationPage /></Route>
  <PrivateRouteGuard path="/passwords" component={PasswordPage} />
  <PrivateRouteGuard path="/generator" component={PasswordGeneratorPage} />
  <PrivateRouteGuard path="/rapport" component={SecurityRapportPage} />
  <PrivateRouteGuard path="/twofactorauthentication" component={TwofactorAuthentication}/>
</Router>
