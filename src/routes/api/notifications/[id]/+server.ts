import { json, error } from '@sveltejs/kit';
import { NotificationServiceServer } from '$lib/services/notificationServiceServer';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, locals }) => {
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
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
		console.error('Error marking notification as read:', err);
		throw error(500, 'Failed to mark notification as read');
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
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
		console.error('Error deleting notification:', err);
		throw error(500, 'Failed to delete notification');
	}
};