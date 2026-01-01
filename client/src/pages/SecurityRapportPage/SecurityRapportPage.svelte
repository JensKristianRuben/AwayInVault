<script>
  import { onMount } from "svelte";
  import Sidebar from "../../components/Sidebar.svelte";

  let amountOfPasswords = $state();
  let vulnarblePasswords = $state([]);

  onMount(async () => {
    const countPasswordsResponse = await fetch("http://localhost:8080/api/passwords/count", {
      credentials: "include",
      headers: {
        "Content-Type": "Application/json"
      }
    })

    const expiredPasswordsResponse = await fetch("http://localhost:8080/api/passwords/expired", {
      credentials: "include",
      headers: {
        "Content-Type": "Application/json",
      }
    })
    
    if (countPasswordsResponse.ok && expiredPasswordsResponse.ok) {
      const countPasswordsResult = await countPasswordsResponse.json();
      amountOfPasswords = countPasswordsResult.count;

      const expiredPasswordsResult = await expiredPasswordsResponse.json();
      console.log(expiredPasswordsResult);
      
      vulnarblePasswords = expiredPasswordsResult.map(p => p.website).join(", ");

      
      

    }

  
    
  });
</script>

<Sidebar />

<main>
  <h1>Security Rapport</h1>
  <div class="rapport-container">
    <div class="rapport-item-container">
      <h3>Amount of Passwords</h3>
      <p class="stats-number">{amountOfPasswords}</p>
      </div>
    <div class="rapport-item-container">
      <h3>Expired Passwords</h3>
      {vulnarblePasswords}</div>
    <div class="rapport-item-container"></div>
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
</style>
