<script>
  import toastr from "toastr";
  import { encryptPassword, verifyMasterKey } from "../../util/cryptoUtil.js";
  import { generateRandomPassword } from "../../util/randomUtil.js";
  import DiceIcon from "../icons/DiceIcon.svelte";
  import CrossIcon from "../icons/CrossIcon.svelte";

  const { onClose, class: className, onSave, existingPasswords } = $props();

  // DET_HEMMELIGE_MASTER_PASSWORD
  let website = $state("");
  let username = $state("");
  let password = $state("");
  let masterPassword = $state("");

  function handleGenerateClick() {
    password = generateRandomPassword();
  }

  function handleModalClick(event) {
    event.stopPropagation();
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      onClose?.();
    }
  }

  async function savePassword() {
    if (!password || password.trim() === "") {
      toastr.error("Password field cannot be empty.");
      return;
    }
    if (!masterPassword) {
      toastr.error("Master Password is required to encrypt.");
      return;
    }

    if (existingPasswords && existingPasswords.length > 0) {
      let isMasterPasswordValid = false;

      for (const item of existingPasswords) {
        const payload = item.encrypted_password || item.encryptedPassword;
        if (!payload) continue;

        const isValid = await verifyMasterKey(payload, masterPassword);
        if (isValid) {
          isMasterPasswordValid = true;
          break;
        }
      }

      if (!isMasterPasswordValid) {
        toastr.error("Wrong master password");
        return;
      }
    }

    const encryptedPayload = await encryptPassword(password, masterPassword);

    const newPassword = {
      website,
      username,
      encryptedPassword: encryptedPayload,
    };

    try {
      const response = await fetch("http://localhost:8080/api/passwords", {
        method: "POST",
        headers: {
          "Content-Type": "Application/json",
        },
        credentials: "include",
        body: JSON.stringify(newPassword),
      });

      if (!response.ok) {
        console.error(response.statusText);
        toastr.error("Failed to save password");
        return onClose?.();
      }

      const savedItem = await response.json();

      onSave?.(savedItem);
      onClose?.();

      website = "";
      username = "";
      password = "";

      toastr.success("Password saved successfully!");
    } catch (error) {
      console.error("Network error during save:", error);
      toastr.error("Networking error during save");
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
  <div
    class="create-password-modal {className}"
    onclick={handleModalClick}
    onkeydown={handleKeydown}
    role="button"
    tabindex="0"
  >
    <button class="close-btn" aria-label="Close" onclick={onClose}>
      <CrossIcon/>   
    </button>

    <label for="master-pass" class="mp-label">Master Password</label>
    <input
      type="password"
      id="master-pass"
      placeholder="Enter Master Password to encrypt..."
      bind:value={masterPassword}
      class="master-password-input"
    />

    <div class="divider"></div>
    <label for="website">Website</label>
    <input
      type="text"
      id="website"
      placeholder="www.something.com"
      bind:value={website}
    />

    <label for="username">Username</label>
    <input
      type="text"
      id="username"
      placeholder="ApesTogetherStrong1515"
      bind:value={username}
    />

    <label for="password">Password</label>
    <div class="password-and-generator-wrapper">
      <input
        class="password-input"
        type="text"
        id="password"
        placeholder="CI;vq=w_0MkBopqC"
        bind:value={password}
      />
      <button aria-label="Generate-password" onclick={handleGenerateClick}>
        <DiceIcon />
      </button>
    </div>

    <div class="bottom-btns">
      <button class="cancel-btn" onclick={onClose}>Cancel</button>
      <button class="save-btn" onclick={savePassword}>Save</button>
    </div>
  </div>
</div>

<style>
  .create-password-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: auto;
    width: 100%;
    max-width: 600px;
    opacity: 0;
    z-index: 1000;
    transition:
      opacity 0.3s,
      visibility 0.3s;
    background-color: #001a0d;
    border: 1px solid #6fbd96;
    border-radius: 10px;
    padding: 20px;
    gap: 20px;
  }

  .create-password-modal.is-open {
    opacity: 1;
    visibility: visible;
  }

  .close-btn {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    background-color: #001a0d;
    border: none;
  }

  button {
    background-color: transparent;
    border: none;
  }

  label {
    width: 70%;
    display: flex;
    justify-content: flex-start;
    color: white;
    font-family: "Montserrat", sans-serif;
    font-weight: 700;
  }

  input {
    width: 70%;
    padding: 12px 15px;
    background-color: #17362680;
    border-radius: 10px;
    border: none;
    transition: all 0.3s ease;
    color: white;
  }
  input:focus {
    border: 1px solid #00ff80;
    box-shadow: 0 0 8px rgba(51, 170, 119, 0.5);
    width: 80%;
  }

  .bottom-btns {
    margin-top: 50px;
    width: 100%;
    display: flex;
    justify-content: flex-end;
    gap: 20px;
  }
  .cancel-btn {
    background-color: #2b4739;
    border: none;
    padding: 12px 15px;
    cursor: pointer;
    border-radius: 10px;
  }

  .save-btn {
    background-color: #6fbd96;
    border: none;
    padding: 12px 15px;
    cursor: pointer;
    border-radius: 10px;
  }

  .password-and-generator-wrapper {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    width: 70%;
  }

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

  .divider {
    width: 100%;
    height: 1px;
    background-color: #6fbd96;
    margin: 10px 0;
    opacity: 0.3;
  }
</style>
