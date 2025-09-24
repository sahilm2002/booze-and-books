import type { Session, User, SupabaseClient } from '@supabase/supabase-js';
import type { PrivateProfile } from '$lib/types/profile';
import type { Book, BookWithOwner } from '$lib/types/book';
import type { SwapRequestWithBook } from '$lib/types/swap';
import type { Notification } from '$lib/types/notification';

// Sanitized user type that excludes sensitive tokens and metadata
export interface SafeUser {
	id: string;
	email?: string;
	user_metadata?: {
		full_name?: string;
		avatar_url?: string;
	};
}

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session: Session | null;
			user: User | null;
		}
		interface PageData {
			session: Session | null;
			profile: PrivateProfile | null;
			user: SafeUser | null;
			bookCount?: number;
			recentBooks?: Book[];
			books?: Book[];
			error?: string;
			// Swap request related data
			incomingSwapCount?: number;
			outgoingSwapCount?: number;
			incomingRequests?: SwapRequestWithBook[];
			outgoingRequests?: SwapRequestWithBook[];
			// Notification related data
			unreadNotificationCount?: number;
			notifications?: Notification[];
			// Discovery related data
			availableBooks?: BookWithOwner[];
			// Book detail page data
			book?: BookWithOwner;
			ownerRating?: {
				average_rating: number;
				total_ratings: number;
				ratings_breakdown: { [key: number]: number };
			};
			canRequestSwap?: boolean;
			isOwner?: boolean;
			// Completion statistics
			completionRate?: number;
			averageRating?: number;
			completedSwapsCount?: number;
			// Real-time connection status
			realtimeConnected?: boolean;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
