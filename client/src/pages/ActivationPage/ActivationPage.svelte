<script>
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import toastr from "toastr";
  import { API_URL } from "../../config/fetchConfig";

  let message = $state("Activating account...");
  let isFinished = $state(false);

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    await new Promise(resolve => setTimeout(resolve, 500));

    if (!token) {
      message = "No activation token found.";
      isFinished = true;
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/activation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        message = "Success! Your account is now activated.";
        toastr.success(message);
      } else {
        message = data.error || "Activation failed";
        toastr.error(message);
      }
    } catch (err) {
      console.error(err);
      message = "Connection error: Activation failed";
      toastr.error(message);
    } finally {
        isFinished = true;
    }
  });

  function goToLogin() {
    navigate("/#login", { replace: true });
  }
</script>

<div class="page-container">
  <div class="content-card">
    <img src="/a-way-in.png" alt="AwayinVault Logo" class="logo" />
    
    <h1>{message}</h1>

    <button class="login-btn" onclick={goToLogin}>
        Go to Login
    </button>
  </div>
</div>

<style>
  .page-container {
    height: 100vh;
    width: 100vw;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #001a0d;
    color: white;
    font-family: "Montserrat", sans-serif;
  }

  .content-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    gap: 30px;
    max-width: 500px;
    text-align: center;
  }

  .logo {
    width: 250px;
    height: auto;
    
  }

  h1 {
    font-size: 2.5rem;
    color: #ffffff;
    margin: 0;
    font-weight: 300;
  }

  .login-btn {
    background-color: #6fbd96;
    color: #001a0d;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.2s, background-color 0.2s;
  }

  .login-btn:hover {
    background-color: #00ff80;
    transform: scale(1.05);
  }
</style>