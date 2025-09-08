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

	// Safely extract user ID - handle various formats
	let currentUserId: string;
	
	if (typeof user.id === 'string') {
		currentUserId = user.id;
	} else if (typeof user.id === 'object' && user.id !== null) {
		// Sometimes user.id might be an object with an id property
		currentUserId = (user.id as any).id || String(user.id);
	} else {
		currentUserId = String(user.id);
	}
	
	// Final validation
	if (!currentUserId || currentUserId === 'undefined' || currentUserId === 'null' || currentUserId === '[object Object]') {
		console.error('Invalid user ID format. User object:', JSON.stringify(user, null, 2));
		throw error(401, 'Invalid user session - unable to extract user ID');
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