<script>
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";


  onMount(() => {
    const timer = setTimeout(() => {
      navigate("/");
    }, 5000);

    return () => clearTimeout(timer);
  });
</script>

<main class="success-container">
  <div class="success-box">
    <h1>Succes!</h1>
  </div>
</main>

<style>
  .success-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: #0f260f;
  }

  .success-box {
    text-align: center;
    background-color: #1f3f1f;
    padding: 40px 60px;
    border-radius: 12px;
    color: white;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    font-family: "Roboto", sans-serif;
  }

  .success-box h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }

</style>
