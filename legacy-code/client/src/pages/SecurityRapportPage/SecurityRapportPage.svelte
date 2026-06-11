<script>
  import { onMount } from "svelte";
  import Sidebar from "../../components/Sidebar.svelte";
  import CheckIcon from "../../components/icons/CheckIcon.svelte";
  import { findReusedPasswords } from "../../util/cryptoUtil.js";
  import MasterPasswordModal from "../PasswordPage/Components/MasterPasswordModal.svelte";
  import { API_URL } from "../../config/fetchConfig";

  let amountOfPasswords = $state();
  let vulnarblePasswords = $state([]);
  let isMasterPasswordModalOpen = $state(false);
  let isScanning = $state(false);
  let reusedPasswordsList = $state(null);

  onMount(async () => {
    const countPasswordsResponse = await fetch(
      `${API_URL}/api/passwords/count`,
      {
        credentials: "include",
        headers: {
          "Content-Type": "Application/json",
        },
      }
    );

    const expiredPasswordsResponse = await fetch(
      `${API_URL}/api/passwords/expired`,
      {
        credentials: "include",
        headers: {
          "Content-Type": "Application/json",
        },
      }
    );

    if (countPasswordsResponse.ok && expiredPasswordsResponse.ok) {
      const countPasswordsResult = await countPasswordsResponse.json();
      amountOfPasswords = countPasswordsResult.count;

      const expiredPasswordsResult = await expiredPasswordsResponse.json();

      vulnarblePasswords = expiredPasswordsResult.map((p) => p.website);
    }
  });

  function handleScanClick() {
    isMasterPasswordModalOpen = true;
  }

  async function handlescanningPasswords(masterPassword) {
    isMasterPasswordModalOpen = false;
    isScanning = true;

    try {
      const response = await fetch(`${API_URL}/api/passwords`, {
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();

        setTimeout(async () => {
          reusedPasswordsList = await findReusedPasswords(
            result,
            masterPassword
          );
          console.log("Listen er:", reusedPasswordsList);
          isScanning = false;
        }, 100);
      }
    } catch (error) {
      console.error("Scanning failed", error);
      isScanning = false;
    }
  }
</script>

<Sidebar />

<MasterPasswordModal
  onClose={() => (isMasterPasswordModalOpen = false)}
  class={isMasterPasswordModalOpen ? "is-open" : ""}
  onVerify={handlescanningPasswords}
/>

<main>
  <h1>Security Rapport</h1>
  <div class="rapport-container">
    <div class="rapport-item-container">
      <h3>Amount of Passwords</h3>
      <p class="stats-number">{amountOfPasswords}</p>
    </div>
    <div class="rapport-item-container">
      <h3>Expired Passwords</h3>
      {#each vulnarblePasswords as website}
        <a href="/passwords?search={website}" class="website-tag">{website}</a>
      {/each}
      {#if vulnarblePasswords.length === 0}
        <CheckIcon />
      {/if}
    </div>
    <div class="rapport-item-container">
      <h3>Reused Passwords</h3>

      {#if isScanning}
        <div class="spinner-wrapper">
          <div class="loading-spinner"></div>
          <p class="status-text">Scanning vault...</p>
        </div>
      {:else if reusedPasswordsList === null}
        <button onclick={handleScanClick} class="scan-passwords-button">
          Scan passwords
        </button>
      {:else if reusedPasswordsList.length === 0}
        <div style="margin-top: 20px;">
          <CheckIcon />
        </div>
        
      {:else}
        <div class="reuse-list">
          {#each reusedPasswordsList as group, i}
            <div class="reuse-card">
              <div class="reuse-header">
                <span>Group {i + 1}</span>
              </div>

              <div class="reuse-tags">
                {#each group as website}
                  <a href="/passwords?search={website}" class="reuse-tag">
                    {website}
                  </a>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</main>

<style>
  main {
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
  }
  .rapport-container {
    width: 80%;
    display: flex;
    flex-direction: row;
    justify-content: center;
    padding: 50px;
    gap: 20px;
  }
  .rapport-item-container {
    width: 30%;
    height: 300px;
    border: 1px solid #6fbd96;
    border-radius: 10px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: column;
    box-shadow: 0 0 15px rgba(0, 255, 128, 0.2);
  }
  .stats-number {
    font-family: "MontSerrat";
    font-weight: 300;
    font-size: 150px;
    color: #6fbd96;
    margin: 0;
  }

  .website-tag {
    color: #6fbd96;
    padding: 10px 20px;
    border-radius: 20px;
    font-family: "MontSerrat", sans-serif;
    font-size: 14px;
    width: 80%;
    text-align: center;
    font-weight: 500;
    text-decoration: none;
    display: block;
    margin-bottom: 10px;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s;
  }

  .website-tag:hover {
    color: white;
  }

  .scan-passwords-button {
    background-color: #6fbd96;
    color: white;
    font-weight: 300;
    font-size: 1rem;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    margin-left: 20px;
    font-family: "Montserrat", sans-serif;
  }

  .scan-passwords-button:hover {
    background-color: #00ff80;
    transform: translateY(-2px);
    box-shadow: 0 0 8px rgba(51, 170, 119, 0.5);
  }

  .spinner-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-top: 30px;
    gap: 15px;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(111, 189, 150, 0.2);
    border-top: 4px solid #6fbd96;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .status-text {
    color: #6fbd96;
    font-family: "Montserrat", sans-serif;
    font-size: 14px;
    animation: pulse 1.5s infinite ease-in-out;
  }

  @keyframes pulse {
    0% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.6;
    }
  }

  .reuse-list {
    width: 90%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
  }

  .reuse-card {
    background: rgba(255, 159, 67, 0.05); 
    border: 1px solid rgba(255, 159, 67, 0.3);
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .reuse-header {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #ff9f43;
    font-family: "Montserrat", sans-serif;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .reuse-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .reuse-tag {
    background: rgba(255, 159, 67, 0.1);
    color: #ff9f43;
    padding: 3px 8px;
    border-radius: 4px;
    font-family: "Montserrat", sans-serif;
    font-size: 0.75rem;
    text-decoration: none;
    transition: all 0.2s;
  }

  .reuse-tag:hover {
    background: #ff9f43;
    color: #001a0d;
  }
</style>
