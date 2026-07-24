<script lang="ts">
	import { toast } from "svelte-sonner";
	import { supabase } from "$lib/utils/supabaseClient";
	import {
		encryptLocal,
		decryptLocal,
		verifyMasterPassword,
		generateSalt,
		deriveKey,
		encryptData,
		importProjectKey,
		getBiometricMasterKey,
	} from "$lib/utils/crypto";
	import { migrateAccountToVaultKey, resolveVaultKey } from "$lib/utils/vaultMigration";
	import { cryptoSession } from "$lib/stores/cryptoSession.svelte";
	import { onMount } from "svelte";
	import {
		getBiometricCredentials,
		setBiometricCredentials,
		clearBiometricCredentials,
	} from "$lib/utils/indexedDB";
	import type { AppUserMetadata } from "$lib/types";
	import VaultImportExport from "$lib/components/settings/VaultImportExport.svelte";
	import DeleteAccountSection from "$lib/components/settings/DeleteAccountSection.svelte";

	let isBiometricsEnabled = $state(false);
	let masterPassword = $state("");
	let userMetadata = $state<AppUserMetadata | null>(null);
	let isDark = $state(true);

	let currentPasswordInput = $state("");
	let newPasswordInput = $state("");
	let confirmNewPasswordInput = $state("");
	let isChangingPassword = $state(false);

	let userId = $state("");
	let userEmail = $state("");
	let showDataUnlockPrompt = $state(false);
	let dataUnlockPassword = $state("");
	let dataUnlockResolve = $state<((val: CryptoKey | null) => void) | null>(null);

	onMount(() => {
		// Initialize theme status
		const checkTheme = () => {
			isDark = !document.documentElement.classList.contains("light");
		};
		checkTheme();

		const observer = new MutationObserver(checkTheme);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		async function loadUser() {
			try {
				const {
					data: { user },
					error,
				} = await supabase.auth.getUser();

				if (error || !user) {
					throw new Error(`No user: ${error?.message || "User session not found"}`);
				}

				userId = user.id;
				userEmail = user.email ?? "";
				userMetadata = user.user_metadata;

				// Initialize biometric status from IndexedDB (scoped to this user)
				isBiometricsEnabled = !!(await getBiometricCredentials(user.id));
			} catch (err: any) {
				console.log(err);
				toast.error(`couldnt get user: ${err.message}`);
			}
		}
		loadUser();

		return () => {
			observer.disconnect();
		};
	});

	async function toggleTheme() {
		isDark = !isDark;
		const newTheme = isDark ? "dark" : "light";

		localStorage.setItem("theme", newTheme);
		if (isDark) {
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
		}

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (user) {
			await supabase.auth.updateUser({
				data: { theme: newTheme },
			});
		}
	}

	async function verifyPassword(): Promise<boolean> {
		if (!masterPassword) {
			toast.error("Please enter your Master Password.");
			return false;
		}
		if (!userMetadata) {
			toast.error("User information has not loaded yet.");
			return false;
		}
		const key = await verifyMasterPassword(masterPassword, userMetadata);
		if (!key) {
			toast.error("Incorrect Master Password.");
			return false;
		}
		return true;
	}

	async function disableBiometricLock() {
		try {
			const credentials = await getBiometricCredentials(userId);
			const currentCredId = credentials?.credentialId || null;
			if (currentCredId && userMetadata) {
				const credentialsList = (userMetadata.biometric_credentials || []).filter(
					(c: any) => c.credential_id !== currentCredId,
				);

				const { error } = await supabase.auth.updateUser({
					data: {
						...userMetadata,
						biometric_credentials: credentialsList,
					},
				});

				if (error) throw error;

				userMetadata.biometric_credentials = credentialsList;
			}

			await clearBiometricCredentials(userId);
			isBiometricsEnabled = false;
			toast.success("Biometric lock disabled on this device.");
		} catch (err: any) {
			console.error(err);
			toast.error("Could not disable biometrics: " + err.message);
		}
	}

	// Changing the Master Password only needs to re-wrap the personal vault key (DEK)
	// and the RSA sharing private key with a new Master Key (KEK) derived from the new
	// password - vault_items, project_keys and project_vault_items are never touched,
	// since none of them are encrypted with the KEK directly.
	async function changeMasterPassword() {
		if (!currentPasswordInput || !newPasswordInput || !confirmNewPasswordInput) {
			toast.error("Please fill in all Master Password fields.");
			return;
		}
		if (newPasswordInput !== confirmNewPasswordInput) {
			toast.error("The new passwords do not match.");
			return;
		}
		if (!userMetadata) {
			toast.error("User information has not loaded yet.");
			return;
		}

		isChangingPassword = true;
		try {
			const oldKey = await verifyMasterPassword(currentPasswordInput, userMetadata);
			if (!oldKey) {
				toast.error("Incorrect current Master Password.");
				return;
			}

			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error("Session not found.");

			let { data: profile } = await supabase
				.from("profiles")
				.select("encrypted_private_key, encrypted_vault_key")
				.eq("id", user.id)
				.single();

			if (!profile?.encrypted_vault_key) {
				// Upgrade legacy accounts (created before the vault key architecture)
				// before proceeding, so there is always a DEK to re-wrap below.
				await migrateAccountToVaultKey(supabase, user.id, oldKey);
				({ data: profile } = await supabase
					.from("profiles")
					.select("encrypted_private_key, encrypted_vault_key")
					.eq("id", user.id)
					.single());
			}

			if (!profile?.encrypted_private_key || !profile?.encrypted_vault_key) {
				throw new Error("Could not load your account's key material.");
			}

			const privateKeyBase64 = await decryptLocal(profile.encrypted_private_key, oldKey);
			const vaultKeyBase64 = await decryptLocal(profile.encrypted_vault_key, oldKey);

			const newSalt = generateSalt();
			const newKey = await deriveKey(newPasswordInput, newSalt);
			const verifier = await encryptData(
				"vaulten-er-lukket-og-du-kan-ikke-komme-ind-uden-masterpassword",
				newKey,
			);

			const newEncryptedPrivateKey = await encryptLocal(privateKeyBase64, newKey);
			const newEncryptedVaultKey = await encryptLocal(vaultKeyBase64, newKey);

			// Write profiles (re-wrapped keys) before user_metadata (new verifier) -
			// if this order is reversed and the profiles write fails, the account would
			// be locked out (new verifier accepts the new password, but the keys are
			// still wrapped with the old one).
			const { error: profileError } = await supabase
				.from("profiles")
				.update({
					encrypted_private_key: newEncryptedPrivateKey,
					encrypted_vault_key: newEncryptedVaultKey,
				})
				.eq("id", user.id);
			if (profileError) throw profileError;

			const { error: userError } = await supabase.auth.updateUser({
				data: {
					...userMetadata,
					salt: newSalt,
					verifier_ciphertext: verifier.ciphertext,
					verifier_iv: verifier.iv,
					biometric_credentials: [],
				},
			});
			if (userError) throw userError;

			userMetadata.salt = newSalt;
			userMetadata.verifier_ciphertext = verifier.ciphertext;
			userMetadata.verifier_iv = verifier.iv;
			userMetadata.biometric_credentials = [];

			cryptoSession.setSession(newKey, newSalt);
			cryptoSession.setVaultKey(await importProjectKey(vaultKeyBase64));

			// Biometric-stored credentials encrypt the *old* master password - they are
			// unusable after this change, so clear them locally too and let the user
			// re-enable biometric lock per device.
			await clearBiometricCredentials(userId);
			isBiometricsEnabled = false;

			currentPasswordInput = "";
			newPasswordInput = "";
			confirmNewPasswordInput = "";

			toast.success(
				"Master Password changed. Biometric lock was disabled for security - you can re-enable it below.",
			);
		} catch (err: any) {
			console.error(err);
			toast.error("Could not change Master Password: " + err.message);
		} finally {
			isChangingPassword = false;
		}
	}

	// Passed to VaultImportExport as resolveKey: reuses cryptoSession.vaultKey if the
	// vault is already unlocked (same pattern as CreatePasswordModal), otherwise prompts
	// for the Master Password inline and resolves the personal DEK via resolveVaultKey.
	function resolvePersonalVaultKey(): Promise<CryptoKey | null> {
		if (cryptoSession.vaultKey) return Promise.resolve(cryptoSession.vaultKey);

		return new Promise((resolve) => {
			dataUnlockPassword = "";
			showDataUnlockPrompt = true;
			dataUnlockResolve = resolve;
		});
	}

	async function handleConfirmDataUnlock() {
		try {
			if (!userMetadata) throw new Error("User information has not loaded yet.");

			let kek = cryptoSession.cryptoKey;
			if (!kek && isBiometricsEnabled) {
				kek = await getBiometricMasterKey(userMetadata, userId);
			}
			if (!kek) {
				kek = await verifyMasterPassword(dataUnlockPassword, userMetadata);
			}
			if (!kek) {
				toast.error("Incorrect Master Password.");
				return;
			}

			if (!cryptoSession.cryptoKey) {
				const salt = userMetadata.salt;
				if (!salt) throw new Error("Missing salt in user metadata.");
				cryptoSession.setSession(kek, salt);
			}

			const vaultKey = await resolveVaultKey(supabase, userId, kek);
			cryptoSession.setVaultKey(vaultKey);

			showDataUnlockPrompt = false;
			dataUnlockPassword = "";
			dataUnlockResolve?.(vaultKey);
			dataUnlockResolve = null;
		} catch (err: any) {
			toast.error(err.message || "Failed to unlock vault");
		}
	}

	function cancelDataUnlock() {
		showDataUnlockPrompt = false;
		dataUnlockPassword = "";
		dataUnlockResolve?.(null);
		dataUnlockResolve = null;
	}

	async function enableBiometricLock() {
		try {
			if (!window.PublicKeyCredential) {
				throw new Error("WebAuthn is not supported in this browser.");
			}

			// Verify password first (and await the result!)
			const isPasswordCorrect = await verifyPassword();
			if (!isPasswordCorrect) return;

			const challenge = crypto.getRandomValues(new Uint8Array(32));
			const webauthnUserHandle = crypto.getRandomValues(new Uint8Array(16));
			const prfSalt = new Uint8Array(32);
			const encoder = new TextEncoder();
			const saltSource = encoder.encode("awayinvault-biometric-salt-v1-key");
			prfSalt.set(saltSource.slice(0, 32));

			const options: CredentialCreationOptions = {
				publicKey: {
					challenge,
					rp: {
						name: "Awayinvault",
						id: window.location.hostname,
					},
					user: {
						id: webauthnUserHandle,
						name: userMetadata?.email || "user@awayinvault.dk",
						displayName: userMetadata?.display_name || "Vault Owner",
					},
					pubKeyCredParams: [
						{ type: "public-key", alg: -7 }, // ES256
						{ type: "public-key", alg: -257 }, // RS256
					],
					authenticatorSelection: {
						authenticatorAttachment: "platform",
						userVerification: "required",
						residentKey: "required",
						requireResidentKey: true,
					},
					timeout: 60000,
					extensions: {
						prf: {
							eval: { first: prfSalt },
						},
					} as any,
				},
			};

			toast.info("Scan your fingerprint or face to register...");
			const credential = (await navigator.credentials.create(options)) as PublicKeyCredential;
			if (!credential) throw new Error("Operation cancelled by the user.");

			const extensionResults = credential.getClientExtensionResults() as any;
			if (extensionResults.prf && extensionResults.prf.enabled) {
				const rawPrfKey = extensionResults.prf.results?.first;
				if (!rawPrfKey) {
					throw new Error("Could not extract the PRF key from the device.");
				}
				const biometricCryptoKey = await crypto.subtle.importKey(
					"raw",
					rawPrfKey,
					{ name: "AES-GCM" },
					false,
					["encrypt"],
				);

				const encryptedPassword = await encryptLocal(masterPassword, biometricCryptoKey);
				const credentialIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));

				// Synkroniser til Supabase Bruger Metadata
				const credentialsList = userMetadata?.biometric_credentials || [];
				if (!credentialsList.some((c: any) => c.credential_id === credentialIdBase64)) {
					const deviceName = `${navigator.userAgent.includes("Windows") ? "Windows" : navigator.userAgent.includes("Mac") ? "Mac" : "Device"} (${window.location.hostname})`;
					credentialsList.push({
						credential_id: credentialIdBase64,
						encrypted_key: encryptedPassword,
						device_name: deviceName,
					});
				}

				const { error: updateError } = await supabase.auth.updateUser({
					data: {
						...userMetadata,
						biometric_credentials: credentialsList,
					},
				});

				if (updateError) throw updateError;

				// Opdater lokal metadata tilstand
				if (userMetadata) {
					userMetadata.biometric_credentials = credentialsList;
				}

				await setBiometricCredentials(userId, credentialIdBase64, encryptedPassword);

				isBiometricsEnabled = true;
				masterPassword = "";
				toast.success("Biometric lock enabled on this device!");
			} else {
				throw new Error("Your device does not support the PRF extension (encryption keys).");
			}
		} catch (err: any) {
			console.error(err);
			toast.error("Could not enable biometrics: " + err.message);
		}
	}
