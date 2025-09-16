import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { NotificationServiceServer } from '$lib/services/notificationServiceServer';

export const POST: RequestHandler = async ({ locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		await NotificationServiceServer.markAllAsRead(supabase, session.user.id);

		return json({ success: true });
	} catch (error) {
		console.error('Error marking all notifications as read:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to mark all notifications as read' },
			{ status: 500 }
		);
	}
};
