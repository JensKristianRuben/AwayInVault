<script>
  const { onClose, class: className } = $props();

  function handleKeydown(event) {
    if (event.key === "Escape") {
      onClose?.();
    }
  }
</script>

<div
  class="backlay {className}"
  onclick={onClose}
  onkeydown={handleKeydown}
  role="button"
  tabindex="0"
></div>

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
</style>
