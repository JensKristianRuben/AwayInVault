<script>
  let { onclick } = $props();

  let isSpinning = $state(false);

  function handleSpin() {
    if (isSpinning) return;

    isSpinning = true;

    setTimeout(() => {
      isSpinning = false;
    }, 500);

    onclick?.();
  }
</script>

<button aria-label="generate-bottom" onclick={handleSpin}>
  <svg
    class={isSpinning ? "spin-active" : ""}
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path
      d="M3 3v5h5"
    /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path
      d="M16 21h5v-5"
    />
  </svg>
</button>

<style>
  button {
    margin: 10px;
  }
  svg {
    color: white;
    transform-origin: center;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(-360deg);
    }
  }

  .spin-active {
    animation: spin 0.5s ease-in-out;
  }
</style>
