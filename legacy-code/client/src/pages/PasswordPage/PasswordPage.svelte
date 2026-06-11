<script>
  import PasswordCard from "./Components/passwordCard.svelte";
  import Sidebar from "../../components/Sidebar.svelte";
  import CreatePasswordModal from "./Components/CreatePasswordModal.svelte";
  import MasterPasswordModal from "./Components/MasterPasswordModal.svelte";
  import ConfirmModal from "./Components/ConfirmModal.svelte";
  import EditPasswordModal from "./Components/EditPasswordModal.svelte";
  import { getSearchParam } from "./passwordPage.js";
  import { decryptPassword } from "../../util/cryptoUtil.js";
  import { flip } from "svelte/animate";
  import { fly, fade } from "svelte/transition";
  import { onMount } from "svelte";
  import toastr from "toastr";
  import SearchIcon from "../../components/icons/SearchIcon.svelte";
  import { API_URL } from "../../config/fetchConfig";


  let passwordToDecrypt = $state(null);
  let selectedPasswordId = $state(null);
  let decryptedPasswords = $state({});
  let searchQuery = $state("");
  let isEditModalOpen = $state(false);
  let passwordToEdit = $state(null);
  let passwordsList = $state([]);
  let passwordToDeleteId = $state(null);
  let isLoading = $state(true);
  let shouldCopyAfterDecrypt = $state(false);

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
    try {
      const response = await fetch(`${API_URL}/api/passwords`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        passwordsList = data;
      }
    } catch (error) {
      console.error("Error fetching passwords:", error);
      toastr.error("Could not load passwords");
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchPasswords();
    searchQuery = getSearchParam("search");
  });

  function handleNewPassword(newPassword) {
    passwordsList = [...passwordsList, newPassword];
  }

  let isCreatePasswordModalOpen = $state(false);
  let isMasterPasswordModalOpen = $state(false);
  let isConfirmModalOpen = $state(false);

  function closeMasterPasswordModal() {
    isMasterPasswordModalOpen = false;
  }

  function openMasterPasswordModal(id, encryptedPassword, autoCopy = false) {
    selectedPasswordId = id;
    passwordToDecrypt = encryptedPassword;

    shouldCopyAfterDecrypt = autoCopy;

    isMasterPasswordModalOpen = true;
  }

  function closeConfirmModal() {
    isConfirmModalOpen = false;
    passwordToDeleteId = null;
  }

  async function handleMasterPasswordVerification(masterPassword) {
    const currentId = selectedPasswordId;

    const decryptedResult = await decryptPassword(
      passwordToDecrypt,
      masterPassword
    );

    if (!decryptedResult) {
      console.error("Wrong masterpassword or decryption failed");
      toastr.error("Wrong masterpassword!");
      return;
    }

    if (shouldCopyAfterDecrypt) {

      navigator.clipboard.writeText(decryptedResult);
      toastr.success("Password copied to clipboard!");
      
      shouldCopyAfterDecrypt = false;
    } else {
      decryptedPasswords = {
        ...decryptedPasswords,
        [currentId]: decryptedResult,
      };

      setTimeout(() => {
        const tempPasswords = { ...decryptedPasswords };
        delete tempPasswords[currentId];
        decryptedPasswords = tempPasswords;
      }, 5000);
    }

    passwordToDecrypt = null;
    selectedPasswordId = null;
    closeMasterPasswordModal();
  }
  function handleDeletePasswordCard(id) {
    passwordToDeleteId = id;
    isConfirmModalOpen = true;
  }

  async function handleDelete() {
    if (!passwordToDeleteId) return;
    try {
      const response = await fetch(
        `${API_URL}/api/passwords/${passwordToDeleteId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        passwordsList = passwordsList.filter(
          (p) => String(p.id) !== String(passwordToDeleteId)
        );
        toastr.success("Password succesfully deleted");
      } else {
        toastr.error("Could not delete");
      }
    } catch (error) {
      console.error(error);
    }
    closeConfirmModal();
  }
</script>

<Sidebar />

<CreatePasswordModal
  onClose={() => (isCreatePasswordModalOpen = false)}
  class={isCreatePasswordModalOpen ? "is-open" : ""}
  onSave={handleNewPassword}
  existingPasswords={passwordsList}
/>

<MasterPasswordModal
  onClose={() => (isMasterPasswordModalOpen = false)}
  class={isMasterPasswordModalOpen ? "is-open" : ""}
  onVerify={handleMasterPasswordVerification}
/>

<ConfirmModal
  onClose={closeConfirmModal}
  class={isConfirmModalOpen ? "is-open" : ""}
  onConfirm={handleDelete}
/>

<EditPasswordModal
  onClose={closeEditModal}
  class={isEditModalOpen ? "is-open" : ""}
  onSave={handleSaveEditedPassword}
  passwordData={passwordToEdit}
/>

<main class="passwords-main">
  {#if isLoading}
    <div class="loading-state">
      <p>Accessing Vault...</p>
    </div>
  {:else if passwordsList.length === 0}
    <div class="empty-state" in:fade={{ duration: 400 }}>
      <img src="/a-way-in.png" alt="logo" class="empty-logo" />
      <h1>AwayinVault</h1>

      <div class="empty-text-content">
        <h2>The Vault is Empty</h2>
        <p>
          Your digital security starts here. Create your first secure entry.
        </p>
      </div>

      <button
        class="cta-button"
        onclick={() => (isCreatePasswordModalOpen = true)}
      >
        Create First Password
      </button>
    </div>
  {:else}
    <div class="logo-and-create-password-wrapper" in:fade>
      <img src="/a-way-in.png" alt="awayinvault logo" class="logo-create-btn" />
      <h1>AwayinVault</h1>
      <button
        class="add-password-button"
        onclick={() => (isCreatePasswordModalOpen = true)}>+</button
      >
    </div>

    <div class="search-wrapper" in:fade>
      <SearchIcon />
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
            onCopyClick={() =>
              openMasterPasswordModal(password.id, password.encrypted_password, true)}
            decrypted_password={decryptedPasswords[password.id]}
            onDeleteClick={() => handleDeletePasswordCard(password.id)}
            id={password.id}
            onEdit={() => openEditModal(password)}
          />
        </div>
      {/each}
    </div>
  {/if}
</main>

<style>
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

  .empty-logo {
    width: 150px;
    height: auto;
    margin-bottom: 20px;
    animation: float 6s ease-in-out infinite;
  }

  .empty-state h1 {
    font-size: 3rem;
    color: #6fbd96;
    margin-bottom: 40px;
    font-weight: 700;
  }

  .empty-text-content {
    margin-bottom: 30px;
  }

  @keyframes float {
    0% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
    100% {
      transform: translateY(0px);
    }
  }

  .loading-state {
    text-align: center;
    margin-top: 100px;
    color: #6fbd96;
    font-size: 1.2rem;
    font-family: "Montserrat", sans-serif;
    animation: pulse 1.5s infinite;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-top: 50px;
    text-align: center;
    font-family: "Montserrat", sans-serif;
    color: white;

    padding: 60px;
    border-radius: 20px;
    border: 1px solid rgba(111, 189, 150, 0.1);
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.5);
  }

  .empty-state p {
    color: #ccc;
    font-size: 1rem;
    max-width: 400px;
    line-height: 1.6;
    margin: 0 auto 30px auto;
  }

  .cta-button {
    background-color: #6fbd96;
    color: #001a0d;
    font-size: 1.2rem;
    font-weight: 700;
    padding: 15px 40px;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }

  .cta-button:hover {
    background-color: #00ff80;
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 0 30px rgba(0, 255, 128, 0.6);
  }
</style>
