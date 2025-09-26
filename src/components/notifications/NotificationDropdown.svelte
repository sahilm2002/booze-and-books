<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { NotificationServiceServer } from '$lib/services/notificationServiceServer';
	import { ChatService } from '$lib/services/chatService';
	import { NotificationType } from '$lib/types/notification';
	import type { Notification, Conversation } from '$lib/types/notification';
	import type { SupabaseClient } from '@supabase/supabase-js';

	export let isOpen = false;
	export let supabase: SupabaseClient;
	export let userId: string;

	const dispatch = createEventDispatcher();

	let notifications: Notification[] = [];
	let conversations: Conversation[] = [];
	let loading = false;

	$: if (isOpen) {
		loadNotificationsAndChats();
	}

	async function loadNotificationsAndChats() {
		try {
			loading = true;
			
			// Load system notifications (excluding chat messages)
			const { data: notificationData, error: notificationError } = await supabase
				.from('notifications')
				.select('*')
				.eq('user_id', userId)
				.eq('message_type', 'notification')
				.order('created_at', { ascending: false })
				.limit(10);

			if (notificationError) {
				console.error('Failed to load notifications:', notificationError);
			} else {
				notifications = notificationData || [];
			}

			// Load recent conversations with unread messages
			conversations = await ChatService.getConversations(userId);
			// Only show conversations with unread messages in the dropdown
			conversations = conversations.filter(conv => conv.unread_count > 0);

		} catch (error) {
			console.error('Failed to load notifications and chats:', error);
		} finally {
			loading = false;
		}
	}

	async function markNotificationAsRead(notification: Notification) {
		try {
			await NotificationServiceServer.markAsRead(supabase, notification.id);
			// Remove from local list
			notifications = notifications.filter(n => n.id !== notification.id);
			
			// Navigate to relevant page based on notification type
			handleNotificationClick(notification);
		} catch (error) {
			console.error('Failed to mark notification as read:', error);
		}
	}

	function handleNotificationClick(notification: Notification) {
		// Dispatch event to parent to handle navigation
		dispatch('notificationClick', {
			type: 'notification',
			notification
		});
	}

	function handleChatClick(conversation: Conversation) {
		// Dispatch event to parent to open chat modal
		dispatch('notificationClick', {
			type: 'chat',
			conversation
		});
	}

	async function markAllAsRead() {
		try {
			await NotificationServiceServer.markAllAsRead(supabase, userId);
			notifications = [];
			conversations = [];
			dispatch('allMarkedAsRead');
		} catch (error) {
			console.error('Failed to mark all as read:', error);
		}
	}

	function formatTime(dateString: string) {
		const date = new Date(dateString);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

		if (diffInMinutes < 1) {
			return 'Just now';
		} else if (diffInMinutes < 60) {
			return `${diffInMinutes}m ago`;
		} else if (diffInMinutes < 1440) {
			return `${Math.floor(diffInMinutes / 60)}h ago`;
		} else {
			return `${Math.floor(diffInMinutes / 1440)}d ago`;
		}
	}

	function getNotificationIcon(type: NotificationType) {
		switch (type) {
			case NotificationType.SWAP_ACCEPTED:
				return '✅';
			case NotificationType.SWAP_COMPLETED:
				return '🎉';
			case NotificationType.SWAP_CANCELLED:
				return '🚫';
			case NotificationType.SWAP_COUNTER_OFFER:
			case NotificationType.COUNTER_OFFER_RECEIVED:
				return '🔄';
			case NotificationType.SWAP_REQUEST:
				return '📩';
			case NotificationType.SWAP_APPROVED:
				return '👍';
			case NotificationType.DAILY_REMINDER_PENDING_SWAPS:
			case NotificationType.DAILY_REMINDER_COUNTER_OFFERS:
			case NotificationType.DAILY_REMINDER_ACCEPTED_SWAPS:
				return '⏰';
			case NotificationType.CHAT_MESSAGE:
			case NotificationType.CHAT_MESSAGE_RECEIVED:
				return '💬';
			default:
				return '📢';
		}
	}

	function truncateMessage(message: string, maxLength = 60) {
		return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
	}
</script>

