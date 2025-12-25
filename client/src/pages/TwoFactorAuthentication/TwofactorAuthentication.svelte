<script>
  import Sidebar from "../../components/sidebar.svelte";
  import toastr from "toastr";
  import { user } from "../../stores/clientAuth";

  let qrcode = $state("");
  let secretCode = $state("");



    function handleClick() {
        toastr.success("Click the botton")


        // TODO: lav endpoint kald på setupfunctionen her:
        
    }

</script>

<Sidebar />

<main>
  <h1>Start Two Factor <br /> Authentication now</h1>
  <h3>
    We use Microsoft Authenticator for added security. It’s quick, safe, and
    easy to use. Click the button to start setting up the authenticator.
  </h3>

  <button onclick={handleClick}>Set it up</button>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  h1 {
    text-align: center;
  }

  h3 {
    margin: 0;
    max-width: 600px;
    text-align: center;
  }
  button {
    border: 1px solid #6fbd96;
    border-radius: 50px;
    background-color: #6fbd96;
    color: white;
    font-size: 20px;
    padding: 20px;
    font-family: "Montserrat", sans-serif;
    font-weight: 300;
    margin-top: 50px;
    box-shadow: 0 0 20px rgba(129, 199, 166, 0.4);
    transition: transform 0.5s ease;
  }

  button:hover {
    transform: scale(1.1);
  }
</style>
