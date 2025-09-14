// Clean, bug-free swap system types
// Built from scratch with proper validation and clear state management

export enum SwapStatus {
	PENDING = 'PENDING',
	ACCEPTED = 'ACCEPTED',
	COUNTER_OFFER = 'COUNTER_OFFER',
	COMPLETED = 'COMPLETED',
	CANCELLED = 'CANCELLED'
}

export interface SwapRequest {
	id: string;
	book_id: string;
	requester_id: string;
	owner_id: string;
	status: SwapStatus;
	message: string | null;
	offered_book_id: string | null;
	counter_offered_book_id: string | null;
	created_at: string;
	updated_at: string;
	completed_at: string | null;
	cancelled_by: string | null;
	requester_rating: number | null;
	owner_rating: number | null;
	requester_feedback: string | null;
	owner_feedback: string | null;
}

export interface SwapRequestInput {
	book_id: string;
	message?: string;
	offered_book_id: string; // REQUIRED - user must offer their own book
}

export interface SwapCompletion {
	rating: number; // 1-5 stars
	feedback?: string;
}

export interface BookInfo {
	id: string;
	title: string;
	authors: string[];
	thumbnail_url: string | null;
	condition: string;
}

export interface UserProfile {
	username: string | null;
	full_name: string | null;
	avatar_url: string | null;
	email?: string | null; // Only available for accepted swaps
}

export interface SwapRequestWithDetails extends SwapRequest {
	book: BookInfo;
	offered_book: BookInfo | null;
	requester_profile: UserProfile;
	owner_profile: UserProfile;
}

export interface SwapStatistics {
	total_completed: number;
	average_rating: number;
	completion_rate: number;
	total_swaps: number;
}

// Validation helpers
export function isValidRating(rating: number): boolean {
	return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

export function canUserCancelSwap(swap: SwapRequest, userId: string): boolean {
	return (
		(swap.status === SwapStatus.PENDING || swap.status === SwapStatus.ACCEPTED) &&
		(swap.requester_id === userId || swap.owner_id === userId)
	);
}

export function canUserAcceptSwap(swap: SwapRequest, userId: string): boolean {
	return swap.status === SwapStatus.PENDING && swap.owner_id === userId;
}

export function canUserCompleteSwap(swap: SwapRequest, userId: string): boolean {
	return (
		swap.status === SwapStatus.ACCEPTED &&
		(swap.requester_id === userId || swap.owner_id === userId)
	);
}

export function getSwapStatusDisplayName(status: SwapStatus): string {
	switch (status) {
		case SwapStatus.PENDING:
			return 'Pending';
		case SwapStatus.ACCEPTED:
			return 'Accepted';
		case SwapStatus.COMPLETED:
			return 'Completed';
		case SwapStatus.CANCELLED:
			return 'Cancelled';
		default:
			return 'Unknown';
	}
}

export function getSwapStatusColor(status: SwapStatus): string {
	switch (status) {
		case SwapStatus.PENDING:
			return 'orange';
		case SwapStatus.ACCEPTED:
			return 'green';
		case SwapStatus.COMPLETED:
			return 'blue';
		case SwapStatus.CANCELLED:
			return 'red';
		default:
			return 'gray';
	}
}
