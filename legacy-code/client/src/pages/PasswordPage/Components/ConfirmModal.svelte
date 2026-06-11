<script>
  const { onClose, class: className, onConfirm } = $props();

  function handleKeydown(event) {
    if (event.key === "Escape") {
      onClose?.();
    }
    if (event.key === "Enter") {
      onConfirm?.();
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
    class="dialog"
    onclick={stopPropagation}
    role="dialog"
    tabindex="-1"
    onkeydown={handleKeydown}
  >
    <div class="header">
      <h3>Confirm Deletion</h3>
      <p>Are you sure you want to delete this?</p>
    </div>

    <div class="actions">
      <button class="cancel-btn" onclick={onClose}>Cancel</button>
      <button class="confirm-btn" aria-label="confirm" onclick={handleConfirmClick}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
          width="20px"
          height="20px"
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
    gap: 25px;
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
    font-size: 0.95rem;
    margin: 0;
    line-height: 1.4;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 15px;
  }

  .cancel-btn {
    background: none;
    border: none;
    color: #6fbd96;
    font-family: "Montserrat", sans-serif;
    font-size: 0.9rem;
    cursor: pointer;
    padding: 10px 15px;
    border-radius: 8px;
    transition: all 0.2s;
    opacity: 0.8;
  }

  .cancel-btn:hover {
    opacity: 1;
    background-color: rgba(111, 189, 150, 0.1);
  }

  .confirm-btn {
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
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }

  .confirm-btn:hover {
    background-color: #00ff80;
    box-shadow: 0 0 15px rgba(0, 255, 128, 0.4);
    transform: translateY(-1px);
  }

  .confirm-btn svg {
    color: #001a0d;
  }
</style>