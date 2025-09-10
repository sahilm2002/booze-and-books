import { writable } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase';
import { goto, invalidateAll } from '$app/navigation';
import { browser } from '$app/environment';
import { activityService } from '$lib/services/activityService';

export interface AuthState {
	session: Session | null;
	user: User | null;
	loading: boolean;
}

const initialState: AuthState = {
	session: null,
	user: null,
	loading: true
};

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(initialState);
	let unsubscribe: (() => void) | null = null;

	return {
		subscribe,
		
		/**
		 * Initialize the auth store with session data from the server
		 */
		initialize: (session: Session | null) => {
			set({
				session,
				user: session?.user ?? null,
				loading: false
			});

			// Set up auth state change listener only in browser
			if (browser) {
				// remove prior listener if any
				unsubscribe?.();
				const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
					console.log('Auth state changed:', event, session?.user?.email);
					
					update(state => ({
						...state,
						session,
						user: session?.user ?? null,
						loading: false
					}));

					// Handle sign out
					if (event === 'SIGNED_OUT') {
						// Stop activity tracking when user signs out
						activityService.destroy();
						await goto('/auth/login', { replaceState: true });
					}
					
					// Handle sign in - start activity tracking
					if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
						// Initialize activity tracking for auto-logout
						activityService.initialize(async () => {
							console.log('Auto-logout triggered due to inactivity');
							await auth.signOut();
						});
						await invalidateAll();
					}
				});
				unsubscribe = () => subscription.unsubscribe();
				
				// If we already have a session, start activity tracking
				if (session) {
					activityService.initialize(async () => {
						console.log('Auto-logout triggered due to inactivity');
						await auth.signOut();
					});
				}
			}
		},

		/**
		 * Set loading state
		 */
		setLoading: (loading: boolean) => {
			update(state => ({ ...state, loading }));
		},

		/**
		 * Sign out the current user
		 */
		signOut: async () => {
			update(state => ({ ...state, loading: true }));
			
			const { error } = await supabase.auth.signOut();
			
			if (error) {
				console.error('Error signing out:', error);
				update(state => ({ ...state, loading: false }));
				return { error };
			}

			// The onAuthStateChange listener will handle the redirect
			return { error: null };
		},

		/**
		 * Clean up auth state change listener and activity tracking
		 */
		teardown: () => {
			unsubscribe?.();
			unsubscribe = null;
			activityService.destroy();
		},

		/**
		 * Get activity service for debugging/monitoring
		 */
		getActivityService: () => activityService
	};
}

export const auth = createAuthStore();

// Create a derived store for just the user
export const user = writable<User | null>(null);

// Update user store when auth changes
auth.subscribe(state => {
	user.set(state.user);
});