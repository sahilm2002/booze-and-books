import { writable, derived, get } from 'svelte/store';
import { NotificationService } from '../services/notificationService.js';
import { realtimeService } from '../services/realtimeService.js';
import { auth } from './auth.js';
import type { Notification } from '../types/notification.js';
import type { RealtimeChangeEvent } from '../services/realtimeService.js';

// Writable stores
export const notifications = writable<Notification[]>([]);
export const notificationsLoading = writable<boolean>(false);
export const notificationsError = writable<string | null>(null);

// Derived stores
export const unreadCount = derived(
	notifications,
	($notifications) => $notifications.filter(n => !n.is_read).length
);

export const unreadNotifications = derived(
	notifications,
	($notifications) => $notifications.filter(n => !n.is_read)
);

export const recentNotifications = derived(
	notifications,
	($notifications) => $notifications.slice(0, 10)
);

// Notification store class for managing state
export class NotificationStore {
	private static instance: NotificationStore;
	private unsubscribeRealtime?: () => void;

	public static getInstance(): NotificationStore {
		if (!NotificationStore.instance) {
			NotificationStore.instance = new NotificationStore();
		}
		return NotificationStore.instance;
	}

	constructor() {
		// Subscribe to auth changes to load notifications and setup real-time
		auth.subscribe(async (state) => {
			if (state.user?.id) {
				await this.loadNotifications();
				this.setupRealtimeSubscription(state.user.id);
			} else {
				// Clear stores when user logs out
				notifications.set([]);
				notificationsError.set(null);
				this.cleanupRealtimeSubscription();
			}
		});
	}

	// Setup real-time subscription for notifications
	private setupRealtimeSubscription(userId: string): void {
		// Clean up existing subscription first
		this.cleanupRealtimeSubscription();

		this.unsubscribeRealtime = realtimeService.subscribeToNotifications(
			userId,
			(event: RealtimeChangeEvent<Notification>) => {
				this.handleRealtimeEvent(event);
			}
		);
	}

	// Handle real-time notification events
	private handleRealtimeEvent(event: RealtimeChangeEvent<Notification>): void {
		switch (event.eventType) {
			case 'INSERT':
				if (event.new) {
					this.addNotification(event.new);
				}
				break;
			case 'UPDATE':
				if (event.new) {
					this.updateNotification(event.new);
				}
				break;
			case 'DELETE':
				if (event.old?.id) {
					notifications.update(notifs =>
						notifs.filter(n => n.id !== event.old!.id)
					);
				}
				break;
		}
	}

	// Clean up real-time subscription
	private cleanupRealtimeSubscription(): void {
		if (this.unsubscribeRealtime) {
			this.unsubscribeRealtime();
			this.unsubscribeRealtime = undefined;
		}
	}

	// Load notifications for the current user
	async loadNotifications(limit = 20, offset = 0): Promise<void> {
		const { user: currentUser } = get(auth);
		if (!currentUser?.id) {
			notificationsError.set('User not authenticated');
			return;
		}

		notificationsLoading.set(true);
		notificationsError.set(null);

		try {
			const userNotifications = await NotificationService.getNotifications(
				currentUser.id,
				limit,
				offset
			);
			
			if (offset === 0) {
				notifications.set(userNotifications);
			} else {
				// Append to existing notifications for pagination
				notifications.update(existing => [...existing, ...userNotifications]);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to load notifications';
			notificationsError.set(errorMessage);
			console.error('Error loading notifications:', error);
		} finally {
			notificationsLoading.set(false);
		}
	}

	// Load recent notifications (last 7 days)
	async loadRecentNotifications(): Promise<void> {
		const { user: currentUser } = get(auth);
		if (!currentUser?.id) {
			return;
		}

		try {
			const recentNotifications = await NotificationService.getRecentNotifications(currentUser.id);
			notifications.set(recentNotifications);
		} catch (error) {
			console.error('Error loading recent notifications:', error);
		}
	}

	// Mark a notification as read
	async markAsRead(notificationId: string): Promise<void> {
		notificationsError.set(null);

		try {
			await NotificationService.markAsRead(notificationId);
			
			// Update the local store
			notifications.update(notifs =>
				notifs.map(n =>
					n.id === notificationId ? { ...n, is_read: true } : n
				)
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to mark notification as read';
			notificationsError.set(errorMessage);
			console.error('Error marking notification as read:', error);
		}
	}

	// Mark all notifications as read
	async markAllAsRead(): Promise<void> {
		const { user: currentUser } = get(auth);
		if (!currentUser?.id) {
			notificationsError.set('User not authenticated');
			return;
		}

		notificationsError.set(null);

		try {
			await NotificationService.markAllAsRead(currentUser.id);
			
			// Update the local store
			notifications.update(notifs =>
				notifs.map(n => ({ ...n, is_read: true }))
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to mark all notifications as read';
			notificationsError.set(errorMessage);
			console.error('Error marking all notifications as read:', error);
		}
	}

	// Delete a notification
	async deleteNotification(notificationId: string): Promise<void> {
		notificationsError.set(null);

		try {
			await NotificationService.deleteNotification(notificationId);
			
			// Remove from local store
			notifications.update(notifs =>
				notifs.filter(n => n.id !== notificationId)
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to delete notification';
			notificationsError.set(errorMessage);
			console.error('Error deleting notification:', error);
		}
	}

	// Get unread count
	async getUnreadCount(): Promise<number> {
		const { user: currentUser } = get(auth);
		if (!currentUser?.id) {
			return 0;
		}

		try {
			return await NotificationService.getUnreadCount(currentUser.id);
		} catch (error) {
			console.error('Error getting unread count:', error);
			return 0;
		}
	}

	// Clear error state
	clearError(): void {
		notificationsError.set(null);
	}

	// Refresh notifications
	async refresh(): Promise<void> {
		await this.loadNotifications();
	}

	// Add a new notification (for real-time updates)
	addNotification(notification: Notification): void {
		notifications.update(notifs => [notification, ...notifs]);
	}

	// Update a notification (for real-time updates)
	updateNotification(updatedNotification: Notification): void {
		notifications.update(notifs =>
			notifs.map(n =>
				n.id === updatedNotification.id ? updatedNotification : n
			)
		);
	}
}

// Export singleton instance
export const notificationStore = NotificationStore.getInstance();