export enum SwapStatus {
	PENDING = 'PENDING',
	ACCEPTED = 'ACCEPTED',
	DECLINED = 'DECLINED',
	CANCELLED = 'CANCELLED',
	COMPLETED = 'COMPLETED'
}

export interface SwapRequest {
	id: string;
	book_id: string;
	requester_id: string;
	owner_id: string;
	status: SwapStatus;
	message: string | null;
	created_at: string;
	updated_at: string;
	completion_date: string | null;
	requester_rating: number | null;
	owner_rating: number | null;
	requester_feedback: string | null;
	owner_feedback: string | null;
}

export interface SwapRequestInput {
	book_id: string;
	message?: string | null;
}

export interface SwapRequestUpdate {
	status: SwapStatus;
	completion_date?: string | null;
}

export interface SwapCompletion {
	rating: number;
	feedback?: string | null;
}

export interface SwapRequestWithBook extends SwapRequest {
	book: {
		id: string;
		title: string;
		authors: string[];
		thumbnail_url: string | null;
		condition: string;
	};
	requester_profile: {
		username: string | null;
		full_name: string | null;
		avatar_url: string | null;
	};
	owner_profile: {
		username: string | null;
		full_name: string | null;
		avatar_url: string | null;
	};
}

export interface SwapRequestWithCompletion extends SwapRequestWithBook {
	completion_stats?: {
		total_completed: number;
		average_rating: number;
		completion_rate: number;
	};
}