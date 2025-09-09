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

	async function toggleDropdown() {
		isOpen = !isOpen;
		if (isOpen) {
			// Force reload recent notifications with enhanced book data when opening
			// Clear existing notifications first to force a fresh reload
			await notificationStore.loadRecentNotifications();
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
							Mark all as read
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
		background-color: rgba(139, 38, 53, 0.4);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 4rem;
		z-index: 9999;
	}

	.notification-modal {
		background: linear-gradient(135deg, var(--light-cream) 0%, white 100%);
		border: 2px solid var(--secondary-gold);
		border-radius: 1rem;
		box-shadow: 0 20px 40px rgba(139, 38, 53, 0.3), 0 10px 20px rgba(212, 175, 55, 0.2);
		width: 90vw;
		max-width: 32rem;
		max-height: 85vh;
		position: relative;
		overflow: hidden;
		animation: modal-enter 0.3s ease-out;
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
		top: 1.2rem;
		right: 1.2rem;
		background: var(--accent-cream);
		border: 1px solid var(--secondary-gold);
		border-radius: 50%;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.3s ease;
		z-index: 10;
	}

	.modal-close-button:hover {
		background: var(--secondary-gold);
		transform: scale(1.1);
		box-shadow: 0 4px 8px rgba(212, 175, 55, 0.4);
	}

	.modal-close-icon {
		width: 1.2rem !important;
		height: 1.2rem !important;
		color: var(--warm-brown);
	}

	.modal-close-button:hover .modal-close-icon {
		color: var(--deep-red);
	}

	.modal-header {
		padding: 2rem 2rem 1rem;
		border-bottom: 2px solid var(--accent-cream);
		background: linear-gradient(135deg, var(--parchment) 0%, var(--light-cream) 100%);
	}

	.modal-header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.modal-title {
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--primary-burgundy);
		margin: 0;
		text-shadow: 1px 1px 2px rgba(139, 38, 53, 0.1);
	}

	.mark-all-read-button {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--warm-brown);
		background: var(--accent-cream);
		border: 1px solid var(--secondary-gold);
		border-radius: 0.5rem;
		padding: 0.5rem 1rem;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.mark-all-read-button:hover {
		background: var(--secondary-gold);
		color: var(--deep-red);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(212, 175, 55, 0.3);
	}

	.modal-content {
		max-height: 24rem;
		overflow-y: auto;
		padding: 0;
		background: white;
	}

	.modal-footer {
		padding: 1.5rem 2rem;
		border-top: 2px solid var(--accent-cream);
		text-align: center;
		background: linear-gradient(135deg, var(--parchment) 0%, var(--light-cream) 100%);
	}

	.view-all-link {
		display: inline-block;
		font-size: 1rem;
		font-weight: 600;
		color: var(--warm-brown);
		background: linear-gradient(135deg, var(--secondary-gold) 0%, #B8941A 100%);
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		text-decoration: none;
		transition: all 0.3s ease;
		border: 1px solid var(--secondary-gold);
	}

	.view-all-link:hover {
		background: linear-gradient(135deg, #B8941A 0%, var(--secondary-gold) 100%);
		color: var(--deep-red);
		transform: translateY(-2px);
		box-shadow: 0 6px 12px rgba(212, 175, 55, 0.4);
	}
</style>