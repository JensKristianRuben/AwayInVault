<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { toast } from "svelte-sonner";
	import PasswordCard from "$lib/components/passwords/PasswordCard.svelte";
	import Dropdown from "$lib/components/ui/Dropdown.svelte";
	import { supabase } from "$lib/utils/supabaseClient";
	import { cryptoSession } from "$lib/stores/cryptoSession.svelte";
	import MasterPasswordModal from "$lib/components/MasterPasswordModal.svelte";
	import {
		generateProjectKey,
		wrapProjectKey,
		unwrapProjectKey,
		importProjectKey,
		encryptLocal,
		decryptLocal,
		importPublicKey,
		importPrivateKey,
		generateSharingKeyPair,
		exportPublicKey,
		exportPrivateKey,
		verifyMasterPassword,
		getBiometricMasterKey,
	} from "$lib/utils/crypto";
	import { getBiometricCredentials } from "$lib/utils/indexedDB";
	import type {
		Team,
		TeamMember,
		SharedProject,
		ProjectVaultItem,
		TeamInvitation,
	} from "$lib/types";

	// Page state
	let isLoading = $state(true);
	let currentUser = $state<any>(null);
	let teams = $state<Team[]>([]);
	let selectedTeamId = $state<string>("");
	let selectedTeam = $derived(teams.find((t) => t.id === selectedTeamId) || null);
	let teamOptions = $derived(teams.map((t) => ({ value: t.id, label: t.name })));
	let myRoleInSelectedTeam = $state<string>("member");

	// Team-specific state
	let members = $state<TeamMember[]>([]);
	let invitations = $state<TeamInvitation[]>([]);
	let projects = $state<SharedProject[]>([]);
	let selectedProjectId = $state<string>("");
	let selectedProject = $derived(projects.find((p) => p.id === selectedProjectId) || null);

	// Project-specific state
	let projectVaultItems = $state<ProjectVaultItem[]>([]);
	let currentProjectKey = $state<CryptoKey | null>(null);
	let currentProjectKeyBase64 = $state<string>("");
	let hasProjectAccess = $state(true);
	let hasBiometrics = $state(false);
	let showPasswordPrompt = $state(false);
	let masterPasswordPromptInput = $state("");
	let itemToUnlock = $state<ProjectVaultItem | null>(null);
	let onPromptSubmit = $state<((password: string) => void) | null>(null);
	let onPromptCancel = $state<(() => void) | null>(null);

	// Received invitations state
	let pendingInvitationsReceived = $state<(TeamInvitation & { teams: Team })[]>([]);

	// Form / Modal visibility states
	let isCreateTeamOpen = $state(false);
	let newTeamName = $state("");

	let isInviteMemberOpen = $state(false);
	let inviteEmail = $state("");
	let inviteRole = $state<"admin" | "member">("member");

	let isAddPasswordOpen = $state(false);
	let newPasswordTitle = $state("");
	let newPasswordWebsite = $state("");
	let newPasswordUsername = $state("");
	let newPasswordValue = $state("");
	let newPasswordNotes = $state("");

	// Copy to clipboard helper
	async function copyToClipboard(text: string, label: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(`${label} copied to clipboard`);
		} catch (err) {
			toast.error("Failed to copy secret");
		}
	}

	onMount(async () => {
		try {
			const credentials = await getBiometricCredentials();
			hasBiometrics = !!credentials;

			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("Please log in first.");
			currentUser = user;

			await loadData();
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			isLoading = false;
		}
	});

	// Ensure sharing keys are initialized and loaded in cryptoSession
	async function ensureSharingKeys() {
		if (cryptoSession.sharingPublicKey) return;

		const masterKey = cryptoSession.cryptoKey;
		if (!masterKey || !currentUser) return;

		try {
			const { data: profile } = await supabase
				.from("profiles")
				.select("public_key, encrypted_private_key")
				.eq("id", currentUser.id)
				.single();

			if (profile?.encrypted_private_key && profile?.public_key) {
				const privKeyBase64 = await decryptLocal(profile.encrypted_private_key, masterKey);
				const privateKeyObj = await importPrivateKey(privKeyBase64);
				const publicKeyObj = await importPublicKey(profile.public_key);
				cryptoSession.setSharingKeys(privateKeyObj, publicKeyObj);
			} else {
				const keyPair = await generateSharingKeyPair();
				const pubKeyBase64 = await exportPublicKey(keyPair.publicKey);
				const privKeyBase64 = await exportPrivateKey(keyPair.privateKey);
				const encPrivKeyBase64 = await encryptLocal(privKeyBase64, masterKey);

				await supabase.from("profiles").upsert({
					id: currentUser.id,
					email: currentUser.email,
					public_key: pubKeyBase64,
					encrypted_private_key: encPrivKeyBase64,
				});

				cryptoSession.setSharingKeys(keyPair.privateKey, keyPair.publicKey);
			}
		} catch (err) {
			console.error("Failed to automatically load/generate sharing keys:", err);
		}
	}

	// Load teams, pending invites and resolve selected team
	async function loadData() {
		if (!currentUser) return;
		await ensureSharingKeys(); // 1. Load pending offline invitations (from team_invitations)
		const { data: invsReceived } = await supabase
			.from("team_invitations")
			.select("*, teams (*)")
			.eq("email", currentUser.email);
		const offlineInvites = (invsReceived || []).map((i) => ({
			id: i.id,
			team_id: i.team_id,
			role: i.role,
			teams: i.teams,
			type: "offline",
		}));

		// 2. Load team memberships
		const { data: memberRows, error } = await supabase
			.from("team_members")
			.select("*, teams (*)")
			.eq("user_id", currentUser.id);

		if (error) throw error;

		// Direct invitations (from team_members where status = 'invited')
		const directInvites = (memberRows || [])
			.filter((m) => m.status === "invited")
			.map((m) => ({
				id: m.id,
				team_id: m.team_id,
				role: m.role,
				teams: m.teams,
				type: "direct",
			}));

		pendingInvitationsReceived = [...offlineInvites, ...directInvites] as any;

		// Filter teams where membership is active
		teams = (memberRows || []).filter((m) => m.status === "active").map((m) => m.teams);

		if (teams.length > 0) {
			if (!selectedTeamId || !teams.some((t) => t.id === selectedTeamId)) {
				selectedTeamId = teams[0].id;
			}
			await loadTeamDetails(selectedTeamId);
		} else {
			selectedTeamId = "";
			members = [];
			invitations = [];
			projects = [];
			selectedProjectId = "";
			projectVaultItems = [];
		}
	}

	// Load members, invites and projects for selected team
	async function loadTeamDetails(teamId: string) {
		if (!teamId) return;

		// Get user role in this team
		const { data: membership } = await supabase
			.from("team_members")
			.select("role")
			.eq("team_id", teamId)
			.eq("user_id", currentUser.id)
			.single();
		myRoleInSelectedTeam = membership?.role || "member";

		// 1. Get members
		const { data: mems } = await supabase.from("team_members").select("*").eq("team_id", teamId);

		if (mems && mems.length > 0) {
			const userIds = mems.map((m) => m.user_id);
			const { data: profs } = await supabase
				.from("public_profiles")
				.select("id, email, public_key")
				.in("id", userIds);

			members = mems.map((m) => ({
				...m,
				profiles: profs?.find((p) => p.id === m.user_id) || null,
			})) as any;
		} else {
			members = [];
		}

		// 2. Get pending invites sent
		const { data: invs } = await supabase
			.from("team_invitations")
			.select("*")
			.eq("team_id", teamId);
		invitations = (invs || []) as any;

		// 3. Get projects
		const { data: projs } = await supabase
			.from("shared_projects")
			.select("*")
			.eq("team_id", teamId);
		projects = projs || [];

		if (projects.length > 0) {
			const storedActive = localStorage.getItem(`active_project_${teamId}`);
			if (storedActive && projects.some((p) => p.id === storedActive)) {
				selectedProjectId = storedActive;
			} else {
				selectedProjectId = projects[0].id;
				localStorage.setItem(`active_project_${teamId}`, selectedProjectId);
			}
			await loadProjectDetails(selectedProjectId);
		} else {
			selectedProjectId = "";
			projectVaultItems = [];
			currentProjectKey = null;
			currentProjectKeyBase64 = "";
		}
	}

	// Load project keys and decrypt vault items
	async function loadProjectDetails(projectId: string) {
		if (!projectId) return;

		// 1. Fetch encrypted key for project
		const { data: keyRow } = await supabase
			.from("project_keys")
			.select("encrypted_key")
			.eq("project_id", projectId)
			.eq("user_id", currentUser.id)
			.maybeSingle();

		if (!keyRow) {
			currentProjectKey = null;
			currentProjectKeyBase64 = "";
			projectVaultItems = [];
			hasProjectAccess = false;
			return;
		}
		hasProjectAccess = true;

		try {
			// 2. Load vault items
			const { data: items } = await supabase
				.from("project_vault_items")
				.select("*")
				.eq("project_id", projectId);
			projectVaultItems = items || [];

			// Decrypt items if sharing key is already in memory
			if (cryptoSession.sharingPrivateKey) {
				const rawKeyBase64 = await unwrapProjectKey(
					keyRow.encrypted_key,
					cryptoSession.sharingPrivateKey,
				);
				currentProjectKeyBase64 = rawKeyBase64;
				currentProjectKey = await importProjectKey(rawKeyBase64);

				for (const item of projectVaultItems) {
					try {
						item.username = item.username_encrypted
							? await decryptLocal(item.username_encrypted, currentProjectKey)
							: "";
						item.password = await decryptLocal(item.password_encrypted, currentProjectKey);
						item.isDecrypted = true;
					} catch (e) {
						console.error("Failed to decrypt item:", item.id, e);
						item.username = "(decryption error)";
						item.password = "(decryption error)";
						item.isDecrypted = false;
					}
				}
			} else {
				currentProjectKey = null;
				currentProjectKeyBase64 = "";
			}
		} catch (err: any) {
			console.error("Error loading project secrets:", err);
			toast.error("Failed to load project keys: " + err.message);
		}
	}

	// Fulfill key requests in background for active members lacking key
	async function fulfillKeyRequests() {
		if (!selectedTeamId || projects.length === 0 || !cryptoSession.sharingPrivateKey) return;

		let keysFulfilled = 0;

		for (const proj of projects) {
			// Find active team members
			const activeMembers = members.filter((m) => m.status === "active");

			// Get project key in base64
			let projKeyBase64 = "";
			if (proj.id === selectedProjectId && currentProjectKeyBase64) {
				projKeyBase64 = currentProjectKeyBase64;
			} else {
				const { data: keyRow } = await supabase
					.from("project_keys")
					.select("encrypted_key")
					.eq("project_id", proj.id)
					.eq("user_id", currentUser.id)
					.maybeSingle();
				if (keyRow) {
					projKeyBase64 = await unwrapProjectKey(
						keyRow.encrypted_key,
						cryptoSession.sharingPrivateKey,
					);
				}
			}

			if (!projKeyBase64) continue;

			for (const member of activeMembers) {
				// Check if member already has a key
				const { data: existing } = await supabase
					.from("project_keys")
					.select("id")
					.eq("project_id", proj.id)
					.eq("user_id", member.user_id)
					.maybeSingle();

				if (!existing && member.profiles?.public_key) {
					try {
						// Import member public key
						const pubKey = await importPublicKey(member.profiles.public_key);
						// Wrap project key
						const wrapped = await wrapProjectKey(projKeyBase64, pubKey);

						// Insert key
						const { error } = await supabase.from("project_keys").insert({
							project_id: proj.id,
							user_id: member.user_id,
							encrypted_key: wrapped,
						});

						if (!error) {
							keysFulfilled++;
						}
					} catch (err) {
						console.error("Failed to encrypt project key for member:", member.user_id, err);
					}
				}
			}
		}

		if (keysFulfilled > 0) {
			toast.success(`Automatically distributed key to ${keysFulfilled} team members`);
		}
	}

	// Run fulfillKeyRequests when members, projects list or sharing key changes
	$effect(() => {
		if (
			selectedTeamId &&
			projects.length > 0 &&
			members.length > 0 &&
			cryptoSession.sharingPrivateKey
		) {
			fulfillKeyRequests();
		}
	});

	// Swaps between selected teams
	async function selectTeam(teamId: string) {
		selectedTeamId = teamId;
		selectedProjectId = "";
		await loadTeamDetails(teamId);
	}

	// Swaps between projects
	async function handleProjectSelect(projId: string) {
		selectedProjectId = projId;
		await loadProjectDetails(projId);
	}

	// Create a new team
	async function handleCreateTeam(e: SubmitEvent) {
		e.preventDefault();
		if (!newTeamName.trim()) return;

		try {
			// Insert team and assign owner atomically via database RPC (bypasses RLS select)
			const { data: newTeam, error: teamErr } = await supabase.rpc("create_team", {
				team_name: newTeamName,
			});

			if (teamErr) throw teamErr;

			toast.success("Team created successfully");
			newTeamName = "";
			isCreateTeamOpen = false;

			selectedTeamId = newTeam.id;
			await loadData();
		} catch (err: any) {
			toast.error(err.message || "Failed to create team");
		}
	}

	// Invite a member by email
	async function handleInviteMember(e: SubmitEvent) {
		e.preventDefault();
		if (!inviteEmail.trim() || !selectedTeamId) return;

		try {
			// Check if already member
			const alreadyMember = members.some((m) => m.profiles?.email === inviteEmail);
			const alreadyInvited = invitations.some((i) => i.email === inviteEmail);

			if (alreadyMember || alreadyInvited) {
				throw new Error("User is already a member or invited to this team.");
			}

			// 1. Check if user is registered (look up in profiles)
			const { data: inviteeProfile } = await supabase
				.from("public_profiles")
				.select("id, email, public_key")
				.eq("email", inviteEmail)
				.maybeSingle();

			if (inviteeProfile && inviteeProfile.public_key) {
				// Proactive encryption of project keys
				// Add member as invited
				const { error: memErr } = await supabase.from("team_members").insert({
					team_id: selectedTeamId,
					user_id: inviteeProfile.id,
					role: inviteRole,
					status: "invited",
				});

				if (memErr) throw memErr;

				// Encrypt and add keys for all projects
				for (const proj of projects) {
					// Get project key (decrypted earlier or fetched)
					let projKeyBase64 = "";
					if (proj.id === selectedProjectId && currentProjectKeyBase64) {
						projKeyBase64 = currentProjectKeyBase64;
					} else {
						const { data: keyRow } = await supabase
							.from("project_keys")
							.select("encrypted_key")
							.eq("project_id", proj.id)
							.eq("user_id", currentUser.id)
							.maybeSingle();
						if (keyRow && cryptoSession.sharingPrivateKey) {
							projKeyBase64 = await unwrapProjectKey(
								keyRow.encrypted_key,
								cryptoSession.sharingPrivateKey,
							);
						}
					}

					if (projKeyBase64) {
						const pubKey = await importPublicKey(inviteeProfile.public_key);
						const wrapped = await wrapProjectKey(projKeyBase64, pubKey);

						await supabase.from("project_keys").insert({
							project_id: proj.id,
							user_id: inviteeProfile.id,
							encrypted_key: wrapped,
						});
					}
				}

				toast.success("User invited proactively (keys wrapped)");
			} else {
				// User not registered, create team_invitations record
				const { error: invErr } = await supabase.from("team_invitations").insert({
					team_id: selectedTeamId,
					email: inviteEmail,
					role: inviteRole,
					invited_by: currentUser.id,
				});

				if (invErr) throw invErr;

				toast.success("Invitation sent to email (will wrap keys on acceptance)");
			}

			inviteEmail = "";
			isInviteMemberOpen = false;
			await loadTeamDetails(selectedTeamId);
		} catch (err: any) {
			toast.error(err.message || "Failed to invite member");
		}
	}

	// Accept invitation received
	async function handleAcceptInvitation(invite: any) {
		try {
			if (invite.type === "offline") {
				// 1. Add to team members
				const { error: memErr } = await supabase.from("team_members").insert({
					team_id: invite.team_id,
					user_id: currentUser.id,
					role: invite.role,
					status: "active",
				});

				if (memErr) throw memErr;

				// 2. Delete invitation
				const { error: delErr } = await supabase
					.from("team_invitations")
					.delete()
					.eq("id", invite.id);

				if (delErr) throw delErr;
			} else {
				// Direct invitation (already exists in team_members as 'invited')
				const { error: updateErr } = await supabase
					.from("team_members")
					.update({ status: "active" })
					.eq("id", invite.id);

				if (updateErr) throw updateErr;
			}

			toast.success(`Accepted invitation to ${invite.teams.name}`);
			await loadData();
		} catch (err: any) {
			toast.error(err.message || "Failed to accept invitation");
		}
	}

	// Decline invitation received
	async function handleDeclineInvitation(invite: any) {
		try {
			if (invite.type === "offline") {
				const { error } = await supabase.from("team_invitations").delete().eq("id", invite.id);
				if (error) throw error;
			} else {
				// Direct invitation
				const { error } = await supabase.from("team_members").delete().eq("id", invite.id);
				if (error) throw error;
			}
			toast.success("Invitation declined");
			await loadData();
		} catch (err: any) {
			toast.error(err.message);
		}
	}

	// Cancel/Delete invitation sent
	async function handleCancelInvitation(inviteId: string) {
		try {
			const { error } = await supabase.from("team_invitations").delete().eq("id", inviteId);
			if (error) throw error;
			toast.success("Invitation cancelled");
			await loadTeamDetails(selectedTeamId);
		} catch (err: any) {
			toast.error(err.message);
		}
	}

	// Manually wrap and distribute project keys to a specific member
	async function handleManualDistributeKeys(member: TeamMember) {
		if (!member.profiles?.public_key) {
			toast.error("User does not have a public key yet. They must log in at least once.");
			return;
		}

		if (!cryptoSession.sharingPrivateKey) {
			// Prompt to unlock vault if locked
			const success = await handleUnlockProject();
			if (!success || !cryptoSession.sharingPrivateKey) {
				toast.error("You must unlock your vault to distribute keys.");
				return;
			}
		}

		try {
			let keysWrapped = 0;
			for (const proj of projects) {
				// 1. Get project key in base64
				let projKeyBase64 = "";
				if (proj.id === selectedProjectId && currentProjectKeyBase64) {
					projKeyBase64 = currentProjectKeyBase64;
				} else {
					const { data: keyRow } = await supabase
						.from("project_keys")
						.select("encrypted_key")
						.eq("project_id", proj.id)
						.eq("user_id", currentUser.id)
						.maybeSingle();

					if (keyRow) {
						projKeyBase64 = await unwrapProjectKey(
							keyRow.encrypted_key,
							cryptoSession.sharingPrivateKey,
						);
					}
				}

				if (!projKeyBase64) continue;

				// 2. Wrap and upsert key
				const pubKey = await importPublicKey(member.profiles.public_key);
				const wrapped = await wrapProjectKey(projKeyBase64, pubKey);

				const { error } = await supabase.from("project_keys").upsert(
					{
						project_id: proj.id,
						user_id: member.user_id,
						encrypted_key: wrapped,
					},
					{ onConflict: "project_id,user_id" },
				);

				if (error) {
					throw error;
				}
				keysWrapped++;
			}

			if (keysWrapped > 0) {
				toast.success(
					`Successfully shared keys for ${keysWrapped} projects with ${member.profiles.email}`,
				);
			} else {
				toast.info(`User ${member.profiles.email} already has keys for all projects`);
			}
		} catch (err: any) {
			console.error("Manual key distribution failed:", err);
			toast.error(`Key sharing failed: ${err.message}`);
		}
	}

	// Add password to project vault
	async function handleAddPassword(e: SubmitEvent) {
		e.preventDefault();
		if (!newPasswordTitle.trim() || !newPasswordValue || !selectedProjectId) {
			return;
		}

		try {
			let projKey = currentProjectKey;

			// If the project key is not decrypted yet, prompt the user for their master password
			if (!projKey) {
				const success = await handleUnlockProject();
				if (!success) return;
				projKey = currentProjectKey;
			}

			if (!projKey) {
				throw new Error("Project key is not loaded. Please unlock the project.");
			}

			const username_encrypted = newPasswordUsername
				? await encryptLocal(newPasswordUsername, projKey)
				: null;
			const password_encrypted = await encryptLocal(newPasswordValue, projKey);
			const notes_encrypted = newPasswordNotes
				? await encryptLocal(newPasswordNotes, projKey)
				: null;

			const { error } = await supabase.from("project_vault_items").insert({
				project_id: selectedProjectId,
				title: newPasswordTitle,
				website: newPasswordWebsite || null,
				username_encrypted,
				password_encrypted,
				notes_encrypted,
			});

			if (error) throw error;

			toast.success("Shared password added successfully");

			newPasswordTitle = "";
			newPasswordWebsite = "";
			newPasswordUsername = "";
			newPasswordValue = "";
			newPasswordNotes = "";
			isAddPasswordOpen = false;

			await loadProjectDetails(selectedProjectId);
		} catch (err: any) {
			toast.error(err.message || "Failed to add secret");
		}
	}

	// Inline prompt helper for Master Password input
	function promptForMasterPassword(
		item: ProjectVaultItem,
		onSubmit: (password: string) => void,
		onCancel: () => void,
	) {
		itemToUnlock = item;
		masterPasswordPromptInput = "";
		onPromptSubmit = onSubmit;
		onPromptCancel = onCancel;
		showPasswordPrompt = true;
	}

	function requestUnlock(): Promise<boolean> {
		if (cryptoSession.sharingPublicKey) return Promise.resolve(true);

		return new Promise<boolean>((resolve) => {
			promptForMasterPassword(
				null as any,
				async (password) => {
					try {
						const {
							data: { user },
						} = await supabase.auth.getUser();
						if (!user) throw new Error("Please log in.");

						const masterKey = await verifyMasterPassword(password, user.user_metadata);
						if (!masterKey) {
							toast.error("Incorrect Master Password.");
							resolve(false);
							return;
						}

						const { data: profile } = await supabase
							.from("profiles")
							.select("public_key, encrypted_private_key")
							.eq("id", user.id)
							.single();

						if (!profile?.encrypted_private_key || !profile?.public_key) {
							throw new Error("Sharing keys not found. Setup in User Settings.");
						}

						const privKeyBase64 = await decryptLocal(profile.encrypted_private_key, masterKey);
						const privateKeyObj = await importPrivateKey(privKeyBase64);
						const publicKeyObj = await importPublicKey(profile.public_key);

						cryptoSession.setSharingKeys(privateKeyObj, publicKeyObj);
						resolve(true);
					} catch (err: any) {
						toast.error(err.message || "Failed to unlock vault");
						resolve(false);
					}
				},
				() => {
					resolve(false);
				},
			);
		});
	}

	function handlePromptSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!masterPasswordPromptInput) {
			toast.error("Please enter your Master Password.");
			return;
		}
		const submitCb = onPromptSubmit;
		showPasswordPrompt = false;
		if (submitCb) submitCb(masterPasswordPromptInput);
	}

	function handlePromptCancel() {
		showPasswordPrompt = false;
		const cancelCb = onPromptCancel;
		if (cancelCb) cancelCb();
	}

	// Unlock individual item in the project vault
	function handleUnlockItem(item: ProjectVaultItem): Promise<boolean> {
		return new Promise<boolean>(async (resolve) => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) {
				toast.error("Please log in first.");
				resolve(false);
				return;
			}

			// 1. Try biometrics if enabled
			if (hasBiometrics) {
				try {
					const masterKey = await getBiometricMasterKey(user.user_metadata);
					if (masterKey) {
						const success = await decryptAndCacheItem(item, masterKey);
						if (success) {
							toast.success("Item decrypted with biometrics!");
							resolve(true);
							return;
						}
					}
				} catch (err) {
					console.warn("Biometric unlock aborted or failed. Trying password...", err);
				}
			}

			// 2. Fallback to prompting for Master Password
			promptForMasterPassword(
				item,
				async (password) => {
					try {
						const masterKey = await verifyMasterPassword(password, user.user_metadata);
						if (!masterKey) {
							toast.error("Incorrect Master Password.");
							resolve(false);
							return;
						}

						const success = await decryptAndCacheItem(item, masterKey);
						if (success) {
							toast.success("Item decrypted successfully!");
							resolve(true);
						} else {
							resolve(false);
						}
					} catch (err: any) {
						toast.error(err.message || "Failed to decrypt item");
						resolve(false);
					}
				},
				() => {
					resolve(false);
				},
			);
		});
	}

	// Helper to decrypt sharing key -> unwrap project key -> decrypt item
	async function decryptAndCacheItem(
		item: ProjectVaultItem,
		masterKey: CryptoKey,
	): Promise<boolean> {
		try {
			// Fetch profile to get sharing keys
			const { data: profile, error: profErr } = await supabase
				.from("profiles")
				.select("public_key, encrypted_private_key")
				.eq("id", currentUser.id)
				.single();

			if (profErr || !profile?.encrypted_private_key) {
				throw new Error("Sharing private key not found in database.");
			}

			// Decrypt sharing private key
			const privKeyBase64 = await decryptLocal(profile.encrypted_private_key, masterKey);
			const privateKeyObj = await importPrivateKey(privKeyBase64);

			// Fetch project key
			const { data: keyRow, error: keyErr } = await supabase
				.from("project_keys")
				.select("encrypted_key")
				.eq("project_id", item.project_id)
				.eq("user_id", currentUser.id)
				.maybeSingle();

			if (keyErr || !keyRow) {
				throw new Error("Project key not found for your user.");
			}

			// Unwrap project key
			const projKeyRaw = await unwrapProjectKey(keyRow.encrypted_key, privateKeyObj);
			const projectKey = await importProjectKey(projKeyRaw);

			// Decrypt item
			item.username = item.username_encrypted
				? await decryptLocal(item.username_encrypted, projectKey)
				: "";
			item.password = await decryptLocal(item.password_encrypted, projectKey);
			item.isDecrypted = true;
			return true;
		} catch (err: any) {
			console.error("Failed to decrypt and cache item:", err);
			toast.error(err.message || "Decryption failed");
			return false;
		}
	}

	// Unlock project key itself
	function handleUnlockProject(): Promise<boolean> {
		return new Promise<boolean>(async (resolve) => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) {
				toast.error("Please log in first.");
				resolve(false);
				return;
			}

			// 1. Try biometrics if enabled
			if (hasBiometrics) {
				try {
					const masterKey = await getBiometricMasterKey(user.user_metadata);
					if (masterKey) {
						const success = await decryptAndCacheProjectKey(masterKey);
						if (success) {
							toast.success("Project key decrypted with biometrics!");
							resolve(true);
							return;
						}
					}
				} catch (err) {
					console.warn("Biometric unlock aborted or failed. Trying password...", err);
				}
			}

			// 2. Fallback to prompting for Master Password
			promptForMasterPassword(
				{ id: "project-key", title: "Project Key", project_id: selectedProjectId } as any,
				async (password) => {
					try {
						const masterKey = await verifyMasterPassword(password, user.user_metadata);
						if (!masterKey) {
							toast.error("Incorrect Master Password.");
							resolve(false);
							return;
						}

						const success = await decryptAndCacheProjectKey(masterKey);
						if (success) {
							toast.success("Project unlocked successfully!");
							resolve(true);
						} else {
							resolve(false);
						}
					} catch (err: any) {
						toast.error(err.message || "Failed to unlock project");
						resolve(false);
					}
				},
				() => {
					resolve(false);
				},
			);
		});
	}

	async function decryptAndCacheProjectKey(masterKey: CryptoKey): Promise<boolean> {
		try {
			// Fetch profile to get sharing keys
			const { data: profile, error: profErr } = await supabase
				.from("profiles")
				.select("public_key, encrypted_private_key")
				.eq("id", currentUser.id)
				.single();

			if (profErr || !profile?.encrypted_private_key) {
				throw new Error("Sharing private key not found in database.");
			}

			// Decrypt sharing private key
			const privKeyBase64 = await decryptLocal(profile.encrypted_private_key, masterKey);
			const privateKeyObj = await importPrivateKey(privKeyBase64);
			const publicKeyObj = await importPublicKey(profile.public_key);

			// Cache sharing keys in global session
			cryptoSession.setSharingKeys(privateKeyObj, publicKeyObj);

			// Fetch project key
			const { data: keyRow, error: keyErr } = await supabase
				.from("project_keys")
				.select("encrypted_key")
				.eq("project_id", selectedProjectId)
				.eq("user_id", currentUser.id)
				.maybeSingle();

			if (keyErr || !keyRow) {
				throw new Error("Project key not found for your user.");
			}

			// Unwrap project key
			const projKeyRaw = await unwrapProjectKey(keyRow.encrypted_key, privateKeyObj);
			currentProjectKeyBase64 = projKeyRaw;
			currentProjectKey = await importProjectKey(projKeyRaw);
			return true;
		} catch (err: any) {
			console.error("Failed to decrypt project key:", err);
			toast.error(err.message || "Decryption failed");
			return false;
		}
	}

	// Delete shared password
	async function handleDeletePassword(item: ProjectVaultItem) {
		if (myRoleInSelectedTeam !== "owner" && myRoleInSelectedTeam !== "admin") {
			toast.error("Only owners and admins can delete shared passwords.");
			return;
		}

		if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;

		try {
			const { error } = await supabase.from("project_vault_items").delete().eq("id", item.id);
			if (error) throw error;
			toast.success("Password deleted");
			await loadProjectDetails(selectedProjectId);
		} catch (err: any) {
			toast.error(err.message);
		}
	}

	// Remove member from team
	async function handleRemoveMember(memberId: string, email: string) {
		if (memberId === currentUser.id) {
			if (!confirm("Are you sure you want to leave this team?")) return;
		} else {
			if (!confirm(`Are you sure you want to remove ${email} from this team?`)) return;
		}

		try {
			const { error } = await supabase.from("team_members").delete().eq("id", memberId);
			if (error) throw error;
			toast.success(memberId === currentUser.id ? "You left the team" : "Member removed");
			await loadData();
		} catch (err: any) {
			toast.error(err.message);
		}
	}

	// Delete team
	async function handleDeleteTeam() {
		if (
			!confirm(
				`Are you sure you want to delete team "${selectedTeam?.name}"? All projects, members, and shared secrets will be deleted.`,
			)
		) {
			return;
		}

		try {
			const { error } = await supabase.from("teams").delete().eq("id", selectedTeamId);
			if (error) throw error;
			toast.success(`Team "${selectedTeam?.name}" deleted`);
			selectedTeamId = "";
			await loadData();
		} catch (err: any) {
			toast.error(err.message);
		}
	}
