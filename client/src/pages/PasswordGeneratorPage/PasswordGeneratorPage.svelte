<script>
  import Sidebar from "../../components/Sidebar.svelte";
  import GenerateIcon from "../../components/icons/GenerateIcon.svelte";
  import CopyIcon from "../../components/icons/CopyIcon.svelte";
  import {
    generateStandardPassword,
    calculateStrength,
  } from "./generatingMethods.js";

  import { onMount } from "svelte";
  import { io } from "socket.io-client";
  import toastr from "toastr";

  let password = $state("");
  let socket;
  let strength = $state(0);
  let passwordLength = $state(8);
  let strengthText = $derived(() => {
    if (strength === 1) return "WEAK";
    if (strength === 2) return "FAIR";
    if (strength === 3) return "GOOD";
    if (strength === 4) return "STRONG";
    return "";
  });
  let method = $state("standard");
  $effect(() => {
    if (password && password !== "Loading..." && password !== "ERROR") {
      strength = calculateStrength(password);
    }
  });

  function handleSliderChange() {
    if (method === "standard") {
      password = generateStandardPassword(passwordLength);
    }

    if (method === "random-thunder") {
      clearTimeout(debounceTimer);

      if (password !== "...") password = "...";
      debounceTimer = setTimeout(() => {
        socket.emit("get-external-password", {
          length: passwordLength,
        });
      }, 500);
    }
  }
  onMount(() => {
    socket = io("http://localhost:8080");

    socket.on("server-password", (newPassword) => {
      password = newPassword;
    });

    socket.on("server-error", (msg) => {
      console.error(msg);
      password = "ERROR";
    });

    return () => socket.disconnect();
  });

  function handleCopy() {
    if (password !== "" && password !== "Loading...") {
      navigator.clipboard.writeText(password);
      toastr.succes("Password copied");
    }
  }

  let debounceTimer;
  function chooseMethod() {
    if (method === "standard") {
      password = generateStandardPassword(passwordLength);
      strength = calculateStrength(password);
    }
    if (method === "random-thunder") {
      clearTimeout(debounceTimer);

      if (password !== "...") password = "...";
      debounceTimer = setTimeout(() => {
        socket.emit("get-external-password", {
          length: passwordLength,
        });
      }, 500);
    }
  }
</script>

<Sidebar />

<main>
  <div class="password-generator-container">
    <div class="password-text-and-button-wrapper">
      <p>{password}</p>
      <CopyIcon onclick={handleCopy} />
      <GenerateIcon onclick={chooseMethod} />
    </div>
    <div class="strength-bar-info">
      <p>Strength</p>
      <p id="strength-value">{strengthText()}</p>
    </div>
    <div class="strength-bar">
      <div class="bar {strength >= 1 ? 'level-' + strength : ''}"></div>
      <div class="bar {strength >= 2 ? 'level-' + strength : ''}"></div>
      <div class="bar {strength >= 3 ? 'level-' + strength : ''}"></div>
      <div class="bar {strength >= 4 ? 'level-' + strength : ''}"></div>
    </div>
  </div>

  <div class="password-length-container">
    <label for="passwordLength" class="password-lengt-label"
      >Password Length: {passwordLength}</label
    >
    <input
      type="range"
      name="passwordLength"
      id="passwordLength"
      class="password-length-slider"
      min="8"
      max="32"
      bind:value={passwordLength}
      oninput={handleSliderChange}
    />
  </div>
  <div class="generate-option-grid">
    <button
      class="generate-option {method === 'standard' ? 'selected' : ''}"
      onclick={() => (method = "standard")}
    >
      <h3>Standard randomness</h3>
      <p>Kinda fake randomness</p>
    </button>
    <button
      class="generate-option {method === 'random-thunder' ? 'selected' : ''}"
      onclick={() => (method = "random-thunder")}
    >
      <h3>Thunder Random</h3>
      <p>Computers fake it, nature doesn't.</p>
    </button>
    <button
      class="generate-option {method === '3' ? 'selected' : ''}"
      onclick={() => (method = "3")}
    >
      <h3>3</h3>
      <p></p>
    </button>
  </div>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  p {
    width: 100%;
    padding: 20px;
    margin: 0;
    color: white;
  }
  .password-generator-container {
    width: 700px;
    border: 1px solid #6fbd96;
    border-radius: 10px;
    box-shadow: 0 0 15px rgba(0, 255, 128, 0.2);
    background-color: #001a0d;
    padding: 20px;
  }

  .password-text-and-button-wrapper {
    display: flex;
    flex-direction: row;
    width: 100%;
  }

  .password-text-and-button-wrapper p {
    background-color: #063e22;
    padding: 20px;
    box-shadow: 0 0 15px rgba(0, 255, 128, 0.2);
    border-radius: 10px;
  }

  .generate-option-grid {
    margin-top: 50px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    padding: 20px;
    justify-items: center;
  }

  .generate-option {
    width: 200px;
    height: 100px;
    border: 1px solid #6fbd96;
    border-radius: 10px;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    cursor: pointer;
  }

  .selected {
    border: 2px solid #00ff80;
    background-color: rgba(0, 255, 128, 0.1);
    color: white;
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(0, 255, 128, 0.2);
  }

  .strength-bar-info {
    display: flex;
    flex-direction: row;
    justify-content: space-around;
  }

  .strength-bar {
    height: 15px;
    flex-grow: 1;
    background-color: transparent;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: row;
  }

  .bar {
    height: 10px;
    flex-grow: 1;
    background-color: transparent;

    transition:
      background-color 0.3s ease-in-out,
      border-color 0.3s ease-in-out,
      box-shadow 0.3s ease;
  }
  .level-1 {
    background-color: #f64a4a;
    border-color: #f64a4a;
    box-shadow: 0 0 10px rgba(246, 74, 74, 0.4);
  }

  .level-2 {
    background-color: #fb7c58;
    border-color: #fb7c58;
    box-shadow: 0 0 10px rgba(251, 124, 88, 0.4);
  }

  .level-3 {
    background-color: #f8cd65;
    border-color: #f8cd65;
    box-shadow: 0 0 10px rgba(248, 205, 101, 0.4);
  }

  .level-4 {
    background-color: #00ff80;
    border-color: #00ff80;
    box-shadow: 0 0 10px rgba(0, 255, 128, 0.4);
  }

  #strength-value {
    display: flex;
    justify-content: flex-end;
    color: white;
    font-weight: bold;
    font-size: 1rem;
  }

  .password-length-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 20px;
  }

  .password-lengt-label {
    width: 600px;
    margin-top: 20px;
    color: white;
    font-size: 1.2rem;
    font-weight: 700;
    font-family: "Montserrat", sans-serif;
  }

  .password-length-slider {
    -webkit-appearance: none;
    width: 600px;
    margin-top: 10px;
    background-color: #063e22;
  }
  .password-length-slider::-webkit-slider-runnable-track {
    height: 6px;
    background: #063e22;
    border-radius: 10px;
    cursor: pointer;
  }

  .password-length-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    margin-top: -7px;
    width: 20px;
    height: 20px;
    background: #00ff80;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(0, 255, 128, 0.6);
  }

  .password-length-slider:hover::-webkit-slider-thumb {
    box-shadow: 0 0 12px rgba(0, 255, 128, 0.9);
  }
</style>
