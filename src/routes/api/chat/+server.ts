import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { ChatServiceServer } from '$lib/services/chatService';
import type { ChatMessageInput } from '$lib/types/notification';
import { ChatEmailDigestServer } from '$lib/services/chatEmailDigestServer';

export const GET: RequestHandler = async ({ url, locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const action = url.searchParams.get('action');
	const conversationId = url.searchParams.get('conversationId');
	const limit = parseInt(url.searchParams.get('limit') || '50');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	try {
		switch (action) {
			case 'conversations':
				const conversations = await ChatServiceServer.getConversations(supabase, session.user.id);
				return json({ conversations });

			case 'history':
				if (!conversationId) {
					return json({ error: 'Conversation ID is required' }, { status: 400 });
				}
				const messages = await ChatServiceServer.getChatHistory(supabase, conversationId, limit, offset);
				return json({ messages });

			default:
				return json({ error: 'Invalid action' }, { status: 400 });
		}
	} catch (error) {
		console.error('Chat API error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to process chat request' },
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { action } = body;

		switch (action) {
			case 'send':
				const { recipient_id, message, attachment_url, attachment_type, attachment_size } = body;
				
				if (!recipient_id || !message) {
					return json({ error: 'Recipient ID and message are required' }, { status: 400 });
				}

				const messageInput: ChatMessageInput = {
					recipient_id,
					message,
					attachment_url,
					attachment_type,
					attachment_size
				};

				const sentMessage = await ChatServiceServer.sendMessage(supabase, session.user.id, messageInput);

				// After sending, trigger offline chat digest (max 1/day, excludes auto_generated)
				try {
					await ChatEmailDigestServer.maybeSendDigest(supabase, recipient_id);
				} catch (e) {
					console.error('Failed to trigger chat email digest:', e);
				}

				return json({ message: sentMessage });

			case 'markAsRead':
				const { conversationId } = body;
				
				if (!conversationId) {
					return json({ error: 'Conversation ID is required' }, { status: 400 });
				}

				await ChatServiceServer.markMessagesAsRead(supabase, conversationId, session.user.id);
				return json({ success: true });

			default:
				return json({ error: 'Invalid action' }, { status: 400 });
		}
	} catch (error) {
		console.error('Chat API error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to process chat request' },
			{ status: 500 }
		);
	}
};
