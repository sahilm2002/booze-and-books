import type { SupabaseClient } from '@supabase/supabase-js';
import type { Notification, NotificationInput } from '../types/notification.js';
import { MessageType } from '../types/notification.js';

export class NotificationServiceServer {
	// Get notifications for a user
	static async getNotifications(
		supabase: SupabaseClient,
		userId: string, 
		limit = 20, 
		offset = 0
	): Promise<Notification[]> {
		// Return only UNREAD items for this user:
		// - System notifications (message_type=notification) by user_id
		// - Chat messages (message_type=chat_message) by recipient_id
		const [systemRes, chatRes] = await Promise.all([
			supabase
				.from('notifications')
				.select('*')
				.eq('user_id', userId)
				.eq('is_read', false)
				.eq('message_type', 'notification'),
			supabase
				.from('notifications')
				.select('*')
				.eq('recipient_id', userId)
				.eq('is_read', false)
				.eq('message_type', 'chat_message'),
		]);

		if (systemRes.error) {
			throw new Error(`Failed to fetch system notifications: ${systemRes.error.message}`);
		}
		if (chatRes.error) {
			throw new Error(`Failed to fetch chat notifications: ${chatRes.error.message}`);
		}

		const combined = [
			...(systemRes.data || []),
			...(chatRes.data || [])
		];

		// Sort by created_at desc and paginate
		combined.sort((a: any, b: any) => {
			const at = new Date(a.created_at).getTime();
			const bt = new Date(b.created_at).getTime();
			return bt - at;
		});
		return combined.slice(offset, offset + limit);
	}

	// Get unread system notifications count (excluding chat messages)
	static async getUnreadNotificationsCount(supabase: SupabaseClient, userId: string): Promise<number> {
		const { count, error } = await supabase
			.from('notifications')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', userId)
			.eq('is_read', false)
			.eq('message_type', 'notification');

		if (error) {
			throw new Error(`Failed to count unread notifications: ${error.message}`);
		}

		return count || 0;
	}

	// Get unread chat messages count
	static async getUnreadChatCount(supabase: SupabaseClient, userId: string): Promise<number> {
		const { count, error } = await supabase
			.from('notifications')
			.select('id', { count: 'exact', head: true })
			.eq('recipient_id', userId)
			.eq('is_read', false)
			.eq('message_type', 'chat_message');

		if (error) {
			throw new Error(`Failed to count unread chat messages: ${error.message}`);
		}

		return count || 0;
	}

	// Get combined unread count for notification bell
	static async getTotalUnreadCount(supabase: SupabaseClient, userId: string): Promise<number> {
		const [notificationCount, chatCount] = await Promise.all([
			this.getUnreadNotificationsCount(supabase, userId),
			this.getUnreadChatCount(supabase, userId)
		]);

		return notificationCount + chatCount;
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
			.eq('message_type', MessageType.NOTIFICATION);

		if (notificationError) {
			throw new Error(`Failed to mark notifications as read: ${notificationError.message}`);
		}

		// Mark chat messages as read (only where user is the recipient)
		const { error: chatError } = await supabase
			.from('notifications')
			.update({ is_read: true })
			.eq('recipient_id', userId)
			.eq('is_read', false)
			.eq('message_type', MessageType.CHAT_MESSAGE);

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
