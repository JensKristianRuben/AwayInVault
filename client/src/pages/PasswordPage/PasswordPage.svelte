<script>
  import { navigate } from "svelte-routing";
  import PasswordCard from "../../components/passwordCard.svelte";
  import Sidebar from "../../components/sidebar.svelte";

  async function logout() {
    const response = await fetch("http://localhost:8080/api/logout", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      console.log("Logout failed");
      return;
    }
    navigate("/");
  }

  let passwords = [
    { id: 1, title: "Netflix", user: "sejefyr1234", pass: "..." },
    { id: 2, title: "Spotify", user: "musiclover", pass: "..." },
    { id: 3, title: "Bank", user: "secureuser", pass: "..." },
    { id: 4, title: "Social Media", user: "meonly", pass: "..." },
  ];
</script>

<Sidebar />

<main class="passwords-main">
  <div class="logo-and-create-password-wrapper">
    <img src="/a-way-in.png" alt="awayinvault logo" class="logo-create-btn" />
    <h1>AwayinVault</h1>
    <button class="add-password-button">+</button>
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
    />
  </div>

  <div class="passwords-grid">
    {#each passwords as password (password.id)}
      <PasswordCard title={password.title} />
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

  .passwords-grid-container {
    background-color: #082114;
    border: 1px solid #6fbd96;
    width: 400px;
    height: 250px;
    border-radius: 10px;
    padding: 10px;
  }

  .passwords-grid-container-info {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .passwords-grid-container-title {
    width: 100%;
    color: white;
    font-family: "Montserrat", sans-serif;
    font-size: 700;
  }

  .passwords-grid-container-info-item {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    background-color: #17362680;
    border-radius: 5px;
    padding: 10px;
  }

  .passwords-grid-container-info-wrapper {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .passwords-grid-container-info-item-wrapper {
    width: 100%;
  }
  .passwords-grid-container-info-item-wrapper p {
    color: white;
    margin: 0;
  }
</style>
