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
          } else if (result.type === 'redirect') {
            toast.success('Welcome back!')
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
  </div>
</div>
