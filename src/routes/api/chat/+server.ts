import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { ChatServiceServer } from '$lib/services/chatService';
import type { ChatMessageInput } from '$lib/types/notification';

// Helper function to sanitize and validate query parameters
function sanitizeQueryParams(url: URL) {
	const rawLimit = url.searchParams.get('limit');
	const rawOffset = url.searchParams.get('offset');
	
	// Parse and sanitize limit (default: 50, min: 1, max: 100)
	let limit = parseInt(rawLimit || '50');
	if (isNaN(limit) || limit < 1) {
		limit = 50;
	} else if (limit > 100) {
		limit = 100;
	}
	
	// Parse and sanitize offset (default: 0, min: 0)
	let offset = parseInt(rawOffset || '0');
	if (isNaN(offset) || offset < 0) {
		offset = 0;
	}
	
	return { limit, offset };
}

// Helper function to validate attachment
function validateAttachment(attachment_url?: string, attachment_type?: string, attachment_size?: number) {
	if (!attachment_url) return; // No attachment is valid
	
	// Validate attachment size (10MB limit)
	if (attachment_size && attachment_size > 10 * 1024 * 1024) {
		throw new Error('Attachment size exceeds 10MB limit');
	}
	
	// Validate MIME type
	const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
	if (attachment_type && !allowedTypes.includes(attachment_type)) {
		throw new Error('Invalid attachment type. Allowed: JPEG, PNG, GIF, PDF');
	}
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const action = url.searchParams.get('action');
	const conversationId = url.searchParams.get('conversationId');
	const { limit, offset } = sanitizeQueryParams(url);

	try {
		switch (action) {
			case 'conversations': {
				const conversations = await ChatServiceServer.getConversations(supabase, session.user.id);
				return json({ conversations });
			}

			case 'history': {
				if (!conversationId) {
					return json({ error: 'Conversation ID is required' }, { status: 400 });
				}
				const messages = await ChatServiceServer.getChatHistory(supabase, conversationId, session.user.id, limit, offset);
				return json({ messages });
			}

			default: {
				return json({ error: 'Invalid action' }, { status: 400 });
			}
		}
	} catch (error) {
		// Generate error reference ID for support correlation
		const errorId = `chat-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		console.error(`Chat API GET error [${errorId}]:`, error);
		return json(
			{ 
				error: 'Internal server error processing chat request',
				errorId 
			},
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
			case 'send': {
				const { recipient_id, message, attachment_url, attachment_type, attachment_size } = body;
				
				// Validate required fields
				if (!recipient_id || !message) {
					return json({ error: 'Recipient ID and message are required' }, { status: 400 });
				}

				// Prevent sending messages to self
				if (recipient_id === session.user.id) {
					return json({ error: 'Cannot send messages to yourself' }, { status: 400 });
				}

				// Validate attachment if present
				try {
					validateAttachment(attachment_url, attachment_type, attachment_size);
				} catch (attachmentError) {
					return json({ 
						error: attachmentError instanceof Error ? attachmentError.message : 'Invalid attachment' 
					}, { status: 400 });
				}

				const messageInput: ChatMessageInput = {
					recipient_id,
					message,
					attachment_url,
					attachment_type,
					attachment_size
				};

				const sentMessage = await ChatServiceServer.sendMessage(supabase, session.user.id, messageInput);
				return json({ message: sentMessage });
			}

			case 'markAsRead': {
				const { conversationId } = body;
				
				if (!conversationId) {
					return json({ error: 'Conversation ID is required' }, { status: 400 });
				}

				await ChatServiceServer.markMessagesAsRead(supabase, conversationId, session.user.id);
				return json({ success: true });
			}

			default: {
				return json({ error: 'Invalid action' }, { status: 400 });
			}
		}
	} catch (error) {
		// Generate error reference ID for support correlation
		const errorId = `chat-post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		console.error(`Chat API POST error [${errorId}]:`, error);
		return json(
			{ 
				error: 'Failed to process chat request',
				errorId 
			},
			{ status: 500 }
		);
	}
};
