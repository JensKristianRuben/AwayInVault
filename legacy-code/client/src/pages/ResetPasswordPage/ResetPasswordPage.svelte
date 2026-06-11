<script>
  import { navigate } from "svelte-routing";
  import { onMount } from "svelte";
  import toastr from "toastr";
  import { API_URL } from "../../config/fetchConfig";

  let password = $state("");
  let confirmPassword = $state("");
  let isLoading = $state(false);
  let token = $state("");

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    token = urlParams.get("token");
    if (!token) {
      toastr.error("Missing reset token");
      navigate("/#login");
    }
  });

  async function handleNewPassword(event) {
    event.preventDefault();

    if (password.length < 8) {
        toastr.warning("Password must be at least 8 characters");
        return;
    }

    if (password !== confirmPassword) {
      toastr.warning("Passwords do not match");
      return;
    }

    isLoading = true;

    try {
      const response = await fetch(`${API_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ 
            token: token,
            newPassword: password
        }),
      });

      if (response.ok) {
        toastr.success("Your password has been updated", "Access Restored");
        
        setTimeout(() => {
          navigate("/#login");
        }, 2000);
      } else {
        const result = await response.json();
        toastr.error(result.error || "Token expired or invalid");
      }
    } catch (error) {
      console.error(error);
      toastr.error("Could not connect to server");
    } finally {
      isLoading = false;
    }
  }
</script>

<main class="reset-container">
  <div class="background-logo"></div>

  <div class="glass-card">
    <h2 class="header-text">Secure New Key</h2>
    <p class="sub-text">
      Create a new strong password to secure your vault.
    </p>

    <form onsubmit={handleNewPassword}>
      
      <label for="password">New Password</label>
      <input 
        type="password" 
        id="password" 
        bind:value={password} 
        placeholder="••••••••" 
        required
        disabled={isLoading}
      />

      <label for="confirmPassword">Repeat Password</label>
      <input 
        type="password" 
        id="confirmPassword" 
        bind:value={confirmPassword} 
        placeholder="••••••••" 
        required
        disabled={isLoading}
      />

      <button type="submit" class="submit-btn" disabled={isLoading}>
        {#if isLoading}
          Updating...
        {:else}
          Update Password
        {/if}
      </button>
    </form>
  </div>
</main>

<style>

  .reset-container {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #001a0d;
    position: relative;
    overflow: hidden;
    font-family: "Montserrat", sans-serif;
  }

  .background-logo {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 800px;
    height: 800px;
    background-image: url('./a-way-in.png'); 
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    opacity: 0.3;
  }

  .glass-card {
       position: relative;
    z-index: 10;
    width: 100%;
    max-width: 550px;
    padding: 50px;
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(111, 189, 150, 0.1);
    border-radius: 12px;
    text-align: center;
  }

  .header-text {
    color: #6fbd96;
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 10px;
    text-transform: uppercase;
    text-shadow: 0 0 15px rgba(0, 255, 128, 0.3);
  }

  .sub-text {
    color: #ccc;
    font-size: 0.95rem;
    margin-bottom: 30px;
    line-height: 1.5;
    font-weight: 300;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  label {
    text-align: left;
    color: white;
    font-weight: 500;
    font-size: 0.9rem;
    margin-left: 5px;
  }

  input {
    width: 100%;
    font-size: 16px;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    border: 1px solid transparent;
    outline: none;
    box-sizing: border-box;
    background-color: #0b1f16;
    transition: all 0.3s ease-in-out;
    font-family: "Montserrat", sans-serif;
  }

  input:focus {
    border-color: #00ff80;
    box-shadow: 0 0 20px rgba(0, 255, 128, 0.4), inset 0 0 10px rgba(0, 255, 128, 0.1);
    background-color: #182521;
  }

  .submit-btn {
    margin-top: 10px;
    padding: 15px;
    font-size: 1rem;
    font-weight: 700;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    background-color: #6fbd96;
    color: #001a0d;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .submit-btn:hover:not(:disabled) {
    background-color: #00ff80;
    transform: translateY(-2px);
    box-shadow: 0 0 25px rgba(0, 255, 128, 0.6);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: #4a6e5d;
  }
</style>