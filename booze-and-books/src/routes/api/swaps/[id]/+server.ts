import { json, error } from '@sveltejs/kit';
import { SwapServiceServer } from '$lib/services/swapServiceServer';
import { validateSwapRequestUpdate, validateSwapCompletion } from '$lib/validation/swap';
import { SwapStatus } from '$lib/types/swap';
import { logError } from '$lib/utils/logger';
import { createErrorResponse } from '$lib/utils/errorHandler';
import { applyRateLimit, RateLimitConfigs } from '$lib/utils/rateLimiter';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
	}

	// Apply rate limiting
	try {
		applyRateLimit(request, RateLimitConfigs.API_GENERAL);
	} catch (rateLimitError) {
		throw error(429, 'Too many requests');
	}

	const { id } = params;
	const userId = locals.session.user.id;

	if (!id) {
		throw error(400, 'Swap request ID is required');
	}

	try {
		const swapRequest = await SwapServiceServer.getSwapRequestById(locals.supabase, id);
		
		if (!swapRequest) {
			throw error(404, 'Swap request not found');
		}

		// Verify user has access to this swap request
		if (swapRequest.requester_id !== userId && swapRequest.owner_id !== userId) {
			throw error(403, 'Access denied');
		}

		return json(swapRequest);
	} catch (err) {
		if (err instanceof Response) {
			throw err;
		}
		logError('Error fetching swap request', err, { userId, swapId: id });
		return createErrorResponse(err, 'Failed to fetch swap request', { userId });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
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
	const validation = validateSwapRequestUpdate(requestData);
	if (!validation.success) {
		const errorMessages = Object.values(validation.errors).join(', ');
		throw error(400, `Invalid request data: ${errorMessages}`);
	}

	try {
		const updatedRequest = await SwapServiceServer.updateSwapRequestStatus(
			locals.supabase,
			id,
			validation.data.status,
			userId
		);

		return json(updatedRequest);
	} catch (err) {
		logError('Error updating swap request', err, { userId, swapId: id, status: validation.data.status });
		const message = err instanceof Error ? err.message : 'Failed to update swap request';
		
		if (message.includes('not found')) {
			throw error(404, message);
		}
		if (message.includes('permission') || message.includes('only')) {
			throw error(403, message);
		}
		if (message.includes('pending')) {
			throw error(400, message);
		}
		
		return createErrorResponse(err, 'Failed to update swap request', { userId });
	}
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
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

	// Validate completion data
	const validation = validateSwapCompletion(requestData);
	if (!validation.success) {
		const errorMessages = Object.values(validation.errors).join(', ');
		throw error(400, `Invalid completion data: ${errorMessages}`);
	}

	try {
		const completedRequest = await SwapServiceServer.markSwapAsCompleted(
			locals.supabase,
			id,
			userId,
			validation.data
		);

		return json(completedRequest);
	} catch (err) {
		logError('Error completing swap request', err, { userId, swapId: id, completionData: validation.data });
		const message = err instanceof Error ? err.message : 'Failed to complete swap request';
		
		if (message.includes('not found')) {
			throw error(404, message);
		}
		if (message.includes('permission') || message.includes('only')) {
			throw error(403, message);
		}
		if (message.includes('accepted')) {
			throw error(400, message);
		}
		
		return createErrorResponse(err, 'Failed to complete swap request', { userId });
	}
};

export const DELETE: RequestHandler = async ({ request, params, locals }) => {
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

	try {
		// Cancel the swap request (only requester can do this)
		await SwapServiceServer.updateSwapRequestStatus(
			locals.supabase,
			id,
			SwapStatus.CANCELLED,
			userId
		);

		return json({ success: true });
	} catch (err) {
		logError('Error cancelling swap request', err, { userId, swapId: id });
		const message = err instanceof Error ? err.message : 'Failed to cancel swap request';
		
		if (message.includes('not found')) {
			throw error(404, message);
		}
		if (message.includes('permission') || message.includes('requester')) {
			throw error(403, message);
		}
		if (message.includes('pending')) {
			throw error(400, message);
		}
		
		return createErrorResponse(err, 'Failed to cancel swap request', { userId });
	}
};
