// Rebuilt swap system types - matches database schema exactly
// Clean, comprehensive type definitions for the new swap system

import { BookCondition } from './book';

export enum SwapStatus {
	PENDING = 'PENDING',
	COUNTER_OFFER = 'COUNTER_OFFER',
	ACCEPTED = 'ACCEPTED',
	COMPLETED = 'COMPLETED',
	CANCELLED = 'CANCELLED'
}

// Core swap request interface matching database schema
export interface SwapRequest {
	id: string;
	
	// Core swap data
	book_id: string;
	offered_book_id: string;
	counter_offered_book_id: string | null;
	
	// Parties involved
	requester_id: string;
	owner_id: string;
	
	// Status and messaging
	status: SwapStatus;
	message: string | null;
	counter_offer_message: string | null;
	
	// Completion tracking
	completed_at: string | null;
	requester_completed_at: string | null;
	owner_completed_at: string | null;
	
	// Ratings and feedback
	requester_rating: number | null;
	owner_rating: number | null;
	requester_feedback: string | null;
	owner_feedback: string | null;
	
	// Audit trail
	cancelled_by: string | null;
	created_at: string;
	updated_at: string;
}

// Input for creating new swap requests
export interface SwapRequestInput {
	book_id: string;
	offered_book_id: string; // REQUIRED - user must offer their own book
	message?: string;
}

// Input for creating counter-offers
export interface CounterOfferInput {
	counter_offered_book_id: string;
	counter_offer_message?: string;
}

// Input for completing swaps
export interface SwapCompletion {
	rating: number; // 1-5 stars
	feedback?: string;
}

// Book information for swap displays
export interface SwapBookInfo {
	id: string;
	title: string;
	authors: string[] | string;
	google_volume_id: string | null;
	condition: BookCondition;
	owner_id: string;
}

// User profile information for swap displays
export interface SwapUserProfile {
	id: string;
	username: string | null;
	full_name: string | null;
	avatar_url: string | null;
	location: string | null;
	email?: string | null; // Email from auth.users
}

// Complete swap request with all related data
export interface SwapRequestWithDetails extends SwapRequest {
	book: SwapBookInfo;
	offered_book: SwapBookInfo;
	counter_offered_book: SwapBookInfo | null;
	requester_profile: SwapUserProfile;
	owner_profile: SwapUserProfile;
}

// Swap statistics for user profiles
export interface SwapStatistics {
	total_swaps: number;
	total_completed: number;
	completion_rate: number;
	average_rating: number;
}

// Validation and business logic functions

