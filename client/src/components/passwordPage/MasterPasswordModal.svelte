<script>
  const { onClose, class: className, onVerify } = $props();

  let masterPassword = $state();

  function handleKeydown(event) {
    if (event.key === "Escape") {
      onClose?.();
    }
  }

  function handleModalClick(event) {
    event.stopPropagation();
  }

  function handleVerifyClick() {
    console.log("Handle verify");
    if (masterPassword) {
      onVerify?.(masterPassword);
      masterPassword = "";
      onClose?.();
      return;
    }
    onClose?.();
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
    <p>Enter your master password to view your password</p>
    <div class="password-and-brn-wrapper">
      <input
        type="password"
        placeholder="Masterpassword"
        bind:value={masterPassword}
      />
      <button aria-label="check-password" onclick={handleVerifyClick}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          width="24px"
          height="24px"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
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
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 999;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 0.3s ease,
      visibility 0.3s ease;
  }

  .backlay.is-open {
    opacity: 1;
    visibility: visible;
  }

  .dialog {
    background: #001a0d;
    padding: 1rem;
    border-radius: 10px;
    padding: 20px;
    gap: 20px;
    border: 1px solid #6fbd96;
  }

  .backlay p {
    display: flex;
    justify-content: flex-start;
    color: white;
    font-family: "Montserrat", sans-serif;
    font-weight: 700;
  }

  .dialog input {
    width: 80%;
    padding: 12px 15px;
    background-color: #17362680;
    border-radius: 10px;
    border: none;
    transition: all 0.3s ease;
    color: white;
  }

  .password-and-brn-wrapper {
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: 10px;
  }
  .dialog button {
    background-color: #001a0d;
    border: none;
    width: 30%;
  }

  .dialog svg {
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .dialog svg:hover {
    color: #6fbd96;
    scale: 1.1;
  }
</style>
