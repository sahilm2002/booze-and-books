import { writable, derived, get } from 'svelte/store';
import { SwapService } from '../services/swapService.js';
import { NotificationService } from '../services/notificationService.js';
import { realtimeService } from '../services/realtimeService.js';
import { auth } from './auth.js';
import type { 
	SwapRequest, 
	SwapRequestWithBook, 
	SwapRequestInput,
	SwapCompletion
} from '../types/swap.js';
import { SwapStatus } from '../types/swap.js';
import type { RealtimeChangeEvent } from '../services/realtimeService.js';

// Writable stores
export const incomingSwapRequests = writable<SwapRequestWithBook[]>([]);
export const outgoingSwapRequests = writable<SwapRequestWithBook[]>([]);
export const completedSwapRequests = writable<SwapRequestWithBook[]>([]);
export const swapRequestsLoading = writable<boolean>(false);
export const swapRequestsError = writable<string | null>(null);
export const swapStatistics = writable<{
	total_completed: number;
	average_rating: number;
	completion_rate: number;
	total_swaps: number;
}>({
	total_completed: 0,
	average_rating: 0,
	completion_rate: 0,
	total_swaps: 0
});
export const userRating = writable<{
	average_rating: number;
	total_ratings: number;
	ratings_breakdown: { [key: number]: number };
}>({
	average_rating: 0,
	total_ratings: 0,
	ratings_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
});

// Derived stores
export const pendingIncomingCount = derived(
	incomingSwapRequests,
	($requests) => $requests.filter(r => r.status === 'PENDING').length
);

export const pendingOutgoingCount = derived(
	outgoingSwapRequests,
	($requests) => $requests.filter(r => r.status === 'PENDING').length
);

export const totalPendingCount = derived(
	[pendingIncomingCount, pendingOutgoingCount],
	([incoming, outgoing]) => incoming + outgoing
);

export const acceptedIncomingCount = derived(
	incomingSwapRequests,
	($requests) => $requests.filter(r => r.status === 'ACCEPTED').length
);

export const acceptedOutgoingCount = derived(
	outgoingSwapRequests,
	($requests) => $requests.filter(r => r.status === 'ACCEPTED').length
);

export const completedSwapCount = derived(
	completedSwapRequests,
	($requests) => $requests.length
);

export const allSwapRequests = derived(
	[incomingSwapRequests, outgoingSwapRequests, completedSwapRequests],
	([incoming, outgoing, completed]) => [...incoming, ...outgoing, ...completed]
);

export const completionRatePercentage = derived(
	swapStatistics,
	($stats) => $stats.completion_rate
);

export const averageUserRating = derived(
	userRating,
	($rating) => $rating.average_rating
);

// Debounce utility for batch updates
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	return ((...args: Parameters<T>) => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	}) as T;
}

// Swap store class for managing state
export class SwapStore {
	private static instance: SwapStore;
	private unsubscribeRealtime?: () => void;
	private debouncedStatsUpdate: () => void;
	private debouncedRatingUpdate: () => void;

	public static getInstance(): SwapStore {
		if (!SwapStore.instance) {
			SwapStore.instance = new SwapStore();
		}
		return SwapStore.instance;
	}

	constructor() {
		// Setup debounced functions for bulk updates
		this.debouncedStatsUpdate = debounce(() => {
			this.loadSwapStatistics();
		}, 500);
		this.debouncedRatingUpdate = debounce(() => {
			this.loadUserRating();
		}, 500);

		// Subscribe to auth changes to load swap requests and setup real-time
		auth.subscribe(async (state) => {
			if (state.user?.id) {
				await this.loadSwapRequests();
				await this.loadCompletedSwaps();
				await this.loadSwapStatistics();
				await this.loadUserRating();
				this.setupRealtimeSubscription(state.user.id);
			} else {
				// Clear stores when user logs out
				incomingSwapRequests.set([]);
				outgoingSwapRequests.set([]);
				completedSwapRequests.set([]);
				swapStatistics.set({
					total_completed: 0,
					average_rating: 0,
					completion_rate: 0,
					total_swaps: 0
				});
				userRating.set({
					average_rating: 0,
					total_ratings: 0,
					ratings_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
				});
				swapRequestsError.set(null);
				this.cleanupRealtimeSubscription();
			}
		});
	}

	// Setup real-time subscription for swap requests
	private setupRealtimeSubscription(userId: string): void {
		// Clean up existing subscription first
		this.cleanupRealtimeSubscription();

		this.unsubscribeRealtime = realtimeService.subscribeToSwapRequests(
			userId,
			(event: RealtimeChangeEvent<SwapRequest>) => {
				this.handleRealtimeEvent(event);
			}
		);
	}

