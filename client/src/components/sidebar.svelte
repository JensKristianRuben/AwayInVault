<script>
  import { navigate } from "svelte-routing";

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
</script>

<nav class="navigation-bar">
  <div class="side-dropdown">
    <img src="./a-way-in.png" alt="awayinvault logo" class="logo" />
    <a href="/passwords" class="menu-link">passwords</a>
    <a href="/generator" class="menu-link">Password generator</a>
    <a href="/rapport" class="menu-link">Security rapport</a>
    <button class="logout-button" id="logoutButton" on:click={logout}
      >Logout</button
    >
  </div>
</nav>

<style>
  .navigation-bar {
    display: flex;
    align-items: center;
  }

  .side-dropdown {
    position: fixed;
    top: 0;
    left: 15px;
    width: 250px;
    height: 100vh;
    background-color: #17362680;
    transform: translateX(-90%);
    transition: transform 0.3s ease;
    z-index: 100;
    cursor: pointer;
    display: flex;
    flex-direction: column;
  }

  .side-dropdown:hover {
    transform: translateX(-10%);
  }

  .logo {
    height: 50px;
    width: 50px;
    margin: 0 auto;
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
</style>
