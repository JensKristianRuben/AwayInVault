<script lang="ts">
  import favicon from "$lib/assets/favicon.png";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import { page } from "$app/state";

  // Web Crypto & Supabase Session Imports
  import { supabase } from "$lib/utils/supabaseClient";
  import { cryptoSession } from "$lib/stores/cryptoSession.svelte";
  import {
    generateSalt,
    deriveKey,
    encryptData,
    decryptData,
  } from "$lib/utils/crypto";

  let { children } = $props();

  let currentPath = $derived(page.url.pathname);
  const isActive = (path: string) =>
    currentPath === path || currentPath.startsWith(path + "/");

  // Local state variables for the modal
  let showModal = $state(false);
  let isNewUser = $state(false);
  let masterPasswordInput = $state("");
  let confirmPasswordInput = $state("");
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);
  let errorMessage = $state("");
  let isProcessing = $state(false);

  let userMetadata = $state(null);

  onMount(async () => {
    // 1. Tjek om vi allerede har en aktiv nøgle i vores in-memory store
    if (cryptoSession.cryptoKey) {
      return;
    }

    // 2. Hent den aktuelle bruger
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; 

    userMetadata = user.user_metadata;

    // 3. Tjek om brugeren har sat et Master Password før (salt og verifier gemt i metadata)
    if (!userMetadata?.salt || !userMetadata?.verifier_ciphertext) {
      isNewUser = true;
    } else {
      isNewUser = false;
    }

    showModal = true;
  });

  async function handleSubmit(e) {
    e.preventDefault();
    errorMessage = "";
    isProcessing = true;

    try {
      if (isNewUser) {
        if (masterPasswordInput !== confirmPasswordInput) {
          errorMessage = "Adgangskoderne er ikke ens";
          isProcessing = false;
          return;
        }

        const salt = generateSalt();

        const key = await deriveKey(masterPasswordInput, salt);

        const verifier = await encryptData(
          "vaulten-er-lukket-og-du-kan-ikke-komme-ind-uden-masterpassword",
          key,
        );

        const { error } = await supabase.auth.updateUser({
          data: {
            salt: salt,
            verifier_ciphertext: verifier.ciphertext,
            verifier_iv: verifier.iv,
          },
        });

        if (error) {
          throw error;
        }

        cryptoSession.setSession(key, salt);

        showModal = false;
        masterPasswordInput = "";
        confirmPasswordInput = "";
        toast.success("Masterpassword Oprettet");
      } else {
        const salt = userMetadata.salt;
        const ciphertext = userMetadata.verifier_ciphertext;
        const iv = userMetadata.verifier_iv;

        const key = await deriveKey(masterPasswordInput, salt);

        const decryptedKey = await decryptData(ciphertext, key, iv);

        if (
          decryptedKey ===
          "vaulten-er-lukket-og-du-kan-ikke-komme-ind-uden-masterpassword"
        ) {
          cryptoSession.setSession(key, salt);

          showModal = false;

          masterPasswordInput = "";

          toast.success("Boksen er klar!");
        } else {
          throw new Error("Fejl under validering af nøglen");
        }
      }
    } catch (err) {
      console.error(err);
      errorMessage = isNewUser
        ? "Fejl under oprettelse."
        : "Forkert Master Password.";
    } finally {
      isProcessing = false;
    }
  }
</script>

<nav
  class="fixed left-0 top-0 h-screen w-16 bg-bg-sidebar transition-all duration-300 ease-in-out hover:w-64
      z-50 overflow-hidden shadow-xl border-r border-border-subtle flex flex-col items-center py-4 group"
