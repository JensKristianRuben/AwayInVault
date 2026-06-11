<script>
  import { navigate } from "svelte-routing";
  import { user } from "../../../stores/clientAuth";
  import toastr from "toastr";
  import { API_URL } from "../../../config/fetchConfig";

  let { class: className, onClose } = $props();
  let otpValue = $state(["", "", "", "", "", ""]);
  let inputFeilds = [];

  $effect(() => {
    if (className.includes("is-open") && inputFeilds[0]) {
      otpValue = ["", "", "", "", "", ""];
      setTimeout(() => inputFeilds[0].focus(), 50);
    }
  });

  async function handleInput(event, index) {
    const value = event.target.value;

    if (value.length === 1) {
      if (index < 5) {
        inputFeilds[index + 1]?.focus();
      }
    }

    const fullCode = otpValue.join("");

    if (fullCode.length === 6) {
      const response = await fetch(
        `${API_URL}/api/login/verify-2fa`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({ token: fullCode }),
        }
      );

      if (!response.ok) {
        toastr.error("Wrong one time password");
        otpValue = ["", "", "", "", "", ""];
        inputFeilds[0]?.focus();
      }

      if (response.ok) {
        const result = await response.json();
        user.set(result.data);
        console.log($user);
        toastr.success("Logged in");
        navigate("/passwords");
      }
    }
  }

  function handleInputKeydown(event, index) {
    if (event.key === "Backspace") {
      if (otpValue[index] === "" && index > 0) {
        inputFeilds[index - 1]?.focus();
      }
    }
  }

  function handleModalClick(event) {
    event.stopPropagation();
  }

  function handleOnClose() {
    onClose?.();
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      handleOnClose();
    }
  }
</script>

<div
  class="backlay {className}"
  onclick={onClose}
  onkeydown={handleKeydown}
  role="button"
  tabindex="0"
>
  <h2 class="two-factor-header">Two Factor Authenticator</h2>
  <div
    class="twoFA-modal"
    onclick={handleModalClick}
    onkeydown={handleKeydown}
    role="button"
    tabindex="0"
  >
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
</div>

<style>
  .backlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 999;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 0.3s ease,
      visibility 0.3s ease;
  }

  .backlay.is-open {
    opacity: 1;
    visibility: visible;
  }

  .twoFA-modal {
    width: 700px;
    height: 300px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: row;
    gap: 10px;
  }

  .two-factor-header {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 2rem 0 1rem 0;
    color: #6fbd96;
    text-shadow: 0 0 15px rgba(0, 255, 128, 0.3);
    text-transform: uppercase;
    letter-spacing: 1px;
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
  }

  .otp-input-box:focus {
    outline: none;
    border: 2px solid #6fbd96;
  }
</style>
