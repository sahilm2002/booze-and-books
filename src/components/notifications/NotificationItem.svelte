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

<button
	type="button"
	class="w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
	class:bg-blue-50={!notification.is_read}
	on:click={handleClick}
>
	<div class="flex items-start space-x-3">
		<!-- Book Cover or Icon -->
		{#if notification.data?.book_cover}
			<div class="flex-shrink-0 w-12 h-16 rounded-md overflow-hidden bg-gray-200">
				<img 
					src={notification.data.book_cover} 
					alt={notification.data?.book_title || 'Book cover'}
					class="w-full h-full object-cover"
					loading="lazy"
				/>
			</div>
		{:else}
			<div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center {getNotificationColor(notification.type)}">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="{getNotificationIcon(notification.type)}" />
				</svg>
			</div>
		{/if}

		<!-- Content -->
		<div class="flex-1 min-w-0">
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<p class="text-sm font-medium text-gray-900 truncate">
						{notification.title}
					</p>
					<p class="text-sm text-gray-600 mt-1 line-clamp-2">
						{notification.message}
					</p>
					
					<!-- Book details if available -->
					{#if notification.data?.book_title}
						<div class="mt-2 text-xs text-gray-500">
							<span class="font-medium">{notification.data.book_title}</span>
							{#if notification.data?.book_authors && notification.data.book_authors.length > 0}
								<span class="mx-1">by</span>
								<span>{notification.data.book_authors.join(', ')}</span>
							{/if}
							{#if notification.data?.book_condition}
								<span class="mx-1">•</span>
								<span class="capitalize">{notification.data.book_condition.toLowerCase()}</span>
							{/if}
						</div>
					{/if}
				</div>
				
				<!-- Unread indicator -->
				{#if !notification.is_read}
					<div class="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full ml-2 mt-1"></div>
				{/if}
			</div>
			
			<!-- Timestamp -->
			<p class="text-xs text-gray-400 mt-2">
				{formatRelativeTime(notification.created_at)}
			</p>
		</div>
	</div>
</button>