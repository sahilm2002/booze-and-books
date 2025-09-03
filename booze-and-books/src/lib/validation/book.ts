import { z } from 'zod';
import { BookCondition } from '../types/book.js';

// ISBN validation regex (ISBN-10 and ISBN-13)
const isbnRegex = /^(?:(?:97[89])?[\d\s-]{10,17})$/;

// Helper to convert blank strings to null for optional fields
const blankToNull = (value: unknown) => {
	if (typeof value === 'string' && value.trim() === '') {
		return null;
	}
	return value;
};

// Validation schema for book input (creating new books)
export const bookInputSchema = z.object({
	title: z.string()
		.min(1, 'Title is required')
		.max(500, 'Title must be 500 characters or less')
		.trim(),
	
	authors: z.array(z.string().trim().min(1, 'Author name cannot be empty'))
		.min(1, 'At least one author is required')
		.max(10, 'Maximum 10 authors allowed'),
	
	isbn: z.preprocess(blankToNull, z.string()
		.regex(isbnRegex, 'Invalid ISBN format')
		.optional()
		.nullable()),
	
	condition: z.nativeEnum(BookCondition, {
		errorMap: () => ({ message: 'Invalid book condition' })
	}),
	
	genre: z.preprocess(blankToNull, z.string()
		.max(100, 'Genre must be 100 characters or less')
		.trim()
		.optional()
		.nullable()),
	
	description: z.preprocess(blankToNull, z.string()
		.max(2000, 'Description must be 2000 characters or less')
		.trim()
		.optional()
		.nullable()),
	
	thumbnail_url: z.preprocess(blankToNull, z.string()
		.url('Invalid thumbnail URL')
		.optional()
		.nullable()),
	
	google_volume_id: z.preprocess(blankToNull, z.string()
		.trim()
		.optional()
		.nullable()),
	
	is_available: z.boolean()
		.optional()
		.default(true)
});

// Validation schema for book updates (partial updates allowed)
export const bookUpdateSchema = z.object({
	title: z.string()
		.min(1, 'Title is required')
		.max(500, 'Title must be 500 characters or less')
		.trim()
		.optional(),
	
	authors: z.array(z.string().trim().min(1, 'Author name cannot be empty'))
		.min(1, 'At least one author is required')
		.max(10, 'Maximum 10 authors allowed')
		.optional(),
	
	isbn: z.preprocess(blankToNull, z.string()
		.regex(isbnRegex, 'Invalid ISBN format')
		.optional()
		.nullable()),
	
	condition: z.nativeEnum(BookCondition, {
		errorMap: () => ({ message: 'Invalid book condition' })
	}).optional(),
	
	genre: z.preprocess(blankToNull, z.string()
		.max(100, 'Genre must be 100 characters or less')
		.trim()
		.optional()
		.nullable()),
	
	description: z.preprocess(blankToNull, z.string()
		.max(2000, 'Description must be 2000 characters or less')
		.trim()
		.optional()
		.nullable()),
	
	thumbnail_url: z.preprocess(blankToNull, z.string()
		.url('Invalid thumbnail URL')
		.optional()
		.nullable()),
	
	is_available: z.boolean()
		.optional()
});

// Types derived from schemas
export type BookInputValidated = z.infer<typeof bookInputSchema>;
export type BookUpdateValidated = z.infer<typeof bookUpdateSchema>;

// Validation helper function for book input
export function validateBookInput(data: unknown) {
	const result = bookInputSchema.safeParse(data);
	
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

// Validation helper function for book updates
export function validateBookUpdate(data: unknown) {
	const result = bookUpdateSchema.safeParse(data);
	
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

// Helper function to format ISBN (remove spaces and hyphens)
export function formatIsbn(isbn: string): string {
	return isbn.replace(/[\s-]/g, '');
}

// Helper function to validate individual ISBN
export function isValidIsbn(isbn: string): boolean {
	const formatted = formatIsbn(isbn);
	return isbnRegex.test(formatted);
}

// Helper function to get condition display name
export function getConditionDisplayName(condition: BookCondition): string {
	const displayNames: Record<BookCondition, string> = {
		[BookCondition.AS_NEW]: 'As New',
		[BookCondition.FINE]: 'Fine',
		[BookCondition.VERY_GOOD]: 'Very Good',
		[BookCondition.GOOD]: 'Good',
		[BookCondition.FAIR]: 'Fair',
		[BookCondition.POOR]: 'Poor'
	};
	return displayNames[condition];
}

// Helper function to get all condition options for dropdowns
export function getConditionOptions() {
	return Object.values(BookCondition).map(condition => ({
		value: condition,
		label: getConditionDisplayName(condition)
	}));
}