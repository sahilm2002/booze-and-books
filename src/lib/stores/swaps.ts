// Clean, bug-free swap store
// Built from scratch with proper state management

import { writable, derived } from 'svelte/store';
import { SwapService } from '$lib/services/swapService';
import { auth } from './auth';
import type { SwapRequestWithDetails, SwapRequestInput, SwapCompletion, SwapStatistics } from '$lib/types/swap';

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
	const incomingPending = $swapStore.incoming.filter(swap => swap.status === 'PENDING').length;
	const outgoingPending = $swapStore.outgoing.filter(swap => swap.status === 'PENDING').length;
	
	return {
		incoming: incomingPending,
		outgoing: outgoingPending,
		total: incomingPending + outgoingPending
	};
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
