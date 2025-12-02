<script>
  import toastr from "toastr";
  import CryptoJS from "crypto-js";

  const { onClose, class: className, onSave } = $props();

  let masterPassword = "DET_HEMMELIGE_MASTER_PASSWORD";

  async function deriveKey(salt) {
    return await CryptoJS.PBKDF2(masterPassword, salt, {
      keySize: 256 / 32,
      iterations: 100000,
    });
  }

  function handleModalClick(event) {
    event.stopPropagation();
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      onClose?.();
    }
  }

  let website = $state("");
  let username = $state("");
  let password = $state("");

  async function savePassword() {
    if (!password || password.trim() === "") {
      toastr.error("Password field cannot be empty.");
      return;
    }
    if (!masterPassword) {
      toastr.error("Master Password not available. Please log in.");
      return;
    }

    const salt = CryptoJS.lib.WordArray.random(128 / 8);
    const key = await deriveKey(salt);
    const iv = CryptoJS.lib.WordArray.random(128 / 8);

    const encrypted = CryptoJS.AES.encrypt(password, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const saltBase64 = salt.toString(CryptoJS.enc.Base64);
    const ivBase64 = iv.toString(CryptoJS.enc.Base64);
    const encryptedPayload = `${saltBase64}:${ivBase64}:${encrypted.toString()}`;

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
    <button class="close-btn" aria-label="Close" onclick={onClose}
      ><svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lucide lucide-x h-4 w-4"
        ><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg
      ></button
    >
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
      <button aria-label="Generate-password"
        ><svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-dice"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <path d="M7 7h.01" />
          <path d="M17 7h.01" />
          <path d="M7 17h.01" />
          <path d="M17 17h.01" />
          <path d="M12 12h.01" />
        </svg></button
      >
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
  svg {
    transition: transform 0.2s ease;
    cursor: pointer;
    color: white;
  }
  svg:hover {
    transform: rotate(90deg) translateX(1px);
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
</style>
