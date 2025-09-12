export interface Profile {
	id: string;
	username: string | null;
	full_name: string | null;
	bio: string | null;
	location: string | null;
	avatar_url: string | null;
	created_at: string;
	updated_at: string;
}

export interface ProfileUpdate {
	username?: string | null;
	full_name?: string | null;
	bio?: string | null;
	location?: string | null;
	avatar_url?: string | null;
}

export interface ProfileWithUser extends Profile {
	email: string;
}