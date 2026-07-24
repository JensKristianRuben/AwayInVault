export interface Profile {
	id: string;
	email: string;
	public_key: string | null;
	encrypted_private_key: string | null;
	encrypted_vault_key: string | null;
	created_at: string;
	updated_at: string;
}

export interface Team {
	id: string;
	name: string;
	created_at: string;
	updated_at: string;
}

export type TeamRole = "owner" | "admin" | "member";
export type TeamMemberStatus = "active" | "invited";

export interface TeamMember {
	id: string;
	team_id: string;
	user_id: string;
	role: TeamRole;
	status: TeamMemberStatus;
	created_at: string;
	updated_at: string;
	// Joined profile info if queried
	profiles?: Profile;
}

export interface SharedProject {
	id: string;
	team_id: string;
	name: string;
	created_at: string;
	updated_at: string;
}

export interface ProjectKey {
	id: string;
	project_id: string;
	user_id: string;
	encrypted_key: string;
	created_at: string;
}

export interface ProjectVaultItem {
	id: string;
	project_id: string;
	title: string;
	website: string | null;
	username_encrypted: string | null;
	password_encrypted: string;
	notes_encrypted: string | null;
	created_at: string;
	updated_at: string;

	// Decrypted fields added locally in the browser
	username?: string;
	password?: string;
	isDecrypted?: boolean;
}

export interface TeamInvitation {
	id: string;
	team_id: string;
	email: string;
	role: TeamRole;
	invited_by: string;
	created_at: string;
	// Joined team info if queried
	teams?: Team;
}
