import { supabase } from '$lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Notification } from '../types/notification.js';
import type { SwapRequest } from '../types/swap.js';

export interface RealtimeConnection {
	connected: boolean;
	subscriptions: Set<string>;
	channels: Map<string, RealtimeChannel>;
}

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeChangeEvent<T = any> {
	eventType: RealtimeEventType;
	new?: T;
	old?: T;
	table: string;
}

type RealtimeCallback<T = any> = (event: RealtimeChangeEvent<T>) => void;

export class RealtimeService {
	private static instance: RealtimeService;
	private connection: RealtimeConnection;
	private callbacks: Map<string, Set<RealtimeCallback>>;
	
	private constructor() {
		this.connection = {
			connected: false,
			subscriptions: new Set(),
			channels: new Map()
		};
		this.callbacks = new Map();
		this.setupConnectionHandlers();
	}

	public static getInstance(): RealtimeService {
		if (!RealtimeService.instance) {
			RealtimeService.instance = new RealtimeService();
		}
		return RealtimeService.instance;
	}

	private setupConnectionHandlers() {
		// Connection state is managed per channel in modern Supabase
		// Set initial connected state to true for now
		this.connection.connected = true;
	}

	private notifyConnectionChange(connected: boolean) {
		const connectionCallbacks = this.callbacks.get('connection') || new Set();
		connectionCallbacks.forEach(callback => {
			callback({
				eventType: connected ? 'INSERT' : 'DELETE',
				new: { connected },
				table: 'connection'
			});
		});
	}

	// Subscribe to connection status changes
	subscribeToConnection(callback: RealtimeCallback<{ connected: boolean }>): () => void {
		const key = 'connection';
		if (!this.callbacks.has(key)) {
			this.callbacks.set(key, new Set());
		}
		
		this.callbacks.get(key)!.add(callback);
		
		// Immediately notify of current connection state
		callback({
			eventType: 'INSERT',
			new: { connected: this.connection.connected },
			table: 'connection'
		});
		
		return () => {
			this.callbacks.get(key)?.delete(callback);
		};
	}

