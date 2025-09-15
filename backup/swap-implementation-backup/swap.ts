import { z } from 'zod';
import { SwapStatus } from '../types/swap.js';

// Helper to convert blank strings to null for optional fields
const blankToNull = (value: unknown) => {
	if (typeof value === 'string' && value.trim() === '') {
		return null;
	}
	return value;
};

// Validation schema for swap request input (creating new swap requests)
export const swapRequestInputSchema = z.object({
	book_id: z.string()
		.uuid('Invalid book ID format')
		.min(1, 'Book ID is required'),
	
	message: z.preprocess(blankToNull, z.string()
		.max(500, 'Message must be 500 characters or less')
		.trim()
		.optional()
		.nullable()),
	
	offered_book_id: z.string()
		.uuid('Invalid offered book ID format')
		.optional()
		.nullable()
});

// Validation schema for swap request updates (status changes)
export const swapRequestUpdateSchema = z.object({
	status: z.nativeEnum(SwapStatus, {
		errorMap: () => ({ message: 'Invalid swap status' })
	}),
	completion_date: z.string().datetime().optional().nullable(),
	counter_offered_book_id: z.string()
		.uuid('Invalid counter-offered book ID format')
		.optional()
		.nullable()
});

// Validation schema for swap completion (rating and feedback)
export const swapCompletionSchema = z.object({
	rating: z.number()
		.int('Rating must be a whole number')
		.min(1, 'Rating must be at least 1 star')
		.max(5, 'Rating cannot exceed 5 stars'),
	
	feedback: z.preprocess(blankToNull, z.string()
		.max(1000, 'Feedback must be 1000 characters or less')
		.trim()
		.optional()
		.nullable())
});

// Types derived from schemas
export type SwapRequestInputValidated = z.infer<typeof swapRequestInputSchema>;
export type SwapRequestUpdateValidated = z.infer<typeof swapRequestUpdateSchema>;
export type SwapCompletionValidated = z.infer<typeof swapCompletionSchema>;

// Validation helper function for swap request input
export function validateSwapRequestInput(data: unknown) {
	const result = swapRequestInputSchema.safeParse(data);
	
	if (result.success) {
		return { 
			success: true as const, 
			data: result.data, 
			errors: {} 
		};
	} else {
		const errors: Record<string, string> = {};
		result.error.errors.forEach(error => {
			const path = error.path.join('.');
			errors[path] = error.message;
		});
		
		return { 
			success: false as const, 
			data: null, 
			errors 
		};
	}
}

// Validation helper function for swap request updates
export function validateSwapRequestUpdate(data: unknown) {
	const result = swapRequestUpdateSchema.safeParse(data);
	
	if (result.success) {
		return { 
			success: true as const, 
			data: result.data, 
			errors: {} 
		};
	} else {
		const errors: Record<string, string> = {};
		result.error.errors.forEach(error => {
			const path = error.path.join('.');
			errors[path] = error.message;
		});
		
		return { 
			success: false as const, 
			data: null, 
			errors 
		};
	}
}

// Validation helper function for swap completion
export function validateSwapCompletion(data: unknown) {
	const result = swapCompletionSchema.safeParse(data);
	
	if (result.success) {
		return { 
			success: true as const, 
			data: result.data, 
			errors: {} 
		};
	} else {
		const errors: Record<string, string> = {};
		result.error.errors.forEach(error => {
			const path = error.path.join('.');
			errors[path] = error.message;
		});
		
		return { 
			success: false as const, 
			data: null, 
			errors 
		};
	}
}

// Helper function to validate completion workflow
export function validateCompletionWorkflow(status: SwapStatus, currentStatus: SwapStatus): boolean {
	if (status === SwapStatus.COMPLETED) {
		return currentStatus === SwapStatus.ACCEPTED;
	}
	return true;
}

/**
 * Returns a human-readable display name for the given swap status.
 *
 * Maps SwapStatus values to concise labels used in the UI (e.g. `PENDING` -> "Pending").
 *
 * @param status - The SwapStatus value to convert to a display string.
 * @returns The display name for `status`.
 */
export function getStatusDisplayName(status: SwapStatus): string {
	const displayNames: Record<SwapStatus, string> = {
		[SwapStatus.PENDING]: 'Pending',
		[SwapStatus.ACCEPTED]: 'Accepted',
		[SwapStatus.COUNTER_OFFER]: 'Counter Offer',
		[SwapStatus.CANCELLED]: 'Cancelled',
		[SwapStatus.COMPLETED]: 'Completed'
	};
	return displayNames[status];
}