export function isValidRating(rating: number): boolean {
	return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

export function isSwapCompleted(swap: SwapRequest): boolean {
	return swap.completed_at !== null;
}

export function isPartiallyCompleted(swap: SwapRequest): boolean {
	const requesterCompleted = swap.requester_completed_at !== null;
	const ownerCompleted = swap.owner_completed_at !== null;
	return requesterCompleted !== ownerCompleted; // XOR - one but not both
}

export function isFullyCompleted(swap: SwapRequest): boolean {
	return swap.requester_completed_at !== null && swap.owner_completed_at !== null;
}

export function getPendingCompletionUser(swap: SwapRequest): string | null {
	if (swap.requester_completed_at && !swap.owner_completed_at) {
		return swap.owner_id;
	}
	if (swap.owner_completed_at && !swap.requester_completed_at) {
		return swap.requester_id;
	}
	return null;
}

// Status transition validation
export function canTransitionTo(currentStatus: SwapStatus, newStatus: SwapStatus): boolean {
	const validTransitions: Record<SwapStatus, SwapStatus[]> = {
		[SwapStatus.PENDING]: [SwapStatus.COUNTER_OFFER, SwapStatus.ACCEPTED, SwapStatus.CANCELLED],
		[SwapStatus.COUNTER_OFFER]: [SwapStatus.ACCEPTED, SwapStatus.CANCELLED],
		[SwapStatus.ACCEPTED]: [SwapStatus.COMPLETED, SwapStatus.CANCELLED],
		[SwapStatus.COMPLETED]: [], // Terminal state
		[SwapStatus.CANCELLED]: [] // Terminal state
	};
	
	return validTransitions[currentStatus].includes(newStatus);
}

// User permission checks
export function canUserCancelSwap(swap: SwapRequest, userId: string): boolean {
	return (
		swap.status !== SwapStatus.COMPLETED &&
		swap.status !== SwapStatus.CANCELLED &&
		(swap.requester_id === userId || swap.owner_id === userId)
	);
}

export function canUserAcceptSwap(swap: SwapRequest, userId: string): boolean {
	return swap.status === SwapStatus.PENDING && swap.owner_id === userId;
}

export function canUserCreateCounterOffer(swap: SwapRequest, userId: string): boolean {
	return swap.status === SwapStatus.PENDING && swap.owner_id === userId;
}

export function canUserAcceptCounterOffer(swap: SwapRequest, userId: string): boolean {
	return swap.status === SwapStatus.COUNTER_OFFER && swap.requester_id === userId;
}

export function canUserCompleteSwap(swap: SwapRequest, userId: string): boolean {
	if (swap.status !== SwapStatus.ACCEPTED || isSwapCompleted(swap)) {
		return false;
	}
	
	// Check if this user hasn't already completed their side
	if (userId === swap.requester_id) {
		return swap.requester_completed_at === null;
	}
	if (userId === swap.owner_id) {
		return swap.owner_completed_at === null;
	}
	
	return false;
}

// Display helpers
export function getSwapStatusDisplayName(status: SwapStatus): string {
	switch (status) {
		case SwapStatus.PENDING:
			return 'Pending';
		case SwapStatus.COUNTER_OFFER:
			return 'Counter Offer';
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
			return '#f59e0b'; // amber
		case SwapStatus.COUNTER_OFFER:
			return '#8b5cf6'; // violet
		case SwapStatus.ACCEPTED:
			return '#10b981'; // emerald
		case SwapStatus.COMPLETED:
			return '#3b82f6'; // blue
		case SwapStatus.CANCELLED:
			return '#ef4444'; // red
		default:
			return '#6b7280'; // gray
	}
}

// Get the books that will actually be exchanged
export function getExchangedBooks(swap: SwapRequest): {
	requesterGets: string;
	ownerGets: string;
} {
	if (swap.counter_offered_book_id && swap.status !== SwapStatus.PENDING) {
		// Counter-offer was made and potentially accepted
		return {
			requesterGets: swap.counter_offered_book_id,
			ownerGets: swap.offered_book_id
		};
	} else {
		// Original request
		return {
			requesterGets: swap.book_id,
			ownerGets: swap.offered_book_id
		};
	}
}

// Get user-friendly action labels
export function getAvailableActions(swap: SwapRequest, userId: string): string[] {
	const actions: string[] = [];
	
	if (canUserCancelSwap(swap, userId)) {
		actions.push('Cancel');
	}
	
	if (canUserAcceptSwap(swap, userId)) {
		actions.push('Accept');
	}
	
	if (canUserCreateCounterOffer(swap, userId)) {
		actions.push('Counter Offer');
	}
	
	if (canUserAcceptCounterOffer(swap, userId)) {
		actions.push('Accept Counter Offer');
	}
	
	if (canUserCompleteSwap(swap, userId)) {
		actions.push('Mark as Completed');
	}
	
	return actions;
}

// Get completion status message
export function getCompletionStatusMessage(swap: SwapRequest, currentUserId: string): string | null {
	if (swap.status !== SwapStatus.ACCEPTED) {
		return null;
	}
	
	const isRequester = currentUserId === swap.requester_id;
	const userCompleted = isRequester ? swap.requester_completed_at : swap.owner_completed_at;
	const otherCompleted = isRequester ? swap.owner_completed_at : swap.requester_completed_at;
	
	if (userCompleted && otherCompleted) {
		return 'Swap completed by both parties!';
	} else if (userCompleted && !otherCompleted) {
		return 'Waiting for the other party to mark as completed';
	} else if (!userCompleted && otherCompleted) {
		return 'The other party has marked as completed. Please confirm your completion.';
	} else {
		return 'Both parties need to mark the swap as completed';
	}
}

// Get detailed completion status with party names
export function getDetailedCompletionStatus(swap: SwapRequest, requesterProfile: any, ownerProfile: any): {
	requesterCompleted: boolean;
	ownerCompleted: boolean;
	requesterName: string;
	ownerName: string;
	message: string;
} {
	const requesterCompleted = swap.requester_completed_at !== null;
	const ownerCompleted = swap.owner_completed_at !== null;
	const requesterName = requesterProfile?.username || requesterProfile?.full_name || 'Requester';
	const ownerName = ownerProfile?.username || ownerProfile?.full_name || 'Owner';
	
	let message = '';
	if (requesterCompleted && ownerCompleted) {
		message = 'Swap completed by both parties!';
	} else if (requesterCompleted && !ownerCompleted) {
		message = `${requesterName} has completed. Waiting for ${ownerName}.`;
	} else if (!requesterCompleted && ownerCompleted) {
		message = `${ownerName} has completed. Waiting for ${requesterName}.`;
	} else {
		message = `Both ${requesterName} and ${ownerName} need to mark as completed.`;
	}
	
	return {
		requesterCompleted,
		ownerCompleted,
		requesterName,
		ownerName,
		message
	};
}
