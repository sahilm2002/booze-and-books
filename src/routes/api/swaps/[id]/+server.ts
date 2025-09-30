import { json, error } from '@sveltejs/kit';
import { SwapServiceServer } from '$lib/services/swapServiceServer';
import { validateSwapRequestUpdate, validateSwapCompletion } from '$lib/validation/swap';
import type { RequestHandler } from './$types';
import { EmailOrchestratorServer } from '$lib/services/emailOrchestratorServer';
import { SwapStatus } from '$lib/types/swap';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
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
		console.error('Error fetching swap request:', err);
		throw error(500, 'Failed to fetch swap request');
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
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
		return json(
			{
				message: 'Invalid request data',
				errors: validation.errors
			},
			{ status: 400 }
		);
	}

	try {
		const statusMap: Record<string, SwapStatus> = {
			PENDING: SwapStatus.PENDING,
			COUNTER_OFFER: SwapStatus.COUNTER_OFFER,
			ACCEPTED: SwapStatus.ACCEPTED,
			COMPLETED: SwapStatus.COMPLETED,
			CANCELLED: SwapStatus.CANCELLED
		};
		const newStatus = statusMap[validation.data.status as keyof typeof statusMap];

		const updatedRequest = await SwapServiceServer.updateSwapRequestStatus(
			locals.supabase,
			id,
			newStatus,
			userId
		);

		// Fire email notifications based on resulting status
		if (updatedRequest.status === 'ACCEPTED') {
			// trigger email notifications for approval
			await EmailOrchestratorServer.onSwapApproved(locals.supabase, id);
		} else if (updatedRequest.status === 'CANCELLED') {
			// trigger email notifications for cancellation
			await EmailOrchestratorServer.onSwapCancelled(locals.supabase, id);
		}

		return json(updatedRequest);
	} catch (err) {
		console.error('Error updating swap request:', err);
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
		
		throw error(500, message);
	}
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
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
		return json(
			{
				message: 'Invalid completion data',
				errors: validation.errors
			},
			{ status: 400 }
		);
	}

	try {
		const safeCompletion = {
			rating: validation.data.rating,
			feedback: validation.data.feedback ?? undefined
		};

		const completedRequest = await SwapServiceServer.markSwapAsCompleted(
			locals.supabase,
			id,
			userId,
			safeCompletion
		);

		// Swap marked as completed - notify both users
		await EmailOrchestratorServer.onSwapCompleted(locals.supabase, id);

		return json(completedRequest);
	} catch (err) {
		console.error('Error completing swap request:', err);
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
		
		throw error(500, message);
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
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

		// Notify requester about cancellation
		await EmailOrchestratorServer.onSwapCancelled(locals.supabase, id);

		return json({ success: true });
	} catch (err) {
		console.error('Error cancelling swap request:', err);
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
		
		throw error(500, message);
	}
};
