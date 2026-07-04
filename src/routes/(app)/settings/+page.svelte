<script lang="ts">
	import { toast } from "svelte-sonner";
	import { supabase } from "$lib/utils/supabaseClient";
	import { encryptLocal, verifyMasterPassword } from "$lib/utils/crypto";
	import { onMount } from "svelte";

	let isBiometricsEnabled = $state(false);
	let masterPassword = $state("");
	let userMetadata = $state<any>(null);

	onMount(async () => {
		// Initialize biometric status from localStorage
		isBiometricsEnabled = !!localStorage.getItem("awayinvault_bio_credential_id");

		try {
			const {
				data: { user },
				error,
			} = await supabase.auth.getUser();

			if (error || !user) {
				throw new Error(`No user: ${error?.message || "User session not found"}`);
			}

			userMetadata = user.user_metadata;
		} catch (err: any) {
			console.log(err);
			toast.error(`couldnt get user: ${err.message}`);
		}
	});

	async function verifyPassword(): Promise<boolean> {
		if (!masterPassword) {
			toast.error("Indtast venligst dit Master Password.");
			return false;
		}
		const key = await verifyMasterPassword(masterPassword, userMetadata);
		if (!key) {
			toast.error("Forkert Master Password.");
			return false;
		}
		return true;
	}

	async function disableBiometricLock() {
		try {
			const currentCredId = localStorage.getItem("awayinvault_bio_credential_id");
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

			localStorage.removeItem("awayinvault_bio_credential_id");
			localStorage.removeItem("awayinvault_bio_encrypted_key");
			isBiometricsEnabled = false;
			toast.success("Biometrisk lås deaktiveret på denne enhed.");
		} catch (err: any) {
			console.error(err);
			toast.error("Kunne ikke deaktivere biometri: " + err.message);
		}
	}

	async function enableBiometricLock() {
		try {
			if (!window.PublicKeyCredential) {
				throw new Error("WebAuthn er ikke understøttet i denne browser.");
			}

			// Verificer adgangskode først (og afvent resultatet!)
			const isPasswordCorrect = await verifyPassword();
			if (!isPasswordCorrect) return;

			const challenge = crypto.getRandomValues(new Uint8Array(32));
			const userId = crypto.getRandomValues(new Uint8Array(16));
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
						id: userId,
						name: userMetadata?.email || "user@awayinvault.dk",
						displayName: userMetadata?.display_name || "Boksejer",
					},
					pubKeyCredParams: [{ type: "public-key", alg: -7 }],
					authenticatorSelection: {
						authenticatorAttachment: "platform",
						userVerification: "required",
					},
					timeout: 60000,
					extensions: {
						prf: {
							eval: { first: prfSalt },
						},
					} as any,
				},
			};

			toast.info("Scan dit fingeraftryk eller ansigt for at registrere...");
			const credential = (await navigator.credentials.create(options)) as PublicKeyCredential;
			if (!credential) throw new Error("Handling afbrudt af brugeren.");

			const extensionResults = credential.getClientExtensionResults() as any;
			if (extensionResults.prf && extensionResults.prf.enabled) {
				const rawPrfKey = extensionResults.prf.results?.first;
				if (!rawPrfKey) {
					throw new Error("Kunne ikke trække PRF-nøglen ud fra enheden.");
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
					const deviceName = `${navigator.userAgent.includes("Windows") ? "Windows" : navigator.userAgent.includes("Mac") ? "Mac" : "Enhed"} (${window.location.hostname})`;
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

				localStorage.setItem("awayinvault_bio_credential_id", credentialIdBase64);
				localStorage.setItem("awayinvault_bio_encrypted_key", encryptedPassword);

				isBiometricsEnabled = true;
				masterPassword = "";
				toast.success("Biometrisk lås aktiveret på denne enhed!");
			} else {
				throw new Error("Din enhed understøtter ikke PRF-udvidelsen (krypteringsnøgler).");
			}
		} catch (err: any) {
			console.error(err);
			toast.error("Kunne ikke aktivere biometri: " + err.message);
		}
	}
</script>

<div class="min-h-screen w-full bg-bg-primary text-text-base p-6 md:p-10 flex justify-center">
	<div class="max-w-4xl w-full space-y-8">
		<!-- Header -->
		<div class="border-b border-border-subtle pb-6">
			<h1 class="text-3xl font-bold tracking-tight text-text-base">Indstillinger</h1>
			<p class="text-sm text-text-muted mt-2">
				Administrer dine sikkerhedsindstillinger og præferencer for Awayinvault.
			</p>
		</div>

		<!-- Settings Grid / Blocks -->
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
						<h3 class="text-lg font-semibold tracking-tight text-text-base">Biometrisk lås</h3>
						<p class="text-sm text-text-muted max-w-xl">
							Lås din adgangskodeboks hurtigt og sikkert op med Windows Hello, Touch ID eller Face
							ID direkte på denne enhed.
						</p>
						<div class="flex items-center gap-2 pt-2">
							<!-- Enabled Badge -->
							{#if isBiometricsEnabled}
								<span
									class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20"
								>
									Aktiv
								</span>
							{:else}
								<span
									class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-500/10 text-text-muted border border-neutral-500/20"
								>
									Inaktiv
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
									placeholder="Indtast adgangskode"
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
								Deaktiver biometrisk lås
							</button>
						{:else}
							<button
								onclick={enableBiometricLock}
								class="w-full md:w-auto py-2.5 px-5 border-2 border-accent text-accent font-semibold rounded-none hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer text-sm"
							>
								Aktiver biometrisk lås
							</button>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
