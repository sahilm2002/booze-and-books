import { json, error } from '@sveltejs/kit';
import { SwapServiceServer } from '$lib/services/swapServiceServer';
import { z } from 'zod';
import { logError } from '$lib/utils/logger';
import { createErrorResponse } from '$lib/utils/errorHandler';
import { applyRateLimit, RateLimitConfigs } from '$lib/utils/rateLimiter';
import type { RequestHandler } from './$types';

// Validation schema for counter-offer
const counterOfferSchema = z.object({
	counter_offered_book_id: z.string()
		.uuid('Invalid book ID format')
		.min(1, 'Counter offered book ID is required')
});

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
	}

	// Apply rate limiting
	try {
		applyRateLimit(request, RateLimitConfigs.MUTATION);
	} catch (rateLimitError) {
		throw error(429, 'Too many requests');
	}

	const { id } = params;
	const userId = locals.session.user.id;

	if (!id) {
		throw error(400, 'Swap request ID is required');
	}

	let requestData;

	try {
		requestData = await request.json();
	} catch (err) {
		throw error(400, 'Invalid JSON');
	}

	// Validate request data
	const validation = counterOfferSchema.safeParse(requestData);
	if (!validation.success) {
		const errors: Record<string, string> = {};
		validation.error.issues.forEach(issue => {
			const path = issue.path.join('.');
			errors[path] = issue.message;
		});
		
		throw error(400, `Invalid request data: ${Object.values(errors).join(', ')}`);
	}

	try {
		const updatedRequest = await SwapServiceServer.makeCounterOffer(
			locals.supabase,
			id,
			userId,
			validation.data.counter_offered_book_id
		);

		return json(updatedRequest);
	} catch (err) {
		logError('Error making counter-offer', err, { 
			userId, 
			swapId: id, 
			counterOfferedBookId: validation.data.counter_offered_book_id 
		});
		const message = err instanceof Error ? err.message : 'Failed to make counter-offer';
		
		if (message.includes('not found')) {
			throw error(404, message);
		}
		if (message.includes('permission') || message.includes('only') || message.includes('owner')) {
			throw error(403, message);
		}
		if (message.includes('pending') || message.includes('status')) {
			throw error(400, message);
		}
		
		return createErrorResponse(err, 'Failed to make counter-offer', { userId });
	}
};
