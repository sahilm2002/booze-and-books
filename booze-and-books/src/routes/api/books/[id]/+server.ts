import { json } from '@sveltejs/kit';
import { BookServiceServer } from '$lib/services/bookServiceServer';
import { validateBookUpdate } from '$lib/validation/book';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const bookId = params.id;
		if (!bookId) {
			return json({ error: 'Book ID is required' }, { status: 400 });
		}

		const book = await BookServiceServer.getBook(locals.supabase, bookId);
		if (!book) {
			return json({ error: 'Book not found' }, { status: 404 });
		}

		return json({ book });
	} catch (error) {
		console.error('Failed to fetch book:', error);
		return json({ error: 'Failed to fetch book' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const bookId = params.id;
		if (!bookId) {
			return json({ error: 'Book ID is required' }, { status: 400 });
		}

		const updates = await request.json();
		
		// Validate using shared schema
		const validation = validateBookUpdate(updates);
		if (!validation.success) {
			const firstError = Object.values(validation.errors)[0];
			return json({ error: firstError || 'Invalid book data' }, { status: 400 });
		}

		const updatedBook = await BookServiceServer.updateBook(
			locals.supabase,
			bookId,
			validation.data,
			locals.user.id
		);
		
		return json({ book: updatedBook });
	} catch (error) {
		console.error('Failed to update book:', error);
		
		if (error instanceof Error) {
			if (error.message === 'Book not found') {
				return json({ error: 'Book not found' }, { status: 404 });
			}
			if (error.message === 'You can only update your own books') {
				return json({ error: 'Forbidden' }, { status: 403 });
			}
		}
		
		return json({ error: 'Failed to update book' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const bookId = params.id;
		if (!bookId) {
			return json({ error: 'Book ID is required' }, { status: 400 });
		}

		await BookServiceServer.deleteBook(locals.supabase, bookId, locals.user.id);
		
		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete book:', error);
		
		if (error instanceof Error) {
			if (error.message === 'Book not found') {
				return json({ error: 'Book not found' }, { status: 404 });
			}
			if (error.message === 'You can only delete your own books') {
				return json({ error: 'Forbidden' }, { status: 403 });
			}
		}
		
		return json({ error: 'Failed to delete book' }, { status: 500 });
	}
};