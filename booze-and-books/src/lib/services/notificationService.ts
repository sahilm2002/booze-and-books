import { supabase } from '$lib/supabase';
import type { Notification, NotificationInput } from '../types/notification.js';

export class NotificationService {
	// Get notifications for a user
	static async getNotifications(userId: string, limit = 20, offset = 0): Promise<Notification[]> {
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

	// Get unread notifications count
	static async getUnreadCount(userId: string): Promise<number> {
		const { count, error } = await supabase
			.from('notifications')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', userId)
			.eq('is_read', false);

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

	// Mark all notifications as read for a user
	static async markAllAsRead(userId: string): Promise<void> {
		const { error } = await supabase
			.from('notifications')
			.update({ is_read: true })
			.eq('user_id', userId)
			.eq('is_read', false);

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
}