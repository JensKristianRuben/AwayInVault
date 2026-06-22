<script lang="ts">
  import { enhance } from "$app/forms";
  import { updated } from "$app/state";
  import { toast } from "svelte-sonner";

  let email = $state("");
  let password = $state("");
  let { form } = $props();
</script>

<div
  class="min-h-screen w-full flex items-center justify-center bg-bg-primary p-4"
>
  <div
    class="w-full max-w-md bg-bg-sidebar border border-accent/10 rounded-2xl shadow-xl overflow-hidden"
  >
    <!-- Header -->
    <div class="p-8 pb-4 text-center">
      <h1 class="text-3xl font-bold text-text-base mb-2">Velkommen tilbage</h1>
      <p class="text-text-base/60">Log ind for at få adgang til dine data</p>
    </div>

    <!-- Form LOGIN -->
    <form
      class="p-8 pt-4 space-y-6"
      method="POST"
      action="?/login"
      use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === "failure") {
            toast.error(result.data?.message || "Failure");
            await update();
          } else if (result.type === "redirect") {
            toast.success("Welcome back!");
            await update();
          } else {
            await update();
          }
          await update();
        };
      }}
    >
      <div class="space-y-2">
        <label for="email" class="text-sm font-medium text-text-base/80 ml-1">
          Email adresse
        </label>
        <input
          name="email"
          type="email"
          id="email"
          bind:value={email}
          placeholder="navn@eksempel.dk"
          required
          class="w-full px-4 py-3 rounded-xl bg-bg-primary border border-accent/10 text-text-base focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-base/30"
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between ml-1">
          <label for="password" class="text-sm font-medium text-text-base/80">
            Adgangskode
          </label>
          <a
            href="/forgot-password"
            class="text-xs text-accent hover:underline"
          >
            Glemt adgangskode?
          </a>
        </div>
        <input
          name="password"
          type="password"
          id="password"
          placeholder="••••••••"
          bind:value={password}
          required
          class="w-full px-4 py-3 rounded-xl bg-bg-primary border border-accent/10 text-text-base focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-text-base/30"
        />
      </div>

      <button
        type="submit"
        class="w-full py-3 px-4 bg-accent hover:bg-accent/90 text-bg-sidebar font-bold rounded-xl transition-colors duration-200 shadow-lg shadow-accent/20 cursor-pointer"
      >
        Log ind
      </button>

      <div class="text-center pt-2">
        <p class="text-sm text-text-base/60">
          Har du ikke en konto?
          <a href="/register" class="text-accent font-medium hover:underline"
            >Opret her</a
          >
        </p>
      </div>
    </form>
    <form method="POST" action="?/loginWithGithub">
      <button
        type="submit"
        class="w-full flex items-center justify-center gap-2 bg-gray-800 text-white p-3 rounded-lg hover:bg-gray-700 transition-colors"
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
  </div>
</div>
