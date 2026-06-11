<script>
  import { navigate } from "svelte-routing";
  import { onMount } from "svelte";
  import { user, redirectAfterLogin } from "../../stores/clientAuth.js";
  import TwoFactorAuthModal from "./Components/TwoFactorAuthModal.svelte";
  import toastr from "toastr";
  import { API_URL } from "../../config/fetchConfig.js";

  let email = $state("jeha0003@stud.ek.dk");
  let password = $state("1234");
  let shakeForm = $state(false);
  let mode = $state("login");
  let isTwoFactorAuthModalOpen = $state(false);

  function goToLogin() {
    mode = "login";
    navigate("/#login");
  }

  function goToRegister() {
    mode = "register";
    navigate("/#register");
  }

  $effect(() => {
    if (mode === "register") document.title = "Awayinvault - Sign Up";
    else document.title = "Awayinvault - Sign in";
  });

  onMount(() => {
    const hash = window.location.hash.slice(1);
    if (hash === "login") {
      goToLogin();
    } else mode = "register";
  });

  async function handleLogin(event) {
    event.preventDefault();

    const response = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        email,
        password,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      const result = await response.json();
      toastr.error(result.error);
    }

    if (response.status === 200) {
      const result = await response.json();

      if (result.requires2FA) {
        isTwoFactorAuthModalOpen = true;
        return;
      }

      user.set(result.data);
      navigate("/passwords");
      if ($redirectAfterLogin) {
        navigate($redirectAfterLogin);
        redirectAfterLogin.set(null);
      }
    } else {
      shakeForm = true;
      setTimeout(() => (shakeForm = false), 500);
    }
  }

  let registerEmail = $state("");
  let registerPassword = $state("");
  let registerPassword2 = $state("");
  let passwordMismatch = false;

  async function register(event) {
    event.preventDefault();

    if (registerPassword !== registerPassword2) {
      passwordMismatch = true;
      toastr.error("Passwords are not matching");
      return;
    }
    passwordMismatch = false;

    const response = await fetch(`${API_URL}/api/register`, {
      method: "POST",
      headers: { "Content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        registerEmail,
        registerPassword,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      const result = await response.json();
      toastr.error("There was an error registering");

      return console.error("There was an error registering: ", result.error);
    }

    if (response.ok) {
      toastr.success(
        "Remember to activate you account - Check your mailbox!",
        "Successfully Registered!"
      );
      goToLogin();
    } else {
      toastr.error("Registration Failed");
    }
  }
</script>

<TwoFactorAuthModal
  class={isTwoFactorAuthModalOpen ? "is-open" : ""}
  onClose={() => (isTwoFactorAuthModalOpen = false)}
/>

<main
  class="login-and-register-main-container"
  class:right-active={mode === "register"}
  class:left-active={mode === "login"}
>
  <div class="info-box right-info">
    <h2 class="info-box-header">Hallo, cheif</h2>
    <p class="info-box-text">
      Join our community and unlock amazing features. Create your account in
      seconds.
    </p>
    <img src="/a-way-in.png" alt="logo" />
    <button
      type="button"
      id="goRight"
      class="side-btn right-side"
      onclick={goToRegister}>Sign up?</button
    >
  </div>

  <form class="left-form {shakeForm ? 'shake' : ''}" onsubmit={handleLogin}>
    <label for="username">Username</label>
    <input type="text" id="username" name="email" bind:value={email} />

    <label for="password">Password</label>
    <input
      type="password"
      id="password"
      name="password"
      bind:value={password}
    />
    <a class="forgot-password" href="/forgot-password">Forgot Password?</a>
    <button type="submit">Login</button>
  </form>
  <div class="info-box left-info">
    <h2 class="info-box-header">Seen you before?</h2>
    <p class="info-box-text">
      Already part of our community? Log in in seconds.
    </p>
    <img src="/a-way-in.png" alt="logo" />
    <button
      type="button"
      id="goLeft"
      class="side-btn left-side"
      onclick={goToLogin}>Already have Account?</button
    >
  </div>
  <form class="right-form" onsubmit={register}>
    <label for="email">Email</label>
    <input type="email" id="email" name="email" bind:value={registerEmail} />

    <label for="password">Password</label>
    <input
      type="password"
      id="registerPassword"
      name="registerPassword"
      bind:value={registerPassword}
    />

    <label for="password2">Repeat Password</label>
    <input
      type="password"
      id="registerPassword2"
      name="registerPassword2"
      bind:value={registerPassword2}
    />

    <button type="submit">Register</button>
  </form>
</main>

<style>
  .login-and-register-main-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    border-radius: 12px;
    overflow: hidden;
    background: #17362680;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    background: radial-gradient(circle at center, #0b2e1e 0%, #001a0d 70%);
  }

  form {
    position: absolute;
    background-color: #17362680;
    top: 0;
    width: 50%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    transition:
      transform 0.6s ease-in-out,
      opacity 0.6s ease-in-out;
    gap: 1rem;

    background: radial-gradient(circle at center, #0b2e1e 0%, #001a0d 70%);
    border: 1px solid rgba(111, 189, 150, 0.1);
    border-top: 1px solid rgba(111, 189, 150, 0.2);
  }

  .left-form {
    left: 0;
    opacity: 0;
  }

  .right-form {
    right: 0;
  }

  .info-box {
    position: absolute;
    top: 0;
    width: 50%;
    height: 100%;
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    align-items: center;
    transition:
      opacity 0.6s ease,
      transform 0.6s ease;
    font-family: "Montserrat", sans-serif;
    line-height: 1.6;
    background: radial-gradient(circle at center, #0b2e1e 0%, #001a0d 70%);
    z-index: 1;
  }

  .info-box h2 {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 2rem 0 1rem 0;
    color: #6fbd96;
    text-shadow: 0 0 15px rgba(0, 255, 128, 0.3);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .info-box p {
    font-size: 1rem;
    font-weight: 300;
    max-width: 80%;
    /* margin: 0 0 2rem 0; */
    letter-spacing: 0.5px;
  }

  .info-box button {
    transform: translateY(-50%);
    z-index: 20;
    padding: 12px 30px;
    border-radius: 8px;
    background: transparent;
    border: 2px solid #6fbd96;
    color: #ffffff;
    font-weight: 300;
    font-family: "Montserrat", sans-serif;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .info-box button:hover {
    background-color: #6fbd96;
    color: #001a0d;
    box-shadow: 0 0 15px rgba(111, 189, 150, 0.4);
    transform: translateY(-55%);
  }

  .info-box img {
    display: block;
    margin: 0 auto;
    max-width: 350px;
    width: 90%;
    height: auto;
    border-radius: 8px;
    animation: cyber-pulse 6s infinite ease-in-out;
  }

  @keyframes cyber-pulse {
    0% {
      transform: scale(1);
      filter: drop-shadow(0 0 10px rgba(0, 255, 128, 0.3));
    }
    50% {
      transform: scale(1.05);
      filter: drop-shadow(0 0 40px rgba(0, 255, 128, 0.7));
    }
    100% {
      transform: scale(1);
      filter: drop-shadow(0 0 10px rgba(0, 255, 128, 0.3));
    }
  }

  .left-info {
    left: 0;
    opacity: 1;
    background-color: #001a0d;
  }

  .right-info {
    right: 0;
    opacity: 0;
    transform: translateX(50%);
    background-color: #001a0d;
  }

  button {
    background: #28bd78;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    color: #333;
  }

  .side-btn:hover {
    background-color: #6fbd96;
    color: #001a0d;
    box-shadow: 0 0 15px rgba(111, 189, 150, 0.4);
    transform: translateY(-55%);
  }

  .right-side {
    right: 25%;
  }
  .left-side {
    left: 25%;
  }

  .right-form {
    opacity: 1;
  }
  .left-form {
    opacity: 0;
    transform: translateX(-50%);
  }

  .left-info {
    opacity: 1;
    transform: translateX(0%);
  }

  .right-info {
    opacity: 0;
    transform: translateX(100%);
  }

  .left-active .right-form {
    opacity: 0;
    transform: translateX(100%);
  }
  .left-active .right-info {
    opacity: 1;
    transform: translate(0%);
  }

  .left-active .left-info {
    opacity: 0;
    transform: translate(-100%);
  }
  .left-active .left-form {
    opacity: 1;
    transform: translateX(0%);
  }

  input {
    width: 50%;
    font-size: 18px;
    color: white;
    padding: 20px 30px;
    border-radius: 10px;
    border: 1px solid transparent;
    outline: none;
    box-sizing: border-box;
    background-color: #0b1f16;
    transition: all 0.3s ease-in-out;
    font-family: "Montserrat", Arial, Helvetica, sans-serif;
  }

  input:focus {
    border-color: #00ff80;
    box-shadow:
      0 0 20px rgba(0, 255, 128, 0.5),
      inset 0 0 10px rgba(0, 255, 128, 0.1);
    background-color: #182521;
  }

  form button[type="submit"] {
    min-width: 200px;
    padding: 12px 50px;
    font-size: 1rem;
    font-weight: 300;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    margin-top: 20px;
    background-color: #6fbd96;
    color: white;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    font-family: "Montserrat", Arial, Helvetica, sans-serif;
  }

  form button[type="submit"]:hover {
    background-color: #00ff80;
    transform: translateY(-2px);
    box-shadow: 0 0 20px rgba(0, 255, 128, 0.6);
  }

  form label {
    display: block;
    text-align: left;
    margin-bottom: 0.25rem;
    font-weight: 500;
    color: white;
    width: 50%;
    font-family: "Montserrat", Arial, Helvetica, sans-serif;
  }

  form.shake {
    animation: shake 0.5s;
    border: 2px solid red;
    border-radius: 6px;
  }

  .forgot-password {
    width: 50%;
    text-align: right;
    color: #6fbd96;
    font-family: "Montserrat", Arial, sans-serif;
    font-size: 0.9rem;
    text-decoration: none;
    margin-top: 5px;
    margin-bottom: 10px;
    transition: all 0.3s ease;
    font-weight: 500;
  }

  .forgot-password:hover {
    color: #00ff80;
    text-shadow: 0 0 10px rgba(0, 255, 128, 0.6);
    transform: translateX(-2px);
  }
  @keyframes shake {
    0% {
      transform: translateX(0px);
    }
    20% {
      transform: translateX(-10px);
    }
    40% {
      transform: translateX(10px);
    }
    60% {
      transform: translateX(-10px);
    }
    80% {
      transform: translateX(10px);
    }
    100% {
      transform: translateX(0px);
    }
  }

  @media (max-width: 768px) {
    .login-and-register-main-container {
      width: 100%;
      height: 100vh;
      border-radius: 0;
    }

    form {
      width: 100%;
      height: 50%;
      flex-direction: column;
      position: absolute;
      left: 0;
      top: 0;
    }

    .info-box {
      width: 100%;
      height: 50%;
      left: 0;
      top: 0;
      padding: 20px;
    }

    .right-form {
      opacity: 1;
      top: 50%;
    }
    .left-form {
      opacity: 0;
      transform: translateY(-100%);
    }

    .left-info {
      opacity: 1;
    }

    .right-info {
      opacity: 0;
      transform: translateX(50%);
    }

    .left-active .right-form {
      opacity: 0;
      transform: translateX(50%);
    }
    .left-active .right-info {
      opacity: 1;
      transform: translate(0%);
    }

    .left-active .left-info {
      opacity: 0;
      transform: translate(-50%);
    }
    .left-active .left-form {
      opacity: 1;
      transform: translateY(100%);
    }

    .right-side {
      top: 40%;
      right: 40%;
    }

    .left-side {
      top: 75%;
      left: 40%;
      display: block;
    }
  }
</style>
