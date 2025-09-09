import { json } from '@sveltejs/kit';
import { BookServiceServer } from '$lib/services/bookServiceServer';
import { validateBookUpdate } from '$lib/validation/book';
import { logError } from '$lib/utils/logger';
import { createErrorResponse } from '$lib/utils/errorHandler';
import { applyRateLimit, RateLimitConfigs } from '$lib/utils/rateLimiter';
import { sanitizeBookData } from '$lib/utils/sanitizer';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Apply rate limiting
	try {
		applyRateLimit(request, RateLimitConfigs.API_GENERAL);
	} catch (rateLimitError) {
		return json({ error: 'Too many requests' }, { status: 429 });
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
		logError('Failed to fetch book', error, { userId: locals.user.id, bookId: params.id });
		return createErrorResponse(error, 'Failed to fetch book', { userId: locals.user.id });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Apply rate limiting
	try {
		applyRateLimit(request, RateLimitConfigs.MUTATION);
	} catch (rateLimitError) {
		return json({ error: 'Too many requests' }, { status: 429 });
	}

	try {
		const bookId = params.id;
		if (!bookId) {
			return json({ error: 'Book ID is required' }, { status: 400 });
		}

		const updates = await request.json();
		
		// Sanitize input data
		const sanitizedUpdates = sanitizeBookData(updates);
		
		// Validate using shared schema
		const validation = validateBookUpdate(sanitizedUpdates);
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
		logError('Failed to update book', error, { userId: locals.user.id, bookId: params.id });
		
		if (error instanceof Error) {
			if (error.message === 'Book not found') {
				return json({ error: 'Book not found' }, { status: 404 });
			}
			if (error.message === 'You can only update your own books') {
				return json({ error: 'Forbidden' }, { status: 403 });
			}
		}
		
		return createErrorResponse(error, 'Failed to update book', { userId: locals.user.id });
	}
};

export const DELETE: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Apply rate limiting
	try {
		applyRateLimit(request, RateLimitConfigs.MUTATION);
	} catch (rateLimitError) {
		return json({ error: 'Too many requests' }, { status: 429 });
	}

	try {
		const bookId = params.id;
		if (!bookId) {
			return json({ error: 'Book ID is required' }, { status: 400 });
		}

		await BookServiceServer.deleteBook(locals.supabase, bookId, locals.user.id);
		
		return json({ success: true });
	} catch (error) {
		logError('Failed to delete book', error, { userId: locals.user.id, bookId: params.id });
		
		if (error instanceof Error) {
			if (error.message === 'Book not found') {
				return json({ error: 'Book not found' }, { status: 404 });
			}
			if (error.message === 'You can only delete your own books') {
				return json({ error: 'Forbidden' }, { status: 403 });
			}
		}
		
		return createErrorResponse(error, 'Failed to delete book', { userId: locals.user.id });
	}
};
