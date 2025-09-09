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
	
	location: z.string()
		.max(100, 'Location must be 100 characters or less')
		.optional(),
	
	avatar_url: z.string().url().optional()
}).refine(data => {
	// At least username or full_name should be provided for meaningful profiles
	return data.username || data.full_name;
}, {
	message: "At least username or full name must be provided"
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