	// Handle real-time swap request events with optimized updates
	private handleRealtimeEvent(event: RealtimeChangeEvent<SwapRequest>): void {
		switch (event.eventType) {
			case 'INSERT':
				// For new swap requests, we need to reload to get proper joins since we can't easily patch
				this.loadSwapRequests();
				break;
			case 'UPDATE':
				if (event.new && event.old) {
					// Try to patch the specific swap request instead of reloading all
					this.patchSwapRequest(event.new, event.old);
					
					// If status changed to COMPLETED, update statistics with debouncing
					if (event.new.status === SwapStatus.COMPLETED && event.old.status !== SwapStatus.COMPLETED) {
						this.loadCompletedSwaps(); // Move to completed list
						this.debouncedStatsUpdate(); // Debounced statistics update
						this.debouncedRatingUpdate(); // Debounced rating update
					}
				} else {
					// Fallback to full reload if we don't have complete data
					this.loadSwapRequests();
				}
				break;
			case 'DELETE':
				// Remove the specific swap request from stores
				if (event.old?.id) {
					this.removeSwapRequest(event.old.id);
				} else {
					// Fallback to full reload
					this.loadSwapRequests();
				}
				break;
		}
	}

	// Patch a specific swap request in the stores
	private patchSwapRequest(newData: SwapRequest, oldData: SwapRequest): void {
		const patchStore = (store: typeof incomingSwapRequests) => {
			store.update(requests => 
				requests.map(req => 
					req.id === newData.id 
						? { ...req, ...newData } as SwapRequestWithBook
						: req
				)
			);
		};

		// Update in the appropriate store based on the request type
		patchStore(incomingSwapRequests);
		patchStore(outgoingSwapRequests);
		
		// If status changed to completed, also update completed store
		if (newData.status === SwapStatus.COMPLETED && oldData.status !== SwapStatus.COMPLETED) {
			completedSwapRequests.update(requests => {
				// Add to completed if not already there
				const exists = requests.some(req => req.id === newData.id);
				if (!exists) {
					return [newData as SwapRequestWithBook, ...requests];
				}
				return requests.map(req => 
					req.id === newData.id ? { ...req, ...newData } as SwapRequestWithBook : req
				);
			});
		}
	}

	// Remove a specific swap request from all stores
	private removeSwapRequest(requestId: string): void {
		const removeFromStore = (store: typeof incomingSwapRequests) => {
			store.update(requests => requests.filter(req => req.id !== requestId));
		};

		removeFromStore(incomingSwapRequests);
		removeFromStore(outgoingSwapRequests);
		removeFromStore(completedSwapRequests);
	}

	// Clean up real-time subscription
	private cleanupRealtimeSubscription(): void {
		if (this.unsubscribeRealtime) {
			this.unsubscribeRealtime();
			this.unsubscribeRealtime = undefined;
		}
	}

	// Load all swap requests for the current user
	async loadSwapRequests(): Promise<void> {
		const { user: currentUser } = get(auth);
		if (!currentUser?.id) {
			swapRequestsError.set('User not authenticated');
			return;
		}

		swapRequestsLoading.set(true);
		swapRequestsError.set(null);

		try {
			const { incoming, outgoing } = await SwapService.getSwapRequestsForUser(currentUser.id);
			incomingSwapRequests.set(incoming);
			outgoingSwapRequests.set(outgoing);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to load swap requests';
			swapRequestsError.set(errorMessage);
			console.error('Error loading swap requests:', error);
		} finally {
			swapRequestsLoading.set(false);
		}
	}

	// Create a new swap request
	async createSwapRequest(input: SwapRequestInput): Promise<SwapRequest | null> {
		const { user: currentUser } = get(auth);
		if (!currentUser?.id) {
			swapRequestsError.set('User not authenticated');
			return null;
		}

		swapRequestsError.set(null);

		try {
			const swapRequest = await SwapService.createSwapRequest(input, currentUser.id);
			
			// Reload swap requests to get updated data with joins
			await this.loadSwapRequests();
			
			return swapRequest;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to create swap request';
			swapRequestsError.set(errorMessage);
			console.error('Error creating swap request:', error);
			return null;
		}
	}

	// Update swap request status
	async updateSwapRequestStatus(
		requestId: string, 
		status: SwapStatus
	): Promise<SwapRequest | null> {
		const { user: currentUser } = get(auth);
		if (!currentUser?.id) {
			swapRequestsError.set('User not authenticated');
			return null;
		}

		swapRequestsError.set(null);

		try {
			const updatedRequest = await SwapService.updateSwapRequestStatus(
				requestId, 
				status, 
				currentUser.id
			);
			
			// Reload swap requests to get updated data
			await this.loadSwapRequests();
			
			return updatedRequest;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to update swap request';
			swapRequestsError.set(errorMessage);
			console.error('Error updating swap request:', error);
			return null;
		}
	}

