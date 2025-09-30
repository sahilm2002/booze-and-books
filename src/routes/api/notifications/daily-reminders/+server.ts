import { json } from '@sveltejs/kit';
import { NotificationService } from '$lib/services/notificationService.js';
import type { RequestHandler } from './$types.js';
import { EmailService, type EmailRecipient, type SwapEmailPayload } from '$lib/services/emailService.js';

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
		
		// 1) In-app reminders (now every 4 days)
		await NotificationService.sendDailyReminders();

		// 2) Email reminders (also every 4 days) – respect preferences + dedupe
		const { supabase } = await import('$lib/supabase');
		const usersNeedingReminders = await NotificationService.getUsersNeedingReminders();

		const fourDaysAgoIso = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
		let totalEmailsConsidered = 0;
		let totalEmailsSent = 0;

		for (const userId of usersNeedingReminders) {
			// Load profile with prefs and email
			const { data: profile, error: profErr } = await supabase
				.from('profiles')
				.select('id, email, username, full_name, email_notifications')
				.eq('id', userId)
				.single();

			if (profErr || !profile?.email) {
				continue;
			}

			// Respect preferences (default opt-in if missing)
			const prefs = (profile as any).email_notifications || {};
			if (prefs.completion_reminders === false) {
				continue;
			}

			// Find accepted swaps where this user hasn't completed yet
			const { data: acceptedSwaps, error: accErr } = await supabase
				.from('swap_requests')
				.select(`
					id,
					book_id,
					requester_id,
					owner_id,
					requester_completed_at,
					owner_completed_at,
					book:books!swap_requests_book_id_fkey(title, authors),
					requester_profile:profiles!swap_requests_requester_id_fkey(id, email, username, full_name),
					owner_profile:profiles!swap_requests_owner_id_fkey(id, email, username, full_name)
				`)
				.or(`requester_id.eq.${userId},owner_id.eq.${userId}`)
				.eq('status', 'ACCEPTED')
				.or('requester_completed_at.is.null,owner_completed_at.is.null');

			if (accErr || !acceptedSwaps || acceptedSwaps.length === 0) {
				continue;
			}

			// Filter to swaps where this user has not completed yet
			const incompleteForUser = acceptedSwaps.filter((s: any) => {
				if (s.requester_id === userId) return !s.requester_completed_at;
				return !s.owner_completed_at;
			});

			for (const s of incompleteForUser as any[]) {
				totalEmailsConsidered++;

				// Dedupe using email_log, one email per swap per user in last 4 days
				const referenceId = `${s.id}:${userId}`;
				const { data: already, error: alreadyErr } = await supabase
					.from('email_log')
					.select('id')
					.eq('user_id', userId)
					.eq('email_type', 'completion_reminder')
					.eq('reference_id', referenceId)
					.gte('sent_at', fourDaysAgoIso)
					.limit(1);

				if (alreadyErr) {
					continue;
				}
				if (already && already.length > 0) {
					// Recently sent; skip
					continue;
				}

				// Profiles and book may be returned as single objects or arrays; normalize to single objects
				const requester_profile = Array.isArray(s.requester_profile) ? s.requester_profile[0] : s.requester_profile;
				const owner_profile = Array.isArray(s.owner_profile) ? s.owner_profile[0] : s.owner_profile;
				const book = Array.isArray(s.book) ? s.book[0] : s.book;

				// Build payload for EmailService.sendCompletionReminderEmail
				const requester: EmailRecipient = {
					id: requester_profile?.id,
					email: requester_profile?.email,
					username: requester_profile?.username,
					full_name: requester_profile?.full_name
				};
				const owner: EmailRecipient = {
					id: owner_profile?.id,
					email: owner_profile?.email,
					username: owner_profile?.username,
					full_name: owner_profile?.full_name
				};
				const payload: SwapEmailPayload = {
					swap_id: s.id,
					requester,
					owner,
					requested_book: {
						title: book?.title || 'Unknown',
						authors: book?.authors ?? null
					},
					offered_book: null,
					counter_offered_book: null,
					message: null
				};

				// Determine which recipient to notify (the one who hasn't completed)
				const toRecipient: EmailRecipient = s.requester_id === userId ? requester : owner;

				// Send the email
				try {
					await EmailService.sendCompletionReminderEmail(payload, toRecipient);
					totalEmailsSent++;
					// Log for dedupe
					await supabase.from('email_log').insert({
						user_id: userId,
						email_type: 'completion_reminder',
						reference_id: referenceId
					});
				} catch (e) {
					console.error('Failed to send completion reminder email:', e);
				}
			}
		}

		return json({
			success: true,
			message: 'Daily reminders (in-app + email) processed successfully',
			stats: {
				total_users_with_active_swaps: usersNeedingReminders.length,
				emails_considered: totalEmailsConsidered,
				emails_sent: totalEmailsSent,
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
