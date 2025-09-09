import { json, error } from '@sveltejs/kit';
import { NotificationServiceServer } from '$lib/services/notificationServiceServer';
import { logError } from '$lib/utils/logger';
import { createErrorResponse } from '$lib/utils/errorHandler';
import { applyRateLimit, RateLimitConfigs } from '$lib/utils/rateLimiter';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ request, params, locals }) => {
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
		throw error(400, 'Notification ID is required');
	}

	try {
		// First check if the notification exists and belongs to the user
		const notification = await NotificationServiceServer.getNotificationById(
			locals.supabase,
			id
		);
		
		if (!notification) {
			throw error(404, 'Notification not found');
		}

		// Verify ownership
		if (notification.user_id !== userId) {
			throw error(403, 'Access denied');
		}

		// Mark as read
		const updatedNotification = await NotificationServiceServer.markAsRead(
			locals.supabase,
			id
		);

		return json(updatedNotification);
	} catch (err) {
		if (err instanceof Response) {
			throw err;
		}
		logError('Error marking notification as read', err, { userId, notificationId: id });
		return createErrorResponse(err, 'Failed to mark notification as read', { userId });
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
		throw error(400, 'Notification ID is required');
	}

	try {
		// First check if the notification exists and belongs to the user
		const notification = await NotificationServiceServer.getNotificationById(
			locals.supabase,
			id
		);
		
		if (!notification) {
			throw error(404, 'Notification not found');
		}

		// Verify ownership
		if (notification.user_id !== userId) {
			throw error(403, 'Access denied');
		}

		// Delete the notification
		await NotificationServiceServer.deleteNotification(locals.supabase, id);

		return json({ success: true });
	} catch (err) {
		if (err instanceof Response) {
			throw err;
		}
		logError('Error deleting notification', err, { userId, notificationId: id });
		return createErrorResponse(err, 'Failed to delete notification', { userId });
	}
};
