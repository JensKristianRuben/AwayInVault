<script>
  import Sidebar from "../../components/Sidebar.svelte";
  import toastr from "toastr";
  import { user } from "../../stores/clientAuth";
  import SheildIcon from "../../components/icons/SheildIcon.svelte";
  import { API_URL } from "../../config/fetchConfig";

  let qrcode = $state("");
  let secretCode = $state("");
  let otpValue = $state(["", "", "", "", "", ""]);
  let inputFeilds = [];
  let qrCodeSection = $state();
  let sixDigitCodeSection = $state();;


  $effect(() => {
    if ($user.twoFactorEnabled) {
        
    }
  });

  async function handleSetUp2FA() {
    const response = await fetch(`${API_URL}/api/setup-2fa`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.ok) {
      const result = await response.json();

      qrcode = result.qrcode;
      secretCode = result.secret;

      setTimeout(() => {
        qrCodeSection.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      toastr.error("Something happen - please try again");
    }
  }

  async function handleVerifing2FA() {
    setTimeout(() => {
      sixDigitCodeSection.scrollIntoView({ behavior: "smooth" });
    }, 100);
    setTimeout(() => inputFeilds[0].focus(), 50);
  }

  function handleInputKeydown(event, index) {
    if (event.key === "Backspace") {
      if (otpValue[index] === "" && index > 0) {
        inputFeilds[index - 1]?.focus();
      }
    }
  }

  async function handleInput(event, index) {
    const value = event.target.value;
    if (value.length === 1) {
      if (index < 5) {
        inputFeilds[index + 1]?.focus();
      }
    }

    const fullCode = otpValue.join("");

    if (fullCode.length === 6) {
      const response = await fetch(`${API_URL}/api/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "Application/json" },
        body: JSON.stringify({ token: fullCode, secret: secretCode }),
      });

      if (response.ok) {
        const result = await response.json();

        toastr.success("Two Factor authentication enabled. Enjoy. ");
      }
    }
  }
</script>

<Sidebar />

{#if !$user.twoFactorEnabled}
    <main>

  <h1>Start Two Factor <br /> Authentication now</h1>
  <h3>
    We use Microsoft Authenticator for added security. It’s quick, safe, and
    easy to use. Click the button to start setting up the authenticator.
  </h3>

  <button onclick={handleSetUp2FA}>Set it up</button>
</main>

<section class="qr-code-section" bind:this={qrCodeSection}>
  {#if qrcode}
    <h3>Scan this QR with the Authenticator application</h3>
    <div class="qr-box">
      <img src={qrcode} alt="2fa qr code" />
    </div>
    <h3>
      Once you’ve scanned the QR code with Microsoft Authenticator, click the
      button and enter the code.
    </h3>
    <button onclick={handleVerifing2FA}>Enter 6 digit code</button>
  {/if}
</section>
<section class="qr-code-section" bind:this={sixDigitCodeSection}>
  <h3>Put in your 6 digit code from the authenticator application</h3>
  <div class="input-feilds-wrapper">
    <input
      type="text"
      inputmode="numeric"
      maxlength="1"
      class="otp-input-box"
      bind:this={inputFeilds[0]}
      bind:value={otpValue[0]}
      oninput={(event) => handleInput(event, 0)}
      onkeydown={(event) => handleInputKeydown(event, 0)}
    />
    <input
      type="text"
      inputmode="numeric"
      maxlength="1"
      class="otp-input-box"
      bind:this={inputFeilds[1]}
      bind:value={otpValue[1]}
      oninput={(event) => handleInput(event, 1)}
      onkeydown={(event) => handleInputKeydown(event, 1)}
    />
    <input
      type="text"
      inputmode="numeric"
      maxlength="1"
      class="otp-input-box"
      bind:this={inputFeilds[2]}
      bind:value={otpValue[2]}
      oninput={(event) => handleInput(event, 2)}
      onkeydown={(event) => handleInputKeydown(event, 2)}
    />
    <input
      type="text"
      inputmode="numeric"
      maxlength="1"
      class="otp-input-box"
      bind:this={inputFeilds[3]}
      bind:value={otpValue[3]}
      oninput={(event) => handleInput(event, 3)}
      onkeydown={(event) => handleInputKeydown(event, 3)}
    />
    <input
      type="text"
      inputmode="numeric"
      maxlength="1"
      class="otp-input-box"
      bind:this={inputFeilds[4]}
      bind:value={otpValue[4]}
      oninput={(event) => handleInput(event, 4)}
      onkeydown={(event) => handleInputKeydown(event, 4)}
    />
    <input
      type="text"
      inputmode="numeric"
      maxlength="1"
      class="otp-input-box"
      bind:this={inputFeilds[5]}
      bind:value={otpValue[5]}
      oninput={(event) => handleInput(event, 5)}
      onkeydown={(event) => handleInputKeydown(event, 5)}
    />
  </div>
</section>
{:else }
<main>
    <h1>Account Secured!</h1>
    <h3>2FA is successfully enabled. Your data is now much better protected against unauthorized access.</h3>
    <SheildIcon/>
</main>

{/if}


<style>
  main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  h1 {
    text-align: center;
  }

  h3 {
    margin: 0;
    max-width: 600px;
    text-align: center;
  }
  button {
    border: 1px solid #6fbd96;
    border-radius: 50px;
    background-color: #6fbd96;
    color: white;
    font-size: 20px;
    padding: 20px;
    font-family: "Montserrat", sans-serif;
    font-weight: 300;
    margin-top: 50px;
    box-shadow: 0 0 20px rgba(129, 199, 166, 0.4);
    transition: transform 0.5s ease;
  }

  button:hover {
    transform: scale(1.1);
  }

  .qr-code-section {
    height: 100vh;
  }

  section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .qr-box img {
    width: 250px;
    height: 250px;
    border-radius: 10px;
    border: 5px solid white;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    margin: 50px;
  }

  .otp-input-box {
    width: 100px;
    height: 100px;
    background-color: #001a0d;
    border: none;
    justify-items: center;
    font-size: 50px;
    color: white;
    border-radius: 10px;
    box-shadow: 0 0 20px rgba(129, 199, 166, 0.4);
  }

  .otp-input-box:focus {
    outline: none;
    border: 2px solid #6fbd96;
  }
  .input-feilds-wrapper {
    display: flex;
    flex-direction: row;
    gap: 20px;
    margin: 50px;
  }
</style>
