import { json, error } from '@sveltejs/kit';
import { NotificationServiceServer } from '$lib/services/notificationServiceServer';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
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

  const unreadCount = await NotificationServiceServer.getUnreadChatCount(
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
		console.error('Error fetching notifications:', err);
		throw error(500, 'Failed to fetch notifications');
	}
};

export const PUT: RequestHandler = async ({ locals }) => {
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.session.user.id;

	try {
		await NotificationServiceServer.markAllAsRead(locals.supabase, userId);
		
		return json({ success: true });
	} catch (err) {
		console.error('Error marking all notifications as read:', err);
		throw error(500, 'Failed to mark notifications as read');
	}
};