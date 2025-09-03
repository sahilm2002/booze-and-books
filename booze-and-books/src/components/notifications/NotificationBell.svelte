<script lang="ts">
	import { onMount } from 'svelte';
	import { notificationStore, unreadCount, recentNotifications } from '$lib/stores/notifications';
	import NotificationItem from './NotificationItem.svelte';

	let isOpen = false;
	let bellRef: HTMLButtonElement;

	onMount(() => {
		function handleClickOutside(event: MouseEvent) {
			if (bellRef && !bellRef.contains(event.target as Node)) {
				isOpen = false;
			}
		}

		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	function toggleDropdown() {
		isOpen = !isOpen;
		if (isOpen) {
			// Load recent notifications when opening
			notificationStore.loadRecentNotifications();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isOpen = false;
		}
	}

	async function markAllAsRead() {
		await notificationStore.markAllAsRead();
	}

	function handleNotificationClick() {
		// Close dropdown when notification is clicked
		isOpen = false;
	}
</script>

<div class="relative">
	<!-- Bell button -->
	<button
		bind:this={bellRef}
		type="button"
		class="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md transition-colors"
		on:click={toggleDropdown}
		on:keydown={handleKeydown}
		aria-label="Notifications"
		aria-expanded={isOpen}
		aria-haspopup="true"
	>
		<!-- Bell icon -->
		<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
		</svg>
		
		<!-- Notification badge -->
		{#if $unreadCount > 0}
			<span class="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[1.25rem] h-5">
				{$unreadCount > 99 ? '99+' : $unreadCount}
			</span>
		{/if}
	</button>

	<!-- Dropdown menu -->
	{#if isOpen}
		<div 
			class="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
			role="menu"
			aria-orientation="vertical"
			aria-labelledby="notifications-menu"
		>
			<!-- Header -->
			<div class="px-4 py-3 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-medium text-gray-900">Notifications</h3>
					{#if $unreadCount > 0}
						<button
							type="button"
							class="text-xs text-blue-600 hover:text-blue-800 transition-colors"
							on:click={markAllAsRead}
						>
							Mark all read
						</button>
					{/if}
				</div>
			</div>

			<!-- Notifications list -->
			<div class="max-h-96 overflow-y-auto">
				{#if $recentNotifications.length === 0}
					<!-- Empty state -->
					<div class="px-4 py-6 text-center">
						<svg class="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
						</svg>
						<p class="mt-2 text-sm text-gray-500">No notifications yet</p>
						<p class="text-xs text-gray-400 mt-1">You'll see swap request updates here</p>
					</div>
				{:else}
					{#each $recentNotifications as notification (notification.id)}
						<NotificationItem 
							{notification} 
							on:click={handleNotificationClick}
						/>
					{/each}
				{/if}
			</div>

			<!-- Footer -->
			{#if $recentNotifications.length > 0}
				<div class="px-4 py-3 border-t border-gray-200">
					<a 
						href="/app/notifications"
						class="block text-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
						on:click={() => isOpen = false}
					>
						View all notifications
					</a>
				</div>
			{/if}
		</div>
	{/if}
</div>