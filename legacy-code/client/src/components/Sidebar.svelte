<script>
  import { navigate } from "svelte-routing";
  import KeyIcon from "./icons/KeyIcon.svelte";
  import WandIcon from "./icons/WandIcon.svelte";
  import SheildNavIcon from "./icons/SheildNavIcon.svelte";
  import RapportIcon from "./icons/RapportIcon.svelte";
  import LogoutIcon from "./icons/LogoutIcon.svelte";
  import toastr from "toastr";

  async function logout() {
    const response = await fetch("http://localhost:8080/api/logout", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      toastr.error("Failed to logout");
      return;
    }
    navigate("/");
  }
</script>

<nav class="navigation-bar">
  <div class="side-dropdown">
    <img src="./a-way-in.png" alt="awayinvault logo" class="logo" />
    <a href="/passwords" class="menu-link">passwords <KeyIcon /></a>
    <a href="/generator" class="menu-link">Password generator <WandIcon /> </a>
    <a href="/twofactorauthentication" class="menu-link">Two Factor Authentication <SheildNavIcon/></a>
    <a href="/rapport" class="menu-link">Security rapport <RapportIcon /> </a>
    <button class="logout-button" id="logoutButton" onclick={logout} 
      >Logout <LogoutIcon/></button
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
    height: 100px;
    width: 100px;
    margin: 50px auto;
  }

  .menu-link {
    padding: 20px 10px 20px 20px;
    color: #e8f5e9;
    text-decoration: none;
    font-size: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    transition:
      background 0.2s,
      padding-left 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: "Montserrat";
    font-size: 12px;
  }

  .menu-link:hover {
    background: rgba(255, 255, 255, 0.08);
    padding-left: 28px;
  }

  .logout-button {
    padding: 20px 10px 20px 20px;
    font-size: 12px;
    font-family: "Montserrat";
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
    display: flex;
    justify-content: space-between;

  }

  .logout-button:hover {
    background: rgba(255, 50, 50, 0.15);
    padding-left: 28px;
  }
</style>
