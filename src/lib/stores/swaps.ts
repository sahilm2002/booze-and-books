// Rebuilt swaps store - clean state management for the new swap system
// Integrates with the rebuilt SwapService and types

import { writable, derived } from 'svelte/store';
import { SwapService } from '$lib/services/swapService';
import { auth } from './auth';
import { 
	SwapStatus,
	type SwapRequestWithDetails, 
	type SwapRequestInput,
	type CounterOfferInput,
	type SwapCompletion, 
	type SwapStatistics 
} from '$lib/types/swap';

interface SwapState {
	incoming: SwapRequestWithDetails[];
	outgoing: SwapRequestWithDetails[];
	statistics: SwapStatistics | null;
	isLoading: boolean;
	error: string | null;
}

const initialState: SwapState = {
	incoming: [],
	outgoing: [],
	statistics: null,
	isLoading: false,
	error: null
};

// Create the main swap store
function createSwapStore() {
	const { subscribe, set, update } = writable<SwapState>(initialState);

	return {
		subscribe,
		
		// Actions
		async loadSwapRequests() {
			let currentUser: any = null;
			auth.subscribe(state => {
				currentUser = state.user;
			})();

			if (!currentUser) {
				update(state => ({ ...state, error: 'User not authenticated' }));
				return;
			}

			update(state => ({ ...state, isLoading: true, error: null }));

			try {
				const { incoming, outgoing } = await SwapService.getSwapRequestsForUser(currentUser.id);
				update(state => ({
					...state,
					incoming,
					outgoing,
					isLoading: false
				}));
			} catch (error) {
				console.error('Error loading swap requests:', error);
				update(state => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to load swap requests',
					isLoading: false
				}));
			}
		},

		async createSwapRequest(input: SwapRequestInput) {
			let currentUser: any = null;
			auth.subscribe(state => {
				currentUser = state.user;
			})();

			if (!currentUser) {
				throw new Error('User not authenticated');
			}

			try {
				const newRequest = await SwapService.createSwapRequest(input, currentUser.id);
				
				// Reload swap requests to get the full details
				await this.loadSwapRequests();
				
				return newRequest;
			} catch (error) {
				console.error('Error creating swap request:', error);
				update(state => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to create swap request'
				}));
				throw error;
			}
		},

		async createCounterOffer(requestId: string, counterOffer: CounterOfferInput) {
			let currentUser: any = null;
			auth.subscribe(state => {
				currentUser = state.user;
			})();

			if (!currentUser) {
				throw new Error('User not authenticated');
			}

			try {
				await SwapService.createCounterOffer(requestId, currentUser.id, counterOffer);
				
				// Reload swap requests to get updated data
				await this.loadSwapRequests();
			} catch (error) {
				console.error('Error creating counter-offer:', error);
				update(state => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to create counter-offer'
				}));
				throw error;
			}
		},

		async acceptSwapRequest(requestId: string) {
			let currentUser: any = null;
			auth.subscribe(state => {
				currentUser = state.user;
			})();

			if (!currentUser) {
				throw new Error('User not authenticated');
			}

			try {
				await SwapService.acceptSwapRequest(requestId, currentUser.id);
				
				// Reload swap requests to get updated data
				await this.loadSwapRequests();
			} catch (error) {
				console.error('Error accepting swap request:', error);
				update(state => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to accept swap request'
				}));
				throw error;
			}
		},

		async cancelSwapRequest(requestId: string) {
			let currentUser: any = null;
			auth.subscribe(state => {
				currentUser = state.user;
			})();

			if (!currentUser) {
				throw new Error('User not authenticated');
			}

			try {
				await SwapService.cancelSwapRequest(requestId, currentUser.id);
				
				// Reload swap requests to get updated data
				await this.loadSwapRequests();
			} catch (error) {
				console.error('Error cancelling swap request:', error);
				update(state => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to cancel swap request'
				}));
				throw error;
			}
		},

		async completeSwapRequest(requestId: string, completion: SwapCompletion) {
			let currentUser: any = null;
			auth.subscribe(state => {
				currentUser = state.user;
			})();

			if (!currentUser) {
				throw new Error('User not authenticated');
			}

			try {
				await SwapService.completeSwapRequest(requestId, currentUser.id, completion);
				
				// Reload swap requests and statistics
				await this.loadSwapRequests();
				await this.loadStatistics();
			} catch (error) {
				console.error('Error completing swap request:', error);
				update(state => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to complete swap request'
				}));
				throw error;
			}
		},

		async loadStatistics() {
			let currentUser: any = null;
			auth.subscribe(state => {
				currentUser = state.user;
			})();

			if (!currentUser) {
				return;
			}

			try {
				const statistics = await SwapService.getSwapStatistics(currentUser.id);
				update(state => ({ ...state, statistics }));
			} catch (error) {
				console.error('Error loading swap statistics:', error);
				update(state => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to load statistics'
				}));
			}
		},

		// Get a single swap request by ID
		async getSwapRequestById(requestId: string) {
			try {
				return await SwapService.getSwapRequestById(requestId);
			} catch (error) {
				console.error('Error fetching swap request:', error);
				update(state => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to fetch swap request'
				}));
				throw error;
			}
		},

		// Clear error
		clearError() {
			update(state => ({ ...state, error: null }));
		},

		// Reset store
		reset() {
			set(initialState);
		}
	};
}

