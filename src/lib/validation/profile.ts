import { z } from 'zod';

// Validation schema for profile updates
export const profileUpdateSchema = z.object({
	username: z.string()
		.min(3, 'Username must be at least 3 characters')
		.max(50, 'Username must be 50 characters or less')
		.regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and dashes')
		.optional(),
	
	full_name: z.string()
		.max(100, 'Full name must be 100 characters or less')
		.optional(),
	
	bio: z.string()
		.max(500, 'Bio must be 500 characters or less')
		.optional(),
	
	zip_code: z.string()
		.min(1, 'Zip code cannot be empty')
		.max(10, 'Zip code must be 10 characters or less')
		.regex(/^[0-9A-Za-z\s-]+$/, 'Please enter a valid zip code (letters, numbers, spaces, and dashes only)')
		.optional(),
	
	address_line1: z.string()
		.max(200, 'Address line 1 must be 200 characters or less')
		.optional(),
	
	address_line2: z.string()
		.max(200, 'Address line 2 must be 200 characters or less')
		.optional(),
	
	city: z.string()
		.max(100, 'City must be 100 characters or less')
		.optional(),
	
	state: z.string()
		.max(2, 'State must be 2 characters (e.g., CA, NY)')
		.optional(),
	
	avatar_url: z.string().url().optional()
});

// Type derived from schema
export type ProfileUpdateValidated = z.infer<typeof profileUpdateSchema>;

// Validation helper function
export function validateProfileUpdate(data: unknown) {
	const result = profileUpdateSchema.safeParse(data);
	
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

// Username validation schema for signup/registration
export const usernameSchema = z.string()
	.min(3, 'Username must be at least 3 characters')
	.max(50, 'Username must be 50 characters or less')
	.regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and dashes');

// Helper to sanitize email to valid username format
export function sanitizeEmailToUsername(email: string): string {
	// Extract local part before @ and sanitize it
	const localPart = email.split('@')[0];
	// Replace any non-allowed characters with underscores, then trim underscores from ends
	const sanitized = localPart.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '');
	return sanitized || 'user';
}