>
  <!-- Logo/Top ikon (Micro-animation on hover) -->
  <div class="h-16 flex items-center justify-center w-full flex-shrink-0 mb-8">
    <img
      src={favicon}
      alt="Awayinvault Logo"
      class="w-10 h-10 object-contain transition-transform duration-500 group-hover:rotate-[360deg]"
    />
  </div>

  <!-- Menu Links -->
  <div class="flex-1 flex flex-col w-full px-2 gap-y-2">
    <!-- Passwords Link -->
    <a
      href="/passwords"
      class="relative flex items-center p-3 rounded-lg transition-all duration-200
             {isActive('/passwords')
        ? 'bg-accent/10 text-accent font-semibold'
        : 'text-text-muted hover:bg-accent/5 hover:text-text-base'}"
    >
      <!-- Active indicator line -->
      {#if isActive("/passwords")}
        <div
          class="absolute left-0 top-1/4 bottom-1/4 w-1 bg-accent rounded-r-md"
        ></div>
      {/if}

      <div class="w-10 flex-shrink-0 flex justify-center">
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
        class="ml-4 text-text-base font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >Passwords</span
      >
    </a>

    <!-- Notes Link -->
    <a
      href="/notes"
      class="relative flex items-center p-3 rounded-lg transition-all duration-200
             {isActive('/notes')
        ? 'bg-accent/10 text-accent font-semibold'
        : 'text-text-muted hover:bg-accent/5 hover:text-text-base'}"
    >
      <!-- Active indicator line -->
      {#if isActive("/notes")}
        <div
          class="absolute left-0 top-1/4 bottom-1/4 w-1 bg-accent rounded-r-md"
        ></div>
      {/if}

      <div class="w-10 flex-shrink-0 flex justify-center">
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
          <path
            d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
          />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
          <line x1="10" x2="8" y1="9" y2="9" />
        </svg>
      </div>
      <span
        class="ml-4 text-text-base font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >Notes</span
      >
    </a>

    <!-- About Link -->
    <a
      href="/about"
      class="relative flex items-center p-3 rounded-lg transition-all duration-200
             {isActive('/about')
        ? 'bg-accent/10 text-accent font-semibold'
        : 'text-text-muted hover:bg-accent/5 hover:text-text-base'}"
    >
      <!-- Active indicator line -->
      {#if isActive("/about")}
        <div
          class="absolute left-0 top-1/4 bottom-1/4 w-1 bg-accent rounded-r-md"
        ></div>
      {/if}

      <div class="w-10 flex-shrink-0 flex justify-center">
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
        class="ml-4 text-text-base font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >About</span
      >
    </a>
  </div>

  <!-- Bottom Actions (Theme toggle + destructive Logout) -->
  <div class="w-full px-2 mt-auto gap-y-2 flex flex-col">
    <ThemeToggle />

    <form method="POST" action="/login?/logout" use:enhance class="w-full">
      <button
        type="submit"
        class="flex items-center w-full p-3 rounded-lg hover:bg-red-500/10 transition-colors duration-200 group/logoutbtn text-text-muted hover:text-red-500 focus:outline-none cursor-pointer"
        aria-label="Logout"
      >
        <div class="w-10 flex-shrink-0 flex justify-center">
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
        <span
          class="ml-4 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          Log ud
        </span>
      </button>
    </form>
  </div>
</nav>

<main class="ml-16 min-h-screen w-full bg-bg-primary">
  {@render children()}
</main>

<!-- 4. BLOCKING MASTER PASSWORD MODAL -->
{#if showModal}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/95 backdrop-blur-md transition-all duration-300"
  >
    <div
      class="bg-bg-sidebar border border-border-subtle p-8 max-w-md w-full shadow-[0_0_50px_-12px_rgba(16,185,129,0.15)] relative overflow-hidden transition-all"
    >
      <!-- Top Decorative Keyhole Icon (Visual Signature) -->
      <div class="flex flex-col items-center text-center mb-6">
        <div
          class="w-16 h-16 rounded-full bg-accent/5 flex items-center justify-center border border-accent/10 mb-4"
        >
          {#if isNewUser}
            <!-- Spin/pulse animation indicating key setup -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-8 h-8 text-accent animate-[pulse_2s_infinite]"
            >
              <path
                d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.5-2.5m5.5 0a2 2 0 1 1-2.828-2.828A2 2 0 0 1 21 2z"
              />
            </svg>
          {:else}
            <!-- Locked Padlock representing secure state -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-8 h-8 text-accent"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              <circle cx="12" cy="16" r="1.5" />
              <path d="M12 17.5V20" />
            </svg>
          {/if}
        </div>

        <h2 class="text-xl font-semibold tracking-tight text-text-base">
          {isNewUser ? "Opret Master Password" : "Lås din Vault op"}
        </h2>
        <p class="text-text-muted text-xs font-light mt-2 max-w-sm">
          {isNewUser
            ? "Dette password bruges til at kryptere dine data lokalt i browseren. Vi gemmer det aldrig på serveren, og det kan ikke genskabes!"
            : "Indtast dit Master Password for at generere din private krypteringsnøgle og hente dine koder."}
        </p>
      </div>

      <!-- Form -->
      <form onsubmit={handleSubmit} class="space-y-5">
        <!-- Input 1: Master Password -->
        <div class="space-y-1.5">
          <label
            for="master-password"
            class="text-[10px] font-semibold uppercase tracking-widest text-text-muted ml-1"
          >
            Master Password
          </label>
          <div class="relative">
            <input
              id="master-password"
              type={showPassword ? "text" : "password"}
              placeholder="Indtast adgangskode"
              bind:value={masterPasswordInput}
              required
              disabled={isProcessing}
              class="w-full pl-4 pr-12 py-3 rounded-none bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-text-base/20"
            />
            <button
              type="button"
              onclick={() => (showPassword = !showPassword)}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-base transition-colors cursor-pointer"
              aria-label="Toggle password visibility"
            >
              {#if showPassword}
                <!-- Eye off -->
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-5 h-5"
                >
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path
                    d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"
                  />
                  <path
                    d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"
                  />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              {:else}
                <!-- Eye -->
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-5 h-5"
                >
                  <path
                    d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"
                  />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              {/if}
            </button>
          </div>
        </div>

        <!-- Input 2: Confirm Password (kun for nye brugere) -->
        {#if isNewUser}
          <div class="space-y-1.5">
            <label
              for="confirm-password"
              class="text-[10px] font-semibold uppercase tracking-widest text-text-muted ml-1"
            >
              Bekræft Password
            </label>
            <div class="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Gentag adgangskode"
                bind:value={confirmPasswordInput}
                required
                disabled={isProcessing}
                class="w-full pl-4 pr-12 py-3 rounded-none bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-text-base/20"
              />
              <button
                type="button"
                onclick={() => (showConfirmPassword = !showConfirmPassword)}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-base transition-colors cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {#if showConfirmPassword}
                  <!-- Eye off -->
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="w-5 h-5"
                  >
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path
                      d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"
                    />
                    <path
                      d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"
                    />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                {:else}
                  <!-- Eye -->
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="w-5 h-5"
                  >
                    <path
                      d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"
                    />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                {/if}
              </button>
            </div>
          </div>
        {/if}

        <!-- Fejlbesked -->
        {#if errorMessage}
          <div
            class="text-xs text-red-500 bg-red-500/5 border border-red-500/10 p-3 flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-4 h-4 flex-shrink-0"
            >
              <circle cx="12" cy="12" r="10" /><line
                x1="12"
                y1="8"
                x2="12"
                y2="12"
              /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        {/if}

        <!-- Højteknologisk progress loader når vi afleder nøgler -->
        {#if isProcessing}
          <div
            class="text-xs text-accent bg-accent/5 border border-accent/10 p-3 flex flex-col gap-2"
          >
            <div class="flex items-center gap-2">
              <!-- Spinning mini circle -->
              <svg
                class="animate-spin h-4 w-4 text-accent"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span class="font-medium">Afleder krypteringsnøgle...</span>
            </div>
            <div class="text-[10px] text-text-muted">
              Kører 600.000 PBKDF2-iterationer (SHA-256)
            </div>
          </div>
        {/if}

        <!-- Submit knap -->
        <button
          type="submit"
          disabled={isProcessing}
          class="w-full py-3 px-4 border-2 border-accent text-accent font-semibold rounded-none hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
        >
          {#if isProcessing}
            Vent venligst...
          {:else}
            {isNewUser ? "Opret og Lås op" : "Lås Vault op"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-4 h-4"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          {/if}
        </button>
      </form>
    </div>
  </div>
{/if}
