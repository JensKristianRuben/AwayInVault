<script>
  import { scale } from "svelte/transition";
  import toastr from "toastr";
  let { onclick } = $props();

  let isCopied = $state();

  function handleClick() {
    if (isCopied) return;

    isCopied = true;

    setTimeout(() => {
      isCopied = false;
    }, 2000);
    onclick?.();
  }
</script>

<button onclick={handleClick} aria-label="Copy to clipboard" class="copy-btn">
  {#if isCopied}
    <div in:scale={{ duration: 200, start: 0.5 }} class="icon-wrapper check">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  {:else}
    <div in:scale={{ duration: 200, start: 0.5 }} class="icon-wrapper copy">
      <svg
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
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
    </div>
  {/if}
</button>

<style>
  button {
    margin: 10px;
  }

  .copy {
    color: white;
    transition: color 0.2s;
  }

  .check {
    color: #00ff80;
  }
</style>
