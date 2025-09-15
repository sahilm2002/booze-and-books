import { json } from '@sveltejs/kit';
import { BookServiceServer } from '$lib/services/bookServiceServer';
import { validateBookInput } from '$lib/validation/book';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const userId = url.searchParams.get('userId') || locals.user.id;
		const includeOwner = url.searchParams.get('includeOwner') === 'true';
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		let books;
		if (includeOwner) {
			books = await BookServiceServer.getAllBooksWithOwners(locals.supabase, limit, offset);
		} else {
			books = await BookServiceServer.getUserBooks(locals.supabase, userId);
		}

		return json({ books });
	} catch (error) {
		console.error('Failed to fetch books:', error);
		return json({ error: 'Failed to fetch books' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const bookData = await request.json();
		
		// Validate using shared schema
		const validation = validateBookInput(bookData);
		if (!validation.success) {
			const firstError = Object.values(validation.errors)[0];
			return json({ error: firstError || 'Invalid book data' }, { status: 400 });
		}

		// Check for duplicate Google Books ID if provided
		if (validation.data.google_volume_id) {
			const isDuplicate = await BookServiceServer.checkDuplicateGoogleBook(
				locals.supabase,
				locals.user.id,
				validation.data.google_volume_id
			);
			if (isDuplicate) {
				return json({ error: 'You have already added this book to your collection' }, { status: 409 });
			}
		}

		const newBook = await BookServiceServer.createBook(locals.supabase, locals.user.id, validation.data);
		return json({ book: newBook }, { status: 201 });
	} catch (error) {
		console.error('Failed to create book:', error);
		
		// Handle specific database errors
		if (error instanceof Error) {
			if (error.message.includes('unique_user_google_book')) {
				return json({ error: 'You have already added this book to your collection' }, { status: 409 });
			}
		}
		
		return json({ error: 'Failed to create book' }, { status: 500 });
	}
};