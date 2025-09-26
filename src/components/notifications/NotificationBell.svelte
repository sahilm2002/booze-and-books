<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { supabase } from '$lib/supabase';
	import { NotificationServiceServer } from '$lib/services/notificationServiceServer';
	import NotificationDropdown from './NotificationDropdown.svelte';
	import ChatModal from '../chat/ChatModal.svelte';
	import type { Conversation } from '$lib/types/notification';
	import type { PublicProfile } from '$lib/types/profile';

	let isOpen = false;
	let bellRef: HTMLButtonElement;
	let totalUnreadCount = 0;
	let showChatModal = false;
	let chatConversationId = '';
	let chatOtherUser: PublicProfile | null = null;
	let currentUserId = '';

	// Get current user ID
	$: if ($auth.user?.id) {
		currentUserId = $auth.user.id;
		loadUnreadCount();
	}

	onMount(() => {
		loadUnreadCount();

		function handleClickOutside(event: MouseEvent) {
			if (isOpen && bellRef && !bellRef.contains(event.target as Node)) {
				const dropdown = document.querySelector('.dropdown-content');
				if (dropdown && !dropdown.contains(event.target as Node)) {
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

	async function loadUnreadCount() {
		if (!$auth.user?.id) return;
		
		try {
			totalUnreadCount = await NotificationServiceServer.getTotalUnreadCount(supabase, $auth.user.id);
		} catch (error) {
			console.error('Failed to load unread count:', error);
		}
	}

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	function handleNotificationClick(event: CustomEvent) {
		const { type, notification, conversation } = event.detail;
		
		isOpen = false; // Close dropdown
		
		if (type === 'chat') {
			// Open chat modal
			const conv = conversation as Conversation;
			chatOtherUser = conv.other_participant;
			chatConversationId = conv.id;
			showChatModal = true;
		} else if (type === 'notification') {
			// Navigate based on notification type
			switch (notification.type) {
				case 'SWAP_REQUEST':
					goto('/app/swaps?tab=incoming');
					break;
				case 'SWAP_ACCEPTED':
				case 'SWAP_COUNTER_OFFER':
				case 'SWAP_CANCELLED':
				case 'SWAP_COMPLETED':
					goto('/app/swaps?tab=outgoing');
					break;
				default:
					goto('/app/swaps');
					break;
			}
		}
	}

	function handleAllMarkedAsRead() {
		loadUnreadCount(); // Refresh count
	}

	function handleCloseChat() {
		showChatModal = false;
		chatOtherUser = null;
		chatConversationId = '';
	}

	function handleMessageSent() {
		// Refresh unread count after sending message
		loadUnreadCount();
	}
</script>

<div class="notification-bell-container">
	<!-- Bell button -->
	<button
		bind:this={bellRef}
		type="button"
		class="notification-bell-button"
		on:click={toggleDropdown}
		aria-label="Notifications"
		aria-expanded={isOpen}
		aria-haspopup="true"
	>
		<svg class="bell-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
		</svg>
		
		<!-- Notification badge -->
		{#if totalUnreadCount > 0}
			<span class="notification-badge">
				{totalUnreadCount > 99 ? '99+' : totalUnreadCount}
			</span>
		{/if}
	</button>

	<!-- Dropdown -->
	{#if isOpen}
		<NotificationDropdown
			isOpen={true}
			{supabase}
			userId={currentUserId}
			on:notificationClick={handleNotificationClick}
			on:allMarkedAsRead={handleAllMarkedAsRead}
		/>
	{/if}
</div>

<!-- Chat Modal -->
{#if showChatModal && chatOtherUser && chatConversationId}
	<ChatModal
		isOpen={showChatModal}
		conversationId={chatConversationId}
		otherUser={chatOtherUser}
		{currentUserId}
		on:close={handleCloseChat}
		on:messageSent={handleMessageSent}
	/>
{/if}

<style>
	.notification-bell-container {
		position: relative;
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
		border-radius: 8px;
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
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.notification-badge {
		position: absolute;
		top: -2px;
		right: -2px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 4px;
		font-size: 10px;
		font-weight: 700;
		line-height: 1;
		color: white;
		background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
		border-radius: 9999px;
		box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
	}

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 4rem;
		z-index: 9999;
		animation: overlay-enter 0.2s ease-out;
	}

	@keyframes overlay-enter {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.notification-modal {
		background: white;
		border-radius: 12px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		width: 90vw;
		max-width: 420px;
		max-height: 80vh;
		overflow: hidden;
		animation: modal-enter 0.2s ease-out;
	}

	@keyframes modal-enter {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(-10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem;
		border-bottom: 1px solid #E2E8F0;
	}

	.modal-title {
		color: #2D3748;
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.mark-all-read-btn {
		color: #8B2635;
		background: none;
		border: none;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	.mark-all-read-btn:hover {
		background: #F5F5DC;
		color: #722F37;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: #F8FAFC;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.close-btn:hover {
		background: #E2E8F0;
	}

	.close-icon {
		width: 16px;
		height: 16px;
		color: #4A5568;
	}

	.modal-content {
		max-height: 400px;
		overflow-y: auto;
	}

	/* Loading State */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		gap: 1rem;
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #E2E8F0;
		border-top: 3px solid #8B2635;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.loading-text {
		color: #718096;
		font-size: 0.875rem;
		margin: 0;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		text-align: center;
	}

	.empty-icon {
		width: 48px;
		height: 48px;
		color: #CBD5E0;
		margin-bottom: 1rem;
	}

	.empty-title {
		color: #2D3748;
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.empty-subtitle {
		color: #718096;
		font-size: 0.875rem;
		margin: 0;
	}

	/* Notifications List */
	.notifications-list {
		display: flex;
		flex-direction: column;
	}

	.notification-item {
		display: block;
		width: 100%;
		padding: 1rem 1.5rem;
		background: white;
		border: none;
		border-bottom: 1px solid #E2E8F0;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
	}

	.notification-item:last-child {
		border-bottom: none;
	}

	.notification-item:hover {
		background: #F8FAFC;
	}

	.notification-item.unread {
		background: #EBF8FF;
	}

	.notification-item.unread:hover {
		background: #DBEAFE;
	}

	.notification-content {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		position: relative;
	}

	.notification-icon {
		width: 40px;
		height: 40px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.notification-icon svg {
		width: 20px;
		height: 20px;
	}

	.notification-details {
		flex: 1;
		min-width: 0;
	}

	.notification-title {
		color: #2D3748;
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0 0 0.25rem 0;
		line-height: 1.3;
	}

	.notification-message {
		color: #4A5568;
		font-size: 0.875rem;
		margin: 0 0 0.5rem 0;
		line-height: 1.4;
	}

	.notification-time {
		color: #9CA3AF;
		font-size: 0.75rem;
		margin: 0;
	}

	.unread-indicator {
		width: 8px;
		height: 8px;
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		border-radius: 50%;
		flex-shrink: 0;
		margin-top: 0.25rem;
	}

	/* Pagination */
	.pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-top: 1px solid #E2E8F0;
		background: #F8FAFC;
	}

	.pagination-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: white;
		border: 1px solid #E2E8F0;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.pagination-btn:hover:not(.disabled) {
		background: #F1F5F9;
		border-color: #CBD5E0;
	}

	.pagination-btn.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pagination-btn svg {
		width: 16px;
		height: 16px;
		color: #4A5568;
	}

	.pagination-info {
		color: #718096;
		font-size: 0.875rem;
		font-weight: 500;
	}
</style>
