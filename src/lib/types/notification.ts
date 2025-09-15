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
	DAILY_REMINDER_ACCEPTED_SWAPS = 'daily_reminder_accepted_swaps'
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
	| DailyReminderNotificationData;

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
