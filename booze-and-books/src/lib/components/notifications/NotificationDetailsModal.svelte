<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Notification } from '$lib/types/notification';
	
	export let notification: Notification;
	
	const dispatch = createEventDispatcher<{ close: void }>();
	
	let modalElement: HTMLDivElement;
	let bookDetails: any = null;
	let userDetails: any = null;
	let swapDetails: any = null;
	let isLoading = true;
	
	onMount(async () => {
		// Load additional details based on notification type
		await loadNotificationDetails();
		
		// Focus management for accessibility
		modalElement?.focus();
		
		// Handle escape key
		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				close();
			}
		}
		
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
	
	async function loadNotificationDetails() {
		try {
			// Extract book_id and user IDs from notification data
			const data = notification.data as any;
			
			if (data.book_id) {
				// Load book details
				const response = await fetch(`/api/books/${data.book_id}`);
				if (response.ok) {
					bookDetails = await response.json();
				}
			}
			
			// Load user details based on notification type
			let targetUserId: string | null = null;
			
			switch (notification.type) {
				case 'SWAP_REQUEST':
					targetUserId = data.requester_id;
					break;
				case 'SWAP_ACCEPTED':
				case 'SWAP_COUNTER_OFFER':
					targetUserId = data.owner_id;
					break;
				case 'SWAP_CANCELLED':
				case 'SWAP_COMPLETED':
					targetUserId = data.cancelled_by || data.completed_by;
					break;
			}
			
			if (targetUserId) {
				const response = await fetch(`/api/users/${targetUserId}/profile`);
				if (response.ok) {
					userDetails = await response.json();
				}
			}
			
			// Load swap request details
			if (data.swap_request_id) {
				const response = await fetch(`/api/swap-requests/${data.swap_request_id}`);
				if (response.ok) {
					swapDetails = await response.json();
				}
			}
		} catch (error) {
			console.error('Error loading notification details:', error);
		} finally {
			isLoading = false;
		}
	}
	
	function close() {
		dispatch('close');
	}
	
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			close();
		}
	}
	
	function getNotificationTypeLabel(type: string): string {
		switch (type) {
			case 'SWAP_REQUEST':
				return 'Book Swap Request';
			case 'SWAP_ACCEPTED':
				return 'Swap Request Accepted';
			case 'SWAP_COUNTER_OFFER':
				return 'Counter Offer Received';
			case 'SWAP_CANCELLED':
				return 'Swap Request Cancelled';
			case 'SWAP_COMPLETED':
				return 'Swap Completed';
			default:
				return 'Notification';
		}
	}
	
	function getActionText(): string {
		switch (notification.type) {
			case 'SWAP_REQUEST':
				return 'View incoming swap request to accept, decline, or make a counter offer.';
			case 'SWAP_ACCEPTED':
				return 'Your swap request was accepted! Contact the book owner to arrange the exchange.';
			case 'SWAP_COUNTER_OFFER':
				return 'The book owner made a counter offer. View the details and decide how to proceed.';
			case 'SWAP_CANCELLED':
				return 'This swap request has been cancelled. You can browse for other books to swap.';
			case 'SWAP_COMPLETED':
				return 'The swap has been marked as completed. Leave a rating if you haven\'t already.';
			default:
				return 'View the details of this notification.';
		}
	}
	
	function navigateToSwaps() {
		const data = notification.data as any;
		
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
		close();
	}
</script>

<!-- Modal backdrop -->
<div
	class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
	on:click={handleBackdropClick}
	role="dialog"
	aria-modal="true"
	aria-labelledby="modal-title"
>
	<!-- Modal content -->
	<div
		bind:this={modalElement}
		class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
		tabindex="-1"
	>
		<!-- Header -->
		<div class="flex items-center justify-between p-6 border-b border-gray-200">
			<div>
				<h2 id="modal-title" class="text-xl font-semibold text-gray-900">
					{getNotificationTypeLabel(notification.type)}
				</h2>
				<p class="text-sm text-gray-600 mt-1">
					{new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString()}
				</p>
			</div>
			<button
				type="button"
				on:click={close}
				class="text-gray-400 hover:text-gray-600 transition-colors"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
			{#if isLoading}
				<!-- Loading state -->
				<div class="flex items-center justify-center py-8">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<span class="ml-3 text-gray-600">Loading details...</span>
				</div>
			{:else}
				<!-- Notification message -->
				<div class="mb-6">
					<h3 class="font-medium text-gray-900 mb-2">{notification.title}</h3>
					<p class="text-gray-700">{notification.message}</p>
				</div>

				<!-- Book details -->
				{#if bookDetails}
					<div class="mb-6 p-4 bg-gray-50 rounded-lg">
						<h4 class="font-medium text-gray-900 mb-3">Book Details</h4>
						<div class="flex space-x-4">
							{#if bookDetails.cover_image}
								<img 
									src={bookDetails.cover_image} 
									alt={bookDetails.title}
									class="w-16 h-24 object-cover rounded shadow-sm"
								/>
							{:else}
								<div class="w-16 h-24 bg-gray-200 rounded flex items-center justify-center">
									<svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
									</svg>
								</div>
							{/if}
							<div class="flex-1">
								<p class="font-medium text-gray-900">{bookDetails.title}</p>
								{#if bookDetails.authors && bookDetails.authors.length > 0}
									<p class="text-sm text-gray-600">by {bookDetails.authors.join(', ')}</p>
								{/if}
								{#if bookDetails.genre}
									<p class="text-sm text-gray-600 mt-1">Genre: {bookDetails.genre}</p>
								{/if}
								{#if bookDetails.condition}
									<p class="text-sm text-gray-600">Condition: <span class="capitalize">{bookDetails.condition.toLowerCase()}</span></p>
								{/if}
							</div>
						</div>
					</div>
				{/if}

				<!-- User details -->
				{#if userDetails}
					<div class="mb-6 p-4 bg-blue-50 rounded-lg">
						<h4 class="font-medium text-gray-900 mb-3">Contact Information</h4>
						<div class="flex items-center space-x-3">
							{#if userDetails.avatar_url}
								<img 
									src={userDetails.avatar_url} 
									alt={userDetails.full_name || userDetails.username}
									class="w-10 h-10 rounded-full object-cover"
								/>
							{:else}
								<div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
									<span class="text-sm font-medium text-gray-700">
										{(userDetails.full_name || userDetails.username)?.charAt(0).toUpperCase()}
									</span>
								</div>
							{/if}
							<div>
								<p class="font-medium text-gray-900">
									{userDetails.full_name || userDetails.username}
								</p>
								{#if userDetails.full_name && userDetails.username}
									<p class="text-sm text-gray-600">@{userDetails.username}</p>
								{/if}
							</div>
						</div>
						{#if userDetails.email}
							<div class="mt-3 p-3 bg-white rounded border">
								<p class="text-sm text-gray-600">Contact via email:</p>
								<a href="mailto:{userDetails.email}" class="text-blue-600 hover:text-blue-800 font-medium">
									{userDetails.email}
								</a>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Action guidance -->
				<div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
							</svg>
						</div>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-yellow-800">Next Steps</h3>
							<div class="mt-2 text-sm text-yellow-700">
								<p>{getActionText()}</p>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
			<button
				type="button"
				on:click={close}
				class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
			>
				Close
			</button>
			<button
				type="button"
				on:click={navigateToSwaps}
				class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
			>
				Go to Swaps
			</button>
		</div>
	</div>
</div>