import type { SupabaseClient } from '@supabase/supabase-js';
import type { Notification, NotificationInput } from '../types/notification.js';

export class NotificationServiceServer {
	// Get notifications for a user
	static async getNotifications(
		supabase: SupabaseClient,
		userId: string, 
		limit = 20, 
		offset = 0
	): Promise<Notification[]> {
		const { data, error } = await supabase
			.from('notifications')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			throw new Error(`Failed to fetch notifications: ${error.message}`);
		}

		return data || [];
	}

	// Get unread notifications and chat messages count
	static async getUnreadCount(supabase: SupabaseClient, userId: string): Promise<number> {
		// Count unread traditional notifications
		const { count: notificationCount, error: notificationError } = await supabase
			.from('notifications')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', userId)
			.eq('is_read', false)
			.eq('message_type', 'notification');

		if (notificationError) {
			throw new Error(`Failed to count unread notifications: ${notificationError.message}`);
		}

		// Count unread chat messages (where user is recipient)
		const { count: chatCount, error: chatError } = await supabase
			.from('notifications')
			.select('id', { count: 'exact', head: true })
			.eq('recipient_id', userId)
			.eq('is_read', false)
			.eq('message_type', 'chat_message');

		if (chatError) {
			throw new Error(`Failed to count unread chat messages: ${chatError.message}`);
		}

		return (notificationCount || 0) + (chatCount || 0);
	}

	// Mark a notification or chat message as read
	static async markAsRead(
		supabase: SupabaseClient,
		notificationId: string
	): Promise<Notification> {
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

	// Mark all notifications and chat messages as read for a user
	static async markAllAsRead(supabase: SupabaseClient, userId: string): Promise<void> {
		// Mark traditional notifications as read
		const { error: notificationError } = await supabase
			.from('notifications')
			.update({ is_read: true })
			.eq('user_id', userId)
			.eq('is_read', false)
			.eq('message_type', 'notification');

		if (notificationError) {
			throw new Error(`Failed to mark notifications as read: ${notificationError.message}`);
		}

		// Mark chat messages as read (only where user is the recipient)
		const { error: chatError } = await supabase
			.from('notifications')
			.update({ is_read: true })
			.eq('recipient_id', userId)
			.eq('is_read', false)
			.eq('message_type', 'chat_message');

		if (chatError) {
			throw new Error(`Failed to mark chat messages as read: ${chatError.message}`);
		}
	}

	// Delete a notification
	static async deleteNotification(
		supabase: SupabaseClient,
		notificationId: string
	): Promise<void> {
		const { error } = await supabase
			.from('notifications')
			.delete()
			.eq('id', notificationId);

		if (error) {
			throw new Error(`Failed to delete notification: ${error.message}`);
		}
	}

	// Create a notification (primarily for testing - production uses triggers)
	static async createNotification(
		supabase: SupabaseClient,
		input: NotificationInput
	): Promise<Notification> {
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
	static async getRecentNotifications(
		supabase: SupabaseClient,
		userId: string
	): Promise<Notification[]> {
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
	static async getNotificationById(
		supabase: SupabaseClient,
		notificationId: string
	): Promise<Notification | null> {
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
}
