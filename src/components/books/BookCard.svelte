<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Book, BookWithOwner } from '$lib/types/book';
	import type { SwapRequestWithBook } from '$lib/types/swap';
import { SwapStatus } from '$lib/types/swap';
	import { getConditionDisplayName } from '$lib/validation/book';
	import { user } from '$lib/stores/auth';
	import { bookStore } from '$lib/stores/books';
	import { SwapService } from '$lib/services/swapService';
	import ConditionIndicator from './ConditionIndicator.svelte';
	import BookSelectionModal from './BookSelectionModal.svelte';

	export let book: Book | BookWithOwner;
	export let showActions = true;
	export let showOwner = false;
	export let enableSwapRequests = false;

	const dispatch = createEventDispatcher<{
		edit: { book: Book };
		delete: { book: Book };
		swapRequested: { 
			requestedBook: Book;
			offeredBook?: Book;
			message?: string;
		};
		'view-details': { book: Book };
		notification: {
			type: 'success' | 'error' | 'info';
			message: string;
		};
	}>();

	$: isOwner = $user?.id === book.owner_id;
	$: bookWithOwner = book as BookWithOwner;
	$: conditionDisplayName = getConditionDisplayName(book.condition);
	$: authorsText = book.authors.join(', ');
	$: isAvailable = book.is_available ?? true;
	$: canRequestSwap = enableSwapRequests && !isOwner && isAvailable && $user?.id;

	let isToggling = false;
	let showBookSelectionModal = false;
	let isCreatingSwapRequest = false;
	let existingSwapRequest: SwapRequestWithBook | null = null;
	let checkingExistingRequest = false;

	// Check for existing swap request when user changes
	$: if ($user?.id && enableSwapRequests && !isOwner) {
		checkForExistingRequest();
	}

	async function checkForExistingRequest() {
		if (!$user?.id || isOwner) return;
		
		checkingExistingRequest = true;
		try {
			const data = await SwapService.getSwapRequestsForUser($user.id);
			if (data?.outgoing) {
				const existing = data.outgoing.find(req => 
					req.book?.id === book.id && req.status === 'PENDING'
				);
				existingSwapRequest = existing || null;
			}
		} catch (error) {
			console.error('Error checking existing swap request:', error);
		} finally {
			checkingExistingRequest = false;
		}
	}

	function handleEdit() {
		if (isOwner) {
			dispatch('edit', { book });
		}
	}

	function handleDelete() {
		if (isOwner && confirm('Are you sure you want to delete this book?')) {
			dispatch('delete', { book });
		}
	}

	async function toggleAvailability(event: Event) {
		// Prevent multiple clicks and ensure only owner can toggle
		if (!isOwner || isToggling) {
			event.preventDefault();
			return;
		}
		
		// Prevent default label click behavior
		event.preventDefault();
		
		isToggling = true;
		const newAvailability = !isAvailable;
		
		try {
			const success = await bookStore.toggleAvailability(book.id, newAvailability);
			if (success) {
				// Update the local book object
				book = { ...book, is_available: newAvailability };
			}
		} catch (error) {
			console.error('Failed to toggle availability:', error);
		} finally {
			isToggling = false;
		}
	}

	function handleSwapRequest() {
		console.log('Swap button clicked!', {
			canRequestSwap,
			existingSwapRequest,
			user: $user?.id,
			enableSwapRequests,
			isOwner
		});
		
		if (canRequestSwap && !existingSwapRequest) {
			showBookSelectionModal = true;
		} else {
			console.log('Swap request blocked:', {
				canRequestSwap,
				existingSwapRequest,
				reason: !canRequestSwap ? 'Cannot request swap' : 'Existing swap request'
			});
		}
	}

	async function handleCancelRequest() {
		if (!existingSwapRequest?.id || !$user?.id) return;

		try {
			await SwapService.updateSwapRequestStatus(existingSwapRequest.id, SwapStatus.CANCELLED, $user.id);
			existingSwapRequest = null;
			
			dispatch('notification', {
				type: 'success',
				message: `Swap request cancelled for "${book.title}"`
			});
		} catch (error) {
			console.error('Failed to cancel swap request:', error);
			dispatch('notification', {
				type: 'error',
				message: error instanceof Error ? error.message : 'Failed to cancel swap request'
			});
		}
	}

	async function handleBookSelection(event: CustomEvent<{ book: Book }>) {
		const offeredBook = event.detail.book;
		
		if (!$user?.id) {
			dispatch('notification', {
				type: 'error',
				message: 'You must be logged in to create swap requests'
			});
			return;
		}

		isCreatingSwapRequest = true;
		
		try {
			const swapRequest = await SwapService.createSwapRequest(
				{
					book_id: book.id,
					offered_book_id: offeredBook.id,
					message: `I'd like to swap "${offeredBook.title}" for "${book.title}"`
				},
				$user.id
			);

			dispatch('notification', {
				type: 'success',
				message: `Swap request sent! You offered "${offeredBook.title}" for "${book.title}"`
			});

			// Refresh existing request status after successful creation
			await checkForExistingRequest();

			dispatch('swapRequested', {
				requestedBook: book,
				offeredBook: offeredBook,
				message: `Swap request created for "${book.title}"`
			});

		} catch (error) {
			console.error('Failed to create swap request:', error);
			dispatch('notification', {
				type: 'error',
				message: error instanceof Error ? error.message : 'Failed to create swap request'
			});
		} finally {
			isCreatingSwapRequest = false;
			showBookSelectionModal = false;
		}
	}

	function handleModalClose() {
		showBookSelectionModal = false;
	}

	function getConditionBadgeClass(condition: string): string {
		const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		
		switch (condition) {
			case 'LIKE_NEW':
				return `${baseClasses} bg-green-100 text-green-800`;
			case 'VERY_GOOD':
				return `${baseClasses} bg-indigo-100 text-indigo-800`;
			case 'GOOD':
				return `${baseClasses} bg-yellow-100 text-yellow-800`;
			case 'FAIR':
				return `${baseClasses} bg-orange-100 text-orange-800`;
			case 'POOR':
				return `${baseClasses} bg-red-100 text-red-800`;
			default:
				return `${baseClasses} bg-gray-100 text-gray-800`;
		}
	}
