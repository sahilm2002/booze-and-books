export class ActivityService {
	private lastActivityTime: number = Date.now();
	private inactivityTimer: NodeJS.Timeout | null = null;
	private onInactivityCallback: (() => void) | null = null;
	private readonly INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds
	private isInitialized = false;
	
	// Events that indicate user activity
	private readonly ACTIVITY_EVENTS = [
		'mousedown',
		'mousemove',
		'keypress',
		'scroll',
		'touchstart',
		'click',
		'focus',
		'blur'
	] as const;

	/**
	 * Initialize the activity service with an inactivity callback
	 */
	initialize(onInactivityCallback: () => void): void {
		if (typeof window === 'undefined') return; // Skip on server
		
		this.onInactivityCallback = onInactivityCallback;
		this.lastActivityTime = Date.now();
		
		if (!this.isInitialized) {
			this.addActivityListeners();
			this.isInitialized = true;
		}
		
		this.resetInactivityTimer();
	}

	/**
	 * Clean up event listeners and timers
	 */
	destroy(): void {
		if (typeof window === 'undefined') return;
		
		this.removeActivityListeners();
		this.clearInactivityTimer();
		this.isInitialized = false;
		this.onInactivityCallback = null;
	}

	/**
	 * Add event listeners for user activity
	 */
	private addActivityListeners(): void {
		this.ACTIVITY_EVENTS.forEach(eventName => {
			document.addEventListener(eventName, this.handleActivity, {
				passive: true,
				capture: true
			});
		});
		
		// Also listen to visibility change to handle tab switching
		document.addEventListener('visibilitychange', this.handleVisibilityChange);
	}

	/**
	 * Remove event listeners
	 */
	private removeActivityListeners(): void {
		this.ACTIVITY_EVENTS.forEach(eventName => {
			document.removeEventListener(eventName, this.handleActivity, true);
		});
		
		document.removeEventListener('visibilitychange', this.handleVisibilityChange);
	}

	/**
	 * Handle user activity events
	 */
	private handleActivity = (): void => {
		this.lastActivityTime = Date.now();
		this.resetInactivityTimer();
	};

	/**
	 * Handle visibility change (tab switching)
	 */
	private handleVisibilityChange = (): void => {
		if (!document.hidden) {
			// Tab became visible, treat as activity
			this.handleActivity();
		}
	};

	/**
	 * Reset the inactivity timer
	 */
	private resetInactivityTimer(): void {
		this.clearInactivityTimer();
		
		this.inactivityTimer = setTimeout(() => {
			if (this.onInactivityCallback) {
				this.onInactivityCallback();
			}
		}, this.INACTIVITY_TIMEOUT);
	}

	/**
	 * Clear the current inactivity timer
	 */
	private clearInactivityTimer(): void {
		if (this.inactivityTimer) {
			clearTimeout(this.inactivityTimer);
			this.inactivityTimer = null;
		}
	}

	/**
	 * Get time since last activity in milliseconds
	 */
	getTimeSinceLastActivity(): number {
		return Date.now() - this.lastActivityTime;
	}

	/**
	 * Get remaining time until auto-logout in milliseconds
	 */
	getRemainingTime(): number {
		const elapsed = this.getTimeSinceLastActivity();
		return Math.max(0, this.INACTIVITY_TIMEOUT - elapsed);
	}

	/**
	 * Check if user should be logged out due to inactivity
	 */
	shouldLogout(): boolean {
		return this.getTimeSinceLastActivity() >= this.INACTIVITY_TIMEOUT;
	}

	/**
	 * Manually trigger activity (useful for programmatic activity)
	 */
	recordActivity(): void {
		this.handleActivity();
	}
}

// Create singleton instance
export const activityService = new ActivityService();