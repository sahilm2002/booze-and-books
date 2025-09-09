import { json, error } from '@sveltejs/kit';
import { NotificationServiceServer } from '$lib/services/notificationServiceServer';
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
	const limitParam = url.searchParams.get('limit');
	const offsetParam = url.searchParams.get('offset');
	
	const limit = limitParam ? parseInt(limitParam, 10) : 20;
	const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

	// Validate parameters
	if (limit < 1 || limit > 100) {
		throw error(400, 'Limit must be between 1 and 100');
	}
	if (offset < 0) {
		throw error(400, 'Offset must be non-negative');
	}

	try {
		const notifications = await NotificationServiceServer.getNotifications(
			locals.supabase,
			userId,
			limit,
			offset
		);

		const unreadCount = await NotificationServiceServer.getUnreadCount(
			locals.supabase,
			userId
		);

		return json({
			notifications,
			unreadCount,
			pagination: {
				limit,
				offset,
				hasMore: notifications.length === limit
			}
		});
	} catch (err) {
		logError('Error fetching notifications', err, { userId, limit, offset });
		return createErrorResponse(err, 'Failed to fetch notifications', { userId });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
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

	try {
		await NotificationServiceServer.markAllAsRead(locals.supabase, userId);
		
		return json({ success: true });
	} catch (err) {
		logError('Error marking all notifications as read', err, { userId });
		return createErrorResponse(err, 'Failed to mark notifications as read', { userId });
	}
};
