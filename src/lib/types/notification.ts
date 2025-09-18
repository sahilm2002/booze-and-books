export enum MessageType {
	NOTIFICATION = 'notification',
	CHAT_MESSAGE = 'chat_message'
}

export enum NotificationType {
	SWAP_REQUEST = 'SWAP_REQUEST',
	SWAP_ACCEPTED = 'SWAP_ACCEPTED',
	SWAP_COUNTER_OFFER = 'SWAP_COUNTER_OFFER',
	SWAP_CANCELLED = 'SWAP_CANCELLED',
	SWAP_COMPLETED = 'SWAP_COMPLETED',
	SWAP_APPROVED = 'swap_approved',
	COUNTER_OFFER_RECEIVED = 'counter_offer_received',
	DAILY_REMINDER_PENDING_SWAPS = 'daily_reminder_pending_swaps',
	DAILY_REMINDER_COUNTER_OFFERS = 'daily_reminder_counter_offers',
	DAILY_REMINDER_ACCEPTED_SWAPS = 'daily_reminder_accepted_swaps',
	CHAT_MESSAGE = 'CHAT_MESSAGE',
	CHAT_MESSAGE_RECEIVED = 'CHAT_MESSAGE_RECEIVED'
}

export interface Notification {
	id: string;
	user_id: string;
	type: NotificationType;
	title: string;
	message: string;
	data: NotificationData;
	is_read: boolean;
	created_at: string;
	message_type: MessageType;
	conversation_id?: string;
	attachment_url?: string;
	attachment_type?: string;
	attachment_size?: number;
	sender_id?: string;
	recipient_id?: string;
}

export interface NotificationInput {
	user_id: string;
	type: NotificationType;
	title: string;
	message: string;
	data?: NotificationData;
}

export type NotificationData = 
	| SwapRequestNotificationData
	| SwapAcceptedNotificationData
	| SwapCounterOfferNotificationData
	| SwapCancelledNotificationData
	| SwapCompletedNotificationData
	| SwapApprovedNotificationData
	| CounterOfferReceivedNotificationData
	| DailyReminderNotificationData
	| ChatMessageNotificationData
	| ChatMessageReceivedNotificationData;

export interface SwapRequestNotificationData {
	swap_request_id: string;
	book_id: string;
	requester_id: string;
}

export interface SwapAcceptedNotificationData {
	swap_request_id: string;
	book_id: string;
	owner_id: string;
}

export interface SwapCounterOfferNotificationData {
	swap_request_id: string;
	book_id: string;
	counter_offered_book_id: string;
	owner_id: string;
}

export interface SwapCancelledNotificationData {
	swap_request_id: string;
	book_id: string;
	cancelled_by: string;
}

export interface SwapCompletedNotificationData {
	swap_request_id: string;
	book_id: string;
	rating: number;
	completed_by: string;
}

export interface SwapApprovedNotificationData {
	swap_request_id: string;
}

export interface CounterOfferReceivedNotificationData {
	swap_request_id: string;
}

export interface DailyReminderNotificationData {
	swap_count: number;
	swap_request_ids: string[];
	reminder_type: 'pending_swaps' | 'counter_offers' | 'accepted_swaps';
}

// Chat-specific interfaces
export interface ChatMessage extends Notification {
	message_type: MessageType.CHAT_MESSAGE;
	conversation_id: string;
	sender_id: string;
	recipient_id: string;
}

export interface ChatMessageInput {
	recipient_id: string;
	message: string;
	attachment_url?: string;
	attachment_type?: string;
	attachment_size?: number;
}

export interface Conversation {
	id: string;
	participants: string[];
	last_message?: ChatMessage;
	unread_count: number;
	updated_at: string;
}

export interface ChatAttachment {
	url: string;
	type: string;
	size: number;
	name: string;
}

export interface ChatMessageNotificationData {
	sender_id: string;
	conversation_id: string;
	has_attachment: boolean;
}

export interface ChatMessageReceivedNotificationData {
	sender_id: string;
	conversation_id: string;
	has_attachment: boolean;
}

// Utility types
export type ConversationParticipants = [string, string];

export interface AttachmentValidation {
	maxSize: number;
	allowedTypes: string[];
}

export type ChatMessageFilter = {
	conversation_id?: string;
	sender_id?: string;
	recipient_id?: string;
	has_attachment?: boolean;
	before?: string;
	after?: string;
	limit?: number;
};
