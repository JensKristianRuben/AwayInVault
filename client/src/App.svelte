<script>
  import { Router, Route } from "svelte-routing";
  import LoginAndRegisterPage from "./pages/LoginAndRegisterPage/LoginAndRegisterPage.svelte";
  import SuccesPage from "./pages/SuccessPage/SuccesPage.svelte";
</script>

<Router>
  
  <Route path="/">
    <LoginAndRegisterPage />
  </Route>

  <Route path="/succes">
    <SuccesPage />
  </Route>

</Router>

