import { auth } from '$lib/stores/auth';
import { browser } from '$app/environment';

export type SupabaseError = {
	code?: string;
	message: string;
	details?: any;
	hint?: any;
};

export const EXPIRED_TOKEN_CODES = [
	'PGRST301', // JWT expired
	'PGRST300', // JWT invalid
	'42501',    // Insufficient privilege (can indicate expired token)
];

export function isExpiredTokenError(error: SupabaseError): boolean {
	if (!error.code) return false;
	return EXPIRED_TOKEN_CODES.includes(error.code) || 
		   error.message?.includes('JWT expired') ||
		   error.message?.includes('Invalid JWT');
}

export async function withValidSession<T>(
	operation: () => Promise<T>,
	retryOnce = true
): Promise<T> {
	if (!browser) {
		return operation();
	}

	try {
		// Ensure we have a valid session before proceeding
		const hasValidSession = await auth.ensureValidSession();
		if (!hasValidSession) {
			throw new Error('No valid session available');
		}

		return await operation();
	} catch (error: any) {
		// If it's an expired token error and we haven't retried yet, try once more
		if (retryOnce && isExpiredTokenError(error)) {
			console.log('Detected expired token error, retrying after session refresh');
			
			// Force a session refresh
			const hasValidSession = await auth.ensureValidSession();
			if (!hasValidSession) {
				throw new Error('Session expired and could not be refreshed');
			}

			// Retry the operation once
			return withValidSession(operation, false);
		}

		// If it's still a token error or other auth error, sign out
		if (isExpiredTokenError(error) || error.message?.includes('Session expired')) {
			console.error('Authentication error, signing out:', error);
			await auth.signOut();
			throw new Error('Your session has expired. Please log in again.');
		}

		throw error;
	}
}