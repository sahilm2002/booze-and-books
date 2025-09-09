import { json } from '@sveltejs/kit';
import { BookServiceServer } from '$lib/services/bookServiceServer';
import { validateBookInput } from '$lib/validation/book';
import { createErrorResponse, ErrorTypes, createValidationError } from '$lib/utils/errorHandler';
import { applyRateLimit, addRateLimitHeaders, RateLimitConfigs } from '$lib/utils/rateLimiter';
import { logInfo, logError } from '$lib/utils/logger';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, request }) => {
	try {
		// Apply rate limiting
		const rateLimitResult = applyRateLimit(request, RateLimitConfigs.API_GENERAL);

		if (!locals.user) {
			throw ErrorTypes.UNAUTHORIZED();
		}

		const userId = url.searchParams.get('userId') || locals.user.id;
		const includeOwner = url.searchParams.get('includeOwner') === 'true';
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		logInfo('Fetching books', { userId, includeOwner, limit, offset });

		let books;
		if (includeOwner) {
			books = await BookServiceServer.getAllBooksWithOwners(locals.supabase, limit, offset);
		} else {
			books = await BookServiceServer.getUserBooks(locals.supabase, userId);
		}

		const response = json({ books, success: true });
		return addRateLimitHeaders(response, rateLimitResult.remaining, rateLimitResult.resetTime);
	} catch (error) {
		return createErrorResponse(error, 'Failed to fetch books', { endpoint: 'GET /api/books' });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Apply rate limiting for mutations
		const rateLimitResult = applyRateLimit(request, RateLimitConfigs.MUTATION);

		if (!locals.user) {
			throw ErrorTypes.UNAUTHORIZED();
		}

		const bookData = await request.json();
		
		// Validate using shared schema
		const validation = validateBookInput(bookData);
		if (!validation.success) {
			throw createValidationError(validation.errors);
		}

		logInfo('Creating new book', { userId: locals.user.id, title: validation.data.title });

		// Check for duplicate Google Books ID if provided
		if (validation.data.google_volume_id) {
			const isDuplicate = await BookServiceServer.checkDuplicateGoogleBook(
				locals.supabase,
				locals.user.id,
				validation.data.google_volume_id
			);
			if (isDuplicate) {
				throw ErrorTypes.CONFLICT('You have already added this book to your collection');
			}
		}

		const newBook = await BookServiceServer.createBook(locals.supabase, locals.user.id, validation.data);
		
		const response = json({ book: newBook, success: true }, { status: 201 });
		return addRateLimitHeaders(response, rateLimitResult.remaining, rateLimitResult.resetTime);
	} catch (error) {
		// Handle specific database errors
		if (error instanceof Error && error.message.includes('unique_user_google_book')) {
			return createErrorResponse(
				ErrorTypes.CONFLICT('You have already added this book to your collection'),
				'Failed to create book',
				{ endpoint: 'POST /api/books' }
			);
		}
		
		return createErrorResponse(error, 'Failed to create book', { endpoint: 'POST /api/books' });
	}
};
