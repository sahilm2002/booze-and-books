import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { NotificationServiceServer } from '$lib/services/notificationServiceServer';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { notificationId } = await request.json();

		if (!notificationId) {
			return json({ error: 'Notification ID is required' }, { status: 400 });
		}

		const updatedNotification = await NotificationServiceServer.markAsRead(supabase, notificationId);

		return json({ success: true, notification: updatedNotification });
	} catch (error) {
		console.error('Error marking notification as read:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to mark notification as read' },
			{ status: 500 }
		);
	}
};