</script>

<div class="p-8 max-w-4xl mx-auto space-y-8">
	<!-- HEADER BAR -->
	<div
		class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-border-subtle"
	>
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-text-base">Team Sharing</h1>
		</div>

		<div class="flex items-center gap-3">
			{#if teams.length > 0}
				<!-- Team Selector -->
				<div class="w-48">
					<Dropdown
						bind:value={selectedTeamId}
						options={teamOptions}
						placeholder="Select Team..."
						showCreateOption={true}
						createLabel="+ Create New Team..."
						onSelect={selectTeam}
						onCreate={() => (isCreateTeamOpen = true)}
					/>
				</div>

				<!-- Settings Button next to Team select -->
				<button
					onclick={() => goto(`/teams/settings?teamId=${selectedTeamId}`)}
					class="p-2 border border-border-subtle text-text-base hover:bg-bg-sidebar transition-all cursor-pointer flex items-center justify-center"
					title="Team Settings"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="w-4 h-4 text-text-muted"
					>
						<circle cx="12" cy="12" r="3" />
						<path
							d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
						/>
					</svg>
				</button>

				<!-- Add Password Button -->
				{#if selectedProjectId && hasProjectAccess}
					<button
						onclick={() => (isAddPasswordOpen = true)}
						class="py-2 px-4 border-2 border-accent text-accent font-semibold text-xs rounded-none hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer flex items-center gap-1.5"
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
						Add password
					</button>
				{/if}
			{/if}
		</div>
	</div>

	{#if isLoading}
		<div class="flex justify-center items-center py-20">
			<div class="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
		</div>
	{:else}
		<!-- INVITATIONS RECEIVED -->
		{#if pendingInvitationsReceived.length > 0}
			<div class="bg-accent/5 border border-accent/20 p-4 space-y-3">
				<h3
					class="text-xs font-semibold uppercase tracking-widest text-accent flex items-center gap-2"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="w-4 h-4 animate-bounce"
					>
						<path
							d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z"
						/>
						<path d="m22 9.5-8.5 5.5L5 9.5" />
					</svg>
					Pending Team Invitations Received
				</h3>
				<div class="grid md:grid-cols-2 gap-3">
					{#each pendingInvitationsReceived as invite}
						<div
							class="bg-bg-sidebar border border-border-subtle p-3 flex justify-between items-center"
						>
							<div>
								<p class="text-sm font-semibold text-text-base">{invite.teams?.name}</p>
								<p class="text-[10px] text-text-muted capitalize">Role: {invite.role}</p>
							</div>
							<div class="flex gap-2">
								<button
									onclick={() => handleAcceptInvitation(invite)}
									class="px-3 py-1 bg-accent text-bg-sidebar text-xs font-semibold hover:bg-accent/90 cursor-pointer"
								>
									Accept
								</button>
								<button
									onclick={() => handleDeclineInvitation(invite)}
									class="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold hover:bg-red-500/20 cursor-pointer"
								>
									Decline
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if teams.length === 0}
			<!-- EMPTY STATE -->
			<div
				class="flex flex-col items-center justify-center py-20 border border-dashed border-border-subtle text-center px-4"
			>
				<div
					class="w-16 h-16 rounded-full bg-accent/5 flex items-center justify-center mb-4 border border-accent/10"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						class="w-8 h-8 text-accent"
					>
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
						<circle cx="9" cy="7" r="4" />
						<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
						<path d="M16 3.13a4 4 0 0 1 0 7.75" />
					</svg>
				</div>
				<h2 class="text-lg font-semibold text-text-base">No Teams Found</h2>
				<p class="text-text-muted text-xs max-w-sm mt-2 font-light">
					Create a team to easily organize logins and securely share them with developers or family
					members.
				</p>
				<button
					onclick={() => (isCreateTeamOpen = true)}
					class="mt-6 px-6 py-2.5 bg-accent text-bg-sidebar font-semibold hover:bg-accent/90 transition-all cursor-pointer"
				>
					Get Started
				</button>
			</div>
		{:else}
			<!-- ACTIVE TEAMS VIEW (DASHBOARD) -->
			<div class="max-w-4xl mx-auto w-full space-y-6">
				{#if !selectedProjectId}
					<div
						class="bg-bg-sidebar border border-border-subtle p-8 text-center text-text-muted text-xs font-light italic"
					>
						{#if projects.length === 0}
							Create a project to start sharing passwords.
						{:else}
							Select a project from the header to view credentials.
						{/if}
					</div>
				{:else}
					<!-- Project Title & Subtitle Info -->
					<div class="flex justify-between items-center pb-2">
						<div>
							<h2 class="text-sm font-semibold text-text-base">{selectedProject?.name}</h2>
							<p class="text-[10px] text-text-muted font-light">
								Decrypted locally with project keys
							</p>
						</div>
					</div>

					{#if !hasProjectAccess}
						<div
							class="text-center py-8 text-red-500/80 border border-red-500/10 bg-red-500/5 p-4 text-xs font-light space-y-2"
						>
							<p>You do not have access to this project's keys yet.</p>
							<p class="text-text-muted text-[10px]">
								Wait for an active team member to log in and automatically wrap the project key for
								you.
							</p>
						</div>
					{:else if projectVaultItems.length === 0}
						<div
							class="bg-bg-sidebar border border-border-subtle p-8 text-center text-text-muted text-xs font-light italic"
						>
							This project's vault is empty. Add a shared password to get started!
						</div>
					{:else}
						<div class="space-y-4">
							{#each projectVaultItems as item}
								<PasswordCard
									{item}
									onDelete={myRoleInSelectedTeam === "owner" || myRoleInSelectedTeam === "admin"
										? handleDeletePassword
										: undefined}
									onUnlock={handleUnlockItem}
								/>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		{/if}
	{/if}
</div>

<!-- MODAL: CREATE TEAM -->
{#if isCreateTeamOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm p-4"
	>
		<div class="bg-bg-sidebar border border-border-subtle p-6 max-w-md w-full shadow-2xl relative">
			<button
				onclick={() => (isCreateTeamOpen = false)}
				class="absolute right-4 top-4 text-text-muted hover:text-text-base cursor-pointer"
				aria-label="Close Modal"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="w-5 h-5"
				>
					<path d="M18 6 6 18M6 6l12 12" />
				</svg>
			</button>

			<h3 class="text-base font-semibold text-text-base mb-4">Create New Team</h3>
			<form onsubmit={handleCreateTeam} class="space-y-4">
				<div class="space-y-1">
					<label
						for="team-name"
						class="text-[10px] font-semibold uppercase tracking-widest text-text-muted"
					>
						Team Name
					</label>
					<input
						id="team-name"
						type="text"
						bind:value={newTeamName}
						placeholder="e.g. Frontend Team"
						required
						class="w-full bg-bg-primary border border-border-subtle text-text-base text-sm px-3 py-2 rounded-none focus:outline-none focus:border-accent"
					/>
				</div>
				<button
					type="submit"
					class="w-full py-2 bg-accent text-bg-sidebar text-sm font-semibold hover:bg-accent/90 cursor-pointer"
				>
					Create Team
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: INVITE MEMBER -->
{#if isInviteMemberOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm p-4"
	>
		<div class="bg-bg-sidebar border border-border-subtle p-6 max-w-md w-full shadow-2xl relative">
			<button
				onclick={() => (isInviteMemberOpen = false)}
				class="absolute right-4 top-4 text-text-muted hover:text-text-base cursor-pointer"
				aria-label="Close Modal"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="w-5 h-5"
				>
					<path d="M18 6 6 18M6 6l12 12" />
				</svg>
			</button>

			<h3 class="text-base font-semibold text-text-base mb-4">Invite Team Member</h3>
			<form onsubmit={handleInviteMember} class="space-y-4">
				<div class="space-y-1">
					<label
						for="invite-email"
						class="text-[10px] font-semibold uppercase tracking-widest text-text-muted"
					>
						Email Address
					</label>
					<input
						id="invite-email"
						type="email"
						bind:value={inviteEmail}
						placeholder="user@example.com"
						required
						class="w-full bg-bg-primary border border-border-subtle text-text-base text-sm px-3 py-2 rounded-none focus:outline-none focus:border-accent"
					/>
				</div>

				<div class="space-y-1">
					<label
						for="invite-role"
						class="text-[10px] font-semibold uppercase tracking-widest text-text-muted"
					>
						Role
					</label>
					<select
						id="invite-role"
						bind:value={inviteRole}
						class="w-full bg-bg-primary border border-border-subtle text-text-base text-sm px-3 py-2 rounded-none focus:outline-none focus:border-accent"
					>
						<option value="member">Member (Can access vault)</option>
						<option value="admin">Admin (Can manage projects)</option>
					</select>
				</div>

				<button
					type="submit"
					class="w-full py-2 bg-accent text-bg-sidebar text-sm font-semibold hover:bg-accent/90 cursor-pointer"
				>
					Send Invitation
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: ADD PASSWORD -->
{#if isAddPasswordOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm p-4"
	>
		<div
			class="bg-bg-sidebar border border-border-subtle p-6 max-w-md w-full shadow-2xl relative overflow-y-auto max-h-[90vh]"
		>
			<button
				onclick={() => (isAddPasswordOpen = false)}
				class="absolute right-4 top-4 text-text-muted hover:text-text-base cursor-pointer"
				aria-label="Close Modal"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="w-5 h-5"
				>
					<path d="M18 6 6 18M6 6l12 12" />
				</svg>
			</button>

			<h3 class="text-base font-semibold text-text-base mb-4">Add Shared Password</h3>
			<form onsubmit={handleAddPassword} class="space-y-4">
				<div class="space-y-1">
					<label
						for="pwd-title"
						class="text-[10px] font-semibold uppercase tracking-widest text-text-muted"
					>
						Title
					</label>
					<input
						id="pwd-title"
						type="text"
						bind:value={newPasswordTitle}
						placeholder="e.g. Database Server"
						required
						class="w-full bg-bg-primary border border-border-subtle text-text-base text-sm px-3 py-2 rounded-none focus:outline-none focus:border-accent"
					/>
				</div>

				<div class="space-y-1">
					<label
						for="pwd-website"
						class="text-[10px] font-semibold uppercase tracking-widest text-text-muted"
					>
						Website/IP (optional)
					</label>
					<input
						id="pwd-website"
						type="text"
						bind:value={newPasswordWebsite}
						placeholder="e.g. aws.amazon.com"
						class="w-full bg-bg-primary border border-border-subtle text-text-base text-sm px-3 py-2 rounded-none focus:outline-none focus:border-accent"
					/>
				</div>

				<div class="space-y-1">
					<label
						for="pwd-username"
						class="text-[10px] font-semibold uppercase tracking-widest text-text-muted"
					>
						Username/Email (optional)
					</label>
					<input
						id="pwd-username"
						type="text"
						bind:value={newPasswordUsername}
						placeholder="admin"
						class="w-full bg-bg-primary border border-border-subtle text-text-base text-sm px-3 py-2 rounded-none focus:outline-none focus:border-accent"
					/>
				</div>

				<div class="space-y-1">
					<label
						for="pwd-value"
						class="text-[10px] font-semibold uppercase tracking-widest text-text-muted"
					>
						Password
					</label>
					<input
						id="pwd-value"
						type="password"
						bind:value={newPasswordValue}
						required
						class="w-full bg-bg-primary border border-border-subtle text-text-base text-sm px-3 py-2 rounded-none focus:outline-none focus:border-accent"
					/>
				</div>

				<div class="space-y-1">
					<label
						for="pwd-notes"
						class="text-[10px] font-semibold uppercase tracking-widest text-text-muted"
					>
						Notes (optional)
					</label>
					<textarea
						id="pwd-notes"
						bind:value={newPasswordNotes}
						placeholder="Port 5432 admin account"
						rows="3"
						class="w-full bg-bg-primary border border-border-subtle text-text-base text-sm px-3 py-2 rounded-none focus:outline-none focus:border-accent resize-none"
					></textarea>
				</div>

				<button
					type="submit"
					class="w-full py-2 bg-accent text-bg-sidebar text-sm font-semibold hover:bg-accent/90 cursor-pointer"
				>
					Add shared credential
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- Inline modal for password fallback decryption -->
{#if showPasswordPrompt}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
		<div
			class="bg-bg-sidebar border border-border-subtle p-6 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
		>
			<h3 class="text-sm font-bold text-text-base mb-1">Unlock</h3>
			<p class="text-[11px] text-text-muted mb-4">
				{#if itemToUnlock}
					Enter your Master Password to decrypt "{itemToUnlock.title}".
				{:else}
					Enter your Master Password to unlock sharing keys.
				{/if}
			</p>

			<form onsubmit={handlePromptSubmit} class="space-y-4">
				<div class="space-y-1.5">
					<label
						for="modal-master-password"
						class="text-[9px] font-semibold uppercase tracking-widest text-text-muted ml-1"
					>
						Master Password
					</label>
					<input
						id="modal-master-password"
						type="password"
						bind:value={masterPasswordPromptInput}
						placeholder="Enter password"
						class="w-full px-4 py-2.5 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent transition-all placeholder:text-text-base/20"
						required
						autofocus
					/>
				</div>

				<div class="flex justify-end gap-3 pt-2">
					<button
						type="button"
						onclick={handlePromptCancel}
						class="px-4 py-2 text-xs border border-border-subtle text-text-muted hover:text-text-base transition-colors duration-200 cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-4 py-2 text-xs border-2 border-accent text-accent font-semibold hover:bg-accent hover:text-bg-sidebar transition-all duration-300 cursor-pointer"
					>
						Confirm
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
