<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { notificationStore } from '$lib/stores/notifications';
	import type { Notification, NotificationType } from '$lib/types/notification';

	export let notification: Notification;

	const dispatch = createEventDispatcher<{
		click: void;
	}>();

	function getNotificationIcon(type: NotificationType): string {
		switch (type) {
			case 'SWAP_REQUEST':
				return 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';
			case 'SWAP_ACCEPTED':
				return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'SWAP_COUNTER_OFFER':
				return 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4';
			case 'SWAP_CANCELLED':
				return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'SWAP_COMPLETED':
				return 'M5 13l4 4L19 7';
			default:
				return 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';
		}
	}

	function getNotificationColor(type: NotificationType): string {
		switch (type) {
			case 'SWAP_REQUEST':
				return 'text-blue-600 bg-blue-100';
			case 'SWAP_ACCEPTED':
				return 'text-green-600 bg-green-100';
			case 'SWAP_COUNTER_OFFER':
				return 'text-yellow-600 bg-yellow-100';
			case 'SWAP_CANCELLED':
				return 'text-red-600 bg-red-100';
			case 'SWAP_COMPLETED':
				return 'text-purple-600 bg-purple-100';
			default:
				return 'text-gray-600 bg-gray-100';
		}
	}

	function formatRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
		
		if (diffInMinutes < 1) return 'Just now';
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
		
		const diffInHours = Math.floor(diffInMinutes / 60);
		if (diffInHours < 24) return `${diffInHours}h ago`;
		
		const diffInDays = Math.floor(diffInHours / 24);
		if (diffInDays < 7) return `${diffInDays}d ago`;
		
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric'
		}).format(date);
	}

	async function handleClick() {
		// Mark as read if not already
		if (!notification.is_read) {
			await notificationStore.markAsRead(notification.id);
		}

		// Navigate based on notification type
		const data = notification.data as any;
		
		if (!$auth.user) {
			goto('/auth/login?redirectTo=/app/swaps');
			return;
		}
		
		switch (notification.type) {
			case 'SWAP_REQUEST':
				// Incoming request - show incoming tab
				goto('/app/swaps?tab=incoming');
				break;
			case 'SWAP_ACCEPTED':
			case 'SWAP_COUNTER_OFFER':
			case 'SWAP_CANCELLED':
			case 'SWAP_COMPLETED':
				// Response to our request - show outgoing tab
				goto('/app/swaps?tab=outgoing');
				break;
			default:
				// Default to swaps page
				goto('/app/swaps');
				break;
		}

		dispatch('click');
	}
</script>

<div 
	class="notification-item"
	class:unread={!notification.is_read}
	on:click={handleClick}
