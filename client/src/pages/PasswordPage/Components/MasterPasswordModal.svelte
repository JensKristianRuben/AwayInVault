<script>
  import ConfirmIcon from "../../../components/icons/ConfirmIcon.svelte";
  const { onClose, class: className, onVerify } = $props();
  

  let masterPassword = $state("");

  function handleKeydown(event) {
    if (event.key === "Escape") {
      onClose?.();
    }
  }

  function handleInputKeydown(event) {
    if (event.key === "Enter") {
      handleVerifyClick();
    }
    if (event.key === "Escape") {
      onClose?.();
    }
  }

  function handleModalClick(event) {
    event.stopPropagation();
  }

  function handleVerifyClick() {
    if (masterPassword) {
      onVerify?.(masterPassword);
      masterPassword = "";
      return;
    }
  }
</script>

<div
  class="backlay {className}"
  onclick={onClose}
  onkeydown={handleKeydown}
  role="button"
  tabindex="0"
>
  <div
    class="dialog"
    onclick={handleModalClick}
    onkeydown={handleKeydown}
    role="button"
    tabindex="0"
  >
    <div class="header">
      <h3>Decrypt check</h3>
      <p>Confirm your masterpassword</p>
    </div>

    <div class="password-and-btn-wrapper">
      <input
        type="password"
        placeholder="Master Password"
        bind:value={masterPassword}
        onkeydown={handleInputKeydown}
      />
      <button aria-label="check-password" onclick={handleVerifyClick}>
        <ConfirmIcon/>
      </button>
    </div>
  </div>
</div>

<style>
  .backlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 26, 13, 0.85);
    backdrop-filter: blur(5px);
    z-index: 999;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease;
  }

  .backlay.is-open {
    opacity: 1;
    visibility: visible;
  }

  .dialog {
    background: #001a0d;
    padding: 30px;
    border-radius: 15px;
    border: 1px solid #6fbd96;
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 400px;
    max-width: 90%;
    box-shadow: 0 0 30px rgba(0, 255, 128, 0.15);
    transform: scale(0.95);
    transition: transform 0.2s ease;
  }

  .backlay.is-open .dialog {
    transform: scale(1);
  }

  .header {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .header h3 {
    color: #6fbd96;
    font-family: "Montserrat", sans-serif;
    margin: 0;
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .header p {
    color: #a0c4b0;
    font-family: "Montserrat", sans-serif;
    font-size: 0.9rem;
    margin: 0;
  }

  .password-and-btn-wrapper {
    display: flex;
    flex-direction: row;
    gap: 10px;
    align-items: center;
  }

  .dialog input {
    flex-grow: 1;
    padding: 12px 15px;
    background-color: rgba(23, 54, 38, 0.6);
    border: 1px solid transparent;
    border-radius: 8px;
    color: white;
    font-family: "Montserrat", sans-serif;
    font-size: 1rem;
    outline: none;
    transition: all 0.3s ease;
  }

  .dialog input:focus {
    border-color: #6fbd96;
    box-shadow: 0 0 10px rgba(111, 189, 150, 0.3);
    background-color: rgba(23, 54, 38, 0.9);
  }

  .dialog button {
    background-color: #6fbd96;
    border: none;
    border-radius: 8px;
    width: 45px;
    height: 45px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .dialog button:hover {
    background-color: #00ff80;
    box-shadow: 0 0 15px rgba(0, 255, 128, 0.4);
    transform: translateY(-1px);
  }
</style>