import { writable } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase';
import { goto, invalidateAll } from '$app/navigation';
import { browser } from '$app/environment';

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
						await goto('/auth/login', { replaceState: true });
					}
					
					// Handle sign in
					if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
						await invalidateAll();
					}
				});
				unsubscribe = () => subscription.unsubscribe();
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
		 * Clean up auth state change listener
		 */
		teardown: () => {
			unsubscribe?.();
			unsubscribe = null;
		}
	};
}

export const auth = createAuthStore();