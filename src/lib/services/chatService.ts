import { supabase } from '$lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatMessage, ChatMessageInput, Conversation, ChatAttachment } from '../types/notification.js';
import { MessageType } from '../types/notification.js';

export class ChatService {
	// Send a chat message
	static async sendMessage(input: ChatMessageInput): Promise<ChatMessage> {
		// Fetch and validate the authenticated user
		const auth = await supabase.auth.getUser();
		if (!auth.data.user) {
			throw new Error('Unauthenticated');
		}
		
		const senderId = auth.data.user.id;

		// Generate deterministic conversation ID from participant pair
		const conversationId = senderId < input.recipient_id 
			? `${senderId}_${input.recipient_id}` 
			: `${input.recipient_id}_${senderId}`;

		const { data, error } = await supabase
			.from('notifications')
			.insert({
				message_type: MessageType.CHAT_MESSAGE,
				sender_id: senderId,
				recipient_id: input.recipient_id,
				conversation_id: conversationId,
				title: 'Chat Message',
				message: input.message,
				attachment_url: input.attachment_url,
				attachment_type: input.attachment_type,
				attachment_size: input.attachment_size,
				data: {}
			})
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to send chat message: ${error.message}`);
		}

		return data as ChatMessage;
	}

	// Get chat conversations for a user
	static async getConversations(userId: string): Promise<Conversation[]> {
		// First get the chat messages without JOINs
		const { data, error } = await supabase
			.from('notifications')
			.select(`
				conversation_id,
				sender_id,
				recipient_id,
				message,
				created_at,
				is_read
			`)
			.eq('message_type', MessageType.CHAT_MESSAGE)
			.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
			.order('created_at', { ascending: false });

		if (error) {
			throw new Error(`Failed to fetch conversations: ${error.message}`);
		}

		// Group by conversation_id and get the latest message for each
		const conversationMap = new Map<string, any>();
		const userIds = new Set<string>();
		
		data?.forEach(message => {
			const conversationId = message.conversation_id;
			
			// Skip messages with missing conversation_id to avoid collapsing under "undefined" key
			if (!conversationId) {
				// Still collect user IDs for profile lookup even if conversation_id is missing
				if (message.sender_id) userIds.add(message.sender_id);
				if (message.recipient_id) userIds.add(message.recipient_id);
				return;
			}
			
			if (!conversationMap.has(conversationId) || 
				new Date(message.created_at) > new Date(conversationMap.get(conversationId).created_at)) {
				conversationMap.set(conversationId, message);
			}
			// Collect user IDs for profile lookup
			if (message.sender_id) userIds.add(message.sender_id);
			if (message.recipient_id) userIds.add(message.recipient_id);
		});

		// Get profiles for all users in separate query
		let profiles: any[] = [];
		if (userIds.size > 0) {
			const { data } = await supabase
				.from('profiles')
				.select('id, username, full_name, avatar_url')
				.in('id', Array.from(userIds));
			profiles = data || [];
		}

		const profileMap = new Map();
		profiles.forEach(profile => {
			profileMap.set(profile.id, profile);
		});

		// Get unread counts for all conversations in a single query using SQL COUNT
		const conversationIds = Array.from(conversationMap.keys());
		const unreadCountMap = new Map<string, number>();
		
		if (conversationIds.length > 0) {
			// Use a more efficient approach with SQL aggregation
			const { data: unreadCounts } = await supabase
				.rpc('get_unread_counts_by_conversation', {
					conversation_ids: conversationIds,
					user_id: userId
				});

			// If RPC function doesn't exist, fall back to the current approach but optimized
			if (!unreadCounts) {
				const { data: unreadMessages } = await supabase
					.from('notifications')
					.select('conversation_id')
					.in('conversation_id', conversationIds)
					.eq('recipient_id', userId)
					.eq('is_read', false)
					.eq('message_type', MessageType.CHAT_MESSAGE);

				// Build a map of conversation_id -> count
				unreadMessages?.forEach(row => {
					const count = unreadCountMap.get(row.conversation_id) || 0;
					unreadCountMap.set(row.conversation_id, count + 1);
				});
			} else {
				// Use the RPC results
				unreadCounts.forEach((row: any) => {
					unreadCountMap.set(row.conversation_id, row.unread_count);
				});
			}
		}

		// Convert to Conversation objects
		const conversations: Conversation[] = [];
		for (const [conversationId, lastMessage] of conversationMap) {
			// Determine the other participant
			const otherParticipantId = lastMessage.sender_id === userId 
				? lastMessage.recipient_id 
				: lastMessage.sender_id;
			const otherParticipant = profileMap.get(otherParticipantId);

			conversations.push({
				id: conversationId,
				participants: [lastMessage.sender_id, lastMessage.recipient_id],
				last_message: lastMessage as ChatMessage,
				unread_count: unreadCountMap.get(conversationId) || 0,
				updated_at: lastMessage.created_at,
				other_participant: otherParticipant
			});
		}

		// Sort by most recent activity
		return conversations.sort((a, b) => 
			new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
		);
	}

	// Get chat history for a specific conversation
	static async getChatHistory(
		conversationId: string, 
		limit = 50, 
		offset = 0
	): Promise<ChatMessage[]> {
		// Get chat messages without JOINs
		const { data, error } = await supabase
			.from('notifications')
			.select('*')
			.eq('conversation_id', conversationId)
			.eq('message_type', MessageType.CHAT_MESSAGE)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			throw new Error(`Failed to fetch chat history: ${error.message}`);
		}

		if (!data || data.length === 0) {
			return [];
		}

		// Get unique user IDs for profile lookup
		const userIds = new Set<string>();
		data.forEach(message => {
			if (message.sender_id) userIds.add(message.sender_id);
			if (message.recipient_id) userIds.add(message.recipient_id);
		});

		// Get profiles in separate query
		let profiles: any[] = [];
		if (userIds.size > 0) {
			const { data } = await supabase
				.from('profiles')
				.select('id, username, full_name, avatar_url')
				.in('id', Array.from(userIds));
			profiles = data || [];
		}

		const profileMap = new Map();
		profiles.forEach(profile => {
			profileMap.set(profile.id, profile);
		});

		// Attach profile data to messages
		const messagesWithProfiles = data.map(message => ({
			...message,
			sender_profile: profileMap.get(message.sender_id),
			recipient_profile: profileMap.get(message.recipient_id)
		}));

		return messagesWithProfiles.reverse() as ChatMessage[];
	}

	// Get or create conversation between two users
	static async getOrCreateConversation(userId1: string, userId2: string): Promise<string> {
		// Generate deterministic conversation ID
		const conversationId = userId1 < userId2 
			? `${userId1}_${userId2}` 
			: `${userId2}_${userId1}`;

		// Check if conversation exists
		const { data: existing } = await supabase
			.from('notifications')
			.select('conversation_id')
			.eq('conversation_id', conversationId)
			.eq('message_type', MessageType.CHAT_MESSAGE)
			.limit(1);

		if (existing && existing.length > 0) {
			return conversationId;
		}

		// Conversation will be created when first message is sent
		return conversationId;
	}

	// Mark chat messages as read
	static async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
		const { error } = await supabase
			.from('notifications')
			.update({ is_read: true })
			.eq('conversation_id', conversationId)
			.eq('recipient_id', userId)
			.eq('is_read', false)
			.eq('message_type', MessageType.CHAT_MESSAGE);

		if (error) {
			throw new Error(`Failed to mark messages as read: ${error.message}`);
		}
	}

	// Get unread chat messages count
	static async getUnreadChatCount(userId: string): Promise<number> {
		const { count, error } = await supabase
			.from('notifications')
			.select('id', { count: 'exact', head: true })
			.eq('recipient_id', userId)
			.eq('is_read', false)
			.eq('message_type', MessageType.CHAT_MESSAGE);

		if (error) {
			throw new Error(`Failed to count unread chat messages: ${error.message}`);
		}

		return count || 0;
	}

	// Upload chat attachment
	static async uploadAttachment(
		conversationId: string,
		file: File
	): Promise<ChatAttachment> {
		// Validate file size (e.g., 10MB limit)
		const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
		if (file.size > MAX_FILE_SIZE) {
			throw new Error('File size exceeds 10MB limit');
		}

		// Validate file type (customize as needed)
		const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
		if (!ALLOWED_TYPES.includes(file.type)) {
			throw new Error('File type not allowed');
		}

		const fileExt = file.name.split('.').pop() || 'bin';
		const fileName = `${Date.now()}.${fileExt}`;
		const filePath = `conversations/${conversationId}/${fileName}`;

		const { data, error } = await supabase.storage
			.from('chat-attachments')
			.upload(filePath, file);

		if (error) {
			throw new Error(`Failed to upload attachment: ${error.message}`);
		}

		const { data: { publicUrl } } = supabase.storage
			.from('chat-attachments')
			.getPublicUrl(filePath);

		return {
			url: publicUrl,
			type: file.type,
			size: file.size,
			name: file.name
		};
	}

	// Delete chat attachment
	static async deleteAttachment(filePath: string): Promise<void> {
		const { error } = await supabase.storage
			.from('chat-attachments')
			.remove([filePath]);

		if (error) {
			throw new Error(`Failed to delete attachment: ${error.message}`);
		}
	}

	// Get chat participants info
	static async getChatParticipants(conversationId: string): Promise<Array<{
		id: string;
		username: string;
		full_name: string;
		avatar_url: string;
		email: string;
	}>> {
		const { data, error } = await supabase
			.from('notifications')
			.select(`
				sender_id,
				recipient_id,
				sender_profile:profiles!notifications_sender_id_fkey(id, username, full_name, avatar_url, email),
				recipient_profile:profiles!notifications_recipient_id_fkey(id, username, full_name, avatar_url, email)
			`)
			.eq('conversation_id', conversationId)
			.eq('message_type', MessageType.CHAT_MESSAGE)
			.limit(1);

		if (error) {
			throw new Error(`Failed to fetch chat participants: ${error.message}`);
		}

		if (!data || data.length === 0) {
			return [];
		}

		const message = data[0];
		return [message.sender_profile, message.recipient_profile].filter(Boolean) as unknown as Array<{
			id: string;
			username: string;
			full_name: string;
			avatar_url: string;
			email: string;
		}>;
	}
}

// Server-side version for use in API routes
export class ChatServiceServer {
	static async sendMessage(
		supabase: SupabaseClient,
		senderId: string,
		input: ChatMessageInput
	): Promise<ChatMessage> {
		// Generate deterministic conversation ID from participant pair
		const conversationId = senderId < input.recipient_id 
			? `${senderId}_${input.recipient_id}` 
			: `${input.recipient_id}_${senderId}`;

		const { data, error } = await supabase
			.from('notifications')
			.insert({
				message_type: MessageType.CHAT_MESSAGE,
				sender_id: senderId,
				recipient_id: input.recipient_id,
				conversation_id: conversationId,
				title: 'Chat Message',
				message: input.message,
				attachment_url: input.attachment_url,
				attachment_type: input.attachment_type,
				attachment_size: input.attachment_size,
				data: {}
			})
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to send chat message: ${error.message}`);
		}

		return data as ChatMessage;
	}

	static async getConversations(
		supabase: SupabaseClient,
		userId: string
	): Promise<Conversation[]> {
		const { data, error } = await supabase
			.from('notifications')
			.select(`
				conversation_id,
				sender_id,
				recipient_id,
				message,
				created_at,
				is_read,
				sender_profile:profiles!notifications_sender_id_fkey(username, full_name, avatar_url),
				recipient_profile:profiles!notifications_recipient_id_fkey(username, full_name, avatar_url)
			`)
			.eq('message_type', MessageType.CHAT_MESSAGE)
			.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
			.order('created_at', { ascending: false });

		if (error) {
			throw new Error(`Failed to fetch conversations: ${error.message}`);
		}

		// Group by conversation_id and get the latest message for each
		const conversationMap = new Map<string, any>();
		
		data?.forEach(message => {
			const conversationId = message.conversation_id;
			if (!conversationId) return;
			
			if (!conversationMap.has(conversationId) || 
				new Date(message.created_at) > new Date(conversationMap.get(conversationId).created_at)) {
				
				// Determine the other participant
				const otherParticipant = message.sender_id === userId 
					? message.recipient_profile 
					: message.sender_profile;
				
				conversationMap.set(conversationId, {
					...message,
					other_participant: otherParticipant
				});
			}
		});

		// Get unread counts for all conversations in a single query
		const conversationIds = Array.from(conversationMap.keys());
		const { data: unreadCounts } = await supabase
			.from('notifications')
			.select('conversation_id')
			.in('conversation_id', conversationIds)
			.eq('recipient_id', userId)
			.eq('is_read', false)
			.eq('message_type', MessageType.CHAT_MESSAGE);

		// Build a map of conversation_id -> count
		const unreadCountMap = new Map<string, number>();
		unreadCounts?.forEach(row => {
			const count = unreadCountMap.get(row.conversation_id) || 0;
			unreadCountMap.set(row.conversation_id, count + 1);
		});

		// Convert to Conversation objects
		const conversations: Conversation[] = [];
		for (const [conversationId, lastMessage] of conversationMap) {
			conversations.push({
				id: conversationId,
				participants: [lastMessage.sender_id, lastMessage.recipient_id],
				last_message: lastMessage as ChatMessage,
				unread_count: unreadCountMap.get(conversationId) || 0,
				updated_at: lastMessage.created_at,
				other_participant: lastMessage.other_participant
			});
		}

		// Sort by most recent activity
		return conversations.sort((a, b) => 
			new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
		);
	}

	static async getChatHistory(
		supabase: SupabaseClient,
		conversationId: string,
		limit = 50,
		offset = 0
	): Promise<ChatMessage[]> {
		const { data, error } = await supabase
			.from('notifications')
			.select(`
				*,
				sender_profile:profiles!notifications_sender_id_fkey(username, full_name, avatar_url),
				recipient_profile:profiles!notifications_recipient_id_fkey(username, full_name, avatar_url)
			`)
			.eq('conversation_id', conversationId)
			.eq('message_type', MessageType.CHAT_MESSAGE)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			throw new Error(`Failed to fetch chat history: ${error.message}`);
		}

		return (data || []).reverse() as ChatMessage[];
	}

	static async markMessagesAsRead(
		supabase: SupabaseClient,
		conversationId: string,
		userId: string
	): Promise<void> {
		const { error } = await supabase
			.from('notifications')
			.update({ is_read: true })
			.eq('conversation_id', conversationId)
			.eq('recipient_id', userId)
			.eq('is_read', false)
			.eq('message_type', MessageType.CHAT_MESSAGE);

		if (error) {
			throw new Error(`Failed to mark messages as read: ${error.message}`);
		}
	}
}
