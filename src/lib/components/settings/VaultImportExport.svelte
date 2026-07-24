<script lang="ts">
	import { toast } from "svelte-sonner";
	import { supabase } from "$lib/utils/supabaseClient";
	import { encryptLocal, decryptLocal } from "$lib/utils/crypto";
	import { parseCsv, writeCsv } from "$lib/utils/csv";
	import { detectFormat, type FieldMapping } from "$lib/utils/importFormats";
	import {
		categorizeIncomingItems,
		buildEncryptedBackup,
		parseEncryptedBackup,
		type DecryptedItem,
		type CategorizedItem,
	} from "$lib/utils/vaultExport";

	// Scope-agnostic: the parent supplies which table/row-scope to operate on and how
	// to resolve the decryption key for that scope (personal vault DEK via
	// resolveVaultKey, or a project's unwrapped symmetric key), so this component has
	// no knowledge of the personal-vs-team distinction beyond these three props.
	let { table, scopeColumn, scopeValue, resolveKey } = $props<{
		table: "vault_items" | "project_vault_items";
		scopeColumn: "user_id" | "project_id";
		scopeValue: string;
		resolveKey: () => Promise<CryptoKey | null>;
	}>();

	type ExistingItem = DecryptedItem & { id: string };

	interface ScopedRow {
		id: string;
		title: string;
		website: string | null;
		username_encrypted: string | null;
		password_encrypted: string;
		notes_encrypted: string | null;
	}

	async function fetchExistingItems(key: CryptoKey): Promise<ExistingItem[]> {
		// Cast away the generated Supabase types here: a table name that's a union of
		// two literal table strings blows up type instantiation on .eq()/.update()/
		// .insert() below (TS2589). The rest of the app hand-casts similarly at the
		// boundary between Supabase's generated types and this kind of table-agnostic
		// code (see vaultMigration.test.ts).
		const { data, error } = await (supabase.from(table) as any)
			.select("id, title, website, username_encrypted, password_encrypted, notes_encrypted")
			.eq(scopeColumn, scopeValue);
		if (error) throw error;

		return Promise.all(
			((data ?? []) as ScopedRow[]).map(async (row) => ({
				id: row.id,
				title: row.title,
				website: row.website,
				username: row.username_encrypted ? await decryptLocal(row.username_encrypted, key) : null,
				password: await decryptLocal(row.password_encrypted, key),
				notes: row.notes_encrypted ? await decryptLocal(row.notes_encrypted, key) : null,
			})),
		);
	}

	function downloadFile(filename: string, content: string, mimeType: string) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	function itemsToCsv(items: DecryptedItem[]): string {
		const rows = [
			["title", "website", "username", "password", "notes"],
			...items.map((item) => [
				item.title,
				item.website ?? "",
				item.username ?? "",
				item.password,
				item.notes ?? "",
			]),
		];
		return writeCsv(rows);
	}

	// --- Export state ---
	let isExporting = $state(false);
	let cleartextConfirmed = $state(false);
	let backupPassphrase = $state("");
	let backupPassphraseConfirm = $state("");
	let showBackupPassphraseForm = $state(false);

	async function exportCleartext(format: "csv" | "json") {
		if (!cleartextConfirmed) {
			toast.error("Please confirm you understand the security risk before exporting.");
			return;
		}
		isExporting = true;
		try {
			const key = await resolveKey();
			if (!key) return;
			const items = await fetchExistingItems(key);
			const timestamp = new Date().toISOString().slice(0, 10);
			if (format === "csv") {
				downloadFile(
					`awayinvault-export-${timestamp}.csv`,
					itemsToCsv(items),
					"text/csv;charset=utf-8",
				);
			} else {
				downloadFile(
					`awayinvault-export-${timestamp}.json`,
					JSON.stringify(items, null, 2),
					"application/json",
				);
			}
			toast.success(`Exported ${items.length} item(s) as cleartext ${format.toUpperCase()}.`);
			cleartextConfirmed = false;
		} catch (err: any) {
			toast.error("Export failed: " + err.message);
		} finally {
			isExporting = false;
		}
	}

	async function exportEncrypted() {
		if (!backupPassphrase || backupPassphrase.length < 8) {
			toast.error("Choose a backup passphrase of at least 8 characters.");
			return;
		}
		if (backupPassphrase !== backupPassphraseConfirm) {
			toast.error("Passphrases do not match.");
			return;
		}
		isExporting = true;
		try {
			const key = await resolveKey();
			if (!key) return;
			const items = await fetchExistingItems(key);
			const fileContents = await buildEncryptedBackup(items, backupPassphrase);
			const timestamp = new Date().toISOString().slice(0, 10);
			downloadFile(`awayinvault-backup-${timestamp}.aiv`, fileContents, "application/json");
			toast.success(
				`Exported ${items.length} item(s) as an encrypted backup. Keep the passphrase safe - it cannot be recovered.`,
			);
			backupPassphrase = "";
			backupPassphraseConfirm = "";
			showBackupPassphraseForm = false;
		} catch (err: any) {
			toast.error("Export failed: " + err.message);
		} finally {
			isExporting = false;
		}
	}

	// --- Import state ---
	type ImportStep = "upload" | "backup-passphrase" | "mapping" | "preview";
	let importStep = $state<ImportStep>("upload");
	let isImporting = $state(false);
	let fileInputEl = $state<HTMLInputElement | null>(null);

	let rawFileText = $state("");
	let isBackupFile = $state(false);
	let importPassphrase = $state("");

	let csvHeaders = $state<string[]>([]);
	let csvDataRows = $state<string[][]>([]);
	let fieldMapping = $state<FieldMapping>({
		title: null,
		website: null,
		username: null,
		password: null,
		notes: null,
	});
	let detectedSource = $state("");

	interface PreviewRow {
		item: DecryptedItem;
		category: CategorizedItem["category"];
		matchedExisting?: ExistingItem;
		included: boolean;
		resolution: "skip" | "overwrite" | "importAsNew";
	}
	let previewRows = $state<PreviewRow[]>([]);

	function resetImportWizard() {
		importStep = "upload";
		rawFileText = "";
		isBackupFile = false;
		importPassphrase = "";
		csvHeaders = [];
		csvDataRows = [];
		fieldMapping = { title: null, website: null, username: null, password: null, notes: null };
		detectedSource = "";
		previewRows = [];
		if (fileInputEl) fileInputEl.value = "";
	}

	function looksLikeBackupEnvelope(text: string): boolean {
		try {
			const parsed = JSON.parse(text);
			return (
				parsed &&
				typeof parsed === "object" &&
				parsed.version === 1 &&
				typeof parsed.salt === "string"
			);
		} catch {
			return false;
		}
	}

	async function handleFileSelected(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const text = await file.text();
		rawFileText = text;

		if (looksLikeBackupEnvelope(text)) {
			isBackupFile = true;
			importStep = "backup-passphrase";
			return;
		}

		isBackupFile = false;
		const rows = parseCsv(text).filter((row) => !row.every((cell) => cell.trim() === ""));
		if (rows.length === 0) {
			toast.error("This file does not look like a CSV export.");
			resetImportWizard();
			return;
		}

		csvHeaders = rows[0];
		csvDataRows = rows.slice(1);
		const detection = detectFormat(csvHeaders);
		detectedSource = detection.source;
		fieldMapping = detection.mapping;
		importStep = "mapping";
	}

	async function proceedFromBackupPassphrase() {
		try {
			const items = await parseEncryptedBackup(rawFileText, importPassphrase);
			await buildPreview(items);
		} catch (err: any) {
			toast.error(err.message || "Could not decrypt this backup file.");
		}
	}

	function mapRowsToItems(
		headers: string[],
		rows: string[][],
		mapping: FieldMapping,
	): DecryptedItem[] {
		const indexOf = (header: string | null) => (header === null ? -1 : headers.indexOf(header));
		const titleIdx = indexOf(mapping.title);
		const websiteIdx = indexOf(mapping.website);
		const usernameIdx = indexOf(mapping.username);
		const passwordIdx = indexOf(mapping.password);
		const notesIdx = indexOf(mapping.notes);

		const items: DecryptedItem[] = [];
		for (const row of rows) {
			const password = passwordIdx >= 0 ? (row[passwordIdx] ?? "").trim() : "";
			if (!password) continue;
			const title = titleIdx >= 0 ? (row[titleIdx] ?? "").trim() : "";
			items.push({
				title: title || "Untitled",
				website: websiteIdx >= 0 ? (row[websiteIdx] ?? "").trim() || null : null,
				username: usernameIdx >= 0 ? (row[usernameIdx] ?? "").trim() || null : null,
				password,
				notes: notesIdx >= 0 ? (row[notesIdx] ?? "").trim() || null : null,
			});
		}
		return items;
	}

	async function proceedFromMapping() {
		if (!fieldMapping.password) {
			toast.error("You must map a Password column to continue.");
			return;
		}
		const items = mapRowsToItems(csvHeaders, csvDataRows, fieldMapping);
		if (items.length === 0) {
			toast.error("No rows with a password were found using this column mapping.");
			return;
		}
		await buildPreview(items);
	}

	async function buildPreview(incoming: DecryptedItem[]) {
		try {
			const key = await resolveKey();
			if (!key) return;
			const existing = await fetchExistingItems(key);
			const categorized = categorizeIncomingItems(existing, incoming);
			previewRows = categorized.map((c) => ({
				item: c.item,
				category: c.category,
				matchedExisting: c.matchedExisting as ExistingItem | undefined,
				included: c.category !== "duplicate",
				resolution: "skip",
			}));
			importStep = "preview";
		} catch (err: any) {
			toast.error("Could not load your existing items: " + err.message);
		}
	}

	let newCount = $derived(previewRows.filter((r) => r.category === "new").length);
	let duplicateCount = $derived(previewRows.filter((r) => r.category === "duplicate").length);
	let conflictCount = $derived(previewRows.filter((r) => r.category === "conflict").length);

	async function confirmImport() {
		isImporting = true;
		try {
			const key = await resolveKey();
			if (!key) return;

			const toInsert: Record<string, unknown>[] = [];
			let updated = 0;
			let skipped = 0;

			for (const row of previewRows) {
				if (row.category === "conflict") {
					if (row.resolution === "skip") {
						skipped++;
						continue;
					}
					if (row.resolution === "overwrite" && row.matchedExisting) {
						const usernameEncrypted = row.item.username
							? await encryptLocal(row.item.username, key)
							: null;
						const passwordEncrypted = await encryptLocal(row.item.password, key);
						const notesEncrypted = row.item.notes ? await encryptLocal(row.item.notes, key) : null;
						const { error } = await (supabase.from(table) as any)
							.update({
								title: row.item.title,
								website: row.item.website,
								username_encrypted: usernameEncrypted,
								password_encrypted: passwordEncrypted,
								notes_encrypted: notesEncrypted,
							})
							.eq("id", row.matchedExisting.id);
						if (error) throw error;
						updated++;
						continue;
					}
					// resolution === "importAsNew" falls through to the insert path below
				} else if (!row.included) {
					skipped++;
					continue;
				}

				const usernameEncrypted = row.item.username
					? await encryptLocal(row.item.username, key)
					: null;
				const passwordEncrypted = await encryptLocal(row.item.password, key);
				const notesEncrypted = row.item.notes ? await encryptLocal(row.item.notes, key) : null;
				toInsert.push({
					[scopeColumn]: scopeValue,
					title: row.item.title,
					website: row.item.website,
					username_encrypted: usernameEncrypted,
					password_encrypted: passwordEncrypted,
					notes_encrypted: notesEncrypted,
				});
			}

			if (toInsert.length > 0) {
				const { error } = await (supabase.from(table) as any).insert(toInsert);
				if (error) throw error;
			}

			toast.success(
				`Import complete: ${toInsert.length} added, ${updated} overwritten, ${skipped} skipped.`,
			);
			resetImportWizard();
		} catch (err: any) {
			toast.error("Import failed: " + err.message);
		} finally {
			isImporting = false;
		}
	}

	const mappingFields: { key: keyof FieldMapping; label: string; required: boolean }[] = [
		{ key: "title", label: "Title", required: false },
		{ key: "website", label: "Website", required: false },
		{ key: "username", label: "Username", required: false },
		{ key: "password", label: "Password", required: true },
		{ key: "notes", label: "Notes", required: false },
	];
