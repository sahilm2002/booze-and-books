import { supabase } from '$lib/supabase';
import type { Notification, NotificationInput } from '../types/notification.js';
import { NotificationType } from '../types/notification.js';

const NOTIFICATION_RETENTION_DAYS = 180;

export class NotificationService {
	// Get notifications for a user (last 180 days only)
	static async getNotifications(userId: string, limit = 20, offset = 0): Promise<Notification[]> {
		const retentionDate = new Date();
		retentionDate.setDate(retentionDate.getDate() - NOTIFICATION_RETENTION_DAYS);

		const { data, error } = await supabase
			.from('notifications')
			.select('*')
			.eq('user_id', userId)
			.gte('created_at', retentionDate.toISOString())
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			throw new Error(`Failed to fetch notifications: ${error.message}`);
		}

		return data || [];
	}

	// Get unread notifications count (last 180 days only)
	static async getUnreadCount(userId: string): Promise<number> {
		const retentionDate = new Date();
		retentionDate.setDate(retentionDate.getDate() - NOTIFICATION_RETENTION_DAYS);

		const { count, error } = await supabase
			.from('notifications')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', userId)
			.eq('is_read', false)
			.gte('created_at', retentionDate.toISOString());

		if (error) {
			throw new Error(`Failed to count unread notifications: ${error.message}`);
		}

		return count || 0;
	}

	// Mark a notification as read
	static async markAsRead(notificationId: string): Promise<Notification> {
		// Ensure we have an authenticated session
		const { data: { session } } = await supabase.auth.getSession();
		if (!session) {
			throw new Error('User not authenticated');
		}

		const { data, error } = await supabase
			.from('notifications')
			.update({ is_read: true })
			.eq('id', notificationId)
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to mark notification as read: ${error.message}`);
		}

		return data;
	}

	// Mark all notifications as read for a user (last 180 days only)
	static async markAllAsRead(userId: string): Promise<void> {
		// Ensure we have an authenticated session
		const { data: { session } } = await supabase.auth.getSession();
		if (!session) {
			throw new Error('User not authenticated');
		}

		const retentionDate = new Date();
		retentionDate.setDate(retentionDate.getDate() - NOTIFICATION_RETENTION_DAYS);

		const { error } = await supabase
			.from('notifications')
			.update({ is_read: true })
			.eq('user_id', userId)
			.eq('is_read', false)
			.gte('created_at', retentionDate.toISOString());

		if (error) {
			throw new Error(`Failed to mark all notifications as read: ${error.message}`);
		}
	}

	// Delete a notification
	static async deleteNotification(notificationId: string): Promise<void> {
		const { error } = await supabase
			.from('notifications')
			.delete()
			.eq('id', notificationId);

		if (error) {
			throw new Error(`Failed to delete notification: ${error.message}`);
		}
	}

	// Create a notification (primarily for testing - production uses triggers)
	static async createNotification(input: NotificationInput): Promise<Notification> {
		const { data, error } = await supabase
			.from('notifications')
			.insert({
				user_id: input.user_id,
				type: input.type,
				title: input.title,
				message: input.message,
				data: input.data || {}
			})
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to create notification: ${error.message}`);
		}

		return data;
	}

	// Get recent notifications (last 7 days)
	static async getRecentNotifications(userId: string): Promise<Notification[]> {
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const { data, error } = await supabase
			.from('notifications')
			.select('*')
			.eq('user_id', userId)
			.gte('created_at', sevenDaysAgo.toISOString())
			.order('created_at', { ascending: false })
			.limit(10);

		if (error) {
			throw new Error(`Failed to fetch recent notifications: ${error.message}`);
		}

		return data || [];
	}

	// Get notification by ID
	static async getNotificationById(notificationId: string): Promise<Notification | null> {
		const { data, error } = await supabase
			.from('notifications')
			.select('*')
			.eq('id', notificationId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null;
			}
			throw new Error(`Failed to fetch notification: ${error.message}`);
		}

		return data;
	}

	// Send email notification for swap approval
	static async sendSwapApprovalNotification(
		swapRequestId: string,
		requesterEmail: string,
		ownerEmail: string,
		bookTitle: string
	): Promise<void> {
		try {
			// In a real application, this would trigger an email service
			// For now, we'll create in-app notifications and log the email intent
			
			console.log('Email notification would be sent:');
			console.log(`To requester (${requesterEmail}): Your swap request for "${bookTitle}" has been approved!`);
			console.log(`To owner (${ownerEmail}): You approved a swap request for "${bookTitle}". Contact the requester to coordinate the exchange.`);

			// Create in-app notifications as a fallback
			const { data: swapRequest } = await supabase
				.from('swap_requests')
				.select('requester_id, owner_id')
				.eq('id', swapRequestId)
				.single();

			if (swapRequest) {
				// Notify requester
				await this.createNotification({
					user_id: swapRequest.requester_id,
					type: NotificationType.SWAP_APPROVED,
					title: 'Swap Request Approved!',
					message: `Your swap request for "${bookTitle}" has been approved. Check your swaps page for contact information.`,
					data: { swap_request_id: swapRequestId }
				});

				// Notify owner  
				await this.createNotification({
					user_id: swapRequest.owner_id,
					type: NotificationType.SWAP_APPROVED,
					title: 'Swap Request Approved',
					message: `You approved a swap request for "${bookTitle}". The requester's contact information is now available.`,
					data: { swap_request_id: swapRequestId }
				});
			}

		} catch (error) {
			console.error('Failed to send swap approval notifications:', error);
			// Don't throw error - notifications are not critical
		}
	}

	// Send email notification for counter-offer
	static async sendCounterOfferNotification(
		swapRequestId: string,
		requesterEmail: string,
		bookTitle: string,
		counterOfferedBookTitle: string
	): Promise<void> {
		try {
			console.log('Email notification would be sent:');
			console.log(`To requester (${requesterEmail}): The owner made a counter-offer for your request of "${bookTitle}". They're offering "${counterOfferedBookTitle}" instead.`);

			// Create in-app notification
			const { data: swapRequest } = await supabase
				.from('swap_requests')
				.select('requester_id')
				.eq('id', swapRequestId)
				.single();

			if (swapRequest) {
				await this.createNotification({
					user_id: swapRequest.requester_id,
					type: NotificationType.COUNTER_OFFER_RECEIVED,
					title: 'Counter-Offer Received',
					message: `The owner made a counter-offer for "${bookTitle}". They're offering "${counterOfferedBookTitle}" instead. Check your swaps to respond.`,
					data: { swap_request_id: swapRequestId }
				});
			}

		} catch (error) {
			console.error('Failed to send counter-offer notifications:', error);
		}
	}

	// Daily reminder system methods
	static async sendDailyReminders(): Promise<void> {
		try {
			console.log('Starting daily reminder process...');
			
			// Get all users who have active swap requests
			const { data: activeUsers, error: usersError } = await supabase
				.from('swap_requests')
				.select('requester_id, owner_id')
				.in('status', ['PENDING', 'COUNTER_OFFER', 'ACCEPTED']);

			if (usersError) {
				console.error('Failed to fetch active users:', usersError);
				return;
			}

			// Get unique user IDs
			const userIds = new Set<string>();
			activeUsers?.forEach(swap => {
				userIds.add(swap.requester_id);
				userIds.add(swap.owner_id);
			});

			console.log(`Processing daily reminders for ${userIds.size} users`);

			// Send reminders to each user
			for (const userId of userIds) {
				await this.sendUserDailyReminder(userId);
			}

			console.log('Daily reminder process completed');
		} catch (error) {
			console.error('Failed to send daily reminders:', error);
		}
	}

	static async sendUserDailyReminder(userId: string): Promise<void> {
		try {
			// Check if user already received a reminder today
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			
			const { data: existingReminder } = await supabase
				.from('notifications')
				.select('id')
				.eq('user_id', userId)
				.in('type', [
					NotificationType.DAILY_REMINDER_PENDING_SWAPS,
					NotificationType.DAILY_REMINDER_COUNTER_OFFERS,
					NotificationType.DAILY_REMINDER_ACCEPTED_SWAPS
				])
				.gte('created_at', today.toISOString())
				.limit(1);

			if (existingReminder && existingReminder.length > 0) {
				console.log(`User ${userId} already received daily reminder today`);
				return;
			}

			// Get pending swap requests (as requester) with book and profile details
			const { data: pendingSwaps } = await supabase
				.from('swap_requests')
				.select(`
					id, 
					book_id,
					owner_id,
					book:books!swap_requests_book_id_fkey(title),
					owner_profile:profiles!swap_requests_owner_id_fkey(username, full_name, email)
				`)
				.eq('requester_id', userId)
				.eq('status', 'PENDING');

			// Get counter offers (as requester) with book and profile details
			const { data: counterOffers } = await supabase
				.from('swap_requests')
				.select(`
					id, 
					book_id,
					owner_id,
					book:books!swap_requests_book_id_fkey(title),
					owner_profile:profiles!swap_requests_owner_id_fkey(username, full_name, email)
				`)
				.eq('requester_id', userId)
				.eq('status', 'COUNTER_OFFER');

			// Get accepted swaps (as either party) that need completion with full details
			const { data: acceptedSwaps } = await supabase
				.from('swap_requests')
				.select(`
					id, 
					book_id,
					requester_id, 
					owner_id, 
					requester_completed_at, 
					owner_completed_at,
					book:books!swap_requests_book_id_fkey(title),
					requester_profile:profiles!swap_requests_requester_id_fkey(username, full_name, email),
					owner_profile:profiles!swap_requests_owner_id_fkey(username, full_name, email)
				`)
				.or(`requester_id.eq.${userId},owner_id.eq.${userId}`)
				.eq('status', 'ACCEPTED')
				.or('requester_completed_at.is.null,owner_completed_at.is.null');

			// Send appropriate reminders with detailed information
			if (pendingSwaps && pendingSwaps.length > 0) {
				const bookTitles = pendingSwaps.map(s => (s.book as any)?.title || 'Unknown Book').join(', ');
				const message = pendingSwaps.length === 1 
					? `Your swap request for "${(pendingSwaps[0].book as any)?.title || 'Unknown Book'}" is still pending. The owner hasn't responded yet.`
					: `You have ${pendingSwaps.length} pending swap requests (${bookTitles}) waiting for responses.`;

				await this.createDailyReminderNotification(
					userId,
					NotificationType.DAILY_REMINDER_PENDING_SWAPS,
					'Pending Swap Requests',
					message,
					{
						swap_count: pendingSwaps.length,
						swap_request_ids: pendingSwaps.map(s => s.id),
						reminder_type: 'pending_swaps'
					} as any
				);
			}

			if (counterOffers && counterOffers.length > 0) {
				const bookTitles = counterOffers.map(s => (s.book as any)?.title || 'Unknown Book').join(', ');
				const message = counterOffers.length === 1 
					? `You have a counter-offer for "${(counterOffers[0].book as any)?.title || 'Unknown Book'}" that needs your response.`
					: `You have ${counterOffers.length} counter offers (${bookTitles}) that need your response.`;

				await this.createDailyReminderNotification(
					userId,
					NotificationType.DAILY_REMINDER_COUNTER_OFFERS,
					'Counter Offers Awaiting Response',
					message,
					{
						swap_count: counterOffers.length,
						swap_request_ids: counterOffers.map(s => s.id),
						reminder_type: 'counter_offers'
					} as any
				);
			}

			if (acceptedSwaps && acceptedSwaps.length > 0) {
				const incompleteSwaps = acceptedSwaps.filter(swap => {
					if (swap.requester_id === userId) {
						return !swap.requester_completed_at;
					} else {
						return !swap.owner_completed_at;
					}
				});

				if (incompleteSwaps.length > 0) {
					// Create detailed message with book names and contact info
					const swapDetails = incompleteSwaps.map(swap => {
						const bookTitle = (swap.book as any)?.title || 'Unknown Book';
						const isRequester = swap.requester_id === userId;
						const otherUser = isRequester ? (swap.owner_profile as any) : (swap.requester_profile as any);
						const otherUserName = otherUser?.full_name || otherUser?.username || 'Unknown User';
						const otherUserEmail = otherUser?.email;
						
						return {
							bookTitle,
							otherUserName,
							otherUserEmail,
							swapId: swap.id
						};
					});

					let message: string;
					if (incompleteSwaps.length === 1) {
						const detail = swapDetails[0];
						message = `Your accepted swap for "${detail.bookTitle}" needs completion. `;
						if (detail.otherUserEmail) {
							message += `Contact ${detail.otherUserName} at ${detail.otherUserEmail} to coordinate the book exchange.`;
						} else {
							message += `Contact ${detail.otherUserName} to coordinate the book exchange.`;
						}
					} else {
						const bookTitles = swapDetails.map(d => d.bookTitle).join(', ');
						message = `You have ${incompleteSwaps.length} accepted swaps (${bookTitles}) that need completion. Check your swaps page for contact details.`;
					}

					await this.createDailyReminderNotification(
						userId,
						NotificationType.DAILY_REMINDER_ACCEPTED_SWAPS,
						'Accepted Swaps Need Completion',
						message,
						{
							swap_count: incompleteSwaps.length,
							swap_request_ids: incompleteSwaps.map(s => s.id),
							reminder_type: 'accepted_swaps'
						} as any
					);
				}
			}

		} catch (error) {
			console.error(`Failed to send daily reminder for user ${userId}:`, error);
		}
	}

	private static async createDailyReminderNotification(
		userId: string,
		type: NotificationType,
		title: string,
		message: string,
		data: { swap_count: number; swap_request_ids: string[]; reminder_type: 'pending_swaps' | 'counter_offers' | 'accepted_swaps' }
	): Promise<void> {
		await this.createNotification({
			user_id: userId,
			type,
			title,
			message,
			data
		});
	}

	// Get users who need daily reminders (have active swaps)
	static async getUsersNeedingReminders(): Promise<string[]> {
		try {
			const { data: activeSwaps, error } = await supabase
				.from('swap_requests')
				.select('requester_id, owner_id')
				.in('status', ['PENDING', 'COUNTER_OFFER', 'ACCEPTED']);

			if (error) {
				throw new Error(`Failed to fetch users needing reminders: ${error.message}`);
			}

			const userIds = new Set<string>();
			activeSwaps?.forEach(swap => {
				userIds.add(swap.requester_id);
				userIds.add(swap.owner_id);
			});

			return Array.from(userIds);
		} catch (error) {
			console.error('Failed to get users needing reminders:', error);
			return [];
		}
	}

	// Check if user has received reminder today
	static async hasReceivedReminderToday(userId: string): Promise<boolean> {
		try {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const { data, error } = await supabase
				.from('notifications')
				.select('id')
				.eq('user_id', userId)
				.in('type', [
					NotificationType.DAILY_REMINDER_PENDING_SWAPS,
					NotificationType.DAILY_REMINDER_COUNTER_OFFERS,
					NotificationType.DAILY_REMINDER_ACCEPTED_SWAPS
				])
				.gte('created_at', today.toISOString())
				.limit(1);

			if (error) {
				console.error('Failed to check daily reminder status:', error);
				return false;
			}

			return data && data.length > 0;
		} catch (error) {
			console.error('Failed to check daily reminder status:', error);
			return false;
		}
	}
}
