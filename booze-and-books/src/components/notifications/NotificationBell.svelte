<script lang="ts">
	import { onMount } from 'svelte';
	import { notificationStore, unreadCount, recentNotifications } from '$lib/stores/notifications';
	import NotificationItem from './NotificationItem.svelte';

	let isOpen = false;
	let bellRef: HTMLButtonElement;

	onMount(() => {
		function handleClickOutside(event: MouseEvent) {
			if (isOpen && bellRef && !bellRef.contains(event.target as Node)) {
				const modal = document.querySelector('.notification-modal');
				if (modal && !modal.contains(event.target as Node)) {
					isOpen = false;
				}
			}
		}

		function handleEscapeKey(event: KeyboardEvent) {
			if (event.key === 'Escape' && isOpen) {
				isOpen = false;
			}
		}

		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleEscapeKey);
		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleEscapeKey);
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
		class="notification-bell-button"
		on:click={toggleDropdown}
		on:keydown={handleKeydown}
		aria-label="Notifications"
		aria-expanded={isOpen}
		aria-haspopup="true"
	>
		<!-- Bell icon -->
		<svg class="bell-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
		</svg>
		
		<!-- Notification badge -->
		{#if $unreadCount > 0}
			<span class="notification-badge">
				{$unreadCount > 99 ? '99+' : $unreadCount}
			</span>
		{/if}
	</button>
</div>

<!-- Modal overlay -->
{#if isOpen}
	<div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="notifications-modal-title">
		<div class="notification-modal">
			<!-- Close button -->
			<button 
				type="button" 
				class="modal-close-button"
				on:click={() => isOpen = false}
				aria-label="Close notifications"
			>
				<svg class="modal-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
			
			<!-- Header -->
			<div class="modal-header">
				<div class="modal-header-content">
					<h3 id="notifications-modal-title" class="modal-title">Notifications</h3>
					{#if $unreadCount > 0}
						<button
							type="button"
							class="mark-all-read-button"
							on:click={markAllAsRead}
						>
							Mark all read
						</button>
					{/if}
				</div>
			</div>

			<!-- Notifications list -->
			<div class="modal-content">
				{#if $recentNotifications.length === 0}
					<!-- Empty state -->
					<div class="empty-state">
						<svg class="empty-bell-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
						</svg>
						<p class="empty-title">No notifications yet</p>
						<p class="empty-subtitle">You'll see swap request updates here</p>
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
				<div class="modal-footer">
					<a 
						href="/app/notifications"
						class="view-all-link"
						on:click={() => isOpen = false}
					>
						View all notifications
					</a>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.notification-bell-button {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		color: #F5F5DC;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.notification-bell-button:hover {
		color: #D4AF37;
		background-color: rgba(212, 175, 55, 0.2);
	}

	.notification-bell-button:focus {
		outline: 2px solid white;
		outline-offset: 2px;
	}

	.bell-icon {
		width: 1.25rem !important;
		height: 1.25rem !important;
		min-width: 1.25rem !important;
		min-height: 1.25rem !important;
		max-width: 1.25rem !important;
		max-height: 1.25rem !important;
		flex-shrink: 0;
	}

	.notification-badge {
		position: absolute;
		top: -0.125rem;
		right: -0.125rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1rem;
		height: 1rem;
		padding: 0 0.25rem;
		font-size: 0.625rem;
		font-weight: 700;
		line-height: 1;
		color: white;
		background-color: #e53e3e;
		border-radius: 9999px;
	}

	.empty-state {
		padding: 1.5rem 1rem;
		text-align: center;
	}

	.empty-bell-icon {
		width: 3rem !important;
		height: 3rem !important;
		min-width: 3rem !important;
		min-height: 3rem !important;
		max-width: 3rem !important;
		max-height: 3rem !important;
		margin: 0 auto;
		color: #cbd5e0;
	}

	.empty-title {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.empty-subtitle {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #9ca3af;
	}

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.3);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 4rem;
		z-index: 9999;
	}

	.notification-modal {
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		width: 90vw;
		max-width: 28rem;
		max-height: 80vh;
		position: relative;
		overflow: hidden;
		animation: modal-enter 0.2s ease-out;
	}

	@keyframes modal-enter {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.modal-close-button {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: #f7fafc;
		border: none;
		border-radius: 50%;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background-color 0.2s;
		z-index: 10;
	}

	.modal-close-button:hover {
		background: #edf2f7;
	}

	.modal-close-icon {
		width: 1rem !important;
		height: 1rem !important;
		color: #4a5568;
	}

	.modal-header {
		padding: 1.5rem 1rem 1rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.modal-header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.modal-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #2d3748;
		margin: 0;
	}

	.mark-all-read-button {
		font-size: 0.75rem;
		color: #4299e1;
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.2s;
	}

	.mark-all-read-button:hover {
		color: #3182ce;
	}

	.modal-content {
		max-height: 24rem;
		overflow-y: auto;
		padding: 0;
	}

	.modal-footer {
		padding: 1rem;
		border-top: 1px solid #e2e8f0;
		text-align: center;
	}

	.view-all-link {
		display: block;
		font-size: 0.875rem;
		color: #4299e1;
		text-decoration: none;
		transition: color 0.2s;
	}

	.view-all-link:hover {
		color: #3182ce;
	}
</style>