import { error } from '@sveltejs/kit';
import type { ProfilePageData, SwapHistoryItem } from '$lib/types/profile';

export const load = async ({ params, locals }: { params: any; locals: any }) => {
	const { supabase, session } = locals;

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { username } = params;

	try {
		// Get the profile by username
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('id, username, full_name, avatar_url, bio, location, created_at, updated_at')
			.eq('username', username)
			.single();

		if (profileError || !profile) {
			throw error(404, 'User not found');
		}

		// Don't allow users to view their own profile via this route
		if (profile.id === session.user.id) {
			throw error(400, 'Cannot view your own profile via this route');
		}

		// Get swap history between current user and profile user
		const { data: swapHistory, error: swapError } = await supabase
			.from('swap_requests')
			.select(`
				id,
				status,
				created_at,
				completed_at,
				requester_id,
				owner_id,
				book:books!swap_requests_book_id_fkey(id, title)
			`)
			.or(`and(requester_id.eq.${session.user.id},owner_id.eq.${profile.id}),and(requester_id.eq.${profile.id},owner_id.eq.${session.user.id})`)
			.order('created_at', { ascending: false });

		if (swapError) {
			console.error('Error fetching swap history:', swapError);
		}

		// Transform swap history to include user role
		const transformedSwapHistory: SwapHistoryItem[] = (swapHistory || []).map((swap: any) => ({
			id: swap.id,
			book_title: (swap.book as any)?.title || 'Unknown Book',
			book_id: (swap.book as any)?.id || '',
			status: swap.status,
			created_at: swap.created_at,
			completed_at: swap.completed_at,
			user_role: swap.requester_id === session.user.id ? 'requester' : 'owner',
			other_user: {
				id: profile.id,
				username: profile.username,
				full_name: profile.full_name,
				avatar_url: profile.avatar_url
			}
		}));

		// Check if there's existing chat history between users
		const { data: chatHistory } = await supabase
			.from('notifications')
			.select('conversation_id')
			.eq('message_type', 'chat_message')
			.or(`and(sender_id.eq.${session.user.id},recipient_id.eq.${profile.id}),and(sender_id.eq.${profile.id},recipient_id.eq.${session.user.id})`)
			.limit(1);

		// Generate conversation ID (deterministic based on user IDs)
		const conversationId = session.user.id < profile.id 
			? `${session.user.id}_${profile.id}` 
			: `${profile.id}_${session.user.id}`;

		const profilePageData: ProfilePageData = {
			profile: {
				id: profile.id,
				username: profile.username,
				full_name: profile.full_name,
				bio: profile.bio,
				location: profile.location,
				avatar_url: profile.avatar_url,
				created_at: profile.created_at,
				updated_at: profile.updated_at
			},
			swap_history_with_current_user: transformedSwapHistory,
			can_chat: true, // Users can always chat with each other
			conversation_id: conversationId
		};

		return {
			profileData: profilePageData
		};

	} catch (err) {
		console.error('Error loading profile:', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to load profile');
	}
};
