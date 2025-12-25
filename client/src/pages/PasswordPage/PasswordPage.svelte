<script>
  import PasswordCard from "../../components/passwordPage/passwordCard.svelte";
  import Sidebar from "../../components/Sidebar.svelte";
  import CreatePasswordModal from "../../components/passwordPage/CreatePasswordModal.svelte";
  import MasterPasswordModal from "../../components/passwordPage/MasterPasswordModal.svelte";
  import ConfirmModal from "../../components/passwordPage/ConfirmModal.svelte";
  import EditPasswordModal from "../../components/passwordPage/EditPasswordModal.svelte";
  import { decryptPassword } from "./passwordPage.js";
  import { flip } from "svelte/animate";
  import { fly, fade } from "svelte/transition";
  import { onMount } from "svelte";
  import toastr from "toastr";
  import SearchIcon from "../../components/icons/SearchIcon.svelte";

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

  let isCreatePasswordModalOpen = $state(false);
  let isMasterPasswordModalOpen = $state(false);
  let isConfirmModalOpen = $state(false);

  function closeMasterPasswordModal() {
    isMasterPasswordModalOpen = false;
  }

  function openMasterPasswordModal(id, encryptedPassword) {
    selectedPasswordId = id;
    passwordToDecrypt = encryptedPassword;

    isMasterPasswordModalOpen = true;
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
        console.error("Error while decrypting the password:", error);
      }

      passwordToDecrypt = null;
      selectedPasswordId = null;
    }
  }

  // ______________DELETE________________

  function handleDeletePasswordCard(id) {
    passwordToDeleteId = id;
    isConfirmModalOpen = true;
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
  onClose={() => isCreatePasswordModalOpen = false}
  class={isCreatePasswordModalOpen ? "is-open" : ""}
  onSave={handleNewPassword}
  existingPasswords={passwordsList}
/>

<MasterPasswordModal
  onClose={() => isMasterPasswordModalOpen = false}
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
    <button class="add-password-button" onclick={() => isCreatePasswordModalOpen = true}>+</button>
  </div>
  <div class="search-wrapper">
    
    <SearchIcon/>



    <input
      type="text"
      name="passwordsSearchBar"
      id="passwordsSearchBar"
      placeholder="search passwords..."
      class="passwords-search-bar"
      bind:value={searchQuery}
    />
  </div>

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

  /* .passwords-main {
    height: 100vh;
  } */


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

  .search-wrapper {
    position: relative;
    width: 80%;
    margin: 0 auto;
    max-width: 1000px;
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
