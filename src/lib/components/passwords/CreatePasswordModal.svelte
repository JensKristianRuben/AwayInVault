<script lang="ts">
	import { supabase } from "$lib/utils/supabaseClient";
	import { cryptoSession } from "$lib/stores/cryptoSession.svelte";
	import { encryptLocal, getBiometricMasterKey, verifyMasterPassword } from "$lib/utils/crypto";
	import { getBiometricCredentials } from "$lib/utils/indexedDB";
	import { toast } from "svelte-sonner";
	import { onMount } from "svelte";

	let { onClose, onSuccess } = $props<{
		onClose: () => void;
		onSuccess: () => void;
	}>();

	// Form input states
	let titleInput = $state("");
	let websiteInput = $state("");
	let usernameInput = $state("");
	let passwordInput = $state("");
	let showPassword = $state(false);
	let isSaving = $state(false);

	let hasBiometrics = $state(false);
	let confirmMasterPassword = $state("");

	onMount(async () => {
		const credentials = await getBiometricCredentials();
		const localBio = !!credentials;
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			const dbBio = (user?.user_metadata?.biometric_credentials || []).length > 0;
			hasBiometrics = localBio || dbBio;
		} catch (err) {
			hasBiometrics = localBio;
		}
	});

	// Generate a random strong password
	function generateRandomPassword() {
		const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*()_-+=";
		const length = 18;
		let generated = "";
		for (let i = 0; i < length; i++) {
			generated += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		passwordInput = generated;
		showPassword = true;
		toast.success("Stærk adgangskode genereret!");
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();

		if (!titleInput.trim()) {
			toast.error("Titel er påkrævet.");
			return;
		}
		if (!passwordInput) {
			toast.error("Adgangskode er påkrævet.");
			return;
		}

		isSaving = true;
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				toast.error("Session udløbet. Log ind igen.");
				isSaving = false;
				return;
			}

			let key = cryptoSession.cryptoKey;
			if (!key) {
				if (hasBiometrics) {
					toast.info("Verificer din biometri for at kryptere og gemme...");
					key = await getBiometricMasterKey(user.user_metadata);
				}

				if (!key) {
					if (!confirmMasterPassword) {
						toast.error("Indtast venligst dit Master Password for at bekræfte.");
						isSaving = false;
						return;
					}
					key = await verifyMasterPassword(confirmMasterPassword, user.user_metadata);
					if (!key) {
						toast.error("Forkert Master Password.");
						isSaving = false;
						return;
					}
				}
			}

			// Encrypt sensitive fields locally
			const usernameEncrypted = usernameInput.trim()
				? await encryptLocal(usernameInput.trim(), key)
				: null;
			const passwordEncrypted = await encryptLocal(passwordInput, key);

			const { error } = await supabase.from("vault_items").insert({
				user_id: user.id,
				title: titleInput.trim(),
				website: websiteInput.trim() || null,
				username_encrypted: usernameEncrypted,
				password_encrypted: passwordEncrypted,
			});

			if (error) throw error;

			toast.success("Kode tilføjet og krypteret!");
			onSuccess();
		} catch (err: any) {
			console.error("Fejl ved oprettelse:", err);
			toast.error("Kunne ikke gemme koden: " + err.message);
		} finally {
			isSaving = false;
		}
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/90 backdrop-blur-md transition-all duration-300"
>
	<div
		class="bg-bg-sidebar border border-border-subtle p-8 max-w-md w-full shadow-[0_0_50px_-12px_rgba(16,185,129,0.15)] relative overflow-hidden transition-all"
	>
		<!-- Header -->
		<div class="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle/50">
			<h2 class="text-xl font-semibold tracking-tight text-text-base flex items-center gap-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="w-6 h-6 text-accent"
				>
					<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
					<path d="M7 11V7a5 5 0 0 1 10 0v4" />
					<circle cx="12" cy="16" r="1.5" />
					<path d="M12 17.5V20" />
				</svg>
				Tilføj Nyt Element
			</h2>
			<button
				onclick={onClose}
				class="text-text-muted hover:text-text-base p-1.5 transition-colors cursor-pointer"
				aria-label="Luk"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="w-5 h-5"
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>

		<!-- Form -->
		<form onsubmit={handleSubmit} class="space-y-4">
			<!-- Title -->
			<div class="space-y-1.5">
				<label
					for="modal-title"
					class="text-[10px] font-semibold uppercase tracking-widest text-text-muted ml-1"
				>
					Titel / Tjeneste *
				</label>
				<input
					id="modal-title"
					type="text"
					placeholder="F.eks. Google, Github, Netflix"
					bind:value={titleInput}
					required
					disabled={isSaving}
					class="w-full px-4 py-3 rounded-none bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-text-base/20"
				/>
			</div>

			<!-- Website URL -->
			<div class="space-y-1.5">
				<label
					for="modal-website"
					class="text-[10px] font-semibold uppercase tracking-widest text-text-muted ml-1"
				>
					Website URL
				</label>
				<input
					id="modal-website"
					type="text"
					placeholder="https://github.com"
					bind:value={websiteInput}
					disabled={isSaving}
					class="w-full px-4 py-3 rounded-none bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-text-base/20"
				/>
			</div>

			<!-- Username -->
			<div class="space-y-1.5">
				<label
					for="modal-username"
					class="text-[10px] font-semibold uppercase tracking-widest text-text-muted ml-1"
				>
					Brugernavn / E-mail
				</label>
				<input
					id="modal-username"
					type="text"
					placeholder="navn@eksempel.dk"
					bind:value={usernameInput}
					disabled={isSaving}
					class="w-full px-4 py-3 rounded-none bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-text-base/20"
				/>
			</div>

			<!-- Password -->
			<div class="space-y-1.5">
				<div class="flex justify-between items-center ml-1">
					<label
						for="modal-password"
						class="text-[10px] font-semibold uppercase tracking-widest text-text-muted"
					>
						Adgangskode *
					</label>
					<button
						type="button"
						onclick={generateRandomPassword}
						disabled={isSaving}
						class="text-[10px] text-accent hover:underline focus:outline-none cursor-pointer disabled:opacity-50"
					>
						Generer kode
					</button>
				</div>
				<div class="relative">
					<input
						id="modal-password"
						type={showPassword ? "text" : "password"}
						placeholder="Indtast adgangskode"
						bind:value={passwordInput}
						required
						disabled={isSaving}
						class="w-full pl-4 pr-12 py-3 rounded-none bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-text-base/20"
					/>
					<button
						type="button"
						onclick={() => (showPassword = !showPassword)}
						disabled={isSaving}
						class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-base transition-colors cursor-pointer disabled:opacity-50"
						aria-label="Vis adgangskode"
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
								<path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
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

			<!-- Confirm with Master Password if not in session -->
			{#if !cryptoSession.cryptoKey}
				<div class="space-y-1.5 pt-4 border-t border-border-subtle/30">
					<label
						for="modal-confirm-master-password"
						class="text-[10px] font-semibold uppercase tracking-widest text-text-muted ml-1"
					>
						Bekræft med Master Password
					</label>
					<input
						id="modal-confirm-master-password"
						type="password"
						placeholder={hasBiometrics
							? "Indtast Master Password (valgfrit hvis biometri bruges)"
							: "Indtast Master Password for at kryptere"}
						bind:value={confirmMasterPassword}
						required={!hasBiometrics}
						disabled={isSaving}
						class="w-full px-4 py-2.5 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent transition-all placeholder:text-text-base/20"
					/>
				</div>
			{/if}

			<!-- Action Buttons -->
			<div class="flex gap-4 pt-4">
				<button
					type="button"
					onclick={onClose}
					disabled={isSaving}
					class="w-1/2 py-3 px-4 border border-border-subtle text-text-muted font-semibold rounded-none hover:text-text-base hover:border-text-base/30 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
				>
					Annuller
				</button>
				<button
					type="submit"
					disabled={isSaving}
					class="w-1/2 py-3 px-4 border-2 border-accent text-accent font-semibold rounded-none hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
				>
					{#if isSaving}
						Gemmer...
					{:else}
						Krypter & Gem
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
