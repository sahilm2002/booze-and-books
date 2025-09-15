import { z } from 'zod';

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
	
	offered_book_id: z.string()
		.uuid('Invalid offered book ID format')
		.min(1, 'Offered book ID is required'),
	
	message: z.preprocess(blankToNull, z.string()
		.max(1000, 'Message must be 1000 characters or less')
		.trim()
		.optional()
		.nullable())
});

// Validation schema for counter-offer input
export const counterOfferInputSchema = z.object({
	counter_offered_book_id: z.string()
		.uuid('Invalid counter-offered book ID format')
		.min(1, 'Counter-offered book ID is required'),
	
	counter_offer_message: z.preprocess(blankToNull, z.string()
		.max(1000, 'Counter-offer message must be 1000 characters or less')
		.trim()
		.optional()
		.nullable())
});

// Validation schema for swap request updates (status changes)
export const swapRequestUpdateSchema = z.object({
	status: z.enum(['PENDING', 'COUNTER_OFFER', 'ACCEPTED', 'COMPLETED', 'CANCELLED'], {
		message: 'Invalid status value'
	})
});

// Validation schema for swap completion input
export const swapCompletionSchema = z.object({
	rating: z.number()
		.int('Rating must be a whole number')
		.min(1, 'Rating must be at least 1')
		.max(5, 'Rating must be at most 5'),
	
	feedback: z.preprocess(blankToNull, z.string()
		.max(2000, 'Feedback must be 2000 characters or less')
		.trim()
		.optional()
		.nullable())
});

// Types derived from schemas
export type SwapRequestInputValidated = z.infer<typeof swapRequestInputSchema>;
export type SwapRequestUpdateValidated = z.infer<typeof swapRequestUpdateSchema>;
export type CounterOfferInputValidated = z.infer<typeof counterOfferInputSchema>;
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
		result.error.issues.forEach(issue => {
			const path = issue.path.join('.');
			errors[path] = issue.message;
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
		result.error.issues.forEach(issue => {
			const path = issue.path.join('.');
			errors[path] = issue.message;
		});
		
		return { 
			success: false as const, 
			data: null, 
			errors 
		};
	}
}

// Validation helper function for counter-offer input
export function validateCounterOfferInput(data: unknown) {
	const result = counterOfferInputSchema.safeParse(data);
	
	if (result.success) {
		return { 
			success: true as const, 
			data: result.data, 
			errors: {} 
		};
	} else {
		const errors: Record<string, string> = {};
		result.error.issues.forEach(issue => {
			const path = issue.path.join('.');
			errors[path] = issue.message;
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
		result.error.issues.forEach(issue => {
			const path = issue.path.join('.');
			errors[path] = issue.message;
		});
		
		return { 
			success: false as const, 
			data: null, 
			errors 
		};
	}
}

// Helper function to validate rating value
export function isValidRating(rating: number): boolean {
	return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

// Helper function to get rating display text
export function getRatingDisplayText(rating: number): string {
	const ratingTexts: Record<number, string> = {
		1: '1 Star - Terrible',
		2: '2 Stars - Poor',
		3: '3 Stars - Average',
		4: '4 Stars - Good',
		5: '5 Stars - Excellent'
	};
	return ratingTexts[rating] || `${rating} Stars`;
}

// Helper function to get all rating options for dropdowns
export function getRatingOptions() {
	return [
		{ value: 5, label: '5 Stars - Excellent' },
		{ value: 4, label: '4 Stars - Good' },
		{ value: 3, label: '3 Stars - Average' },
		{ value: 2, label: '2 Stars - Poor' },
		{ value: 1, label: '1 Star - Terrible' }
	];
}