/**
 * Returns the CSS class string used to style a status badge for the given swap status.
 *
 * Maps each SwapStatus to a short Tailwind-style class pair (text color + background) suitable for badges.
 *
 * @param status - The swap status to map to a color class
 * @returns A space-separated CSS class string (e.g., `"text-green-600 bg-green-100"`)
 */
export function getStatusColor(status: SwapStatus): string {
	const colors: Record<SwapStatus, string> = {
		[SwapStatus.PENDING]: 'text-yellow-600 bg-yellow-100',
		[SwapStatus.ACCEPTED]: 'text-green-600 bg-green-100',
		[SwapStatus.COUNTER_OFFER]: 'text-purple-600 bg-purple-100',
		[SwapStatus.CANCELLED]: 'text-gray-600 bg-gray-100',
		[SwapStatus.COMPLETED]: 'text-blue-600 bg-blue-100'
	};
	return colors[status];
}

// Helper function to get rating display (stars)
export function formatRating(rating: number | null): string {
	if (rating === null) return 'Not rated';
	return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

/**
 * Returns whether the given user may mark an accepted swap as completed.
 *
 * Allowed only when `status` is `ACCEPTED` and `userId` matches either the `requesterId` or the `ownerId`.
 *
 * @param status - Current swap status.
 * @param userId - ID of the user attempting to complete the swap.
 * @param requesterId - ID of the swap requester.
 * @param ownerId - ID of the book owner.
 * @returns True if the user is permitted to complete the swap; otherwise false.
 */
export function canCompleteSwap(status: SwapStatus, userId: string, requesterId: string, ownerId: string): boolean {
	return status === SwapStatus.ACCEPTED && (userId === requesterId || userId === ownerId);
}

/**
 * Returns whether the given user is allowed to make a counter-offer for a swap.
 *
 * The action is allowed only when the swap is in PENDING state and the acting user is the owner.
 *
 * @param status - Current swap status
 * @param userId - ID of the acting user
 * @param ownerId - ID of the book owner for the swap
 * @returns True if the user can make a counter-offer, otherwise false
 */
export function canMakeCounterOffer(status: SwapStatus, userId: string, ownerId: string): boolean {
	return status === SwapStatus.PENDING && userId === ownerId;
}

/**
 * Returns whether the given user is allowed to accept a counter-offer.
 *
 * Allowed only when the swap is in COUNTER_OFFER status and the user is the original requester.
 *
 * @param status - Current swap status
 * @param userId - ID of the user attempting the action
 * @param requesterId - ID of the swap requester (the only user allowed to accept a counter-offer)
 * @returns True if the user may accept the counter-offer; otherwise false
 */
export function canAcceptCounterOffer(status: SwapStatus, userId: string, requesterId: string): boolean {
	return status === SwapStatus.COUNTER_OFFER && userId === requesterId;
}

/**
 * Returns whether a user is allowed to cancel a swap.
 *
 * Cancellation is permitted only when the swap status is PENDING or COUNTER_OFFER,
 * and the acting user is either the requester or the owner.
 *
 * @param status - Current swap status
 * @param userId - ID of the user attempting the action
 * @param requesterId - ID of the user who created the swap request
 * @param ownerId - ID of the owner of the offered/target book
 * @returns `true` if the user may cancel the swap; otherwise `false`
 */
export function canCancelSwap(status: SwapStatus, userId: string, requesterId: string, ownerId: string): boolean {
	return (status === SwapStatus.PENDING || status === SwapStatus.COUNTER_OFFER) && 
		   (userId === requesterId || userId === ownerId);
}

/**
 * Validates whether a transition to a counter-offer is allowed.
 *
 * Returns true for all status changes except when attempting to set the status to `COUNTER_OFFER`.
 * In that case the transition is allowed only if the current status is `PENDING` and the acting user
 * is the owner.
 *
 * @param status - Desired target status for the swap
 * @param currentStatus - Current status of the swap
 * @param userId - ID of the user performing the action
 * @param ownerId - ID of the swap owner
 * @returns `true` if the requested workflow transition is permitted, otherwise `false`
 */
export function validateCounterOfferWorkflow(status: SwapStatus, currentStatus: SwapStatus, userId: string, ownerId: string): boolean {
	if (status === SwapStatus.COUNTER_OFFER) {
		return currentStatus === SwapStatus.PENDING && userId === ownerId;
	}
	return true;
}