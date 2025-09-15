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

	const initializeActivityService = () => {
		activityService.initialize(async () => {
			console.log('Auto-logout triggered due to inactivity');
			await auth.signOut();
		});
	};

	return {
		subscribe,
		
		/**
		 * Check if user is authenticated and session is valid
		 * Uses getUser() for secure server-side verification
		 */
		ensureValidSession: async (): Promise<boolean> => {
			try {
				// Use getUser() instead of getSession() for security
				const { data: { user }, error } = await supabase.auth.getUser();
				
				if (error) {
					console.error('Error getting user:', error);
					return false;
				}
				
				if (!user) {
					console.log('No authenticated user found');
					await auth.signOut();
					return false;
				}
				
				// User is authenticated and verified by Supabase server
				return true;
			} catch (error) {
				console.error('Error ensuring valid session:', error);
				await auth.signOut();
				return false;
			}
		},

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
					
					// For security, verify user data with server when session changes
					if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
						try {
							// Verify user with server for security
							const { data: { user }, error } = await supabase.auth.getUser();
							if (error || !user) {
								console.error('Failed to verify user after auth change:', error);
								await auth.signOut();
								return;
							}
							
							update(state => ({
								...state,
								session,
								user, // Use server-verified user data
								loading: false
							}));
						} catch (error) {
							console.error('Error verifying user:', error);
							await auth.signOut();
							return;
						}
					} else {
						// For sign out or other events, use session data directly
						update(state => ({
							...state,
							session,
							user: session?.user ?? null,
							loading: false
						}));
					}

					// Handle sign out
					if (event === 'SIGNED_OUT') {
						// Stop activity tracking when user signs out
						activityService.destroy();
						await goto('/auth/login', { replaceState: true });
					}
					
					// Handle sign in - start activity tracking
					if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
						// Initialize activity tracking for auto-logout
						initializeActivityService();
						await invalidateAll();
					}
				});
				unsubscribe = () => subscription.unsubscribe();
				
				// If we already have a session, start activity tracking
				if (session) {
					initializeActivityService();
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
		 * Sign out the current user using custom JWT endpoint
		 */
		signOut: async () => {
			update(state => ({ ...state, loading: true }));
			
			try {
				// Use custom JWT logout endpoint
				const response = await fetch('/api/auth/logout', {
					method: 'POST'
				});

				if (!response.ok) {
					console.error('Error signing out:', response.statusText);
					update(state => ({ ...state, loading: false }));
					return { error: new Error('Logout failed') };
				}

				// Also sign out from Supabase for complete cleanup
				await supabase.auth.signOut();

				// Clear auth state
				set({
					session: null,
					user: null,
					loading: false
				});

				// Stop activity tracking
				activityService.destroy();

				// Redirect to login
				await goto('/auth/login', { replaceState: true });

				return { error: null };
			} catch (error) {
				console.error('Error signing out:', error);
				update(state => ({ ...state, loading: false }));
				return { error: error as Error };
			}
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
