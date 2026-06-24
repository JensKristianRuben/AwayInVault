<script>
  import favicon from "$lib/assets/favicon.png";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import { enhance } from "$app/forms";

  let { children } = $props();
</script>

<nav
  class="fixed left-0 top-0 h-screen w-16 bg-bg-sidebar transition-all duration-300 ease-in-out hover:w-64
      z-50 overflow-hidden shadow-xl border-r border-accent/10 flex flex-col items-center"
>
  <!-- Logo/Top ikon -->
  <div class="h-16 flex items-center justify-center w-full flex-shrink-0">
    <img
      src={favicon}
      alt="Awayinvault Logo"
      class="w-10 h-10 object-contain"
    />
  </div>

  <!-- Menu -->
  <div class="flex-1 flex flex-col justify-center w-full px-2">
    <div class="space-y-4">
      <a
        href="/passwords"
        class="flex items-center group p-3 rounded-lg hover:bg-accent/10 transition-colors duration-200"
      >
        <div class="w-10 flex-shrink-0 flex justify-center text-accent">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-6 h-6"
          >
            <circle cx="7.5" cy="15.5" r="5.5" />
            <path d="m21 2-9.6 9.6" />
            <path d="m15.5 7.5 3 3" />
            <path d="M18 4.8 20 7" />
          </svg>
        </div>
        <span
          class="ml-4 text-text-base font-medium whitespace-nowrap transition-opacity duration-300"
          >Passwords</span
        >
      </a>

      <a
        href="/notes"
        class="flex items-center group p-3 rounded-lg hover:bg-accent/10 transition-colors duration-200"
      >
        <div class="w-10 flex-shrink-0 flex justify-center text-accent">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-6 h-6"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
            <line x1="10" x2="8" y1="9" y2="9" />
          </svg>
        </div>
        <span
          class="ml-4 text-text-base font-medium whitespace-nowrap transition-opacity duration-300"
          >Notes</span
        >
      </a>

      <a
        href="/about"
        class="flex items-center group p-3 rounded-lg hover:bg-accent/10 transition-colors duration-200"
      >
        <div class="w-10 flex-shrink-0 flex justify-center text-accent">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-6 h-6"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
        <span
          class="ml-4 text-text-base font-medium whitespace-nowrap transition-opacity duration-300"
          >About</span
        >
      </a>
    </div>
  </div>

  <!-- Bottom Actions -->
  <div class="w-full flex items-center justify-start p-2 gap-x-1">
    <ThemeToggle />
    <form method="POST" action="/login?/logout" use:enhance >
      <button
        type="submit"
        class="flex items-center p-3 rounded-lg hover:bg-accent/10 transition-colors duration-200 group text-text-base focus:outline-none cursor-pointer"
        aria-label="Logout"
      >
        <div class="w-10 flex-shrink-0 flex justify-center text-accent">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-6 h-6"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
        </div>
      </button>
    </form>
  </div>
</nav>

<main class="ml-16 min-h-screen w-full bg-bg-primary">
  {@render children()}
</main>
