<script>
  import Sidebar from "../../components/sidebar.svelte";
  import GenerateIcon from "../../components/icons/GenerateIcon.svelte";
  import CopyIcon from "../../components/icons/CopyIcon.svelte";

  import { onMount } from "svelte";
  import { io } from "socket.io-client";
  import toastr from "toastr";


  let password = $state("")
  let socket;

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
  
  function handleGenerateRandomThunderPassword() {
    password = "Loading...";
    socket.emit("get-external-password");
  }

  function handleCopy() {
    if (password !== "" && password !== "Loading...") {
      navigator.clipboard.writeText(password);
      toastr.succes("Password copied")
    }
  }
</script>

<Sidebar />

<main>
  <div class="password-generator-container">
    <div class="password-text-and-button-wrapper">
      <p>{password}</p>
      <CopyIcon />
      <GenerateIcon 
      onclick={handleGenerateRandomThunderPassword}
      />  
    </div>
  </div>

  <div class="generate-option-grid">
    <div class="generate-option">1</div>
    <div class="generate-option">2</div>
    <div class="generate-option">3</div>
    <div class="generate-option">4</div>
    <div class="generate-option">5</div>
    <div class="generate-option">6</div>
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
    width: 500px;
    border: 1px solid #6fbd96;
    background-color: #001a0d;
  }

  .password-text-and-button-wrapper {
    display: flex;
    flex-direction: row;
    width: 100%;
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
    cursor: pointer;
  }
</style>
