import { json, error } from '@sveltejs/kit';
import { SwapServiceServer } from '$lib/services/swapServiceServer';
import { validateSwapRequestInput } from '$lib/validation/swap';
import { logError } from '$lib/utils/logger';
import { createErrorResponse } from '$lib/utils/errorHandler';
import { applyRateLimit, RateLimitConfigs } from '$lib/utils/rateLimiter';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals, url }) => {
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
	}

	// Apply rate limiting
	try {
		applyRateLimit(request, RateLimitConfigs.API_GENERAL);
	} catch (rateLimitError) {
		throw error(429, 'Too many requests');
	}

	const userId = locals.session.user.id;

	try {
		const { incoming, outgoing } = await SwapServiceServer.getSwapRequestsForUser(
			locals.supabase,
			userId
		);

		return json({
			incoming,
			outgoing
		});
	} catch (err) {
		logError('Error fetching swap requests', err, { userId });
		return createErrorResponse(err, 'Failed to fetch swap requests', { userId });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
	}

	// Apply rate limiting
	try {
		applyRateLimit(request, RateLimitConfigs.MUTATION);
	} catch (rateLimitError) {
		throw error(429, 'Too many requests');
	}

	const userId = locals.session.user.id;
	let requestData;

	try {
		requestData = await request.json();
	} catch (err) {
		throw error(400, 'Invalid JSON');
	}

	// Validate request data
	const validation = validateSwapRequestInput(requestData);
	if (!validation.success) {
		const errorMessages = Object.values(validation.errors).join(', ');
		throw error(400, `Invalid request data: ${errorMessages}`);
	}

	try {
		const swapRequest = await SwapServiceServer.createSwapRequest(
			locals.supabase,
			validation.data,
			userId
		);

		return json(swapRequest, { status: 201 });
	} catch (err) {
		logError('Error creating swap request', err, { userId, requestData: validation.data });
		const message = err instanceof Error ? err.message : 'Failed to create swap request';
		
		if (message.includes('not available') || message.includes('own book')) {
			throw error(400, message);
		}
		
		return createErrorResponse(err, 'Failed to create swap request', { userId });
	}
};
