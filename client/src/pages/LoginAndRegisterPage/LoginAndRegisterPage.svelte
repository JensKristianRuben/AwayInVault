<script>
  import { navigate } from "svelte-routing";
  import { onMount } from "svelte";
  import { user, redirectAfterLogin } from "../../stores/clientAuth.js";

  export let mode;

  function goToLogin() {
    mode = "login";
    navigate("/#login");
  }

  function goToRegister() {
    mode = "register";
    navigate("/#register");
  }

  $: document.title = getTitle(mode);

  function getTitle(mode) {
    if (mode === "register") return "Awayinvault - Sign Up";
    return "Awayinvault - Sign in";
  }

  onMount(() => {
    const hash = window.location.hash.slice(1);
    if (hash === "login") mode = "login";
    else mode = "register";
  });

  let email = "alice@example.com";
  let password = "123456789";
  let shakeForm = false;

  async function handleLogin(event) {
    event.preventDefault();

    const response = await fetch("http://localhost:8080/api/login", {
      method: "POST",
      headers: { "Content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        email,
        password,
      }),
      credentials: "include",
    });

    if (response.status === 200) {
      const result = await response.json();
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

  let registerEmail = "";
  let registerPassword = "";
  let registerPassword2 = "";
  let passwordMismatch = false;

  async function register(event) {
    event.preventDefault();

    if (registerPassword !== registerPassword2) {
      passwordMismatch = true;
      return;
    }
    passwordMismatch = false;

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        registerEmail,
        registerPassword,
      }),
      credentials: "include",
    });

    if (response.ok) {
      navigate("/#login");
    } else {
      console.error("Registration failed");
    }
  }
</script>

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
      on:click={goToRegister}>Sign up?</button
    >
  </div>

  <form class="left-form {shakeForm ? 'shake' : ''}" on:submit={handleLogin}>
    <label for="username">Username</label>
    <input type="text" id="username" name="email" bind:value={email} />

    <label for="password">Password</label>
    <input
      type="password"
      id="password"
      name="password"
      bind:value={password}
    />
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
      on:click={goToLogin}>Already have Account?</button
    >
  </div>
  <form class="right-form" on:submit={register}>
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
    font-family: "Roboto", "Helvetica Neue", Helvetica, Arial, sans-serif;
    line-height: 1.6;
  }

  .info-box h2 {
    font-size: 2rem;
    font-weight: 700;
    margin: 2rem 0 1rem 0;
  }

  .info-box p {
    font-size: 1rem;
    font-weight: 300;
    max-width: 80%;
    margin: 0 0 2rem 0;
    letter-spacing: 0.5px;
  }

  .info-box button {
    margin-top: auto;
    padding: 12px 24px;
    border-radius: 8px;
    background-color: #ffffff;
    color: #333;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition:
      transform 0.2s ease,
      background 0.2s ease;
  }

  .info-box img {
    display: block;
    margin: 1rem auto;
    max-width: 150px;
    height: auto;
    border-radius: 8px;
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
    background: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    color: #333;
  }

  .side-btn {
    transform: translateY(-50%);
    padding: 12px 22px;
    border-radius: 8px;
    background: #fff;
    font-weight: bold;
    border: none;
    cursor: pointer;
    z-index: 20;
    transition:
      opacity 0.4s ease,
      transform 0.4s ease;
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
    padding: 8px 12px;
    border-radius: 6px;
    border: none;
    outline: none;
    box-sizing: border-box;
  }

  form button[type="submit"] {
    margin-top: 12px;
    background: white;
    color: #333;
    font-weight: bold;
    border-radius: 6px;
    padding: 10px 20px;
    cursor: pointer;
  }

  form label {
    display: block;
    text-align: left;
    margin-bottom: 0.25rem;
    font-weight: 500;
    color: white;
    width: 50%;
  }

  form.shake {
    animation: shake 0.5s;
    border: 2px solid red;
    border-radius: 6px;
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
