<script lang="ts">
	import { toast } from "svelte-sonner";
	import { supabase } from "$lib/utils/supabaseClient";
	import { cryptoSession } from "$lib/stores/cryptoSession.svelte";
	import {
		generateSalt,
		deriveKey,
		encryptData,
		decryptData,
		getBiometricMasterKey,
		generateSharingKeyPair,
		exportPublicKey,
		exportPrivateKey,
		encryptLocal,
		decryptLocal,
		importPublicKey,
		importPrivateKey,
		generateProjectKey,
		importProjectKey,
	} from "$lib/utils/crypto";
	import { onMount } from "svelte";
	import { getBiometricCredentials } from "$lib/utils/indexedDB";
	import { migrateAccountToVaultKey } from "$lib/utils/vaultMigration";
	import type { AppUserMetadata } from "$lib/types";

	// Svelte 5 Props destructuring
	let { isNewUser, userMetadata, onSuccess } = $props<{
		isNewUser: boolean;
		userMetadata: AppUserMetadata;
		onSuccess: () => void;
	}>();

	// Local state variables for form inputs and status
	let masterPasswordInput = $state("");
	let confirmPasswordInput = $state("");
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let errorMessage = $state("");
	let isProcessing = $state(false);
	let hasBiometrics = $state(false);

	onMount(async () => {
		if (isNewUser) return;
		const {
			data: { user },
		} = await supabase.auth.getUser();
		const hasLocal = user ? !!(await getBiometricCredentials(user.id)) : false;
		const hasDb = (userMetadata?.biometric_credentials || []).length > 0;
		hasBiometrics = hasLocal || hasDb;
	});

	async function handleBiometricUnlock() {
		errorMessage = "";
		isProcessing = true;
		try {
			const {
				data: { user: bioUser },
			} = await supabase.auth.getUser();
			if (!bioUser) throw new Error("User session not found.");

			const key = await getBiometricMasterKey(userMetadata, bioUser.id);
			if (key) {
				const salt = userMetadata.salt;
				cryptoSession.setSession(key, salt);

				// Fetch and decrypt sharing keys
				const { data: userData } = await supabase.auth.getUser();
				if (userData?.user) {
					const { data: profile } = await supabase
						.from("profiles")
						.select("public_key, encrypted_private_key, encrypted_vault_key")
						.eq("id", userData.user.id)
						.single();

					if (profile?.encrypted_private_key && profile?.public_key) {
						const privKeyBase64 = await decryptLocal(profile.encrypted_private_key, key);
						const privateKeyObj = await importPrivateKey(privKeyBase64);
						const publicKeyObj = await importPublicKey(profile.public_key);
						cryptoSession.setSharingKeys(privateKeyObj, publicKeyObj);
					} else {
						// Fallback: Generate sharing keys if missing
						const keyPair = await generateSharingKeyPair();
						const pubKeyBase64 = await exportPublicKey(keyPair.publicKey);
						const privKeyBase64 = await exportPrivateKey(keyPair.privateKey);
						const encPrivKeyBase64 = await encryptLocal(privKeyBase64, key);

						await supabase.from("profiles").upsert({
							id: userData.user.id,
							email: userData.user.email!,
							public_key: pubKeyBase64,
							encrypted_private_key: encPrivKeyBase64,
						});

						cryptoSession.setSharingKeys(keyPair.privateKey, keyPair.publicKey);
					}

					// Unwrap the personal vault key (DEK), or upgrade legacy accounts that
					// were created before this architecture existed.
					if (profile?.encrypted_vault_key) {
						const vaultKeyBase64 = await decryptLocal(profile.encrypted_vault_key, key);
						cryptoSession.setVaultKey(await importProjectKey(vaultKeyBase64));
					} else {
						const vaultKeyObj = await migrateAccountToVaultKey(supabase, userData.user.id, key);
						cryptoSession.setVaultKey(vaultKeyObj);
					}
				}

				toast.success("The vault has been unlocked using biometrics!");
				onSuccess();
			} else {
				throw new Error("Biometric login failed.");
			}
		} catch (err: any) {
			console.error(err);
			errorMessage = err.message || "Biometric login failed.";
		} finally {
			isProcessing = false;
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		errorMessage = "";
		isProcessing = true;

		try {
			if (isNewUser) {
				if (masterPasswordInput !== confirmPasswordInput) {
					errorMessage = "Passwords do not match";
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

				// Generate sharing keys
				const keyPair = await generateSharingKeyPair();
				const pubKeyBase64 = await exportPublicKey(keyPair.publicKey);
				const privKeyBase64 = await exportPrivateKey(keyPair.privateKey);
				const encPrivKeyBase64 = await encryptLocal(privKeyBase64, key);

				// Generate the personal vault key (DEK) and wrap it with the master key (KEK)
				const vaultKeyBase64 = generateProjectKey();
				const vaultKeyObj = await importProjectKey(vaultKeyBase64);
				const encVaultKeyBase64 = await encryptLocal(vaultKeyBase64, key);

				const { data: userData, error: userError } = await supabase.auth.getUser();
				if (userError || !userData.user) throw new Error("User session not found.");

				const { error: profileError } = await supabase.from("profiles").upsert({
					id: userData.user.id,
					email: userData.user.email!,
					public_key: pubKeyBase64,
					encrypted_private_key: encPrivKeyBase64,
					encrypted_vault_key: encVaultKeyBase64,
				});

				if (profileError) {
					throw profileError;
				}

				cryptoSession.setSharingKeys(keyPair.privateKey, keyPair.publicKey);
				cryptoSession.setVaultKey(vaultKeyObj);

				masterPasswordInput = "";
				confirmPasswordInput = "";
				toast.success("Master password created");
				onSuccess();
			} else {
				const salt = userMetadata.salt;
				const ciphertext = userMetadata.verifier_ciphertext;
				const iv = userMetadata.verifier_iv;

				const key = await deriveKey(masterPasswordInput, salt);
				const decryptedKey = await decryptData(ciphertext, key, iv);

				if (decryptedKey === "vaulten-er-lukket-og-du-kan-ikke-komme-ind-uden-masterpassword") {
					cryptoSession.setSession(key, salt);

					// Fetch and decrypt/import sharing keys
					const { data: userData, error: userError } = await supabase.auth.getUser();
					if (userError || !userData.user) throw new Error("User session not found.");

					const { data: profile } = await supabase
						.from("profiles")
						.select("public_key, encrypted_private_key, encrypted_vault_key")
						.eq("id", userData.user.id)
						.single();

					if (profile?.encrypted_private_key && profile?.public_key) {
						const privKeyBase64 = await decryptLocal(profile.encrypted_private_key, key);
						const privateKeyObj = await importPrivateKey(privKeyBase64);
						const publicKeyObj = await importPublicKey(profile.public_key);
						cryptoSession.setSharingKeys(privateKeyObj, publicKeyObj);
					} else {
						// Fallback: Generate sharing keys if missing
						const keyPair = await generateSharingKeyPair();
						const pubKeyBase64 = await exportPublicKey(keyPair.publicKey);
						const privKeyBase64 = await exportPrivateKey(keyPair.privateKey);
						const encPrivKeyBase64 = await encryptLocal(privKeyBase64, key);

						await supabase.from("profiles").upsert({
							id: userData.user.id,
							email: userData.user.email!,
							public_key: pubKeyBase64,
							encrypted_private_key: encPrivKeyBase64,
						});

						cryptoSession.setSharingKeys(keyPair.privateKey, keyPair.publicKey);
					}

					// Unwrap the personal vault key (DEK), or upgrade legacy accounts that
					// were created before this architecture existed.
					if (profile?.encrypted_vault_key) {
						const vaultKeyBase64 = await decryptLocal(profile.encrypted_vault_key, key);
						cryptoSession.setVaultKey(await importProjectKey(vaultKeyBase64));
					} else {
						const vaultKeyObj = await migrateAccountToVaultKey(supabase, userData.user.id, key);
						cryptoSession.setVaultKey(vaultKeyObj);
					}

					masterPasswordInput = "";
					toast.success("The vault is ready!");
					onSuccess();
				} else {
					throw new Error("Error validating the key");
				}
			}
		} catch (err) {
			console.error(err);
			errorMessage = isNewUser ? "Error during creation." : "Incorrect Master Password.";
		} finally {
			isProcessing = false;
		}
	}
</script>

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
				{isNewUser ? "Create Master Password" : "Unlock Your Vault"}
			</h2>
			<p class="text-text-muted text-xs font-light mt-2 max-w-sm">
				{isNewUser
					? "This password is used to encrypt your data locally in the browser. We never store it on the server, and it cannot be recovered!"
					: "Enter your Master Password to generate your private encryption key and retrieve your passwords."}
			</p>
		</div>

		{#if hasBiometrics && !isNewUser}
			<div class="mb-4">
				<button
					type="button"
					onclick={handleBiometricUnlock}
					disabled={isProcessing}
					class="w-full py-3 px-4 bg-accent/10 border border-accent/30 text-accent font-semibold hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="w-5 h-5 text-accent animate-[pulse_2s_infinite]"
					>
						<path d="M12 10a2 2 0 0 0-2 2v3" />
						<path d="M14 10a4 4 0 0 0-8 0v4" />
						<path d="M8 10a6 6 0 0 1 12 0v3" />
						<path d="M12 2a10 10 0 0 0-10 10v3" />
						<path d="M12 22a10 10 0 0 0 10-10V9" />
					</svg>
					Unlock with Biometrics
				</button>
				<div class="flex items-center my-4">
					<div class="flex-grow border-t border-border-subtle/50"></div>
					<span class="px-3 text-[10px] text-text-muted uppercase tracking-widest">or</span>
					<div class="flex-grow border-t border-border-subtle/50"></div>
				</div>
			</div>
		{/if}

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
						placeholder="Enter password"
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

			<!-- Input 2: Confirm Password (kun for nye brugere) -->
			{#if isNewUser}
				<div class="space-y-1.5">
					<label
						for="confirm-password"
						class="text-[10px] font-semibold uppercase tracking-widest text-text-muted ml-1"
					>
						Confirm Password
					</label>
					<div class="relative">
						<input
							id="confirm-password"
							type={showConfirmPassword ? "text" : "password"}
							placeholder="Repeat password"
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
						<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line
							x1="12"
							y1="16"
							x2="12.01"
							y2="16"
						/>
					</svg>
					<span>{errorMessage}</span>
				</div>
			{/if}

			<!-- High-tech progress loader when deriving keys -->
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
						<span class="font-medium">Deriving encryption key...</span>
					</div>
					<div class="text-[10px] text-text-muted">Running 600,000 PBKDF2 iterations (SHA-256)</div>
				</div>
			{/if}

			<!-- Submit knap -->
			<button
				type="submit"
				disabled={isProcessing}
				class="w-full py-3 px-4 border-2 border-accent text-accent font-semibold rounded-none hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
			>
				{#if isProcessing}
					Please wait...
				{:else}
					{isNewUser ? "Create and Unlock" : "Unlock Vault"}
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
