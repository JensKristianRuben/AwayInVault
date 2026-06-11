<script>
  import { Router, Route, navigate } from "svelte-routing";
  import { onMount } from "svelte";
  import { user } from "./stores/clientAuth";
  import LoginAndRegisterPage from "./pages/LoginAndRegisterPage/LoginAndRegisterPage.svelte";
  import PasswordPage from "./pages/PasswordPage/PasswordPage.svelte";
  import ActivationPage from "./pages/ActivationPage/ActivationPage.svelte";
  import toastr from "toastr";
  import { configureToastr } from "./config/toastrConfig.js";
  import PrivateRouteGuard from "./components/PrivateRouteGuard.svelte";
  import PasswordGeneratorPage from "./pages/PasswordGeneratorPage/PasswordGeneratorPage.svelte";
  import SecurityRapportPage from "./pages/SecurityRapportPage/SecurityRapportPage.svelte";
  import TwofactorAuthentication from "./pages/TwoFactorAuthentication/TwofactorAuthentication.svelte";
  import ForgotPasswordPage from "./pages/ForgotPasswordpage/ForgotPasswordPage.svelte";
  import ResetPasswordPage from "./pages/ResetPasswordPage/ResetPasswordPage.svelte";
  import { API_URL } from "./config/fetchConfig";

  onMount(async () => {
    try {
      const res = await fetch(`${API_URL}/api/session`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        user.set(data.user);

        if (window.location.pathname === "/") {
          navigate("/passwords", { replace: true });
        }
      } else {
        user.set(null);
      }
    } catch (err) {
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

  configureToastr();
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
  <Route path="/forgot-password"><ForgotPasswordPage /></Route>
  <Route path="/reset-password"><ResetPasswordPage /></Route>
  <PrivateRouteGuard path="/passwords" component={PasswordPage} />
  <PrivateRouteGuard path="/generator" component={PasswordGeneratorPage} />
  <PrivateRouteGuard path="/rapport" component={SecurityRapportPage} />
  <PrivateRouteGuard
    path="/twofactorauthentication"
    component={TwofactorAuthentication}
  />
</Router>