{#if isOpen}
	<div class="dropdown-overlay" on:click={() => dispatch('close')}>
		<div class="dropdown-content" on:click|stopPropagation>
			<div class="dropdown-header">
				<h3>Notifications</h3>
				{#if notifications.length > 0 || conversations.length > 0}
					<button class="mark-all-btn" on:click={markAllAsRead}>
						Mark all as read
					</button>
				{/if}
			</div>

			<div class="dropdown-body">
				{#if loading}
					<div class="loading">
						<div class="loading-spinner"></div>
						<p>Loading...</p>
					</div>
				{:else if notifications.length === 0 && conversations.length === 0}
					<div class="empty-state">
						<div class="empty-icon">🔔</div>
						<p>No new notifications</p>
					</div>
				{:else}
					<!-- Chat Messages -->
					{#if conversations.length > 0}
						<div class="section">
							<h4>Messages</h4>
							{#each conversations as conversation (conversation.id)}
								<div 
									class="notification-item chat-item" 
									tabindex="0"
									role="button"
									aria-label="Open chat with {conversation.other_participant?.full_name || conversation.other_participant?.username || 'Unknown User'}"
									on:click={() => handleChatClick(conversation)}
									on:keydown={(event) => {
										if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
											event.preventDefault();
											handleChatClick(conversation);
										}
									}}
								>
									<div class="item-icon">
										{#if conversation.other_participant?.avatar_url}
											<img 
												src={conversation.other_participant.avatar_url} 
												alt={conversation.other_participant.username}
												class="avatar"
											/>
										{:else}
											<div class="avatar-placeholder">
												{conversation.other_participant?.username?.charAt(0)?.toUpperCase() || '?'}
											</div>
										{/if}
									</div>
									<div class="item-content">
										<div class="item-header">
											<span class="sender-name">
												{conversation.other_participant?.full_name || conversation.other_participant?.username || 'Unknown User'}
											</span>
											<span class="item-time">
												{formatTime(conversation.updated_at)}
											</span>
										</div>
										<p class="item-message">
											{truncateMessage(conversation.last_message?.message || 'New message')}
										</p>
										{#if conversation.unread_count > 1}
											<div class="unread-count">
												{conversation.unread_count} new messages
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<!-- System Notifications -->
					{#if notifications.length > 0}
						<div class="section">
							<h4>System Notifications</h4>
							{#each notifications as notification (notification.id)}
								<div 
									class="notification-item system-item" 
									tabindex="0"
									role="button"
									aria-label="Mark notification as read: {notification.title}"
									on:click={() => markNotificationAsRead(notification)}
									on:keydown={(event) => {
										if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
											event.preventDefault();
											markNotificationAsRead(notification);
										}
									}}
									class:unread={!notification.is_read}
								>
									<div class="item-icon">
										<span class="notification-emoji">
											{getNotificationIcon(notification.type)}
										</span>
									</div>
									<div class="item-content">
										<div class="item-header">
											<span class="notification-title">
												{notification.title}
											</span>
											<span class="item-time">
												{formatTime(notification.created_at)}
											</span>
										</div>
										<p class="item-message">
											{truncateMessage(notification.message)}
										</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.dropdown-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 999;
	}

	.dropdown-content {
		position: absolute;
		top: 60px;
		right: 2rem;
		width: 380px;
		max-width: calc(100vw - 4rem);
		background: white;
		border-radius: 12px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		border: 1px solid #e5e7eb;
		max-height: 500px;
		display: flex;
		flex-direction: column;
	}

	.dropdown-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.dropdown-header h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: #111827;
	}

	.mark-all-btn {
		background: none;
		border: none;
		color: #6366f1;
		font-size: 0.875rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.mark-all-btn:hover {
		background: #f3f4f6;
	}

	.dropdown-body {
		flex: 1;
		overflow-y: auto;
		max-height: 400px;
	}

	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		color: #6b7280;
	}

	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid #e5e7eb;
		border-top: 2px solid #6366f1;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 0.5rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		color: #6b7280;
	}

	.empty-icon {
		font-size: 2rem;
		margin-bottom: 0.5rem;
		opacity: 0.5;
	}

	.section {
		border-bottom: 1px solid #f3f4f6;
	}

	.section:last-child {
		border-bottom: none;
	}

	.section h4 {
		margin: 0;
		padding: 0.75rem 1rem 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.notification-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.notification-item:hover,
	.notification-item:focus {
		background: #f9fafb;
		outline: none;
	}

	.notification-item:focus {
		box-shadow: 0 0 0 2px #6366f1;
	}

	.notification-item.unread {
		background: #f0f9ff;
	}

	.notification-item.unread:hover,
	.notification-item.unread:focus {
		background: #e0f2fe;
	}

	.item-icon {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
	}

	.avatar-placeholder {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: #6366f1;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.notification-emoji {
		font-size: 1.5rem;
	}

	.item-content {
		flex: 1;
		min-width: 0;
	}

	.item-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.25rem;
	}

	.sender-name,
	.notification-title {
		font-weight: 600;
		color: #111827;
		font-size: 0.875rem;
	}

	.item-time {
		font-size: 0.75rem;
		color: #6b7280;
		flex-shrink: 0;
	}

	.item-message {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.unread-count {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #6366f1;
		font-weight: 500;
	}

	.chat-item {
		border-left: 3px solid #6366f1;
	}

	.system-item.unread {
		border-left: 3px solid #10b981;
	}
</style>
