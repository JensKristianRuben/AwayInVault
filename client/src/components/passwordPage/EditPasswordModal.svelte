<script>
  import toastr from "toastr";
  import { encryptPassword, verifyMasterKey } from "../../util/cryptoUtil.js";

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
        }
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

    <label for="password">Master password</label>
    <input
      type="text"
      id="masterPassword"
      placeholder="Leave empty to keep current password"
      bind:value={masterPassword}
    />

    <label for="password">New Password</label>
    <input
      type="text"
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

  h2 {
    color: #6fbd96;
    font-family: "Montserrat", sans-serif;
    margin: 0;
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
    color: white;
  }

  .save-btn {
    background-color: #6fbd96;
    border: none;
    padding: 12px 15px;
    cursor: pointer;
    border-radius: 10px;
    font-weight: bold;
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
