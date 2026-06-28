<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/utils/supabaseClient";
  import { cryptoSession } from "$lib/stores/cryptoSession.svelte";
  import { decryptData } from "$lib/utils/crypto";
  import { toast } from "svelte-sonner";
  import type { VaultItem } from "$lib/types/vault";

  import CreatePasswordModal from "$lib/components/passwords/CreatePasswordModal.svelte";
  import PasswordCard from "$lib/components/passwords/PasswordCard.svelte";

  // Data states
  let decryptedItems = $state<VaultItem[]>([]);
  let isLoading = $state(true);
  let showCreateModal = $state(false);

  // Search state
  let searchQuery = $state("");

  // Helper to decrypt a field of format 'iv:ciphertext'
  async function decryptField(encryptedValue: string | null, key: CryptoKey): Promise<string> {
    if (!encryptedValue) return "";
    const parts = encryptedValue.split(":");
    if (parts.length !== 2) {
      return "(formatfejl)";
    }
    const [iv, ciphertext] = parts;
    try {
      return await decryptData(ciphertext, key, iv);
    } catch (err) {
      console.error("Fejl ved dekryptering:", err);
      return "(dekrypteringsfejl)";
    }
  }

  // Load items from Supabase and decrypt them locally
  async function loadAndDecryptVaultItems() {
    isLoading = true;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        isLoading = false;
        return;
      }

      const { data, error } = await supabase
        .from("vault_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const key = cryptoSession.cryptoKey;
      if (!key) {
        // Vault is locked (e.g. modal is open), display encrypted placeholders
        decryptedItems = (data || []).map(item => ({
          ...item,
          username: "(låst)",
          password: "(låst - krypteret i database)",
          isDecrypted: false
        }));
        return;
      }

      // Decrypt items
      const decrypted = await Promise.all(
        (data || []).map(async (item) => {
          const username = await decryptField(item.username_encrypted, key);
          const password = await decryptField(item.password_encrypted, key);
          return {
            ...item,
            username,
            password,
            isDecrypted: true
          };
        })
      );

      decryptedItems = decrypted;
    } catch (err: any) {
      console.error("Fejl ved hentning af vault_items:", err);
      toast.error("Kunne ikke hente eller dekryptere dine koder: " + err.message);
    } finally {
      isLoading = false;
    }
  }

  // Delete an item with sonner confirmation toast styled to match theme
  function handleDelete(item: VaultItem) {
    toast(`Vil du slette adgangskoden til "${item.title}" permanent?`, {
      description: "Denne handling kan ikke fortrydes.",
      action: {
        label: "Slet permanent",
        onClick: async () => {
          try {
            const { error } = await supabase
              .from("vault_items")
              .delete()
              .eq("id", item.id);

            if (error) throw error;

            toast.success(`"${item.title}" blev slettet!`);
            await loadAndDecryptVaultItems();
          } catch (err: any) {
            console.error("Fejl ved sletning:", err);
            toast.error("Kunne ikke slette elementet: " + err.message);
          }
        }
      },
      cancel: {
        label: "Annuller",
        onClick: () => {}
      },
      classes: {
        toast: "!bg-bg-sidebar !border !border-border-subtle !rounded-none !text-text-base !p-4 !shadow-2xl !flex !flex-col !gap-3 !items-start",
        title: "!text-sm !font-semibold !text-text-base",
        description: "!text-xs !text-text-muted",
        actionButton: "!bg-red-500 hover:!bg-red-600 !text-white !text-xs !px-3 !py-1.5 !font-semibold !rounded-none !transition-colors !cursor-pointer",
        cancelButton: "!bg-transparent !border !border-border-subtle hover:!border-text-base/30 !text-text-muted hover:!text-text-base !text-xs !px-3 !py-1.5 !font-semibold !rounded-none !transition-all !cursor-pointer"
      }
    });
  }

  function handleCreateSuccess() {
    showCreateModal = false;
    loadAndDecryptVaultItems();
  }

  // Computed filter of items based on search query
  let filteredItems = $derived(
    decryptedItems.filter(item => {
      const query = searchQuery.toLowerCase();
      const titleMatch = item.title?.toLowerCase().includes(query);
      const websiteMatch = item.website?.toLowerCase().includes(query);
      const usernameMatch = item.username?.toLowerCase().includes(query);
      return titleMatch || websiteMatch || usernameMatch;
    })
  );

  // Watch for changes in the key state to re-run decryption
  $effect(() => {
    if (cryptoSession.cryptoKey) {
      loadAndDecryptVaultItems();
    }
  });

  onMount(() => {
    loadAndDecryptVaultItems();
  });
</script>

<div class="p-8 max-w-5xl mx-auto space-y-8">
  <!-- Header with signature key/vault status -->
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-border-subtle">
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-text-base">
        Passwords
      </h1>
    </div>

    <div class="flex items-center gap-3">
      <!-- Add Password Button -->
      <button
        onclick={() => (showCreateModal = true)}
        disabled={!cryptoSession.cryptoKey}
        class="py-2 px-4 border-2 border-accent text-accent font-semibold text-xs rounded-none hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          class="w-3.5 h-3.5"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Tilføj kode
      </button>
    </div>
  </div>

  <!-- Search & Content Section -->
  <div class="space-y-6">
    <!-- Search Bar -->
    <div class="flex items-center bg-bg-sidebar border border-border-subtle p-3 shadow-sm">
      <div class="relative flex-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Søg efter tjeneste, URL eller brugernavn..."
          bind:value={searchQuery}
          class="w-full pl-9 pr-4 py-2 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent transition-all placeholder:text-text-base/20"
        />
      </div>
    </div>

    <!-- Items list -->
    {#if isLoading}
      <div class="flex flex-col items-center justify-center py-20 bg-bg-sidebar border border-border-subtle text-text-muted space-y-4">
        <svg class="animate-spin h-7 w-7 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-xs tracking-wide">Henter og dekrypterer elementer...</p>
      </div>
    {:else if !cryptoSession.cryptoKey}
      <div class="flex flex-col items-center justify-center py-20 bg-bg-sidebar border border-border-subtle text-text-muted text-center p-6 space-y-4">
        <div class="w-12 h-12 rounded-full bg-red-500/5 flex items-center justify-center border border-red-500/10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6 text-red-500">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div>
          <h3 class="text-text-base font-semibold text-sm">Boksen er låst</h3>
          <p class="text-xs text-text-muted mt-1 max-w-sm">Indtast venligst dit Master Password i modal-vinduet for at hente din boks-nøgle.</p>
        </div>
      </div>
    {:else if filteredItems.length === 0}
      <div class="flex flex-col items-center justify-center py-20 bg-bg-sidebar border border-border-subtle text-text-muted text-center p-6 space-y-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          class="w-7 h-7 text-text-muted"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        <p class="text-xs font-medium">Ingen koder fundet</p>
        {#if searchQuery}
          <p class="text-[10px] text-text-muted">Prøv at søge efter andre ord.</p>
        {/if}
      </div>
    {:else}
      <div class="space-y-4">
        {#each filteredItems as item (item.id)}
          <PasswordCard {item} onDelete={handleDelete} />
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Modal for creating a new vault item -->
{#if showCreateModal}
  <CreatePasswordModal
    onClose={() => (showCreateModal = false)}
    onSuccess={handleCreateSuccess}
  />
{/if}
