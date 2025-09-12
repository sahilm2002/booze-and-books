import { error } from '@sveltejs/kit';
import { BookServiceServer } from '$lib/services/bookServiceServer';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.supabase) {
		throw error(401, 'Unauthorized');
	}

	// Use the recommended getUser() method instead of session 
	const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
	
	if (userError || !user) {
		throw error(401, 'Unauthorized');
	}

	const currentUserId = user.id;
	if (!currentUserId?.trim()) {
		throw error(401, 'Invalid user session - missing user ID');
	}
	const limit = 50;
	const offset = 0;

	try {
		// Get available books for discovery (excluding current user's books)
		const availableBooks = await BookServiceServer.getAvailableBooksForDiscovery(
			locals.supabase,
			currentUserId,
			limit,
			offset
		);

		return {
			availableBooks
		};
	} catch (err) {
		console.error('Error loading discovery page:', err);
		
		// Always return empty array instead of throwing errors
		// This prevents 500 errors and allows the page to load gracefully
		console.warn('Database error occurred, returning empty books for graceful fallback');
		return {
			availableBooks: []
		};
	}
};