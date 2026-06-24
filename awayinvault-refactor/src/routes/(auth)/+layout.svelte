<script lang="ts">
  import { page } from "$app/state";
  import { enhance } from "$app/forms";
  import { toast } from "svelte-sonner";

  let { children } = $props();

  // Bruges udelukkende til den visuelle sliding-animation
  let isRegister = $derived(page.url.pathname === "/register");

  // Beholder eksisterende login logik
  let loginEmail = $state("");
  let loginPassword = $state("");
</script>

<div class="min-h-screen w-full flex items-center justify-center bg-bg-primary p-4">
  <!-- Ydre container -->
  <div class="relative w-full max-w-4xl h-[650px] md:h-[600px] overflow-hidden">
    
    <!-- 1. LOGIN FORM CONTAINER -->
    <div 
      class="absolute left-0 top-0 w-full md:w-1/2 h-full flex flex-col justify-center p-8 transition-all duration-700 ease-in-out z-10
             {isRegister ? 'opacity-0 pointer-events-none -translate-x-full md:translate-x-12' : 'opacity-100 translate-x-0'}"
    >
      <div class="max-w-md w-full mx-auto">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-2xl font-semibold tracking-tight text-text-base mb-2">Velkommen tilbage</h1>
          <p class="text-text-muted text-xs font-light">Log ind for at få adgang til dine data</p>
        </div>

        <!-- Form LOGIN -->
        <form
          class="space-y-6"
          method="POST"
          action="/login?/login"
          use:enhance={() => {
            return async ({ result, update }) => {
              if (result.type === "failure") {
                toast.error(result.data?.message || "Failure");
                await update();
              } else if (result.type === "redirect") {
                toast.success("Velkommen tilbage!");
                await update();
              } else {
                await update();
              }
              await update();
            };
          }}
        >
          <div class="space-y-2">
            <label for="login-email" class="text-xs font-semibold uppercase tracking-wider text-text-muted ml-1">
              Email adresse
            </label>
            <input
              name="email"
              type="email"
              id="login-email"
              bind:value={loginEmail}
              placeholder="navn@eksempel.dk"
              required
              class="w-full px-4 py-3 rounded-none bg-bg-primary border border-border-subtle text-text-base focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-base/30 text-sm"
            />
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between ml-1">
              <label for="login-password" class="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Adgangskode
              </label>
              <a
                href="/forgot-password"
                class="text-xs text-accent hover:underline font-light"
              >
                Glemt adgangskode?
              </a>
            </div>
            <input
              name="password"
              type="password"
              id="login-password"
              placeholder="••••••••"
              bind:value={loginPassword}
              required
              class="w-full px-4 py-3 rounded-none bg-bg-primary border border-border-subtle text-text-base focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-base/30 text-sm"
            />
          </div>

          <!-- Log ind knap uden fyld (outlined med border-2 border-accent og text-accent) -->
          <button
            type="submit"
            class="w-full py-3 px-4 border-2 border-accent text-accent font-semibold rounded-none hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer text-sm"
          >
            Log ind
          </button>
        </form>

        <form method="POST" action="/login?/loginWithGithub" class="mt-4">
          <button
            type="submit"
            class="w-full flex items-center justify-center gap-2 bg-bg-primary border border-border-subtle text-text-base p-3 rounded-none hover:bg-bg-sidebar transition-colors cursor-pointer text-sm font-semibold"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
              />
            </svg>
            Login med GitHub
          </button>
        </form>

        <!-- Skift-knap til mobil -->
        <div class="text-center mt-6 md:hidden">
          <p class="text-sm text-text-base/60">
            Har du ikke en konto?
            <a href="/register" class="text-accent font-medium hover:underline font-light">Opret her</a>
          </p>
        </div>
      </div>
    </div>

    <!-- 2. REGISTER FORM CONTAINER -->
    <div 
      class="absolute left-0 top-0 w-full md:w-1/2 h-full flex flex-col justify-center p-8 transition-all duration-700 ease-in-out z-10
             {isRegister ? 'opacity-100 translate-x-0 md:translate-x-full' : 'opacity-0 pointer-events-none translate-x-full md:translate-x-[-12]'}"
    >
      <div class="max-w-md w-full mx-auto">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-2xl font-semibold tracking-tight text-text-base mb-2">Opret konto</h1>
          <p class="text-text-muted text-sm font-light">Gem dine adgangskoder sikkert ét sted</p>
        </div>

        <!-- Form REGISTER -->
        <form
          class="space-y-4"
          method="POST"
          action="/register?/register"
        >
          <div class="space-y-2">
            <label for="reg-email" class="text-xs font-semibold uppercase tracking-wider text-text-muted ml-1">
              Email adresse
            </label>
            <input
              name="email"
              type="email"
              id="reg-email"
              placeholder="navn@eksempel.dk"
              required
              class="w-full px-4 py-3 rounded-none bg-bg-primary border border-border-subtle text-text-base focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-base/30 text-sm"
            />
          </div>

          <div class="space-y-2">
            <label for="reg-password" class="text-xs font-semibold uppercase tracking-wider text-text-muted ml-1">
              Adgangskode
            </label>
            <input
              name="password"
              type="password"
              id="reg-password"
              placeholder="••••••••"
              required
              class="w-full px-4 py-3 rounded-none bg-bg-primary border border-border-subtle text-text-base focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-base/30 text-sm"
            />
          </div>

          <div class="space-y-2">
            <label for="reg-password-confirm" class="text-xs font-semibold uppercase tracking-wider text-text-muted ml-1">
              Bekræft adgangskode
            </label>
            <input
              name="passwordConfirm"
              type="password"
              id="reg-password-confirm"
              placeholder="••••••••"
              required
              class="w-full px-4 py-3 rounded-none bg-bg-primary border border-border-subtle text-text-base focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-base/30 text-sm"
            />
          </div>

          <!-- Opret konto knap uden fyld (outlined med border-2 border-accent og text-accent) -->
          <button
            type="submit"
            class="w-full py-3 px-4 border-2 border-accent text-accent font-semibold rounded-none hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer text-sm"
          >
            Opret konto
          </button>
        </form>

        <!-- Skift-knap til mobil -->
        <div class="text-center mt-6 md:hidden">
          <p class="text-sm text-text-base/60">
            Har du allerede en konto?
            <a href="/login" class="text-accent font-medium hover:underline font-light">Log ind her</a>
          </p>
        </div>
      </div>
    </div>

    <!-- 3. SLIDING OVERLAY (Kun desktop) -->
    <div 
      class="hidden md:flex absolute top-0 left-0 w-1/2 h-full bg-bg-sidebar flex-col items-center justify-center p-12 text-center transition-all duration-700 ease-in-out z-20
             {isRegister ? 'translate-x-0 border-r border-border-subtle' : 'translate-x-full border-l border-border-subtle'}"
    >
      {#if isRegister}
        <div class="space-y-6">
          <h2 class="text-3xl font-light tracking-tight text-text-base">Velkommen tilbage!</h2>
          <p class="text-text-muted max-w-sm mx-auto leading-relaxed font-light text-sm">
            For at holde forbindelsen med dine gemte koder skal du logge ind med dine personlige oplysninger.
          </p>
          <a
            href="/login"
            class="inline-block px-8 py-3 border-2 border-accent text-accent font-semibold rounded-none hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer text-sm"
          >
            Log ind
          </a>
        </div>
      {:else}
        <div class="space-y-6">
          <h2 class="text-3xl font-light tracking-tight text-text-base">Hej ven!</h2>
          <p class="text-text-muted max-w-sm mx-auto leading-relaxed font-light text-sm">
            Opret en sikker konto og start din rejse mod bedre og stærkere beskyttelse af dine adgangskoder.
          </p>
          <a
            href="/register"
            class="inline-block px-8 py-3 border-2 border-accent text-accent font-semibold rounded-none hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer text-sm"
          >
            Opret konto
          </a>
        </div>
      {/if}
    </div>

  </div>
</div>

<!-- SvelteKit placeholder for at rendere de tomme side-komponenter -->
<div class="hidden">
  {@render children()}
</div>