>
	<div class="notification-content">
		<!-- Book Cover or Icon -->
		{#if notification.data?.book_cover}
			<div class="book-cover">
				<img 
					src={notification.data.book_cover} 
					alt={notification.data?.book_title || 'Book cover'}
					loading="lazy"
					on:error={(e) => {
						e.target.parentElement.outerHTML = `
							<div class="notification-icon ${getNotificationColor(notification.type)}">
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${getNotificationIcon(notification.type)}" />
								</svg>
							</div>
						`;
					}}
				/>
			</div>
		{:else}
			<div class="notification-icon {getNotificationColor(notification.type)}">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="{getNotificationIcon(notification.type)}" />
				</svg>
			</div>
		{/if}

		<!-- Content -->
		<div class="notification-text">
			<div class="notification-header">
				<p class="notification-title">
					{notification.title}
				</p>
				{#if !notification.is_read}
					<div class="unread-dot"></div>
				{/if}
			</div>
			
			<p class="notification-message">
				{notification.message}
			</p>
			
			<!-- Book details if available -->
			{#if notification.data?.book_title}
				<div class="book-info">
					<span class="book-title-small">{notification.data.book_title}</span>
					{#if notification.data?.book_authors && notification.data.book_authors.length > 0}
						<span class="book-meta">by {notification.data.book_authors.join(', ')}</span>
					{/if}
					{#if notification.data?.book_condition}
						<span class="book-meta">• {notification.data.book_condition}</span>
					{/if}
				</div>
			{/if}
			
			<p class="notification-time">
				{formatRelativeTime(notification.created_at)}
			</p>
		</div>
	</div>
</div>

<style>
	/* Books & Booze Theme Variables */
	:root {
		--primary-burgundy: #8B2635;
		--secondary-gold: #D4AF37;
		--accent-cream: #F5F5DC;
		--warm-brown: #8B4513;
		--deep-red: #722F37;
		--light-cream: #FFF8DC;
		--parchment: #F4F1E8;
	}

	.notification-item {
		width: 100%;
		border-bottom: 1px solid var(--accent-cream);
		cursor: pointer;
		transition: all 0.3s ease;
		padding: 0;
		margin: 0;
		background: transparent;
	}

	.notification-item:last-child {
		border-bottom: none;
	}

	.notification-item:hover {
		background: linear-gradient(135deg, var(--parchment) 0%, var(--light-cream) 100%);
		transform: translateX(2px);
	}

	.notification-item.unread {
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(139, 38, 53, 0.03) 100%);
		border-left: 3px solid var(--secondary-gold);
	}

	.notification-item.unread:hover {
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(139, 38, 53, 0.05) 100%);
	}

	.notification-content {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1.2rem 1.5rem;
		width: 100%;
	}

	/* Book Cover */
	.book-cover {
		flex-shrink: 0;
		width: 2.8rem;
		height: 3.8rem;
		border-radius: 0.4rem;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(139, 38, 53, 0.15);
		border: 1px solid var(--accent-cream);
		background: var(--parchment);
	}

	.book-cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Notification Icon */
	.notification-icon {
		flex-shrink: 0;
		width: 2.8rem;
		height: 2.8rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 6px rgba(139, 38, 53, 0.15);
		border: 1px solid var(--accent-cream);
	}

	.notification-icon svg {
		width: 1.4rem;
		height: 1.4rem;
	}

	/* Icon Colors - Updated for theme */
	:global(.text-blue-600.bg-blue-100) {
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.1) 100%) !important;
		color: var(--warm-brown) !important;
	}

	:global(.text-green-600.bg-green-100) {
		background: linear-gradient(135deg, rgba(139, 38, 53, 0.2) 0%, rgba(139, 38, 53, 0.1) 100%) !important;
		color: var(--deep-red) !important;
	}

	:global(.text-yellow-600.bg-yellow-100) {
		background: linear-gradient(135deg, var(--secondary-gold) 0%, rgba(212, 175, 55, 0.4) 100%) !important;
		color: var(--deep-red) !important;
	}

	:global(.text-red-600.bg-red-100) {
		background: linear-gradient(135deg, var(--deep-red) 0%, rgba(114, 47, 55, 0.4) 100%) !important;
		color: var(--light-cream) !important;
	}

	:global(.text-purple-600.bg-purple-100) {
		background: linear-gradient(135deg, var(--primary-burgundy) 0%, rgba(139, 38, 53, 0.4) 100%) !important;
		color: var(--light-cream) !important;
	}

	:global(.text-gray-600.bg-gray-100) {
		background: linear-gradient(135deg, var(--accent-cream) 0%, var(--parchment) 100%) !important;
		color: var(--warm-brown) !important;
	}

	/* Text Content */
	.notification-text {
		flex: 1;
		min-width: 0;
	}

	.notification-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 0.4rem;
	}

	.notification-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--primary-burgundy);
		line-height: 1.3;
		margin: 0;
		flex: 1;
		padding-right: 0.5rem;
	}

	.unread-dot {
		flex-shrink: 0;
		width: 0.6rem;
		height: 0.6rem;
		background: var(--secondary-gold);
		border-radius: 50%;
		margin-top: 0.2rem;
		box-shadow: 0 0 6px rgba(212, 175, 55, 0.6);
	}

	.notification-message {
		font-size: 0.875rem;
		color: var(--warm-brown);
		line-height: 1.4;
		margin: 0 0 0.8rem 0;
		word-wrap: break-word;
	}

	.book-info {
		background: var(--parchment);
		border: 1px solid var(--accent-cream);
		border-radius: 0.4rem;
		padding: 0.6rem 0.8rem;
		margin-bottom: 0.8rem;
		font-size: 0.8rem;
		line-height: 1.3;
	}

	.book-title-small {
		font-weight: 600;
		color: var(--primary-burgundy);
		display: block;
		margin-bottom: 0.2rem;
	}

	.book-meta {
		color: var(--warm-brown);
		font-size: 0.75rem;
	}

	.notification-time {
		font-size: 0.75rem;
		color: var(--warm-brown);
		opacity: 0.7;
		margin: 0;
		font-weight: 500;
	}

	/* Responsive Design */
	@media (max-width: 640px) {
		.notification-content {
			gap: 0.8rem;
			padding: 1rem;
		}

		.book-cover {
			width: 2.4rem;
			height: 3.2rem;
		}

		.notification-icon {
			width: 2.4rem;
			height: 2.4rem;
		}

		.notification-icon svg {
			width: 1.2rem;
			height: 1.2rem;
		}

		.notification-title {
			font-size: 0.9rem;
		}

		.notification-message {
			font-size: 0.825rem;
		}

		.notification-item.unread {
			border-left: 2px solid var(--secondary-gold);
		}
	}
</style>