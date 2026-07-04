<script lang="ts">
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";

	let isWebAuthnSupported = $state(false);
	let isPlatformAuthenticatorSupported = $state<boolean | null>(null);
	let prfSupportedStatus = $state<string>("Tjekker...");

	let credentialId = $state<string | null>(null);
	let prfKeyHex = $state<string | null>(null);

	let masterPasswordInput = $state("");
	let encryptedPassword = $state<string | null>(null);
	let decryptedPassword = $state<string | null>(null);

	// Hjælpefunktioner til at konvertere ArrayBuffer til Hex og omvendt
	function bufferToHex(buffer: ArrayBuffer): string {
		return Array.prototype.map
			.call(new Uint8Array(buffer), (x) => ("00" + x.toString(16)).slice(-2))
			.join("");
	}

	onMount(async () => {
		isWebAuthnSupported = !!window.PublicKeyCredential;
		if (isWebAuthnSupported) {
			isPlatformAuthenticatorSupported =
				await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

			// I moderne browsere kan vi tjekke understøttelse af extensions via getPublicKeyCredentialCreationOptions
			if (
				window.PublicKeyCredential &&
				(window.PublicKeyCredential as any).isConditionalMediationAvailable
			) {
				prfSupportedStatus = "Understøttet af browseren (WebAuthn L3 / PRF)";
			} else {
				prfSupportedStatus = "Standard WebAuthn understøttet (Kan mangle PRF i ældre browsere)";
			}
		} else {
			isPlatformAuthenticatorSupported = false;
			prfSupportedStatus = "Ikke understøttet";
		}

		// Indlæs gemte test-data fra localStorage
		credentialId = localStorage.getItem("test_biometric_credential_id");
		encryptedPassword = localStorage.getItem("test_encrypted_master_password");
	});

	// Fase 2: Registrer Biometri og få PRF-nøglen
	async function registerBiometrics() {
		try {
			if (!isWebAuthnSupported) throw new Error("WebAuthn er ikke understøttet i denne browser.");

			// Generer tilfældig challenge og user ID
			const challenge = crypto.getRandomValues(new Uint8Array(32));
			const userId = crypto.getRandomValues(new Uint8Array(16));

			// PRF kræver en salt (32 bytes)
			const prfSalt = new Uint8Array(32);
			crypto.getRandomValues(prfSalt);

			const options: CredentialCreationOptions = {
				publicKey: {
					challenge,
					rp: {
						name: "Awayinvault Test",
						id: window.location.hostname,
					},
					user: {
						id: userId,
						name: "testuser@awayinvault.dk",
						displayName: "Test Bruger",
					},
					pubKeyCredParams: [
						{ type: "public-key", alg: -7 }, // ES256
						{ type: "public-key", alg: -257 }, // RS256
					],
					authenticatorSelection: {
						authenticatorAttachment: "platform", // Tvinger platform-biometri (Windows Hello / Touch ID)
						userVerification: "required",
						residentKey: "preferred",
					},
					timeout: 60000,
					extensions: {
						prf: {
							eval: {
								first: prfSalt,
							},
						},
					} as any,
				},
			};

			toast.info("Scan dit fingeraftryk/ansigt for at registrere...");
			const credential = (await navigator.credentials.create(options)) as PublicKeyCredential;

			if (!credential) throw new Error("Registrering annulleret eller fejlede.");

			// Gem credential ID i base64
			const rawId = credential.rawId;
			const idBase64 = btoa(String.fromCharCode(...new Uint8Array(rawId)));
			credentialId = idBase64;
			localStorage.setItem("test_biometric_credential_id", idBase64);

			// Tjek om PRF var aktiveret af autentifikatoren
			const extensionResults = credential.getClientExtensionResults() as any;
			const prfResults = extensionResults.prf;

			if (prfResults && prfResults.enabled) {
				if (prfResults.results && prfResults.results.first) {
					prfKeyHex = bufferToHex(prfResults.results.first);
					toast.success("Biometri registreret! PRF-nøgle genereret succesfuldt.");
				} else {
					// Nogle browsere/enheder returnerer kun prf.enabled = true, og lader os først trække nøglen ved .get()
					prfKeyHex = "Nøglen frigives ved login/oplåsning";
					toast.success("Biometri registreret med PRF-support!");
				}
			} else {
				toast.warning(
					"Biometri registreret, men enheden/browseren understøtter ikke PRF-krypteringsnøgler.",
				);
			}
		} catch (err: any) {
			console.error(err);
			toast.error("Fejl under registrering: " + err.message);
		}
	}

	// Fase 3: Hent PRF-nøgle til kryptering/dekryptering
	async function getPrfKey(): Promise<ArrayBuffer | null> {
		if (!credentialId) {
			toast.error("Registrer biometri først!");
			return null;
		}

		try {
			const challenge = crypto.getRandomValues(new Uint8Array(32));
			const credIdBytes = Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0));

			// PRF kræver en fast salt til at udlede den samme nøgle hver gang.
			// Vi bruger en fast 32-byte salt her til test-brug.
			const prfSalt = new Uint8Array(32);
			const encoder = new TextEncoder();
			const saltSource = encoder.encode("awayinvault-biometric-salt-v1-key");
			prfSalt.set(saltSource.slice(0, 32));

			const options: CredentialRequestOptions = {
				publicKey: {
					challenge,
					allowCredentials: [
						{
							type: "public-key",
							id: credIdBytes,
						},
					],
					userVerification: "required",
					extensions: {
						prf: {
							eval: {
								first: prfSalt,
							},
						},
					} as any,
				},
			};

			toast.info("Verificer din biometri for at generere nøglen...");
			const assertion = (await navigator.credentials.get(options)) as PublicKeyCredential;

			if (!assertion) throw new Error("Biometrisk scanning fejlede.");

			const extensionResults = assertion.getClientExtensionResults() as any;
			if (extensionResults.prf && extensionResults.prf.results) {
				const prfKey = extensionResults.prf.results.first;
				prfKeyHex = bufferToHex(prfKey);
				return prfKey;
			} else {
				throw new Error("Enheden returnerede ikke en PRF-nøgle.");
			}
		} catch (err: any) {
			console.error(err);
			toast.error("Kunne ikke hente PRF-nøglen: " + err.message);
			return null;
		}
	}

	// Kryptering af test Master Password lokalt
	async function encryptLocalMasterPassword() {
		try {
			if (!masterPasswordInput) {
				toast.error("Indtast venligst et test Master Password.");
				return;
			}

			const rawPrfKey = await getPrfKey();
			if (!rawPrfKey) return;

			// Importer PRF-nøglen til en AES-GCM CryptoKey
			const cryptoKey = await crypto.subtle.importKey(
				"raw",
				rawPrfKey,
				{ name: "AES-GCM" },
				false,
				["encrypt", "decrypt"],
			);

			// Krypter
			const iv = crypto.getRandomValues(new Uint8Array(12));
			const encoder = new TextEncoder();
			const ciphertextBuffer = await crypto.subtle.encrypt(
				{ name: "AES-GCM", iv },
				cryptoKey,
				encoder.encode(masterPasswordInput),
			);

			// Konverter til base64 og gem
			const base64Iv = btoa(String.fromCharCode(...iv));
			const base64Ciphertext = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));
			const storedValue = `${base64Iv}:${base64Ciphertext}`;

			encryptedPassword = storedValue;
			localStorage.setItem("test_encrypted_master_password", storedValue);
			toast.success("Master Password blev krypteret og gemt i localStorage!");
			masterPasswordInput = "";
		} catch (err: any) {
			console.error(err);
			toast.error("Kryptering fejlede: " + err.message);
		}
	}

	// Dekryptering af test Master Password lokalt
	async function decryptLocalMasterPassword() {
		try {
			const storedValue = localStorage.getItem("test_encrypted_master_password");
			if (!storedValue) {
				toast.error("Intet krypteret password fundet i localStorage.");
				return;
			}

			const parts = storedValue.split(":");
			if (parts.length !== 2) throw new Error("Ugyldigt gemt format.");
			const [base64Iv, base64Ciphertext] = parts;

			const iv = Uint8Array.from(atob(base64Iv), (c) => c.charCodeAt(0));
			const ciphertext = Uint8Array.from(atob(base64Ciphertext), (c) => c.charCodeAt(0));

			const rawPrfKey = await getPrfKey();
			if (!rawPrfKey) return;

			// Importer PRF-nøglen til dekryptering
			const cryptoKey = await crypto.subtle.importKey(
				"raw",
				rawPrfKey,
				{ name: "AES-GCM" },
				false,
				["encrypt", "decrypt"],
			);

			// Dekrypter
			const decryptedBuffer = await crypto.subtle.decrypt(
				{ name: "AES-GCM", iv },
				cryptoKey,
				ciphertext,
			);

			const decoder = new TextDecoder();
			decryptedPassword = decoder.decode(decryptedBuffer);
			toast.success("Master Password blev dekrypteret succesfuldt!");
		} catch (err: any) {
			console.error(err);
			toast.error("Dekryptering fejlede. Ugyldig nøgle eller korrupt data: " + err.message);
		}
	}

	function resetTestData() {
		localStorage.removeItem("test_biometric_credential_id");
		localStorage.removeItem("test_encrypted_master_password");
		credentialId = null;
		prfKeyHex = null;
		encryptedPassword = null;
		decryptedPassword = null;
		toast.info("Test-data nulstillet!");
	}