export const swapStore = createSwapStore();

// Derived stores for convenience
export const incomingSwaps = derived(swapStore, $swapStore => $swapStore.incoming);
export const outgoingSwaps = derived(swapStore, $swapStore => $swapStore.outgoing);
export const swapStatistics = derived(swapStore, $swapStore => $swapStore.statistics);
export const swapError = derived(swapStore, $swapStore => $swapStore.error);
export const swapLoading = derived(swapStore, $swapStore => $swapStore.isLoading);

// Derived store for pending swap counts
export const pendingSwapCounts = derived(swapStore, $swapStore => {
	const incomingPending = $swapStore.incoming.filter(swap => 
		swap.status === SwapStatus.PENDING || swap.status === SwapStatus.COUNTER_OFFER
	).length;
	
	const outgoingPending = $swapStore.outgoing.filter(swap => 
		swap.status === SwapStatus.PENDING || swap.status === SwapStatus.COUNTER_OFFER
	).length;
	
	return {
		incoming: incomingPending,
		outgoing: outgoingPending,
		total: incomingPending + outgoingPending
	};
});

// Derived store for accepted swaps (ready for completion)
export const acceptedSwaps = derived(swapStore, $swapStore => {
	const allAccepted = [
		...$swapStore.incoming.filter(swap => swap.status === SwapStatus.ACCEPTED),
		...$swapStore.outgoing.filter(swap => swap.status === SwapStatus.ACCEPTED)
	];
	
	return allAccepted;
});

// Derived store for completed swaps
export const completedSwaps = derived(swapStore, $swapStore => {
	const allCompleted = [
		...$swapStore.incoming.filter(swap => swap.status === SwapStatus.COMPLETED),
		...$swapStore.outgoing.filter(swap => swap.status === SwapStatus.COMPLETED)
	];
	
	return allCompleted;
});

// Derived store for swaps needing user action
export const swapsNeedingAction = derived([swapStore, auth], ([$swapStore, $auth]) => {
	if (!$auth.user) return [];
	
	const needingAction: SwapRequestWithDetails[] = [];
	
	// Incoming swaps that need owner action
	$swapStore.incoming.forEach(swap => {
		if (swap.status === SwapStatus.PENDING) {
			needingAction.push(swap); // Owner can accept/counter-offer/cancel
		}
	});
	
	// Outgoing swaps that need requester action
	$swapStore.outgoing.forEach(swap => {
		if (swap.status === SwapStatus.COUNTER_OFFER) {
			needingAction.push(swap); // Requester can accept/cancel counter-offer
		}
	});
	
	// Accepted swaps where user hasn't completed yet
	const allAccepted = [
		...$swapStore.incoming.filter(swap => swap.status === SwapStatus.ACCEPTED),
		...$swapStore.outgoing.filter(swap => swap.status === SwapStatus.ACCEPTED)
	];
	
	allAccepted.forEach(swap => {
		const isRequester = swap.requester_id === $auth.user?.id;
		const userCompleted = isRequester ? swap.requester_completed_at : swap.owner_completed_at;
		
		if (!userCompleted) {
			needingAction.push(swap); // User needs to mark as completed
		}
	});
	
	return needingAction;
});

// Auto-load swap requests when user changes
auth.subscribe(user => {
	if (user) {
		swapStore.loadSwapRequests();
		swapStore.loadStatistics();
	} else {
		swapStore.reset();
	}
});
