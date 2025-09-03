import { error } from '@sveltejs/kit';
import { BookServiceServer } from '$lib/services/bookServiceServer';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.supabase || !locals.session?.user) {
		throw error(401, 'Unauthorized');
	}

	const currentUserId = locals.session.user.id;
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
		throw error(500, 'Failed to load available books');
	}
};