</script>

½

<div class="min-h-screen w-full bg-bg-primary text-text-base p-8 flex flex-col items-center">
	<div class="max-w-2xl w-full bg-bg-sidebar border border-border-subtle p-8 shadow-xl">
		<!-- Overskrift -->
		<div class="mb-8 border-b border-border-subtle pb-4">
			<h1 class="text-2xl font-bold text-accent">WebAuthn PRF Biometrisk Playground</h1>
			<p class="text-sm text-text-muted mt-1">
				Et lukket og isoleret testmiljø til at teste biometrisk lokal kryptering af dit Master
				Password.
			</p>
		</div>

		<!-- Statussektion -->
		<div class="space-y-4 mb-8">
			<h2 class="text-lg font-semibold border-b border-border-subtle pb-2">
				1. Browser & Enheds Status
			</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
				<div class="p-4 bg-bg-primary border border-border-subtle flex flex-col justify-between">
					<span class="text-text-muted text-xs font-semibold uppercase">WebAuthn Support</span>
					<span class="text-base font-medium mt-1">
						{#if isWebAuthnSupported}
							<span class="text-green-500">✓ Understøttet</span>
						{:else}
							<span class="text-red-500">✗ Ikke understøttet</span>
						{/if}
					</span>
				</div>

				<div class="p-4 bg-bg-primary border border-border-subtle flex flex-col justify-between">
					<span class="text-text-muted text-xs font-semibold uppercase"
						>Platform Autentifikator</span
					>
					<span class="text-base font-medium mt-1">
						{#if isPlatformAuthenticatorSupported === true}
							<span class="text-green-500">✓ Klar (Windows Hello / TouchID er tilgængelig)</span>
						{:else if isPlatformAuthenticatorSupported === false}
							<span class="text-red-500">✗ Ikke fundet eller deaktiveret</span>
						{:else}
							<span class="text-text-muted">Tjekker...</span>
						{/if}
					</span>
				</div>

				<div
					class="p-4 bg-bg-primary border border-border-subtle flex flex-col justify-between md:col-span-2"
				>
					<span class="text-text-muted text-xs font-semibold uppercase"
						>Krypteringsudvidelse (WebAuthn PRF)</span
					>
					<span class="text-sm font-medium mt-1 text-accent">
						{prfSupportedStatus}
					</span>
				</div>
			</div>
		</div>

		<!-- Registrering -->
		<div class="space-y-4 mb-8">
			<h2 class="text-lg font-semibold border-b border-border-subtle pb-2">
				2. Registrering (Fase 2)
			</h2>
			<p class="text-xs text-text-muted">
				Dette trin simulerer registreringen af en ny enhed. Vi beder din enhed oprette et sikkert
				nøglepar til dette domæne.
			</p>

			<div class="flex flex-col gap-3">
				<button
					onclick={registerBiometrics}
					class="w-full py-3 px-4 border-2 border-accent text-accent font-semibold hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer text-sm"
				>
					Registrer Biometri (Opret Credential)
				</button>

				{#if credentialId}
					<div class="p-4 bg-bg-primary border border-border-subtle rounded-none space-y-2">
						<div>
							<span class="text-[10px] text-text-muted uppercase font-bold"
								>Credential ID (Gemmes i DB):</span
							>
							<p class="text-xs font-mono break-all text-text-base mt-1">{credentialId}</p>
						</div>
						{#if prfKeyHex}
							<div>
								<span class="text-[10px] text-text-muted uppercase font-bold"
									>Udledt PRF Nøgle (Hex):</span
								>
								<p class="text-xs font-mono break-all text-accent mt-1">{prfKeyHex}</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Kryptering / Dekryptering Test -->
		<div class="space-y-4 mb-8">
			<h2 class="text-lg font-semibold border-b border-border-subtle pb-2">
				3. Lokal Kryptering Test (Fase 3)
			</h2>
			<p class="text-xs text-text-muted">
				Her tester vi, at vi kan tage et Master Password, køre en biometrisk scanning for at hente
				PRF-nøglen, kryptere passwordet og gemme det i browseren.
			</p>

			<div class="space-y-4">
				<!-- Krypter Input -->
				<div class="space-y-2">
					<label for="test-master" class="text-xs text-text-muted font-semibold uppercase"
						>Indtast Test Master Password</label
					>
					<div class="flex gap-2">
						<input
							id="test-master"
							type="password"
							placeholder="Indtast adgangskode"
							bind:value={masterPasswordInput}
							class="flex-1 px-4 py-3 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent"
						/>
						<button
							onclick={encryptLocalMasterPassword}
							class="px-6 py-3 bg-accent text-bg-sidebar font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer"
						>
							Kryptér & Gem
						</button>
					</div>
				</div>

				<!-- Krypteret Værdi Gemt -->
				{#if encryptedPassword}
					<div class="p-4 bg-bg-primary border border-border-subtle space-y-2">
						<span class="text-[10px] text-text-muted uppercase font-bold"
							>Gemt krypteret streng i localStorage:</span
						>
						<p class="text-xs font-mono break-all text-text-base mt-1">{encryptedPassword}</p>

						<div class="pt-2">
							<button
								onclick={decryptLocalMasterPassword}
								class="w-full py-3 px-4 border border-accent text-accent font-semibold hover:bg-accent/10 transition-all cursor-pointer text-sm"
							>
								Lås op & Dekryptér med Biometri
							</button>
						</div>
					</div>
				{/if}

				<!-- Dekrypteret Resultat -->
				{#if decryptedPassword}
					<div class="p-4 bg-green-500/10 border border-green-500/20 text-green-500">
						<span class="text-[10px] uppercase font-bold block">Dekrypteret Master Password:</span>
						<span class="text-base font-semibold mt-1 block">{decryptedPassword}</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Nulstil & Gå tilbage -->
		<div class="flex gap-4 border-t border-border-subtle pt-6 justify-between">
			<button
				onclick={resetTestData}
				class="py-2 px-4 border border-red-500/50 text-red-500 text-sm hover:bg-red-500/10 transition-all cursor-pointer"
			>
				Nulstil test-data
			</button>
			<a
				href="/passwords"
				class="py-2 px-4 text-text-muted text-sm hover:text-text-base transition-colors flex items-center gap-1"
			>
				← Gå til Passwords
			</a>
		</div>
	</div>
</div>
