export interface PublicProfile {
	id: string;
	username: string;
	full_name?: string;
	bio?: string;
	avatar_url?: string;
	created_at: string;
	updated_at: string;
	is_online?: boolean;
	last_seen_at?: string;
	first_login_at?: string;
	city?: string;
	state?: string;
	zip_code?: string;
}

export interface PrivateProfile extends PublicProfile {
	email?: string;
	address_line1?: string;
	address_line2?: string;
	city?: string;
	state?: string;
}

export interface ProfileUpdate {
	username?: string;
	full_name?: string;
	bio?: string;
	avatar_url?: string;
	address_line1?: string;
	address_line2?: string;
	city?: string;
	state?: string;
	zip_code?: string;
}

export interface UserContactInfo {
	username: string;
	full_name?: string;
	email?: string;
	bio?: string;
	city?: string;
	state?: string;
	zip_code?: string;
	avatar_url?: string;
}

export interface SwapHistoryItem {
	id: string;
	book_title: string;
	book_id: string;
	status: 'PENDING' | 'ACCEPTED' | 'COUNTER_OFFER' | 'COMPLETED' | 'CANCELLED';
	created_at: string;
	completed_at?: string;
	user_role: 'requester' | 'owner';
	other_user: {
		id: string;
		username: string;
		full_name?: string;
		avatar_url?: string;
	};
}

export interface UserPairSwapHistory {
	user1: PublicProfile;
	user2: PublicProfile;
	swap_history: SwapHistoryItem[];
	total_swaps: number;
	completed_swaps: number;
	has_chat_history: boolean;
}

export interface ProfilePageData {
	profile: PublicProfile;
	swap_history_with_current_user: SwapHistoryItem[];
	can_chat: boolean;
	conversation_id?: string;
}