	// Subscribe to notification changes for a specific user
	subscribeToNotifications(userId: string, callback: RealtimeCallback<Notification>): () => void {
		const channelName = `notifications-${userId}`;
		
		if (this.connection.channels.has(channelName)) {
			// Channel already exists, just add callback
			const key = `notifications-${userId}`;
			if (!this.callbacks.has(key)) {
				this.callbacks.set(key, new Set());
			}
			this.callbacks.get(key)!.add(callback);
			
			return () => {
				this.callbacks.get(key)?.delete(callback);
				if (this.callbacks.get(key)?.size === 0) {
					this.unsubscribeFromChannel(channelName);
				}
			};
		}

		const channel = supabase
			.channel(channelName)
			.on('postgres_changes', {
				event: '*',
				schema: 'public',
				table: 'notifications',
				filter: `user_id=eq.${userId}`
			}, (payload: RealtimePostgresChangesPayload<Notification>) => {
				const event: RealtimeChangeEvent<Notification> = {
					eventType: payload.eventType as RealtimeEventType,
					new: payload.new as Notification,
					old: payload.old as Notification,
					table: 'notifications'
				};
				
				// Notify all callbacks for this subscription
				const key = `notifications-${userId}`;
				const callbacks = this.callbacks.get(key) || new Set();
				callbacks.forEach(cb => cb(event));
			})
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					this.connection.subscriptions.add(channelName);
				}
			});

		this.connection.channels.set(channelName, channel);
		
		// Add callback
		const key = `notifications-${userId}`;
		if (!this.callbacks.has(key)) {
			this.callbacks.set(key, new Set());
		}
		this.callbacks.get(key)!.add(callback);
		
		return () => {
			this.callbacks.get(key)?.delete(callback);
			if (this.callbacks.get(key)?.size === 0) {
				this.unsubscribeFromChannel(channelName);
			}
		};
	}

	// Subscribe to swap request changes for a specific user
	subscribeToSwapRequests(userId: string, callback: RealtimeCallback<SwapRequest>): () => void {
		const channelName = `swaps-${userId}`;
		
		if (this.connection.channels.has(channelName)) {
			// Channel already exists, just add callback
			const key = `swaps-${userId}`;
			if (!this.callbacks.has(key)) {
				this.callbacks.set(key, new Set());
			}
			this.callbacks.get(key)!.add(callback);
			
			return () => {
				this.callbacks.get(key)?.delete(callback);
				if (this.callbacks.get(key)?.size === 0) {
					this.unsubscribeFromChannel(channelName);
				}
			};
		}

		const channel = supabase
			.channel(channelName)
			.on('postgres_changes', {
				event: '*',
				schema: 'public',
				table: 'swap_requests',
				filter: `requester_id=eq.${userId}`
			}, (payload: RealtimePostgresChangesPayload<SwapRequest>) => {
				const event: RealtimeChangeEvent<SwapRequest> = {
					eventType: payload.eventType as RealtimeEventType,
					new: payload.new as SwapRequest,
					old: payload.old as SwapRequest,
					table: 'swap_requests'
				};
				
				// Notify all callbacks for this subscription
				const key = `swaps-${userId}`;
				const callbacks = this.callbacks.get(key) || new Set();
				callbacks.forEach(cb => cb(event));
			})
			.on('postgres_changes', {
				event: '*',
				schema: 'public',
				table: 'swap_requests',
				filter: `owner_id=eq.${userId}`
			}, (payload: RealtimePostgresChangesPayload<SwapRequest>) => {
				const event: RealtimeChangeEvent<SwapRequest> = {
					eventType: payload.eventType as RealtimeEventType,
					new: payload.new as SwapRequest,
					old: payload.old as SwapRequest,
					table: 'swap_requests'
				};
				
				// Notify all callbacks for this subscription
				const key = `swaps-${userId}`;
				const callbacks = this.callbacks.get(key) || new Set();
				callbacks.forEach(cb => cb(event));
			})
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					this.connection.subscriptions.add(channelName);
				}
			});

		this.connection.channels.set(channelName, channel);
		
		// Add callback
		const key = `swaps-${userId}`;
		if (!this.callbacks.has(key)) {
			this.callbacks.set(key, new Set());
		}
		this.callbacks.get(key)!.add(callback);
		
		return () => {
			this.callbacks.get(key)?.delete(callback);
			if (this.callbacks.get(key)?.size === 0) {
				this.unsubscribeFromChannel(channelName);
			}
		};
	}

	// Subscribe to book availability changes
	subscribeToBookAvailability(callback: RealtimeCallback<{ id: string; is_available: boolean }>): () => void {
		const channelName = 'book-availability';
		
		if (this.connection.channels.has(channelName)) {
			// Channel already exists, just add callback
			const key = 'book-availability';
			if (!this.callbacks.has(key)) {
				this.callbacks.set(key, new Set());
			}
			this.callbacks.get(key)!.add(callback);
			
			return () => {
				this.callbacks.get(key)?.delete(callback);
				if (this.callbacks.get(key)?.size === 0) {
					this.unsubscribeFromChannel(channelName);
				}
			};
		}

		const channel = supabase
			.channel(channelName)
			.on('postgres_changes', {
				event: 'UPDATE',
				schema: 'public',
				table: 'books'
			}, (payload: RealtimePostgresChangesPayload<{ id: string; is_available: boolean }>) => {
				// Only notify if availability actually changed
				const oldData = payload.old as { id: string; is_available: boolean } | null;
				const newData = payload.new as { id: string; is_available: boolean } | null;
				
				if (oldData?.is_available !== newData?.is_available) {
					const event: RealtimeChangeEvent<{ id: string; is_available: boolean }> = {
						eventType: 'UPDATE',
						new: newData || undefined,
						old: oldData || undefined,
						table: 'books'
					};
					
					// Notify all callbacks for this subscription
					const key = 'book-availability';
					const callbacks = this.callbacks.get(key) || new Set();
					callbacks.forEach(cb => cb(event));
				}
			})
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					this.connection.subscriptions.add(channelName);
				}
			});

		this.connection.channels.set(channelName, channel);
		
		// Add callback
		const key = 'book-availability';
		if (!this.callbacks.has(key)) {
			this.callbacks.set(key, new Set());
		}
		this.callbacks.get(key)!.add(callback);
		
		return () => {
			this.callbacks.get(key)?.delete(callback);
			if (this.callbacks.get(key)?.size === 0) {
				this.unsubscribeFromChannel(channelName);
			}
		};
	}

	private async unsubscribeFromChannel(channelName: string): Promise<void> {
		const channel = this.connection.channels.get(channelName);
		if (channel) {
			await channel.unsubscribe();
			this.connection.channels.delete(channelName);
			this.connection.subscriptions.delete(channelName);
		}
	}

	// Get current connection status
	getConnectionStatus(): RealtimeConnection {
		return { ...this.connection };
	}

	// Clean up all subscriptions
	async cleanup(): Promise<void> {
		for (const [channelName, channel] of this.connection.channels) {
			await channel.unsubscribe();
		}
		
		this.connection.channels.clear();
		this.connection.subscriptions.clear();
		this.callbacks.clear();
	}

	// Initialize realtime connection for a user
	async initializeForUser(userId: string): Promise<{
		unsubscribeNotifications: () => void;
		unsubscribeSwaps: () => void;
		unsubscribeBooks: () => void;
		unsubscribeConnection: () => void;
	}> {
		// Return unsubscribe functions for easy cleanup
		const unsubscribeNotifications = this.subscribeToNotifications(userId, () => {});
		const unsubscribeSwaps = this.subscribeToSwapRequests(userId, () => {});
		const unsubscribeBooks = this.subscribeToBookAvailability(() => {});
		const unsubscribeConnection = this.subscribeToConnection(() => {});

		return {
			unsubscribeNotifications,
			unsubscribeSwaps,
			unsubscribeBooks,
			unsubscribeConnection
		};
	}
}

// Export singleton instance
export const realtimeService = RealtimeService.getInstance();
