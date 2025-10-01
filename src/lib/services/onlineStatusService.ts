import { supabase } from '$lib/supabase';
import { browser } from '$app/environment';

export class OnlineStatusService {
	private heartbeatInterval: NodeJS.Timeout | null = null;
	private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
	private currentUserId: string | null = null;

	/**
	 * Start tracking online status for a user
	 */
	async startTracking(userId: string): Promise<void> {
		if (!browser || !userId) return;

		this.currentUserId = userId;
		
		// Set user as online immediately
		await this.setUserOnline(userId);
		
		// Start heartbeat to maintain online status
		this.startHeartbeat();
		
		// Set up event listeners for page visibility and beforeunload
		this.setupEventListeners();
	}

	/**
	 * Stop tracking online status
	 */
	async stopTracking(): Promise<void> {
		if (!browser || !this.currentUserId) return;

		// Set user as offline
		await this.setUserOffline(this.currentUserId);
		
		// Clear heartbeat
		this.stopHeartbeat();
		
		// Remove event listeners
		this.removeEventListeners();
		
		this.currentUserId = null;
	}

	/**
	 * Set user as online and update last seen
	 */
	private async setUserOnline(userId: string): Promise<void> {
		try {
			const { error } = await supabase.rpc('update_user_last_seen', {
				user_id: userId
			});

			if (error) {
				console.error('Error setting user online:', error);
			}
		} catch (error) {
			console.error('Error setting user online:', error);
		}
	}

	/**
	 * Set user as offline
	 */
	private async setUserOffline(userId: string): Promise<void> {
		try {
			const { error } = await supabase.rpc('set_user_offline', {
				user_id: userId
			});

			if (error) {
				console.error('Error setting user offline:', error);
			}
		} catch (error) {
			console.error('Error setting user offline:', error);
		}
	}

	/**
	 * Get user's online status
	 */
	async getUserOnlineStatus(userId: string): Promise<{
		is_online: boolean;
		last_seen_at: string | null;
		first_login_at: string | null;
	} | null> {
		try {
			const { data, error } = await supabase.rpc('get_user_online_status', {
				user_id: userId
			});

			if (error) {
				console.error('Error getting user online status:', error);
				return null;
			}

			return data?.[0] || null;
		} catch (error) {
			console.error('Error getting user online status:', error);
			return null;
		}
	}

	/**
	 * Start heartbeat to maintain online status
	 */
	private startHeartbeat(): void {
		this.stopHeartbeat(); // Clear any existing heartbeat
		
		this.heartbeatInterval = setInterval(async () => {
			if (this.currentUserId) {
				await this.setUserOnline(this.currentUserId);
			}
		}, this.HEARTBEAT_INTERVAL);
	}

	/**
	 * Stop heartbeat
	 */
	private stopHeartbeat(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	/**
	 * Set up event listeners for page visibility and beforeunload
	 */
	private setupEventListeners(): void {
		if (!browser) return;

		// Handle page visibility changes
		document.addEventListener('visibilitychange', this.handleVisibilityChange);
		
		// Handle page unload
		window.addEventListener('beforeunload', this.handleBeforeUnload);
		
		// Handle page focus/blur
		window.addEventListener('focus', this.handleFocus);
		window.addEventListener('blur', this.handleBlur);
	}

	/**
	 * Remove event listeners
	 */
	private removeEventListeners(): void {
		if (!browser) return;

		document.removeEventListener('visibilitychange', this.handleVisibilityChange);
		window.removeEventListener('beforeunload', this.handleBeforeUnload);
		window.removeEventListener('focus', this.handleFocus);
		window.removeEventListener('blur', this.handleBlur);
	}

	/**
	 * Handle visibility change events
	 */
	private handleVisibilityChange = async (): Promise<void> => {
		if (!this.currentUserId) return;

		if (document.hidden) {
			// Page hidden: stop heartbeat so user naturally transitions offline after grace period
			this.stopHeartbeat();
		} else {
			// Page visible: restart heartbeat and set online immediately
			this.startHeartbeat();
			await this.setUserOnline(this.currentUserId);
		}
	};

	/**
	 * Handle before unload events
	 */
	private handleBeforeUnload = (): void => {
		if (this.currentUserId) {
			// Use sendBeacon for reliable offline status update on page unload
			const data = JSON.stringify({ user_id: this.currentUserId });
			navigator.sendBeacon('/api/user/set-offline', data);
		}
	};

	/**
	 * Handle window focus events
	 */
	private handleFocus = async (): Promise<void> => {
		if (this.currentUserId) {
			await this.setUserOnline(this.currentUserId);
		}
	};

	/**
	 * Handle window blur events
	 */
	private handleBlur = (): void => {
		// Don't immediately set offline on blur, let heartbeat handle it
	};

	/**
	 * Format last seen time for display
	 */
	static formatLastSeen(lastSeenAt: string | null, isOnline: boolean): string {
		if (isOnline) {
			return 'Online now';
		}

		if (!lastSeenAt) {
			return 'Never logged in';
		}

		const lastSeen = new Date(lastSeenAt);
		const now = new Date();
		const diffMs = now.getTime() - lastSeen.getTime();
		const diffMinutes = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMinutes / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMinutes < 1) {
			return 'Just now';
		} else if (diffMinutes < 60) {
			return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
		} else if (diffHours < 24) {
			return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
		} else if (diffDays < 7) {
			return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
		} else {
			return lastSeen.toLocaleDateString();
		}
	}

	/**
	 * Check if user has ever logged in
	 */
	static hasEverLoggedIn(firstLoginAt: string | null): boolean {
		return firstLoginAt !== null;
	}
}

// Create singleton instance
export const onlineStatusService = new OnlineStatusService();
