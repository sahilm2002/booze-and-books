import { json } from '@sveltejs/kit';
import { NotificationService } from '$lib/services/notificationService.js';
import type { RequestHandler } from './$types.js';

// POST /api/notifications/daily-reminders
// Endpoint to trigger daily reminder notifications
// This should be called by a cron job or scheduler (e.g., daily at 9 AM)
export const POST: RequestHandler = async ({ request }) => {
	try {
		// Optional: Add authentication/authorization for security
		// In production, you might want to verify this is called by your scheduler
		const authHeader = request.headers.get('authorization');
		const expectedToken = process.env.DAILY_REMINDER_TOKEN || 'your-secret-token';
		
		if (authHeader !== `Bearer ${expectedToken}`) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		console.log('Starting daily reminder process via API...');
		
		// Send daily reminders to all users with active swaps
		await NotificationService.sendDailyReminders();
		
		// Get statistics for the response
		const usersNeedingReminders = await NotificationService.getUsersNeedingReminders();
		
		return json({
			success: true,
			message: 'Daily reminders sent successfully',
			stats: {
				total_users_with_active_swaps: usersNeedingReminders.length,
				timestamp: new Date().toISOString()
			}
		});

	} catch (error) {
		console.error('Failed to send daily reminders:', error);
		
		return json({
			success: false,
			error: 'Failed to send daily reminders',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};

// GET /api/notifications/daily-reminders
// Get information about users who need daily reminders (for monitoring)
export const GET: RequestHandler = async ({ request }) => {
	try {
		// Use Authorization header instead of query parameter for security
		const authHeader = request.headers.get('authorization');
		const expectedToken = process.env.DAILY_REMINDER_TOKEN || 'your-secret-token';
		
		if (authHeader !== `Bearer ${expectedToken}`) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const usersNeedingReminders = await NotificationService.getUsersNeedingReminders();
		
		return json({
			success: true,
			data: {
				total_users_with_active_swaps: usersNeedingReminders.length,
				user_ids: usersNeedingReminders,
				timestamp: new Date().toISOString()
			}
		});

	} catch (error) {
		console.error('Failed to get daily reminder stats:', error);
		
		return json({
			success: false,
			error: 'Failed to get daily reminder statistics',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};
