<script>
  const { onClose, class: className, onConfirm } = $props();

  function handleKeydown(event) {
    if (event.key === "Escape") {
      onClose?.();
    }
  }

  function handleConfirmClick() {
    onConfirm?.();
  }

  function stopPropagation(event) {
    event.stopPropagation();
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
    class="confirm-Wrapper"
    onclick={stopPropagation}
    role="dialog"
    tabindex="-1"
    onkeydown={null}
  >
    <p>Are you sure you want to delete this?</p>
    <button aria-label="check-password" onclick={handleConfirmClick}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        width="50px"
        height="50px"
      >
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </button>
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

  .confirm-Wrapper {
    background: #001a0d;
    padding: 1rem;
    border-radius: 10px;
    padding: 20px;
    gap: 20px;
    border: 1px solid #6fbd96;
  }

  .confirm-Wrapper p {
    display: flex;
    justify-content: flex-start;
    color: white;
    font-family: "Montserrat", sans-serif;
    font-weight: 700;
  }

  .confirm-Wrapper button {
    background-color: #001a0d;
    border: none;
    width: 100%;
  }

  .confirm-Wrapper svg {
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .confirm-Wrapper svg:hover {
    color: #6fbd96;
    scale: 1.1;
  }
</style>
