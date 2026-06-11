<script>
  import { navigate } from "svelte-routing";
  import toastr from "toastr";
  import { API_URL } from "../../config/fetchConfig";

  let email = $state("");
  let isLoading = $state(false);

  async function handleResetRequest(event) {
    event.preventDefault();
    if (!email) {
      toastr.warning("Please enter your email");
      return;
    }

    isLoading = true;

    try {
      const response = await fetch(`${API_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ email }),
      });


      if (response.status === 200) {
        toastr.success(
          "Check your inbox for a reset link",
          "If the account exists, we sent an email"
        );
        
        setTimeout(() => {
            navigate("/#login");
        }, 3000);
      } else {
        toastr.error("Something went wrong. Try again later.");
      }
    } catch (error) {
      console.error(error);
      toastr.error("Could not connect to server");
    } finally {
      isLoading = false;
    }
  }

  function goBack() {
    navigate("/#login");
  }
</script>

<main class="forgot-password-container">
  <div class="background-logo"></div>

  <div class="glass-card">
    <h2 class="header-text">Reset Password</h2>
    <p class="sub-text">
      Enter your email address to receive a reset link.
    </p>

    <form onsubmit={handleResetRequest}>
      <label for="email">Email Address</label>
      <input 
        type="email" 
        id="email" 
        bind:value={email} 
        placeholder="alice@example.com" 
        disabled={isLoading}
      />

      <button type="submit" class="submit-btn" disabled={isLoading}>
        {#if isLoading}
          Sending...
        {:else}
          Send Reset Link
        {/if}
      </button>
    </form>

    <button class="back-btn" onclick={goBack}>
      Back to Login
    </button>
  </div>
</main>

<style>
  .forgot-password-container {
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

  .back-btn {
    margin-top: 20px;
    background: transparent;
    border: none;
    color: #6fbd96;
    font-weight: 600;
    cursor: pointer;
    font-family: "Montserrat", sans-serif;
    transition: color 0.3s ease;
  }

  .back-btn:hover {
    color: #00ff80;
    text-decoration: underline;
  }
</style>