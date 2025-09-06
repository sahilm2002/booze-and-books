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
		.nullable())
});

// Validation schema for swap request updates (status changes)
export const swapRequestUpdateSchema = z.object({
	status: z.nativeEnum(SwapStatus, {
		errorMap: () => ({ message: 'Invalid swap status' })
	}),
	completion_date: z.string().datetime().optional().nullable()
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

// Helper function to get status display name
export function getStatusDisplayName(status: SwapStatus): string {
	const displayNames: Record<SwapStatus, string> = {
		[SwapStatus.PENDING]: 'Pending',
		[SwapStatus.ACCEPTED]: 'Accepted',
		[SwapStatus.DECLINED]: 'Declined',
		[SwapStatus.CANCELLED]: 'Cancelled',
		[SwapStatus.COMPLETED]: 'Completed'
	};
	return displayNames[status];
}

// Helper function to get status color class for styling
export function getStatusColor(status: SwapStatus): string {
	const colors: Record<SwapStatus, string> = {
		[SwapStatus.PENDING]: 'text-yellow-600 bg-yellow-100',
		[SwapStatus.ACCEPTED]: 'text-green-600 bg-green-100',
		[SwapStatus.DECLINED]: 'text-red-600 bg-red-100',
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

// Helper function to check if user can complete swap
export function canCompleteSwap(status: SwapStatus, userId: string, requesterId: string, ownerId: string): boolean {
	return status === SwapStatus.ACCEPTED && (userId === requesterId || userId === ownerId);
}