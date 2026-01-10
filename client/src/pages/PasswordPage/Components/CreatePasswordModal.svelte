<script>
  import toastr from "toastr";
  import { encryptPassword, verifyMasterKey } from "../../../util/cryptoUtil.js";
  import { generateRandomPassword } from "../../../util/randomUtil.js";
  import DiceIcon from "../../../components/icons/DiceIcon.svelte";
  import CrossIcon from "../../../components/icons/CrossIcon.svelte";

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
      <CrossIcon />
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
      <button 
        aria-label="Generate-password" 
        onclick={handleGenerateClick}
        class="dice-btn" 
      >
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
  /* --- BACKGROUND & OVERLAY --- */
  .backlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 26, 13, 0.85); /* Mørkere tone */
    backdrop-filter: blur(5px); /* Glass effect */
    z-index: 999;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
  }

  .backlay.is-open {
    opacity: 1;
    visibility: visible;
  }

  /* --- MODAL CONTAINER --- */
  .create-password-modal {
    position: fixed; /* Beholder din positionering */
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.95); /* Starter lidt zoomet ud */
    
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    
    height: auto;
    width: 100%;
    max-width: 500px; /* Lidt smallere for pænere look */
    
    background-color: #001a0d;
    border: 1px solid #6fbd96;
    border-radius: 15px; /* Mere runde hjørner */
    padding: 30px;
    gap: 15px; /* Justeret gap */
    
    /* Neon Glow Effect */
    box-shadow: 0 0 30px rgba(0, 255, 128, 0.15);
    transition: transform 0.2s ease, opacity 0.3s;
  }

  .backlay.is-open .create-password-modal {
    transform: translate(-50%, -50%) scale(1); /* Zoom ind effekt ved åbning */
  }

  /* --- CLOSE BUTTON --- */
  .close-btn {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    background-color: transparent;
    border: none;
    cursor: pointer;
    margin-bottom: -10px;
    color: #6fbd96;
    transition: transform 0.2s;
  }
  
  .close-btn:hover {
      transform: rotate(90deg); /* Roterer ved hover */
      color: #00ff80;
  }

  /* --- INPUTS & LABELS --- */
  label {
    width: 80%; /* Matcher input bredde */
    display: flex;
    justify-content: flex-start;
    color: #6fbd96;
    font-family: "Montserrat", sans-serif;
    font-weight: 600;
    font-size: 0.75rem; /* Mindre, uppercase labels */
    text-transform: uppercase;
    margin-bottom: -10px; /* Strammer layoutet op */
    margin-top: 5px;
  }

  /* Master password label specifik styling hvis nødvendigt */
  .mp-label {
      color: #00ff80; /* Lidt lysere for at fremhæve vigtighed */
  }

  input {
    width: 80%;
    padding: 12px 15px;
    background-color: rgba(23, 54, 38, 0.6); /* Semi-transparent baggrund */
    border-radius: 8px;
    border: 1px solid transparent;
    transition: all 0.3s ease;
    color: white;
    font-family: "Montserrat", sans-serif;
    font-size: 1rem;
    outline: none;
    box-sizing: border-box; /* Sikrer padding ikke ødelægger bredden */
  }

  input:focus {
    border-color: #6fbd96;
    box-shadow: 0 0 10px rgba(111, 189, 150, 0.3); /* Glow ved fokus */
    background-color: rgba(23, 54, 38, 0.9);
  }
  
  /* Særlig styling til master password input for at fremhæve det */
  .master-password-input {
      border-color: rgba(111, 189, 150, 0.3);
  }

  /* --- PASSWORD GENERATOR WRAPPER --- */
  .password-and-generator-wrapper {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 80%;
    gap: 10px;
  }
  
  .password-input {
      width: 100%; /* Fylder resten af pladsen */
  }

  .dice-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;
      color: #6fbd96;
  }
  
  .dice-btn:hover {
      transform: rotate(180deg) scale(1.1); /* Ruller terningen ved hover */
      color: #00ff80;
  }

  /* --- DIVIDER --- */
  .divider {
    width: 80%;
    height: 1px;
    background: linear-gradient(90deg, transparent, #6fbd96, transparent); /* Fader ud i enderne */
    margin: 10px 0;
    opacity: 0.4;
  }

  /* --- BOTTOM BUTTONS --- */
  .bottom-btns {
    margin-top: 30px;
    width: 80%;
    display: flex;
    justify-content: flex-end;
    gap: 15px;
  }

  .cancel-btn {
    background: none;
    border: none;
    padding: 10px 20px;
    cursor: pointer;
    border-radius: 8px;
    color: #6fbd96;
    font-family: "Montserrat", sans-serif;
    opacity: 0.8;
    transition: all 0.2s;
  }
  .cancel-btn:hover {
      opacity: 1;
      background-color: rgba(111, 189, 150, 0.1);
  }

  .save-btn {
    background-color: #6fbd96;
    color: #001a0d;
    border: none;
    padding: 10px 25px;
    cursor: pointer;
    border-radius: 8px;
    font-weight: bold;
    font-family: "Montserrat", sans-serif;
    transition: all 0.2s;
  }

  .save-btn:hover {
    background-color: #00ff80;
    box-shadow: 0 0 15px rgba(0, 255, 128, 0.4);
    transform: translateY(-2px);
  }
</style>