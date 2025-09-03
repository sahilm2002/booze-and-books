export enum NotificationType {
	SWAP_REQUEST = 'SWAP_REQUEST',
	SWAP_ACCEPTED = 'SWAP_ACCEPTED',
	SWAP_DECLINED = 'SWAP_DECLINED'
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
	| SwapDeclinedNotificationData;

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

export interface SwapDeclinedNotificationData {
	swap_request_id: string;
	book_id: string;
	owner_id: string;
}