</script>

<div class="grid grid-cols-1 gap-6">
	<!-- Export -->
	<div
		class="bg-bg-sidebar border border-border-subtle p-6 md:p-8 shadow-md relative overflow-hidden transition-all duration-300 hover:shadow-lg"
	>
		<div
			class="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"
		></div>

		<div class="space-y-1 mb-6">
			<h3 class="text-lg font-semibold tracking-tight text-text-base">Export</h3>
			<p class="text-sm text-text-muted max-w-xl">
				Download every item in this vault. Everything is decrypted locally in your browser - nothing
				plaintext is ever sent to the server.
			</p>
		</div>

		<div class="space-y-5 max-w-xl">
			<div class="border border-red-500/20 bg-red-500/5 p-4 space-y-3">
				<p class="text-xs text-red-400 font-medium">
					Cleartext export writes every username, password, and note into a plain, unencrypted file.
					Anyone with access to that file can read everything in it.
				</p>
				<label class="flex items-start gap-2 text-xs text-text-muted cursor-pointer">
					<input type="checkbox" bind:checked={cleartextConfirmed} class="mt-0.5" />
					I understand the risk and want to export cleartext data.
				</label>
				<div class="flex gap-3">
					<button
						onclick={() => exportCleartext("csv")}
						disabled={isExporting || !cleartextConfirmed}
						class="py-2 px-4 border border-border-subtle text-text-base text-xs font-semibold hover:bg-bg-primary transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
					>
						Export as CSV
					</button>
					<button
						onclick={() => exportCleartext("json")}
						disabled={isExporting || !cleartextConfirmed}
						class="py-2 px-4 border border-border-subtle text-text-base text-xs font-semibold hover:bg-bg-primary transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
					>
						Export as JSON
					</button>
				</div>
			</div>

			<div class="border-t border-border-subtle/50 pt-5">
				<h4 class="text-sm font-semibold text-text-base mb-1">Encrypted backup (recommended)</h4>
				<p class="text-xs text-text-muted mb-3">
					Encrypted with a backup passphrase you choose now - not your Master Password, so a stolen
					backup file can never be used to attack your live vault. Store the passphrase somewhere
					safe; it cannot be recovered.
				</p>
				{#if !showBackupPassphraseForm}
					<button
						onclick={() => (showBackupPassphraseForm = true)}
						class="py-2 px-4 border-2 border-accent text-accent font-semibold text-xs hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer"
					>
						Create encrypted backup
					</button>
				{:else}
					<div class="space-y-3">
						<input
							type="password"
							placeholder="Backup passphrase (min. 8 characters)"
							bind:value={backupPassphrase}
							disabled={isExporting}
							class="w-full px-4 py-2.5 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent transition-all placeholder:text-text-base/20"
						/>
						<input
							type="password"
							placeholder="Confirm passphrase"
							bind:value={backupPassphraseConfirm}
							disabled={isExporting}
							class="w-full px-4 py-2.5 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent transition-all placeholder:text-text-base/20"
						/>
						<div class="flex gap-3">
							<button
								onclick={() => (showBackupPassphraseForm = false)}
								disabled={isExporting}
								class="py-2 px-4 border border-border-subtle text-text-muted text-xs font-semibold hover:text-text-base transition-all cursor-pointer"
							>
								Cancel
							</button>
							<button
								onclick={exportEncrypted}
								disabled={isExporting}
								class="py-2 px-4 border-2 border-accent text-accent font-semibold text-xs hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer disabled:opacity-50"
							>
								{isExporting ? "Encrypting..." : "Download encrypted backup"}
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Import -->
	<div
		class="bg-bg-sidebar border border-border-subtle p-6 md:p-8 shadow-md relative overflow-hidden transition-all duration-300 hover:shadow-lg"
	>
		<div
			class="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"
		></div>

		<div class="space-y-1 mb-6">
			<h3 class="text-lg font-semibold tracking-tight text-text-base">Import</h3>
			<p class="text-sm text-text-muted max-w-xl">
				Import a CSV export from Bitwarden, 1Password, Chrome, or an AwayInVault encrypted backup.
				Parsing happens entirely in your browser.
			</p>
		</div>

		<div class="max-w-xl space-y-5">
			{#if importStep === "upload"}
				<input
					bind:this={fileInputEl}
					type="file"
					accept=".csv,.aiv,.json,text/csv,application/json"
					onchange={handleFileSelected}
					class="block w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:border-2 file:border-accent file:text-accent file:font-semibold file:text-xs file:bg-transparent hover:file:bg-accent hover:file:text-bg-sidebar file:cursor-pointer cursor-pointer"
				/>
			{:else if importStep === "backup-passphrase"}
				<div class="space-y-3">
					<p class="text-sm text-text-base">
						This looks like an AwayInVault encrypted backup. Enter the backup passphrase to decrypt
						it.
					</p>
					<input
						type="password"
						placeholder="Backup passphrase"
						bind:value={importPassphrase}
						class="w-full px-4 py-2.5 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent transition-all placeholder:text-text-base/20"
					/>
					<div class="flex gap-3">
						<button
							onclick={resetImportWizard}
							class="py-2 px-4 border border-border-subtle text-text-muted text-xs font-semibold hover:text-text-base transition-all cursor-pointer"
						>
							Cancel
						</button>
						<button
							onclick={proceedFromBackupPassphrase}
							class="py-2 px-4 border-2 border-accent text-accent font-semibold text-xs hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer"
						>
							Decrypt
						</button>
					</div>
				</div>
			{:else if importStep === "mapping"}
				<div class="space-y-4">
					<p class="text-sm text-text-base">
						{#if detectedSource !== "unknown"}
							Detected format: <span class="font-semibold capitalize">{detectedSource}</span>.
						{:else}
							Could not confidently detect the source format.
						{/if}
						Confirm or correct which column maps to each field below.
					</p>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{#each mappingFields as field}
							<div class="space-y-1.5">
								<label
									for="mapping-{field.key}"
									class="text-[10px] font-semibold uppercase tracking-widest text-text-muted ml-1"
								>
									{field.label}{field.required ? " *" : ""}
								</label>
								<select
									id="mapping-{field.key}"
									bind:value={fieldMapping[field.key]}
									class="w-full px-3 py-2 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent"
								>
									<option value={null}>— None —</option>
									{#each csvHeaders as header}
										<option value={header}>{header}</option>
									{/each}
								</select>
							</div>
						{/each}
					</div>
					<div class="flex gap-3">
						<button
							onclick={resetImportWizard}
							class="py-2 px-4 border border-border-subtle text-text-muted text-xs font-semibold hover:text-text-base transition-all cursor-pointer"
						>
							Cancel
						</button>
						<button
							onclick={proceedFromMapping}
							class="py-2 px-4 border-2 border-accent text-accent font-semibold text-xs hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer"
						>
							Continue
						</button>
					</div>
				</div>
			{:else if importStep === "preview"}
				<div class="space-y-4">
					<p class="text-xs text-text-muted">
						{newCount} new · {duplicateCount} identical duplicate(s) (unchecked) · {conflictCount} conflict(s)
						requiring a choice.
					</p>
					<div
						class="max-h-96 overflow-y-auto divide-y divide-border-subtle border border-border-subtle"
					>
						{#each previewRows as row}
							<div class="p-3 flex items-start justify-between gap-4 text-sm">
								<div class="flex items-start gap-2 min-w-0">
									{#if row.category !== "conflict"}
										<input type="checkbox" bind:checked={row.included} class="mt-1 flex-shrink-0" />
									{/if}
									<div class="min-w-0">
										<p class="font-medium text-text-base truncate">{row.item.title}</p>
										<p class="text-xs text-text-muted truncate">
											{row.item.website || "—"} · {row.item.username || "—"}
										</p>
									</div>
								</div>
								<div class="flex-shrink-0">
									{#if row.category === "new"}
										<span
											class="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-semibold uppercase tracking-wider border border-accent/20"
										>
											New
										</span>
									{:else if row.category === "duplicate"}
										<span
											class="px-2 py-0.5 bg-neutral-500/10 text-text-muted text-[10px] font-semibold uppercase tracking-wider border border-neutral-500/20"
										>
											Duplicate
										</span>
									{:else}
										<select
											bind:value={row.resolution}
											class="px-2 py-1 bg-bg-primary border border-yellow-500/40 text-text-base text-xs focus:outline-none"
										>
											<option value="skip">Keep existing</option>
											<option value="overwrite">Overwrite</option>
											<option value="importAsNew">Import as new</option>
										</select>
									{/if}
								</div>
							</div>
						{/each}
					</div>
					<div class="flex gap-3">
						<button
							onclick={resetImportWizard}
							disabled={isImporting}
							class="py-2 px-4 border border-border-subtle text-text-muted text-xs font-semibold hover:text-text-base transition-all cursor-pointer disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							onclick={confirmImport}
							disabled={isImporting}
							class="py-2 px-4 border-2 border-accent text-accent font-semibold text-xs hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer disabled:opacity-50"
						>
							{isImporting ? "Importing..." : "Confirm import"}
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
