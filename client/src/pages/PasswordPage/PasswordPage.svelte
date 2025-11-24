<script>
  import { navigate } from "svelte-routing";

  async function logout() {
    const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include"
    });

    if (!response.ok) {
        console.log("Logout failed");
        return;
    }
    navigate("/");
  }
</script>

<nav class="navigation-bar">
  <div class="side-dropdown">
    <img src="./a-way-in.png" alt="awayinvault logo" class="logo">
    <a href="/passwords" class="menu-link">passwords</a>
    <a href="/activation" class="menu-link">Files</a>
    <a href="#" class="menu-link">3</a>
    <a href="#" class="menu-link">4</a>
    <a href="#" class="menu-link">5</a>
    <button class="logout-button" id="logoutButton" on:click={logout}>Logout</button>
  </div>
</nav>

<main class="passwords-main"></main>

<style>
  .navigation-bar {
    display: flex;
    align-items: center;
  }

  .menu-trigger { 
    cursor: pointer;
    color: white;
    font-size: 1.2rem;
    z-index: 2;
  }

  .side-dropdown {
    position: absolute;
    top: 0;
    left: 15px;
    width: 250px;
    height: 100vh;
    background-color: #012c01;
    transform: translateX(-90%);
    transition: transform 0.3s ease;
    z-index: 1;
    cursor: pointer;
    display: flex;
    flex-direction: column;
  }

  .side-dropdown:hover {
    transform: translateX(-10%);
  }

  .menu-link {
    padding: 12px 20px;
    color: #e8f5e9;
    text-decoration: none;
    font-size: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    transition:
      background 0.2s,
      padding-left 0.2s;
  }

  .menu-link:hover {
    background: rgba(255, 255, 255, 0.08);
    padding-left: 28px;
  }

  .logout-button {
    padding: 12px 20px;
    font-size: 15px;
    color: #ffb3b3;
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    transition:
      background 0.2s,
      padding-left 0.2s;
    margin-top: auto;
  }

  .logout-button:hover {
    background: rgba(255, 50, 50, 0.15);
    padding-left: 28px;
  }

  .passwords-main {
    height: 100%;
  }
  
  .logo {
    height: 50px;
    width: 50px;
  }
</style>