</script>

<div class="book-card" class:opacity-60={!isAvailable && !isOwner}>
	<div class="book-card-content">
		{#if book.google_volume_id}
		<div class="book-cover-section">
			<img 
				src="https://books.google.com/books/content?id={book.google_volume_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api"
				alt="{book.title} cover"
				class="book-cover"
				loading="lazy"
			/>
		</div>
		{/if}

		<div class="book-details">
			<h3 class="book-title">{book.title}</h3>
			<p class="book-author">by {authorsText}</p>
			
			{#if book.genre}
				<p class="book-genre">{book.genre}</p>
			{/if}

			<div class="condition-section">
				<ConditionIndicator condition={book.condition} size="small" />
			</div>

			{#if book.description}
				<div class="description-section">
					<div class="book-description">
						{book.description}
					</div>
				</div>
			{/if}

			<p class="book-date">Added {new Date(book.created_at).toLocaleDateString()}</p>
		</div>
	</div>

	<!-- Availability Status -->
	{#if isOwner}
		<div class="availability-section">
			<span class="availability-label">Available for swap:</span>
			<label class="toggle-switch" class:disabled={isToggling} on:click={toggleAvailability}>
				<input
					type="checkbox"
					checked={isAvailable}
					disabled={isToggling}
					readonly
				/>
				<span class="toggle-slider"></span>
			</label>
		</div>
	{/if}

	<!-- Existing Swap Request Status -->
	{#if existingSwapRequest && !isOwner}
		<div class="swap-request-status">
			<div class="status-info">
				<span class="status-label">Swap Request:</span>
				<span class="status-badge pending">Pending</span>
			</div>
			{#if existingSwapRequest?.offered_book}
				<div class="offered-book-info">
					You offered: <strong>{existingSwapRequest.offered_book.title}</strong>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Actions -->
	{#if showActions}
		<div class="actions-section">
			{#if isOwner}
				<button on:click={handleEdit} class="btn-edit">Edit</button>
				<button on:click={handleDelete} class="btn-delete">Delete</button>
			{:else if canRequestSwap}
				{#if existingSwapRequest}
					<button on:click={handleCancelRequest} class="btn-cancel">
						Cancel Request
					</button>
				{:else if checkingExistingRequest}
					<button class="btn-swap" disabled>
						<div class="btn-spinner"></div>
						Checking...
					</button>
				{:else}
					<button on:click={handleSwapRequest} class="btn-swap" disabled={isCreatingSwapRequest}>
						{#if isCreatingSwapRequest}
							<div class="btn-spinner"></div>
							Creating Request...
						{:else}
							Request Swap
						{/if}
					</button>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<!-- Book Selection Modal -->
<BookSelectionModal 
	bind:isOpen={showBookSelectionModal}
	title="Select a Book to Offer"
	confirmText="Create Swap Request"
	excludeBookIds={[book.id]}
	on:select={handleBookSelection}
	on:close={handleModalClose}
/>


<style>
	.book-card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		padding: 1.5rem;
		margin-bottom: 1rem;
		transition: all 0.2s;
	}

	.book-card:hover {
		box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1);
	}

	.book-card-content {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.book-cover-section {
		flex-shrink: 0;
	}

	.book-cover {
		width: 60px;
		height: 84px;
		object-fit: cover;
		border-radius: 6px;
		border: 1px solid #e2e8f0;
	}


	.book-details {
		flex: 1;
		min-width: 0;
	}

	.book-title {
		color: #2d3748;
		font-weight: 600;
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
		line-height: 1.4;
	}

	.book-author {
		color: #4a5568;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}

	.book-genre {
		color: #718096;
		font-size: 0.85rem;
		margin-bottom: 0.5rem;
		font-style: italic;
	}

	.condition-section {
		margin-bottom: 0.75rem;
	}

	.description-section {
		margin-bottom: 0.75rem;
	}

	.book-description {
		color: #4a5568;
		font-size: 0.85rem;
		line-height: 1.4;
		max-height: 4.5em;
		overflow-y: auto;
		padding: 0.5rem;
		background: #f8f9fa;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		scrollbar-width: thin;
		scrollbar-color: #cbd5e0 #f8f9fa;
	}

	.book-description::-webkit-scrollbar {
		width: 6px;
	}

	.book-description::-webkit-scrollbar-track {
		background: #f8f9fa;
		border-radius: 3px;
	}

	.book-description::-webkit-scrollbar-thumb {
		background: #cbd5e0;
		border-radius: 3px;
	}

	.book-description::-webkit-scrollbar-thumb:hover {
		background: #a0aec0;
	}


	.book-date {
		color: #718096;
		font-size: 0.75rem;
		margin-top: auto;
	}

	.availability-section {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 8px;
		margin-bottom: 1rem;
		border: 1px solid #e2e8f0;
	}

	.availability-label {
		color: #4a5568;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 44px;
		height: 24px;
		cursor: pointer;
	}
	
	.toggle-switch.disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: #cbd5e0;
		transition: 0.4s;
		border-radius: 24px;
	}

	.toggle-slider:before {
		position: absolute;
		content: "";
		height: 18px;
		width: 18px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		transition: 0.4s;
		border-radius: 50%;
	}

	input:checked + .toggle-slider {
		background-color: #48bb78;
	}

	input:checked + .toggle-slider:before {
		transform: translateX(20px);
	}

	.swap-request-status {
		background: #e6fffa;
		border: 1px solid #81e6d9;
		border-radius: 8px;
		padding: 0.75rem;
		margin-bottom: 1rem;
	}

	.status-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.status-label {
		color: #2d3748;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status-badge.pending {
		background: #fef5e7;
		color: #d69e2e;
		border: 1px solid #f6e05e;
	}

	.offered-book-info {
		color: #4a5568;
		font-size: 0.85rem;
		line-height: 1.4;
	}

	.actions-section {
		display: flex;
		gap: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid #e2e8f0;
	}

	.btn-edit {
		background: #f7fafc;
		color: #4299e1;
		border: 1px solid #e2e8f0;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-edit:hover {
		background: #edf2f7;
		border-color: #cbd5e0;
	}

	.btn-delete {
		background: #fed7d7;
		color: #c53030;
		border: 1px solid #feb2b2;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-delete:hover {
		background: #fc8181;
		color: white;
	}

	.btn-swap {
		background: #c6f6d5;
		color: #2f855a;
		border: 1px solid #9ae6b4;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-swap:hover:not(:disabled) {
		background: #48bb78;
		color: white;
	}

	.btn-swap:disabled {
		background: #e2e8f0;
		color: #a0aec0;
		cursor: not-allowed;
		border-color: #e2e8f0;
	}

	.btn-cancel {
		background: #fed7d7;
		color: #c53030;
		border: 1px solid #feb2b2;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-cancel:hover {
		background: #fc8181;
		color: white;
	}


	.btn-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid #a0aec0;
		border-top-color: #4a5568;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-right: 0.5rem;
		flex-shrink: 0;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>