	// Accept a swap request (owner only)
	async acceptSwapRequest(requestId: string): Promise<SwapRequest | null> {
		const { user: currentUser } = get(auth);
		if (!currentUser?.id) {
			swapRequestsError.set('User not authenticated');
			return null;
		}

		try {
			// Get request details for notifications
			const swapRequest = await SwapService.getSwapRequestById(requestId);
			
			const updatedRequest = await this.updateSwapRequestStatus(requestId, SwapStatus.ACCEPTED);
			
			// Send email notification for approval
			if (swapRequest && updatedRequest) {
				// Get user emails for notification
				const requesterEmail = swapRequest.requester_profile.email;
				const ownerEmail = swapRequest.owner_profile.email;
				
				if (requesterEmail && ownerEmail) {
					await NotificationService.sendSwapApprovalNotification(
						requestId,
						requesterEmail,
						ownerEmail,
						swapRequest.book.title
					);
				}
			}
			
			return updatedRequest;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to accept swap request';
			swapRequestsError.set(errorMessage);
			console.error('Error accepting swap request:', error);
			return null;
		}
	}

	// Make counter offer (owner only)
	async makeCounterOffer(requestId: string, counterOfferedBookId: string): Promise<SwapRequest | null> {
		const { user: currentUser } = get(auth);
		if (!currentUser?.id) {
			swapRequestsError.set('User not authenticated');
			return null;
		}

		swapRequestsError.set(null);

		try {
			// Get request details for notifications
			const swapRequest = await SwapService.getSwapRequestById(requestId);
			
			const updatedRequest = await SwapService.makeCounterOffer(
				requestId, 
				currentUser.id, 
				counterOfferedBookId
			);
			
			// Reload swap requests to get updated data
			await this.loadSwapRequests();
			
			// Send counter-offer notification
			if (swapRequest && updatedRequest) {
				const requesterEmail = swapRequest.requester_profile.email;
				
				if (requesterEmail) {
					// We need to get the counter-offered book title
					const supabaseModule = await import('../supabase.js');
					const { data: counterBook } = await supabaseModule.supabase
						.from('books')
						.select('title')
						.eq('id', counterOfferedBookId)
						.single();
					
					await NotificationService.sendCounterOfferNotification(
						requestId,
						requesterEmail,
						swapRequest.book.title,
						counterBook?.title || 'Unknown Book'
					);
				}
			}
			
			return updatedRequest;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to make counter offer';
			swapRequestsError.set(errorMessage);
			console.error('Error making counter offer:', error);
			return null;
		}
	}

	// Cancel a swap request (requester only)
	async cancelSwapRequest(requestId: string): Promise<SwapRequest | null> {
		return this.updateSwapRequestStatus(requestId, SwapStatus.CANCELLED);
	}

	// Complete a swap request with rating and feedback
	async completeSwapRequest(
		requestId: string, 
		completion: SwapCompletion
	): Promise<SwapRequest | null> {
		const { user: currentUser } = get(auth);
		if (!currentUser?.id) {
			swapRequestsError.set('User not authenticated');
			return null;
		}

		swapRequestsError.set(null);

		try {
			const completedRequest = await SwapService.completeSwapRequest(
				requestId, 
				currentUser.id,
				completion
			);
			
			// Reload all swap-related data
			await this.loadSwapRequests();
			await this.loadCompletedSwaps();
			await this.loadSwapStatistics();
			await this.loadUserRating();
			
			return completedRequest;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to complete swap request';
			swapRequestsError.set(errorMessage);
			console.error('Error completing swap request:', error);
			return null;
		}
	}

	// Load completed swaps for the current user
	async loadCompletedSwaps(): Promise<void> {
		const { user: currentUser } = get(auth);
		if (!currentUser?.id) {
			return;
		}

		try {
			const completed = await SwapService.getCompletedSwaps(currentUser.id);
			completedSwapRequests.set(completed);
		} catch (error) {
			console.error('Error loading completed swaps:', error);
		}
	}

	// Load swap statistics for the current user
	async loadSwapStatistics(): Promise<void> {
		const { user: currentUser } = get(auth);
		if (!currentUser?.id) {
			return;
		}

		try {
			const stats = await SwapService.getSwapStatistics(currentUser.id);
			swapStatistics.set(stats);
		} catch (error) {
			console.error('Error loading swap statistics:', error);
		}
	}

	// Load user rating from completed swaps
	async loadUserRating(): Promise<void> {
		const { user: currentUser } = get(auth);
		if (!currentUser?.id) {
			return;
		}

		try {
			const rating = await SwapService.getUserRating(currentUser.id);
			userRating.set(rating);
		} catch (error) {
			console.error('Error loading user rating:', error);
		}
	}

	// Get swap request counts
	async getSwapRequestCounts(): Promise<{
		incomingPending: number;
		outgoingPending: number;
	} | null> {
		const { user: currentUser } = get(auth);
		if (!currentUser?.id) {
			return null;
		}

		try {
			return await SwapService.getSwapRequestCounts(currentUser.id);
		} catch (error) {
			console.error('Error getting swap request counts:', error);
			return null;
		}
	}

	// Clear error state
	clearError(): void {
		swapRequestsError.set(null);
	}

	// Refresh swap requests
	async refresh(): Promise<void> {
		await this.loadSwapRequests();
	}
}

// Export singleton instance
export const swapStore = SwapStore.getInstance();
