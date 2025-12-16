<script>
  import PasswordCard from "../../components/passwordPage/passwordCard.svelte";
  import Sidebar from "../../components/sidebar.svelte";
  import CreatePasswordModal from "../../components/passwordPage/CreatePasswordModal.svelte";
  import MasterPasswordModal from "../../components/passwordPage/MasterPasswordModal.svelte";
  import ConfirmModal from "../../components/passwordPage/ConfirmModal.svelte";
  import EditPasswordModal from "../../components/passwordPage/EditPasswordModal.svelte";
  import { flip } from "svelte/animate";
  import { fly, fade } from "svelte/transition";
  import { onMount } from "svelte";
  import CryptoJS from "crypto-js";
  import toastr from "toastr";

  let passwordToDecrypt = $state(null);
  let selectedPasswordId = $state(null);
  let decryptedPasswords = $state({});
  let searchQuery = $state("");

  let isEditModalOpen = $state(false);
  let passwordToEdit = $state(null);

  let passwordsList = $state([]);

  let passwordToDeleteId = $state(null);

  let filteredPasswords = $derived(
    passwordsList.filter((password) => {
      const query = searchQuery.toLowerCase();
      const website = password.website?.toLowerCase() || "";
      const username = password.username?.toLowerCase() || "";
      return website.includes(query) || username.includes(query);
    })
  );

  function openEditModal(password) {
    passwordToEdit = password;
    isEditModalOpen = true;
  }

  function closeEditModal() {
    isEditModalOpen = false;
    passwordToEdit = null;
  }

  function handleSaveEditedPassword(updatedPassword) {
    if (!updatedPassword) return;

    passwordsList = passwordsList.map((password) =>
      password.id === updatedPassword.id ? updatedPassword : password
    );

    closeEditModal();
  }

  async function fetchPasswords() {
    let response = await fetch("http://localhost:8080/api/passwords", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();
    passwordsList = data;
  }

  onMount(fetchPasswords);

  function handleNewPassword(newPassword) {
    passwordsList = [...passwordsList, newPassword];
  }

  let isModalOpen = $state(false);

  function openModal() {
    isModalOpen = true;
  }

  function closeModal() {
    isModalOpen = false;
  }

  let isMasterPasswordModalOpen = $state(false);

  function closeMasterPasswordModal() {
    isMasterPasswordModalOpen = false;
  }

  function openMasterPasswordModal(id, encryptedPassword) {
    selectedPasswordId = id;
    passwordToDecrypt = encryptedPassword;

    isMasterPasswordModalOpen = true;
  }

  let isConfirmModalOpen = $state(false);

  function openConfirmModal() {
    isConfirmModalOpen = true;
  }
  function closeConfirmModal() {
    isConfirmModalOpen = false;
    passwordToDeleteId = null;
  }

  async function handleMasterPasswordVerification(masterPassword) {
    const key = masterPassword;
    const encryptedValue = passwordToDecrypt;
    const currentId = selectedPasswordId;

    if (key && encryptedValue && currentId) {
      try {
        const decryptedPassword = await decryptPassword(key, encryptedValue);

        if (!decryptedPassword) {
          console.error("Wrong masterpassword or the drcryption failed");
          return;
        }

        decryptedPasswords = {
          ...decryptedPasswords,
          [currentId]: decryptedPassword,
        };

        setTimeout(() => {
          const tempPasswords = { ...decryptedPasswords };
          delete tempPasswords[currentId];
          decryptedPasswords = tempPasswords;
        }, 5000);
      } catch (error) {
        console.error("Fejl under dekryptering/kryptering:", error);
      }

      passwordToDecrypt = null;
      selectedPasswordId = null;
    }
  }

  // __________________DEKRYPTERING____________________
  async function deriveKey(masterKey, salt) {
    return await CryptoJS.PBKDF2(masterKey, salt, {
      keySize: 256 / 32,
      iterations: 100000,
    });
  }

  async function decryptPassword(masterKey, encryptedPayload) {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 3) {
      console.error("Payload format er forkert. Skal være salt:iv:ciphertext");
      return null;
    }
    const [saltBase64, ivBase64, ciphertextBase64] = parts;

    const salt = CryptoJS.enc.Base64.parse(saltBase64);
    const iv = CryptoJS.enc.Base64.parse(ivBase64);

    const key = await deriveKey(masterKey, salt);

    const encryptedData = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(ciphertextBase64),
    });

    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const originalText = decryptedBytes.toString(CryptoJS.enc.Utf8);

    return originalText;
  }

  // ______________DELETE________________

  function handleDeletePasswordCard(id) {
    passwordToDeleteId = id;
    openConfirmModal();
  }

  async function executeDeletion() {
    if (!passwordToDeleteId) return;
    try {
      const response = await fetch(
        `http://localhost:8080/api/passwords/${passwordToDeleteId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {


        passwordsList = passwordsList.filter(
          (p) => String(p.id) !== String(passwordToDeleteId)
        );
        toastr.success("Password succesfully deleted")

      } else {
        toastr.error("Could not delete")
      }
    } catch (error) {
      console.error(error);
    }
    closeConfirmModal();
  }
</script>

<Sidebar />

<CreatePasswordModal
  onClose={closeModal}
  class={isModalOpen ? "is-open" : ""}
  onSave={handleNewPassword}
  existingPasswords={passwordsList}
/>

<MasterPasswordModal
  onClose={closeMasterPasswordModal}
  class={isMasterPasswordModalOpen ? "is-open" : ""}
  onVerify={handleMasterPasswordVerification}
/>

<ConfirmModal
  onClose={closeConfirmModal}
  class={isConfirmModalOpen ? "is-open" : ""}
  onConfirm={executeDeletion}
/>

<EditPasswordModal
  onClose={closeEditModal}
  class={isEditModalOpen ? "is-open" : ""}
  onSave={handleSaveEditedPassword}
  passwordData={passwordToEdit}
/>

<main class="passwords-main">
  <div class="logo-and-create-password-wrapper">
    <img src="/a-way-in.png" alt="awayinvault logo" class="logo-create-btn" />
    <h1>AwayinVault</h1>
    <button class="add-password-button" onclick={openModal}>+</button>
  </div>
  <div class="search-wrapper">
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
      class="lucide lucide-search"
    >
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.3-4.3"></path>
    </svg>

    <input
      type="text"
      name="passwordsSearchBar"
      id="passwordsSearchBar"
      placeholder="search passwords..."
      class="passwords-search-bar"
      bind:value={searchQuery}
    />
  </div>

  <!-- TODO: send passwordet videre så det kan ses i kortet -->
  <div class="passwords-grid">
    {#each filteredPasswords as password (password.id)}
      <div
        animate:flip={{ duration: 300 }}
        in:fly={{ y: 20, duration: 300 }}
        out:fade={{ duration: 200 }}
        class="card-wrapper"
      >
        <PasswordCard
          title={password.website}
          username={password.username}
          encrypted_password={password.encrypted_password}
          onWatchClick={() =>
            openMasterPasswordModal(password.id, password.encrypted_password)}
          decrypted_password={decryptedPasswords[password.id]}
          onDeleteClick={() => handleDeletePasswordCard(password.id)}
          id={password.id}
          onEdit={() => openEditModal(password)}
        />
      </div>
    {/each}
  </div>
</main>

<style>
  /* --------------- GENERAL ------------------- */

  .passwords-main {
    height: 100vh;
  }

  /* -------------------------------------LOGO AND CREATE BUTTON WRAPPER ---------------------------------------*/

  .logo-and-create-password-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 80%;
    margin: 0 auto;
    max-width: 1000px;
  }

  .logo-create-btn {
    margin-top: 50px;
    width: 100px;
    height: 100px;
  }
  h1 {
    font-size: 4em;
    margin-top: 50px;
    color: #6fbd96;
    font-family: "Montserrat", sans-serif;
    font-weight: 700;
  }

  .add-password-button {
    background-color: #6fbd96;
    color: white;
    font-weight: 600;
    font-size: 1rem;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    margin-left: 20px;
  }

  .add-password-button:hover {
    background-color: #00ff80;
    transform: translateY(-2px);
    box-shadow: 0 0 8px rgba(51, 170, 119, 0.5);
  }

  /* ---------------------------------------- SEARCH BAR ----------------------------- */
  .search-wrapper {
    position: relative;
    width: 80%;
    margin: 0 auto;
    max-width: 1000px;
  }

  .lucide-search {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    height: 20px;
    width: 20px;
    pointer-events: none;
    color: #6fbd96;
  }
  .passwords-search-bar {
    width: 70%;
    max-width: 1000px;
    padding: 12px 40px;
    font-size: 1rem;
    border: 1px solid #6fbd96;
    color: #6fbd96;
    border-radius: 8px;
    outline: none;
    display: block;
    margin: 20px auto;
    box-sizing: border-box;
    background-color: #001a0d;
    transition: all 0.3s ease;
  }
  .passwords-search-bar:focus {
    width: 100%;
    border: 1px solid #00ff80;
    box-shadow: 0 0 8px rgba(51, 170, 119, 0.5);
  }

  /* ---------------------PASSWORDS GRID ----------------------------- */

  .passwords-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    max-width: 1000px;
    border-radius: 10px;
    width: 80%;
    margin: 0 auto;
    padding: 20px;
    gap: 20px;
    justify-items: center;
  }
</style>
