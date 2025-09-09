import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { BookServiceServer } from '$lib/services/bookServiceServer.js';
import { SwapServiceServer } from '$lib/services/swapServiceServer.js';
import type { BookWithOwner } from '$lib/types/book.js';

export const load: PageServerLoad = async ({ params, locals: { supabase, session } }) => {
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const bookId = params.id;

	try {
		// Get book details with owner information
		const book = await BookServiceServer.getBook(supabase, bookId);

		if (!book) {
			throw error(404, 'Book not found');
		}

		// Check if the current user is the owner
		const isOwner = book.owner_id === session.user.id;

		// Get owner's rating information if not the owner
		let ownerRating = null;
		if (!isOwner && book.owner_id) {
			try {
				ownerRating = await SwapServiceServer.getUserRating(supabase, book.owner_id);
			} catch (err) {
				console.error('Error fetching owner rating:', err);
				// Don't fail the page load if rating fetch fails
			}
		}

		// Check if user can request a swap (not owner, not already requested, book available)
		const canRequestSwap = !isOwner && book.is_available;

		return {
			book: book as BookWithOwner,
			ownerRating,
			canRequestSwap,
			isOwner
		};
	} catch (err) {
		console.error('Error loading book details:', err);
		
		if (err && typeof err === 'object' && 'message' in err) {
			const errorMessage = (err as Error).message;
			if (errorMessage.includes('not found') || errorMessage.includes('PGRST116')) {
				throw error(404, 'Book not found');
			}
		}

		throw error(500, 'Failed to load book details');
	}
};
