import { writable } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase';
import { goto, invalidateAll } from '$app/navigation';
import { browser } from '$app/environment';
import { activityService } from '$lib/services/activityService';
import { onlineStatusService } from '$lib/services/onlineStatusService';

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
			await auth.signOutToHomepage();
		});
	};

	return {
		subscribe,
		
		/**
		 * Check if user is authenticated - simplified for client-side only
		 */
		ensureValidSession: async (): Promise<boolean> => {
			try {
				// Validate against Supabase Auth server to avoid stale client cache
				const { data: userData, error: userError } = await supabase.auth.getUser();
				if (userError) {
					console.error('Error validating user via getUser:', userError);
					await auth.signOut();
					return false;
				}
				if (!userData?.user) {
					console.log('No authenticated user found (server-validated)');
					await auth.signOut();
					return false;
				}

				// Fetch session after validating user to sync tokens/expiry
				const { data: { session }, error: sessionError } = await supabase.auth.getSession();
				if (sessionError || !session) {
					console.warn('Validated user but no session available, signing out');
					await auth.signOut();
					return false;
				}

				// Update store with current, validated session
				update(state => ({
					...state,
					session,
					user: userData.user,
					loading: false
				}));
				return true;
			} catch (error) {
				console.error('Error ensuring valid session (server-validation):', error);
				await auth.signOut();
				return false;
			}
		},

		/**
		 * Initialize the auth store - client-side only
		 */
		initialize: (session: Session | null = null) => {
			// Start with provided session or try to get current session
			if (browser) {
				// Get current session on initialization
				supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
					const finalSession = session || currentSession;

					// Server-validate the session to avoid stale client state
					const { data: userData, error: userError } = await supabase.auth.getUser().catch((e) => ({ data: null, error: e as any }));
					if (userError || !userData?.user) {
						console.warn('Initial session present but user validation failed; enforcing logout');
						set({ session: null, user: null, loading: false });
						await auth.signOutToHomepage();
						return;
					}

					set({
						session: finalSession ?? null,
						user: userData.user,
						loading: false
					});

					// If we have a validated user, start activity + online status tracking
					if (userData.user) {
						console.log('Initializing services for user:', userData.user.email);
						initializeActivityService();
						onlineStatusService.startTracking(userData.user.id);
					} else {
						console.log('No validated user found, services not initialized');
					}
				}).catch(error => {
					console.error('Error getting initial session:', error);
					set({
						session: null,
						user: null,
						loading: false
					});
				});

				// Set up auth state change listener
				unsubscribe?.();
				const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
					console.log('Auth state changed:', event, session?.user?.email);
					
					// Update store with new session
					update(state => ({
						...state,
						session,
						user: session?.user ?? null,
						loading: false
					}));

					// Handle sign out
					if (event === 'SIGNED_OUT') {
						console.log('User signed out, destroying services');
						activityService.destroy();
						onlineStatusService.stopTracking();
						await goto('/auth/login', { replaceState: true });
					}
					
					// Handle sign in - start activity tracking and online status tracking (no redirect)
					if (event === 'SIGNED_IN' && session) {
						console.log('User signed in, initializing services');
						initializeActivityService();
						onlineStatusService.startTracking(session.user.id);
						await invalidateAll();
						// Login component handles redirect directly - no redirect here
					}
					
					// Handle token refresh
					if (event === 'TOKEN_REFRESHED' && session) {
						console.log('Token refreshed, reinitializing services');
						initializeActivityService();
						onlineStatusService.startTracking(session.user.id);
						await invalidateAll();
					}
				});
				unsubscribe = () => subscription.unsubscribe();
			} else {
				// Server-side: just set the provided session
				set({
					session,
					user: session?.user ?? null,
					loading: false
				});
			}
		},

		/**
		 * Set loading state
		 */
		setLoading: (loading: boolean) => {
			update(state => ({ ...state, loading }));
		},

		/**
		 * Sign out the current user - client-side only
		 */
		signOut: async () => {
			update(state => ({ ...state, loading: true }));
			
			try {
				// Sign out from Supabase client-side
				const { error } = await supabase.auth.signOut();

				if (error) {
					console.error('Error signing out:', error);
					update(state => ({ ...state, loading: false }));
					return { error };
				}

				// Clear auth state
				set({
					session: null,
					user: null,
					loading: false
				});

				// Stop activity tracking and online status tracking
				activityService.destroy();
				onlineStatusService.stopTracking();

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
		 * Sign out the current user and redirect to homepage - for auto-logout
		 */
		signOutToHomepage: async () => {
			update(state => ({ ...state, loading: true }));
			
			try {
				// Sign out from Supabase client-side
				const { error } = await supabase.auth.signOut();

				if (error) {
					console.error('Error signing out:', error);
					update(state => ({ ...state, loading: false }));
					return { error };
				}

				// Clear auth state
				set({
					session: null,
					user: null,
					loading: false
				});

				// Stop activity tracking and online status tracking
				activityService.destroy();
				onlineStatusService.stopTracking();

				// Redirect to homepage instead of login
				await goto('/', { replaceState: true });

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
