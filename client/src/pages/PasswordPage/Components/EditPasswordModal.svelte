<script>
  import toastr from "toastr";
  import { encryptPassword, verifyMasterKey } from "../../../util/cryptoUtil.js";

  const { onClose, class: className, onSave, passwordData } = $props();

  let website = $state("");
  let username = $state("");
  let newPassword = $state("");
  let masterPassword = $state("");

  $effect(() => {
    if (passwordData) {
      website = passwordData.website;
      username = passwordData.username;
      newPassword = "";
      masterPassword = "";
    }
  });

  async function handleUpdate() {
    if (!website || !username) {
      toastr.error("Website and Username cannot be empty.");
      return;
    }

    let passwordToSend;

    if (newPassword) {
      if (!masterPassword) {
        toastr.error("Master Password is required to encrypt new password.");
        return;
      }

      const isMasterPasswordCorrect = await verifyMasterKey(
        passwordData.encrypted_password,
        masterPassword
      );

      if (!isMasterPasswordCorrect) {
        toastr.error("Wrong Master Password!");
        return;
      }

      passwordToSend = await encryptPassword(newPassword, masterPassword);
    } else {
      passwordToSend = passwordData.encrypted_password;
    }

    const updatedPasswordObj = {
      id: passwordData.id,
      website: website,
      username: username,
      encrypted_password: passwordToSend,
    };

    try {
      const response = await fetch(
        `http://localhost:8080/api/passwords/${passwordData.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "Application/json",
          },
          credentials: "include",
          body: JSON.stringify(updatedPasswordObj),
        },
      );

      if (!response.ok) {
        toastr.error("Failed to update password info");
        return;
      }

      const savedItem = await response.json().catch(() => updatedPasswordObj);

      onSave?.(savedItem);
      onClose?.();

      toastr.success("Information updated successfully!");
    } catch (error) {
      console.error("Network error during update:", error);
      toastr.error("Networking error during update");
    }
  }

  function handleModalClick(event) {
    event.stopPropagation();
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      onClose?.();
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
      <svg
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
      >
        <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
      </svg>
    </button>

    <h2>Edit Details</h2>

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
      placeholder="Username..."
      bind:value={username}
    />

    <label for="masterPassword">Master password</label>
    <input
      type="password"
      id="masterPassword"
      placeholder="Required if changing password"
      bind:value={masterPassword}
    />

    <label for="password">New Password</label>
    <input
      type="password"
      id="password"
      placeholder="Leave empty to keep current password"
      bind:value={newPassword}
    />

    <div class="bottom-btns">
      <button class="cancel-btn" onclick={onClose}>Cancel</button>
      <button class="save-btn" onclick={handleUpdate}>Save Changes</button>
    </div>
  </div>
</div>

<style>
  .backlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 26, 13, 0.85);
    backdrop-filter: blur(5px);
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

  .create-password-modal {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-width: 500px;
    
    background-color: #001a0d;
    border: 1px solid #6fbd96;
    border-radius: 15px;
    padding: 30px;
    gap: 15px;
    box-shadow: 0 0 30px rgba(0, 255, 128, 0.15);
    transform: scale(0.95);
    transition: transform 0.2s ease;
  }
  
  .backlay.is-open .create-password-modal {
      transform: scale(1);
  }

  .close-btn {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    background-color: transparent;
    border: none;
    padding: 0;
    margin-bottom: -10px;
  }

  .close-btn svg {
    transition: transform 0.2s ease, color 0.2s;
    cursor: pointer;
    color: #6fbd96;
  }
  
  .close-btn svg:hover {
    transform: rotate(90deg);
    color: #00ff80;
  }

  h2 {
    color: #6fbd96;
    font-family: "Montserrat", sans-serif;
    margin: 0 0 10px 0;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 1.5rem;
  }

  label {
    width: 80%;
    display: flex;
    justify-content: flex-start;
    color: #6fbd96;
    font-family: "Montserrat", sans-serif;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    margin-bottom: -10px;
    margin-top: 5px;
  }

  input {
    width: 80%;
    padding: 12px 15px;
    background-color: rgba(23, 54, 38, 0.6);
    border-radius: 8px;
    border: 1px solid transparent;
    transition: all 0.3s ease;
    color: white;
    font-family: "Montserrat", sans-serif;
    font-size: 1rem;
    outline: none;
  }
  
  input:focus {
    border-color: #6fbd96;
    background-color: rgba(23, 54, 38, 0.9);
    box-shadow: 0 0 10px rgba(111, 189, 150, 0.3);
  }

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