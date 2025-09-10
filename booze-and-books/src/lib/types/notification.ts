export enum NotificationType {
	SWAP_REQUEST = 'SWAP_REQUEST',
	SWAP_ACCEPTED = 'SWAP_ACCEPTED',
	SWAP_COUNTER_OFFER = 'SWAP_COUNTER_OFFER',
	SWAP_CANCELLED = 'SWAP_CANCELLED',
	SWAP_COMPLETED = 'SWAP_COMPLETED'
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
	| SwapCompletedNotificationData;

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