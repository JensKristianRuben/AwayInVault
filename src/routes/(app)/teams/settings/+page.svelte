<script lang="ts">
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { supabase } from "$lib/utils/supabaseClient";
	import { toast } from "svelte-sonner";
	import {
		deriveKey,
		encryptLocal,
		decryptLocal,
		importPublicKey,
		importPrivateKey,
		unwrapProjectKey,
		wrapProjectKey,
		verifyMasterPassword,
		generateProjectKey,
		importProjectKey,
	} from "$lib/utils/crypto";
	import { cryptoSession } from "$lib/stores/cryptoSession.svelte";
	import VaultImportExport from "$lib/components/settings/VaultImportExport.svelte";

	let teamId = $derived(page.url.searchParams.get("teamId") || "");

	let teamName = $state("");
	let teamNameInput = $state("");
	let members = $state<any[]>([]);
	let invitations = $state<any[]>([]);
	let projects = $state<any[]>([]);
	let currentUser = $state<any>(null);
	let myRoleInSelectedTeam = $state("member");
	let isLoading = $state(true);

	// Navigation / Tab state
	let activeTab = $state<"general" | "members" | "projects" | "data" | "danger">("members");

	// Active project state
	let activeProjectId = $state("");

	// Create project state
	let isCreateProjectOpen = $state(false);
	let newProjectName = $state("");

	// Delete project state
	let isDeleteProjectOpen = $state(false);
	let deleteProjectId = $state("");
	let deleteProjectName = $state("");
	let deleteProjectConfirmInput = $state("");

	// Invite form state
	let isInviteMemberOpen = $state(false);
	let inviteEmail = $state("");
	let inviteRole = $state<"member" | "admin">("member");

	// Unlock password prompt state
	let showPasswordPrompt = $state(false);
	let promptPassword = $state("");
	let promptResolve = $state<((val: boolean) => void) | null>(null);

	// Delete team modal state
	let isDeleteTeamOpen = $state(false);
	let deleteTeamConfirmInput = $state("");

	// User Actions Dropdown state
	let openUserActionsId = $state<string>("");

	function toggleUserActions(id: string, e: MouseEvent) {
		e.stopPropagation();
		if (openUserActionsId === id) {
			openUserActionsId = "";
		} else {
			openUserActionsId = id;
		}
	}

	onMount(() => {
		if (!teamId) {
			toast.error("No team selected.");
			goto("/teams");
			return;
		}

		loadData();

		const closeMenus = () => {
			openUserActionsId = "";
		};
		window.addEventListener("click", closeMenus);
		return () => {
			window.removeEventListener("click", closeMenus);
		};
	});

	async function loadData() {
		isLoading = true;
		try {
			// Get current user
			const {
				data: { user },
			} = await supabase.auth.getUser();
			currentUser = user;
			if (!user) throw new Error("Not logged in");

			// Get team details
			const { data: teamData, error: teamErr } = await supabase
				.from("teams")
				.select("*")
				.eq("id", teamId)
				.single();

			if (teamErr || !teamData) {
				throw new Error("Team not found");
			}

			teamName = teamData.name;
			teamNameInput = teamData.name;

			// Get my membership role
			const { data: myMembership } = await supabase
				.from("team_members")
				.select("role")
				.eq("team_id", teamId)
				.eq("user_id", user.id)
				.single();

			myRoleInSelectedTeam = myMembership?.role || "member";

			// Get members list (query profiles separately and map to bypass RLS join limits)
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
				}));
			} else {
				members = [];
			}

			// Get invitations sent
			const { data: invs } = await supabase
				.from("team_invitations")
				.select("*")
				.eq("team_id", teamId);
			invitations = invs || [];

			// Get shared projects
			const { data: projs } = await supabase
				.from("shared_projects")
				.select("*")
				.eq("team_id", teamId);
			projects = projs || [];

			// Initialize active project ID from localStorage or first project
			const storedActive = localStorage.getItem(`active_project_${teamId}`);
			if (storedActive && projects.some((p) => p.id === storedActive)) {
				activeProjectId = storedActive;
			} else if (projects.length > 0) {
				activeProjectId = projects[0].id;
				localStorage.setItem(`active_project_${teamId}`, activeProjectId);
			} else {
				activeProjectId = "";
			}
		} catch (err: any) {
			toast.error(err.message || "Failed to load team settings");
			goto("/teams");
		} finally {
			isLoading = false;
		}
	}

	// Rename Team
	async function handleRenameTeam(e: Event) {
		e.preventDefault();
		if (myRoleInSelectedTeam !== "owner" && myRoleInSelectedTeam !== "admin") {
			toast.error("Only owners and admins can rename the team.");
			return;
		}

		if (!teamNameInput.trim()) {
			toast.error("Team name cannot be empty.");
			return;
		}

		try {
			const { error } = await supabase
				.from("teams")
				.update({ name: teamNameInput.trim() })
				.eq("id", teamId);

			if (error) throw error;
			teamName = teamNameInput.trim();
			toast.success("Team renamed successfully!");
		} catch (err: any) {
			toast.error(err.message || "Failed to rename team");
		}
	}

	// Change member role
	async function handleChangeRole(memberId: string, newRole: string) {
		if (myRoleInSelectedTeam !== "owner" && myRoleInSelectedTeam !== "admin") {
			toast.error("Only owners and admins can change member roles.");
			return;
		}

		try {
			const { error } = await supabase
				.from("team_members")
				.update({ role: newRole })
				.eq("id", memberId);

			if (error) throw error;
			toast.success("Member role updated successfully");
			await loadData();
		} catch (err: any) {
			toast.error(err.message || "Failed to update member role");
		}
	}

	// Remove member or Leave team
	async function handleRemoveMember(memberId: string, email: string) {
		const isSelf = memberId === currentUser.id;
		const actionWord = isSelf ? "leave" : "remove";
		const confirmMsg = isSelf
			? "Are you sure you want to leave this team? You will lose access to all shared project keys."
			: `Are you sure you want to remove ${email} from the team?`;

		if (!confirm(confirmMsg)) return;

		try {
			const { error } = await supabase.from("team_members").delete().eq("id", memberId);
			if (error) throw error;

			toast.success(isSelf ? "You left the team" : "Member removed");
			if (isSelf) {
				goto("/teams");
			} else {
				await loadData();
			}
		} catch (err: any) {
			toast.error(err.message || "Failed to remove member");
		}
	}

	// Invite member
	async function handleInviteMember(e: SubmitEvent) {
		e.preventDefault();
		const emailTrimmed = inviteEmail.trim();
		if (!emailTrimmed) {
			toast.error("Please enter an email address.");
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(emailTrimmed)) {
			toast.error("Invalid email format. Format must be: user@domain.com");
			return;
		}

		try {
			const emailLower = emailTrimmed.toLowerCase();

			// 1. Check if user is already a member
			const alreadyMember = members.some((m) => m.profiles?.email === emailLower);
			if (alreadyMember) {
				toast.error("User is already a member of this team.");
				return;
			}

			// 2. Check if user is registered (look up in profiles)
			const { data: inviteeProfile } = await supabase
				.from("public_profiles")
				.select("id, email, public_key")
				.eq("email", emailLower)
				.maybeSingle();

			if (inviteeProfile && inviteeProfile.public_key) {
				// Direct invitation (adds row to team_members as 'invited')
				const { error: memErr } = await supabase.from("team_members").insert({
					team_id: teamId,
					user_id: inviteeProfile.id,
					role: inviteRole,
					status: "invited",
				});

				if (memErr) throw memErr;

				// Distribute project keys proactively
				if (cryptoSession.sharingPrivateKey) {
					let keysShared = 0;
					for (const proj of projects) {
						// Unwrap project key
						const { data: keyRow } = await supabase
							.from("project_keys")
							.select("encrypted_key")
							.eq("project_id", proj.id)
							.eq("user_id", currentUser.id)
							.maybeSingle();

						if (keyRow) {
							const projKeyBase64 = await unwrapProjectKey(
								keyRow.encrypted_key,
								cryptoSession.sharingPrivateKey,
							);
							const pubKey = await importPublicKey(inviteeProfile.public_key);
							const wrapped = await wrapProjectKey(projKeyBase64, pubKey);

							await supabase.from("project_keys").upsert(
								{
									project_id: proj.id,
									user_id: inviteeProfile.id,
									encrypted_key: wrapped,
								},
								{ onConflict: "project_id,user_id" },
							);
							keysShared++;
						}
					}
					if (keysShared > 0) {
						toast.success(`Invited registered user. Shared ${keysShared} project keys.`);
					} else {
						toast.success("Invited registered user.");
					}
				} else {
					toast.warning("Invited user. Unlock your vault to share project keys automatically.");
				}
			} else {
				// Offline invitation (adds row to team_invitations)
				const { error: invErr } = await supabase.from("team_invitations").insert({
					team_id: teamId,
					email: emailLower,
					role: inviteRole,
					invited_by: currentUser.id,
				});

				if (invErr) throw invErr;
				toast.success(`Invitation sent to ${emailLower} (unregistered user)`);
			}

			inviteEmail = "";
			isInviteMemberOpen = false;
			await loadData();
		} catch (err: any) {
			toast.error(err.message || "Failed to invite member");
		}
	}

	// Cancel invitation sent
	async function handleCancelInvitation(inviteId: string) {
		try {
			const { error } = await supabase.from("team_invitations").delete().eq("id", inviteId);
			if (error) throw error;
			toast.success("Invitation cancelled");
			await loadData();
		} catch (err: any) {
			toast.error(err.message);
		}
	}

	// Trigger delete team modal
	function handleDeleteTeam() {
		if (myRoleInSelectedTeam !== "owner") {
			toast.error("Only the team owner can delete the team.");
			return;
		}
		deleteTeamConfirmInput = "";
		isDeleteTeamOpen = true;
	}

	// Confirm and execute team deletion
	async function confirmDeleteTeam() {
		if (deleteTeamConfirmInput !== teamName) {
			toast.error("Team name confirmation does not match.");
			return;
		}

		try {
			const { error } = await supabase.from("teams").delete().eq("id", teamId);
			if (error) throw error;

			toast.success(`Team "${teamName}" deleted`);
			isDeleteTeamOpen = false;
			goto("/teams");
		} catch (err: any) {
			toast.error(err.message || "Failed to delete team");
		}
	}

	// Prompt unlock vault
	function requestUnlock(): Promise<boolean> {
		if (cryptoSession.sharingPrivateKey) return Promise.resolve(true);

		return new Promise((resolve) => {
			promptPassword = "";
			showPasswordPrompt = true;
			promptResolve = resolve;
		});
	}

	async function handleConfirmUnlock() {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error("Please log in.");

			const masterKey = await verifyMasterPassword(promptPassword, user.user_metadata);
			if (!masterKey) {
				toast.error("Incorrect Master Password.");
				return;
			}

			const { data: profile } = await supabase
				.from("profiles")
				.select("public_key, encrypted_private_key")
				.eq("id", user.id)
				.single();

			if (!profile?.encrypted_private_key) {
				throw new Error("Sharing keys not found. Setup in User Settings.");
			}

			const privKeyBase64 = await decryptLocal(profile.encrypted_private_key, masterKey);
			const privateKeyObj = await importPrivateKey(privKeyBase64);
			const publicKeyObj = await importPublicKey(profile.public_key);

			cryptoSession.setSharingKeys(privateKeyObj, publicKeyObj);
			toast.success("Vault unlocked for key sharing!");

			showPasswordPrompt = false;
			if (promptResolve) {
				promptResolve(true);
				promptResolve = null;
			}
		} catch (err: any) {
			toast.error(err.message || "Failed to unlock vault");
		}
	}

	// Passed to VaultImportExport as resolveKey when viewing the active project's Data
	// tab: unwraps that project's symmetric key via the caller's RSA sharing keypair,
	// the same way project_vault_items are decrypted elsewhere on this page.
	async function resolveActiveProjectKey(): Promise<CryptoKey | null> {
		if (!activeProjectId) {
			toast.error("Select an active project first.");
			return null;
		}

		const unlocked = await requestUnlock();
		if (!unlocked || !cryptoSession.sharingPrivateKey) {
			toast.error("Unlock required to decrypt this project's vault.");
			return null;
		}

		const { data: keyRow, error } = await supabase
			.from("project_keys")
			.select("encrypted_key")
			.eq("project_id", activeProjectId)
			.eq("user_id", currentUser.id)
			.maybeSingle();

		if (error || !keyRow) {
			toast.error("You do not have a key for this project yet.");
			return null;
		}

		const projKeyBase64 = await unwrapProjectKey(
			keyRow.encrypted_key,
			cryptoSession.sharingPrivateKey,
		);
		return await importProjectKey(projKeyBase64);
	}

	// Manual distribute keys
	async function handleManualDistributeKeys(member: any) {
		if (!member.profiles?.public_key) {
			toast.error("User does not have a public key yet. They must log in at least once.");
			return;
		}

		const unlocked = await requestUnlock();
		if (!unlocked || !cryptoSession.sharingPrivateKey) {
			toast.error("Unlock required to wrap keys.");
			return;
		}

		try {
			let keysWrapped = 0;
			for (const proj of projects) {
				let projKeyBase64 = "";

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

				if (!projKeyBase64) continue;

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

				if (error) throw error;
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
			toast.error(`Key sharing failed: ${err.message}`);
		}
	}

	// Create project in settings
	async function handleCreateProject(e: SubmitEvent) {
		e.preventDefault();
		if (!newProjectName.trim() || !teamId) return;

		const unlocked = await requestUnlock();
		if (!unlocked) {
			toast.error("Unlock required to create project.");
			return;
		}

		try {
			// 1. Insert project
			const { data: newProj, error: projErr } = await supabase
				.from("shared_projects")
				.insert({
					team_id: teamId,
					name: newProjectName,
				})
				.select()
				.single();

			if (projErr) throw projErr;

			// 2. Generate symmetric project key
			const rawKeyBase64 = generateProjectKey();

			// 3. Encrypt for ourselves
			if (!cryptoSession.sharingPublicKey) {
				throw new Error("Sharing public key not found. Please unlock the vault.");
			}
			const wrapped = await wrapProjectKey(rawKeyBase64, cryptoSession.sharingPublicKey);

			// 4. Insert project key
			const { error: keyErr } = await supabase.from("project_keys").insert({
				project_id: newProj.id,
				user_id: currentUser.id,
				encrypted_key: wrapped,
			});

			if (keyErr) throw keyErr;

			toast.success("Project created successfully");
			newProjectName = "";
			isCreateProjectOpen = false;

			// Set as active
			activeProjectId = newProj.id;
			localStorage.setItem(`active_project_${teamId}`, newProj.id);

			await loadData();
		} catch (err: any) {
			toast.error(err.message || "Failed to create project");
		}
	}

	// Delete project from settings (opens confirmation modal)
	function handleDeleteProject(projId: string, name: string) {
		deleteProjectId = projId;
		deleteProjectName = name;
		deleteProjectConfirmInput = "";
		isDeleteProjectOpen = true;
	}

	// Confirm and execute project deletion
	async function confirmDeleteProject() {
		if (deleteProjectConfirmInput !== deleteProjectName) {
			toast.error("Project name confirmation does not match.");
			return;
		}

		try {
			const { error } = await supabase.from("shared_projects").delete().eq("id", deleteProjectId);
			if (error) throw error;
			toast.success(`Project "${deleteProjectName}" deleted`);
			isDeleteProjectOpen = false;

			if (activeProjectId === deleteProjectId) {
				activeProjectId = "";
				localStorage.removeItem(`active_project_${teamId}`);
			}
			await loadData();
		} catch (err: any) {
			toast.error(err.message);
		}
	}

	// Set active project manually
	function handleSetActiveProject(projId: string) {
		activeProjectId = projId;
		localStorage.setItem(`active_project_${teamId}`, projId);
		toast.success("Active project set!");
	}
</script>

<div class="min-h-screen w-full bg-bg-primary text-text-base p-6 md:p-10 flex justify-center">
	<div class="max-w-5xl w-full space-y-8">
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-border-subtle pb-6">
			<div>
				<div
					class="flex items-center gap-2 text-text-muted text-xs font-semibold uppercase tracking-wider"
				>
					<button
						onclick={() => goto(`/teams?teamId=${teamId}`)}
						class="hover:text-accent transition-colors cursor-pointer"
					>
						← Back to Teams
					</button>
					<span>•</span>
					<span>Settings</span>
				</div>
				<h1 class="text-3xl font-bold tracking-tight text-text-base mt-2">
					{teamName || "Team"} Settings
				</h1>
			</div>
		</div>

		{#if isLoading}
			<div class="flex justify-center items-center py-20">
				<div class="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
			</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
				<!-- Left Sidebar Menu -->
				<div
					class="lg:col-span-3 flex flex-row overflow-x-auto lg:flex-col gap-1 border-b border-border-subtle lg:border-none pb-4 lg:pb-0 scrollbar-none shrink-0"
				>
					<button
						onclick={() => (activeTab = "members")}
						class="whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 lg:border-b-0 lg:border-l-2 transition-all cursor-pointer
							{activeTab === 'members'
							? 'bg-accent/10 border-accent text-accent font-semibold'
							: 'border-transparent text-text-muted hover:bg-bg-sidebar hover:text-text-base'}"
					>
						Team Members
					</button>
					<button
						onclick={() => (activeTab = "general")}
						class="whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 lg:border-b-0 lg:border-l-2 transition-all cursor-pointer
							{activeTab === 'general'
							? 'bg-accent/10 border-accent text-accent font-semibold'
							: 'border-transparent text-text-muted hover:bg-bg-sidebar hover:text-text-base'}"
					>
						General Settings
					</button>
					<button
						onclick={() => (activeTab = "projects")}
						class="whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 lg:border-b-0 lg:border-l-2 transition-all cursor-pointer
							{activeTab === 'projects'
							? 'bg-accent/10 border-accent text-accent font-semibold'
							: 'border-transparent text-text-muted hover:bg-bg-sidebar hover:text-text-base'}"
					>
						Projects
					</button>
					{#if myRoleInSelectedTeam === "owner" || myRoleInSelectedTeam === "admin"}
						<button
							onclick={() => (activeTab = "data")}
							class="whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 lg:border-b-0 lg:border-l-2 transition-all cursor-pointer
								{activeTab === 'data'
								? 'bg-accent/10 border-accent text-accent font-semibold'
								: 'border-transparent text-text-muted hover:bg-bg-sidebar hover:text-text-base'}"
						>
							Data
						</button>
					{/if}
					<button
						onclick={() => (activeTab = "danger")}
						class="whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 lg:border-b-0 lg:border-l-2 transition-all cursor-pointer
							{activeTab === 'danger'
							? 'bg-accent/10 border-accent text-accent font-semibold'
							: 'border-transparent text-text-muted hover:bg-bg-sidebar hover:text-text-base'}"
					>
						Danger Zone
					</button>
				</div>

				<!-- Right Main Settings View -->
				<div class="lg:col-span-9 space-y-6">
					{#if activeTab === "general"}
						<!-- GENERAL SETTINGS SECTION -->
						<div class="bg-bg-sidebar border border-border-subtle p-6 space-y-6">
							<div>
								<h2 class="text-lg font-semibold text-text-base">Rename Team</h2>
								<p class="text-xs text-text-muted mt-1 font-light">
									Change the display name of your team. This will update the name for all members.
								</p>
							</div>

							<form onsubmit={handleRenameTeam} class="space-y-4">
								<div class="space-y-2">
									<label
										for="team-name"
										class="text-[10px] font-semibold uppercase tracking-widest text-text-muted ml-1"
									>
										Team Name
									</label>
									<input
										id="team-name"
										type="text"
										bind:value={teamNameInput}
										disabled={myRoleInSelectedTeam !== "owner" && myRoleInSelectedTeam !== "admin"}
										class="w-full px-4 py-2 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent disabled:opacity-50"
									/>
								</div>

								{#if myRoleInSelectedTeam === "owner" || myRoleInSelectedTeam === "admin"}
									<button
										type="submit"
										class="px-4 py-2 bg-accent text-bg-sidebar text-xs font-semibold hover:bg-accent/90 cursor-pointer"
									>
										Save Changes
									</button>
								{/if}
							</form>
						</div>
					{:else if activeTab === "members"}
						<!-- MEMBERS SECTION -->
						<div class="space-y-6">
							<!-- Invite Member Card -->
							{#if myRoleInSelectedTeam === "owner" || myRoleInSelectedTeam === "admin"}
								<div class="bg-bg-sidebar border border-border-subtle p-6 space-y-4">
									<div>
										<h2 class="text-lg font-semibold text-text-base">Invite Member</h2>
										<p class="text-xs text-text-muted mt-1 font-light">
											Add new developers or users to your team. Registered users will have keys
											generated automatically.
										</p>
									</div>

									<form
										onsubmit={handleInviteMember}
										novalidate
										class="grid md:grid-cols-12 gap-3 items-end"
									>
										<div class="md:col-span-6 space-y-1">
											<label
												for="invite-email"
												class="text-[9px] font-semibold uppercase tracking-wider text-text-muted"
											>
												Email Address
											</label>
											<input
												id="invite-email"
												type="text"
												placeholder="developer@awayinvault.dk"
												bind:value={inviteEmail}
												class="w-full px-3 py-1.5 bg-bg-primary border border-border-subtle text-text-base text-xs focus:outline-none focus:border-accent"
											/>
										</div>

										<div class="md:col-span-3 space-y-1">
											<label
												for="invite-role"
												class="text-[9px] font-semibold uppercase tracking-wider text-text-muted"
											>
												Team Role
											</label>
											<select
												id="invite-role"
												bind:value={inviteRole}
												class="w-full px-3 py-1.5 bg-bg-primary border border-border-subtle text-text-base text-xs focus:outline-none"
											>
												<option value="member">Member</option>
												<option value="admin">Admin</option>
											</select>
										</div>

										<div class="md:col-span-3">
											<button
												type="submit"
												class="w-full py-1.5 bg-accent text-bg-sidebar text-xs font-semibold hover:bg-accent/90 cursor-pointer"
											>
												Send Invite
											</button>
										</div>
									</form>
								</div>
							{/if}

							<!-- Members List -->
							<div class="bg-bg-sidebar border border-border-subtle p-6 space-y-4">
								<div>
									<h2 class="text-lg font-semibold text-text-base">Team Members</h2>
									<p class="text-xs text-text-muted mt-1 font-light">
										Currently active and invited users in this team.
									</p>
								</div>

								<div class="divide-y divide-border-subtle">
									{#each members as mem}
										<div class="py-3 flex justify-between items-center text-sm">
											<div>
												<p class="font-medium text-text-base">{mem.profiles?.email}</p>
												<p class="text-[10px] text-text-muted capitalize">
													Status: <span
														class={mem.status === "active" ? "text-accent" : "text-yellow-400"}
														>{mem.status}</span
													>
												</p>
											</div>

											<div class="flex items-center gap-4">
												<!-- Role Dropdown/Selector -->
												<div>
													{#if (myRoleInSelectedTeam === "owner" || myRoleInSelectedTeam === "admin") && mem.role !== "owner" && mem.user_id !== currentUser.id}
														<select
															value={mem.role}
															onchange={(e: any) => handleChangeRole(mem.id, e.target.value)}
															class="bg-bg-primary border border-border-subtle text-text-base text-xs px-2 py-1 rounded focus:outline-none"
														>
															<option value="member">Member</option>
															<option value="admin">Admin</option>
														</select>
													{:else}
														<span
															class="text-xs text-text-muted capitalize font-medium px-2 py-1 bg-bg-primary/50 border border-border-subtle"
														>
															{mem.role}
														</span>
													{/if}
												</div>

												<!-- Actions Dropdown -->
												<div class="relative">
													<button
														type="button"
														onclick={(e) => toggleUserActions(mem.id, e)}
														class="p-1.5 bg-bg-primary hover:bg-bg-primary/80 border border-border-subtle text-text-muted hover:text-text-base transition-colors cursor-pointer flex items-center justify-center"
														title="Member Actions"
													>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															stroke-width="2.5"
															class="w-3.5 h-3.5"
														>
															<circle cx="12" cy="12" r="1" />
															<circle cx="12" cy="5" r="1" />
															<circle cx="12" cy="19" r="1" />
														</svg>
													</button>

													{#if openUserActionsId === mem.id}
														<div
															class="absolute right-0 mt-1 bg-bg-sidebar border border-border-subtle shadow-lg z-50 py-1 w-36"
														>
															{#if mem.user_id !== currentUser.id && mem.status === "active"}
																<button
																	type="button"
																	onclick={() => handleManualDistributeKeys(mem)}
																	class="w-full text-left px-3 py-1.5 text-xs text-accent hover:bg-accent hover:text-bg-sidebar transition-colors cursor-pointer font-medium"
																>
																	Distribute Keys
																</button>
															{/if}

															{#if myRoleInSelectedTeam === "owner" && mem.user_id !== currentUser.id}
																<button
																	type="button"
																	onclick={() =>
																		handleRemoveMember(mem.id, mem.profiles?.email || "")}
																	class="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer font-medium"
																>
																	Remove Member
																</button>
															{:else if mem.user_id === currentUser.id}
																<button
																	type="button"
																	onclick={() => handleRemoveMember(mem.id, "")}
																	class="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer font-medium"
																>
																	Leave Team
																</button>
															{/if}
														</div>
													{/if}
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>

							<!-- Pending Invitations Sent List -->
							{#if invitations.length > 0}
								<div class="bg-bg-sidebar border border-border-subtle p-6 space-y-4">
									<div>
										<h2 class="text-lg font-semibold text-text-base">Pending Offline Invites</h2>
										<p class="text-xs text-text-muted mt-1 font-light">
											Invitations sent to unregistered emails. These users will be added to the team
											once they register.
										</p>
									</div>

									<div class="divide-y divide-border-subtle">
										{#each invitations as invite}
											<div class="py-3 flex justify-between items-center text-sm">
												<div>
													<p class="font-medium text-text-base">{invite.email}</p>
													<p class="text-[10px] text-text-muted capitalize">Role: {invite.role}</p>
												</div>

												{#if myRoleInSelectedTeam === "owner" || myRoleInSelectedTeam === "admin"}
													<button
														onclick={() => handleCancelInvitation(invite.id)}
														class="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold cursor-pointer border border-red-500/20"
													>
														Cancel Invitation
													</button>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{:else if activeTab === "projects"}
						<!-- PROJECTS MANAGEMENT SECTION -->
						<div class="space-y-6">
							<!-- Create Project Form (Admins / Owners only) -->
							{#if myRoleInSelectedTeam === "owner" || myRoleInSelectedTeam === "admin"}
								<div class="bg-bg-sidebar border border-border-subtle p-6 space-y-4">
									<div>
										<h2 class="text-lg font-semibold text-text-base">Create Project</h2>
										<p class="text-xs text-text-muted mt-1 font-light">
											Add a new project to group and share credentials within your team.
										</p>
									</div>

									<form
										onsubmit={handleCreateProject}
										class="flex flex-col sm:flex-row gap-3 sm:items-end"
									>
										<div class="flex-1 space-y-1 w-full">
											<label
												for="new-project-name"
												class="text-[9px] font-semibold uppercase tracking-wider text-text-muted"
											>
												Project Name
											</label>
											<input
												id="new-project-name"
												type="text"
												placeholder="Production, Staging, Api..."
												bind:value={newProjectName}
												class="w-full px-3 py-1.5 bg-bg-primary border border-border-subtle text-text-base text-xs focus:outline-none focus:border-accent"
											/>
										</div>

										<button
											type="submit"
											class="w-full sm:w-auto px-4 py-2 bg-accent text-bg-sidebar text-xs font-semibold hover:bg-accent/90 cursor-pointer h-[34px]"
										>
											+ Create Project
										</button>
									</form>
								</div>
							{/if}

							<!-- Projects List -->
							<div class="bg-bg-sidebar border border-border-subtle p-6 space-y-4">
								<div>
									<h2 class="text-lg font-semibold text-text-base">Shared Projects</h2>
									<p class="text-xs text-text-muted mt-1 font-light">
										Shared projects under this team. Setting a project as active configures it as
										your default workspace on the team sharing page.
									</p>
								</div>

								{#if projects.length === 0}
									<p class="text-text-muted text-xs py-4 font-light italic">
										No projects created yet.
									</p>
								{:else}
									<div class="divide-y divide-border-subtle">
										{#each projects as proj}
											<div class="py-3 flex justify-between items-center text-sm">
												<div class="flex items-center gap-2">
													<p class="font-medium text-text-base">{proj.name}</p>
													{#if activeProjectId === proj.id}
														<span
															class="px-1.5 py-0.5 bg-accent/10 text-accent text-[9px] font-semibold tracking-wider uppercase border border-accent/20"
														>
															Active
														</span>
													{/if}
												</div>

												<div class="flex items-center gap-3">
													{#if activeProjectId !== proj.id}
														<button
															onclick={() => handleSetActiveProject(proj.id)}
															class="px-2.5 py-1 border border-border-subtle text-text-base hover:bg-bg-primary text-xs font-semibold cursor-pointer transition-colors"
														>
															Set Active
														</button>
													{/if}

													{#if myRoleInSelectedTeam === "owner" || myRoleInSelectedTeam === "admin"}
														<button
															onclick={() => handleDeleteProject(proj.id, proj.name)}
															class="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold cursor-pointer border border-red-500/20 transition-colors"
														>
															Delete
														</button>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{:else if activeTab === "data"}
						<!-- DATA (IMPORT/EXPORT) SECTION - owners/admins only -->
						{#if myRoleInSelectedTeam !== "owner" && myRoleInSelectedTeam !== "admin"}
							<div class="bg-bg-sidebar border border-border-subtle p-6">
								<p class="text-xs text-text-muted italic">
									Only team owners and admins can import or export a project's vault.
								</p>
							</div>
						{:else if !activeProjectId}
							<div class="bg-bg-sidebar border border-border-subtle p-6">
								<p class="text-xs text-text-muted italic">
									Select or create a project under the Projects tab first, then set it as active.
								</p>
							</div>
						{:else}
							{#key activeProjectId}
								<VaultImportExport
									table="project_vault_items"
									scopeColumn="project_id"
									scopeValue={activeProjectId}
									resolveKey={resolveActiveProjectKey}
								/>
							{/key}
						{/if}
					{:else if activeTab === "danger"}
						<!-- DANGER ZONE SECTION -->
						<div class="bg-bg-sidebar border border-border-subtle p-6 space-y-6">
							<div>
								<h2 class="text-lg font-semibold text-red-400">Danger Zone</h2>
								<p class="text-xs text-text-muted mt-1 font-light">
									Irreversible actions for team management.
								</p>
							</div>

							<div class="border-t border-border-subtle pt-6">
								{#if myRoleInSelectedTeam === "owner"}
									<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
										<div>
											<h3 class="text-sm font-semibold text-text-base">Delete Entire Team</h3>
											<p class="text-xs text-text-muted mt-1 font-light max-w-lg">
												Delete this team permanently. All associated projects, passwords, members,
												and keys will be permanently deleted.
											</p>
										</div>
										<button
											onclick={handleDeleteTeam}
											class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
										>
											Delete Entire Team
										</button>
									</div>
								{:else}
									<p class="text-xs text-text-muted italic">
										Only the team owner ({members.find((m) => m.role === "owner")?.profiles
											?.email || "the owner"}) can delete the team.
									</p>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Modal: Unlock Vault for Key Sharing -->
{#if showPasswordPrompt}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
		<div class="bg-bg-sidebar border border-border-subtle p-6 max-w-md w-full space-y-4">
			<div>
				<h3 class="text-lg font-bold text-text-base">Unlock Sharing Keys</h3>
				<p class="text-xs text-text-muted mt-1">
					Please enter your Master Password to decrypt your private sharing keys and wrap project
					keys for this member.
				</p>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleConfirmUnlock();
				}}
				class="space-y-4"
			>
				<input
					type="password"
					placeholder="Enter Master Password"
					bind:value={promptPassword}
					required
					autofocus
					class="w-full px-3 py-2 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-accent"
				/>

				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={() => {
							showPasswordPrompt = false;
							if (promptResolve) {
								promptResolve(false);
								promptResolve = null;
							}
						}}
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

<!-- Modal: Delete Team Confirmation -->
{#if isDeleteTeamOpen}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
		<div class="bg-bg-sidebar border border-border-subtle p-6 max-w-md w-full space-y-4">
			<div>
				<h3 class="text-lg font-bold text-text-base">Delete Team</h3>
				<p class="text-xs text-text-muted mt-2 leading-relaxed">
					This action cannot be undone. To delete the team <strong class="text-text-base"
						>"{teamName}"</strong
					>, including all projects, members, and shared secrets, please type the name of the team
					below to confirm:
				</p>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					confirmDeleteTeam();
				}}
				class="space-y-4"
			>
				<input
					type="text"
					placeholder="Type team name to confirm"
					bind:value={deleteTeamConfirmInput}
					required
					autofocus
					class="w-full px-3 py-2 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-red-500 transition-colors"
				/>

				<div class="flex justify-end gap-3 pt-2">
					<button
						type="button"
						onclick={() => (isDeleteTeamOpen = false)}
						class="px-4 py-2 border border-border-subtle text-text-base text-xs font-semibold hover:bg-bg-primary transition-all cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={deleteTeamConfirmInput !== teamName}
						class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all cursor-pointer"
					>
						Delete Team
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Delete Project Confirmation -->
{#if isDeleteProjectOpen}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
		<div class="bg-bg-sidebar border border-border-subtle p-6 max-w-md w-full space-y-4">
			<div>
				<h3 class="text-lg font-bold text-text-base">Delete Project</h3>
				<p class="text-xs text-text-muted mt-2 leading-relaxed">
					This action cannot be undone. To delete the project <strong class="text-text-base"
						>"{deleteProjectName}"</strong
					>, including all shared credentials, please type the name of the project below to confirm:
				</p>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					confirmDeleteProject();
				}}
				class="space-y-4"
			>
				<input
					type="text"
					placeholder="Type project name to confirm"
					bind:value={deleteProjectConfirmInput}
					required
					autofocus
					class="w-full px-3 py-2 bg-bg-primary border border-border-subtle text-text-base text-sm focus:outline-none focus:border-red-500 transition-colors"
				/>

				<div class="flex justify-end gap-3 pt-2">
					<button
						type="button"
						onclick={() => (isDeleteProjectOpen = false)}
						class="px-4 py-2 border border-border-subtle text-text-base text-xs font-semibold hover:bg-bg-primary transition-all cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={deleteProjectConfirmInput !== deleteProjectName}
						class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all cursor-pointer"
					>
						Delete Project
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