</script>

<div class="min-h-screen w-full bg-bg-primary text-text-base p-6 md:p-10 flex justify-center">
	<div class="max-w-4xl w-full space-y-8">
		<!-- Header -->
		<div class="border-b border-border-subtle pb-6">
			<h1 class="text-3xl font-bold tracking-tight text-text-base">Settings</h1>
			<p class="text-sm text-text-muted mt-2">
				Manage your security settings and preferences for AwayInVault.
			</p>
		</div>
		<!-- Settings Sections -->
		<div class="space-y-10">
			<!-- Section: Security -->
			<div class="space-y-4">
				<h2
					class="text-xl font-semibold tracking-tight text-text-base border-b border-border-subtle pb-2"
				>
					Security
				</h2>
				<div class="grid grid-cols-1 gap-6">
					<!-- Biometrics Block -->
					<div
						class="bg-bg-sidebar border border-border-subtle p-6 md:p-8 shadow-md relative overflow-hidden transition-all duration-300 hover:shadow-lg"
					>
						<!-- Top decorative layout element -->
						<div
							class="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"
						></div>

						<div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
							<!-- Info -->
							<div class="space-y-1">
								<h3 class="text-lg font-semibold tracking-tight text-text-base">Biometric Lock</h3>
								<p class="text-sm text-text-muted max-w-xl">
									Unlock your password vault quickly and securely with Windows Hello, Touch ID, or
									Face ID directly on this device.
								</p>
								<div class="flex items-center gap-2 pt-2">
									<!-- Enabled Badge -->
									{#if isBiometricsEnabled}
										<span
											class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20"
										>
											Active
										</span>
									{:else}
										<span
											class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-500/10 text-text-muted border border-neutral-500/20"
										>
											Inactive
										</span>
									{/if}
								</div>
							</div>

							<!-- Toggle / Action Button -->
							<div class="flex-shrink-0 flex flex-col items-end gap-3 w-full md:w-auto">
								{#if !isBiometricsEnabled}
									<div class="w-full md:w-80 space-y-1.5">
										<label
											for="settings-master-password"
											class="text-[10px] font-semibold uppercase tracking-widest text-text-muted ml-1"
										>
											Master Password
										</label>
										<input
											id="settings-master-password"
											type="password"
											placeholder="Enter password"
											bind:value={masterPassword}
											class="w-full px-4 py-2.5 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent transition-all placeholder:text-text-base/20"
										/>
									</div>
								{/if}

								{#if isBiometricsEnabled}
									<button
										onclick={disableBiometricLock}
										class="w-full md:w-auto py-2.5 px-5 border border-red-500/30 text-red-400 font-medium rounded-none hover:bg-red-500/10 transition-all duration-200 cursor-pointer text-sm"
									>
										Disable biometric lock
									</button>
								{:else}
									<button
										onclick={enableBiometricLock}
										class="w-full md:w-auto py-2.5 px-5 border-2 border-accent text-accent font-semibold rounded-none hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer text-sm"
									>
										Enable biometric lock
									</button>
								{/if}
							</div>
						</div>
					</div>
					<!-- Change Master Password Block -->
					<div
						class="bg-bg-sidebar border border-border-subtle p-6 md:p-8 shadow-md relative overflow-hidden transition-all duration-300 hover:shadow-lg"
					>
						<div
							class="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"
						></div>

						<div class="space-y-1 mb-6">
							<h3 class="text-lg font-semibold tracking-tight text-text-base">
								Change Master Password
							</h3>
							<p class="text-sm text-text-muted max-w-xl">
								Your existing passwords stay intact - only your encryption keys are re-wrapped with
								the new Master Password. Any biometric lock will be disabled and needs to be
								re-enabled afterward.
							</p>
						</div>

						<form
							onsubmit={(e) => {
								e.preventDefault();
								changeMasterPassword();
							}}
							class="space-y-4 max-w-md"
						>
							<div class="space-y-1.5">
								<label
									for="current-master-password"
									class="text-[10px] font-semibold uppercase tracking-widest text-text-muted ml-1"
								>
									Current Master Password
								</label>
								<input
									id="current-master-password"
									type="password"
									placeholder="Enter current password"
									bind:value={currentPasswordInput}
									disabled={isChangingPassword}
									required
									class="w-full px-4 py-2.5 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent transition-all placeholder:text-text-base/20"
								/>
							</div>

							<div class="space-y-1.5">
								<label
									for="new-master-password"
									class="text-[10px] font-semibold uppercase tracking-widest text-text-muted ml-1"
								>
									New Master Password
								</label>
								<input
									id="new-master-password"
									type="password"
									placeholder="Enter new password"
									bind:value={newPasswordInput}
									disabled={isChangingPassword}
									required
									class="w-full px-4 py-2.5 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent transition-all placeholder:text-text-base/20"
								/>
							</div>

							<div class="space-y-1.5">
								<label
									for="confirm-new-master-password"
									class="text-[10px] font-semibold uppercase tracking-widest text-text-muted ml-1"
								>
									Confirm New Master Password
								</label>
								<input
									id="confirm-new-master-password"
									type="password"
									placeholder="Repeat new password"
									bind:value={confirmNewPasswordInput}
									disabled={isChangingPassword}
									required
									class="w-full px-4 py-2.5 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent transition-all placeholder:text-text-base/20"
								/>
							</div>

							<button
								type="submit"
								disabled={isChangingPassword}
								class="w-full md:w-auto py-2.5 px-5 border-2 border-accent text-accent font-semibold rounded-none hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isChangingPassword ? "Changing Master Password..." : "Change Master Password"}
							</button>
						</form>
					</div>
				</div>
			</div>

			<!-- Section: Appearance -->
			<div class="space-y-4">
				<h2
					class="text-xl font-semibold tracking-tight text-text-base border-b border-border-subtle pb-2"
				>
					Appearance
				</h2>
				<div class="grid grid-cols-1 gap-6">
					<!-- Theme Toggle Block -->
					<div
						class="bg-bg-sidebar border border-border-subtle p-6 md:p-8 shadow-md relative overflow-hidden transition-all duration-300 hover:shadow-lg"
					>
						<!-- Top decorative layout element -->
						<div
							class="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"
						></div>

						<div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
							<!-- Info -->
							<div class="space-y-1">
								<h3 class="text-lg font-semibold tracking-tight text-text-base">Color Theme</h3>
								<p class="text-sm text-text-muted max-w-xl">
									Choose your preferred appearance for AwayInVault. You can switch between a dark
									and a light theme.
								</p>
							</div>

							<!-- Toggle Selection Buttons -->
							<div class="flex-shrink-0 flex items-center gap-3 w-full md:w-auto">
								<button
									onclick={() => {
										if (!isDark) toggleTheme();
									}}
									class="flex-1 md:flex-initial px-5 py-2.5 text-sm font-medium border border-border-subtle cursor-pointer transition-all duration-200 flex items-center justify-center gap-2
										{isDark
										? 'bg-accent/10 text-accent border-accent/30 font-semibold'
										: 'text-text-muted hover:text-text-base hover:bg-accent/5'}"
								>
									<!-- Moon Icon -->
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										class="w-4 h-4"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
										/>
									</svg>
									Dark
								</button>

								<button
									onclick={() => {
										if (isDark) toggleTheme();
									}}
									class="flex-1 md:flex-initial px-5 py-2.5 text-sm font-medium border border-border-subtle cursor-pointer transition-all duration-200 flex items-center justify-center gap-2
										{!isDark
										? 'bg-accent/10 text-accent border-accent/30 font-semibold'
										: 'text-text-muted hover:text-text-base hover:bg-accent/5'}"
								>
									<!-- Sun Icon -->
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										class="w-4 h-4"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M12 3v2.25m0 13.5V21m8.966-8.966h-2.25m-13.5 0h-2.25m15.356-6.356l-1.591 1.591M6.783 17.217l-1.591 1.591m12.728 0l-1.591-1.591M6.783 6.783L5.192 5.192M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
										/>
									</svg>
									Light
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Section: Data -->
			<div class="space-y-4">
				<h2
					class="text-xl font-semibold tracking-tight text-text-base border-b border-border-subtle pb-2"
				>
					Data
				</h2>
				{#if userId}
					<VaultImportExport
						table="vault_items"
						scopeColumn="user_id"
						scopeValue={userId}
						resolveKey={resolvePersonalVaultKey}
					/>
				{/if}
			</div>

			<!-- Section: Danger Zone -->
			<div class="space-y-4">
				<h2
					class="text-xl font-semibold tracking-tight text-text-base border-b border-border-subtle pb-2"
				>
					Danger Zone
				</h2>
				{#if userMetadata && userEmail}
					<DeleteAccountSection {userMetadata} {userEmail} />
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Modal: Unlock Vault for Import/Export -->
{#if showDataUnlockPrompt}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
		<div class="bg-bg-sidebar border border-border-subtle p-6 max-w-md w-full space-y-4">
			<div>
				<h3 class="text-lg font-bold text-text-base">Unlock Your Vault</h3>
				<p class="text-xs text-text-muted mt-1">
					Enter your Master Password to decrypt your vault for import/export.
				</p>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleConfirmDataUnlock();
				}}
				class="space-y-4"
			>
				<input
					type="password"
					placeholder="Enter Master Password"
					bind:value={dataUnlockPassword}
					required
					autofocus
					class="w-full px-3 py-2 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent"
				/>

				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={cancelDataUnlock}
						class="px-4 py-2 border border-border-subtle text-text-base text-xs font-semibold hover:bg-bg-primary transition-all cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-accent text-bg-sidebar text-xs font-semibold hover:bg-accent/90 transition-all cursor-pointer"
					>
						Unlock
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
