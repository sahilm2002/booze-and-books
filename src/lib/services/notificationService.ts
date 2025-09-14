import { supabase } from '$lib/supabase';
import type { Notification, NotificationInput } from '../types/notification.js';
import { NotificationType } from '../types/notification.js';

export class NotificationService {
	// Get notifications for a user (last 180 days only)
	static async getNotifications(userId: string, limit = 20, offset = 0): Promise<Notification[]> {
		const oneHundredEightyDaysAgo = new Date();
		oneHundredEightyDaysAgo.setDate(oneHundredEightyDaysAgo.getDate() - 180);

		const { data, error } = await supabase
			.from('notifications')
			.select('*')
			.eq('user_id', userId)
			.gte('created_at', oneHundredEightyDaysAgo.toISOString())
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			throw new Error(`Failed to fetch notifications: ${error.message}`);
		}

		return data || [];
	}

	// Get unread notifications count (last 180 days only)
	static async getUnreadCount(userId: string): Promise<number> {
		const oneHundredEightyDaysAgo = new Date();
		oneHundredEightyDaysAgo.setDate(oneHundredEightyDaysAgo.getDate() - 180);

		const { count, error } = await supabase
			.from('notifications')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', userId)
			.eq('is_read', false)
			.gte('created_at', oneHundredEightyDaysAgo.toISOString());

		if (error) {
			throw new Error(`Failed to count unread notifications: ${error.message}`);
		}

		return count || 0;
	}

	// Mark a notification as read
	static async markAsRead(notificationId: string): Promise<Notification> {
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
		const oneHundredEightyDaysAgo = new Date();
		oneHundredEightyDaysAgo.setDate(oneHundredEightyDaysAgo.getDate() - 180);

		const { error } = await supabase
			.from('notifications')
			.update({ is_read: true })
			.eq('user_id', userId)
			.eq('is_read', false)
			.gte('created_at', oneHundredEightyDaysAgo.toISOString());

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
}
