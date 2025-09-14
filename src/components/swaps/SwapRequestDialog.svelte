<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Book } from '$lib/types/book';
	import type { SwapRequestInput } from '$lib/types/swap';
	import { SwapService } from '$lib/services/swapService';
	import { auth } from '$lib/stores/auth';
	import ConditionIndicator from '$lib/components/books/ConditionIndicator.svelte';

	export let targetBook: Book; // The book the user wants to request
	export let show: boolean = false;

	const dispatch = createEventDispatcher<{
		close: void;
		success: void;
		error: string;
	}>();

	let loading = false;
	let userBooks: Book[] = [];
	let selectedBookId: string = '';
	let message: string = '';
	let loadingUserBooks = false;

	$: currentUser = $auth.user;

	// Load user's available books when dialog opens
	$: if (show && currentUser) {
		loadUserBooks();
	}

	async function loadUserBooks() {
		if (!currentUser) return;
		
		loadingUserBooks = true;
		try {
			userBooks = await SwapService.getUserAvailableBooksForOffering(currentUser.id);
		} catch (error) {
			console.error('Error loading user books:', error);
			dispatch('error', 'Failed to load your available books');
		} finally {
			loadingUserBooks = false;
		}
	}

	async function handleSubmit() {
		if (!currentUser || !selectedBookId || loading) return;

		loading = true;
		try {
			const swapInput: SwapRequestInput = {
				book_id: targetBook.id,
				offered_book_id: selectedBookId,
				message: message.trim() || undefined
			};

			await SwapService.createSwapRequest(swapInput, currentUser.id);
			dispatch('success');
			handleClose();
		} catch (error) {
			dispatch('error', error instanceof Error ? error.message : 'Failed to create swap request');
		} finally {
			loading = false;
		}
	}

	function handleClose() {
		show = false;
		selectedBookId = '';
		message = '';
		dispatch('close');
	}

	function handleOverlayClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}
</script>

{#if show}
	<div class="modal-overlay" on:click={handleOverlayClick}>
		<div class="modal-content">
			<div class="modal-header">
				<h2>Request Book Swap</h2>
				<button class="close-btn" on:click={handleClose} aria-label="Close">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 6L6 18M6 6l12 12"/>
					</svg>
				</button>
			</div>

			<div class="modal-body">
				<!-- Target Book -->
				<div class="section">
					<h3>Book You Want</h3>
					<div class="book-card target-book">
						<img 
							src="/images/book-placeholder.png" 
							alt="{targetBook.title} cover"
							class="book-cover"
						/>
						<div class="book-info">
							<h4>{targetBook.title}</h4>
							<p class="book-author">{Array.isArray(targetBook.authors) ? targetBook.authors.join(', ') : targetBook.authors}</p>
							<ConditionIndicator condition={targetBook.condition} />
						</div>
					</div>
				</div>

				<!-- Book Selection -->
				<div class="section">
					<h3>Your Book to Offer</h3>
					<p class="section-description">Select one of your books to offer in exchange:</p>
					
					{#if loadingUserBooks}
						<div class="loading-state">
							<p>Loading your available books...</p>
						</div>
					{:else if userBooks.length === 0}
						<div class="empty-state">
							<p>You don't have any available books to offer.</p>
							<p class="empty-note">Add some books to your collection first, then come back to make swap requests.</p>
						</div>
					{:else}
						<div class="books-grid">
							{#each userBooks as book (book.id)}
								<label class="book-option" class:selected={selectedBookId === book.id}>
									<input 
										type="radio" 
										bind:group={selectedBookId} 
										value={book.id}
										name="offered-book"
									/>
									<div class="book-card">
										<img 
											src="/images/book-placeholder.png" 
											alt="{book.title} cover"
											class="book-cover"
										/>
										<div class="book-info">
											<h5>{book.title}</h5>
											<p class="book-author">{Array.isArray(book.authors) ? book.authors.join(', ') : book.authors}</p>
											<ConditionIndicator condition={book.condition} />
										</div>
									</div>
								</label>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Message -->
				<div class="section">
					<h3>Message (Optional)</h3>
					<textarea 
						bind:value={message}
						placeholder="Add a personal message to the book owner..."
						rows="3"
						maxlength="500"
					></textarea>
					<div class="char-count">{message.length}/500</div>
				</div>
			</div>

			<div class="modal-footer">
				<button 
					type="button" 
					class="btn btn-secondary" 
					on:click={handleClose}
					disabled={loading}
				>
					Cancel
				</button>
				<button 
					type="button" 
					class="btn btn-primary" 
					on:click={handleSubmit}
					disabled={loading || !selectedBookId || userBooks.length === 0}
				>
					{loading ? 'Sending Request...' : 'Send Swap Request'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-content {
		background: white;
		border-radius: 12px;
		width: 100%;
		max-width: 600px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
	}

	.close-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 6px;
		color: #6b7280;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background: #f3f4f6;
		color: #374151;
	}

	.modal-body {
		padding: 1.5rem;
	}

	.section {
		margin-bottom: 2rem;
	}

	.section:last-child {
		margin-bottom: 0;
	}

	.section h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
	}

	.section-description {
		margin: 0 0 1rem 0;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.book-card {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #f8fafc;
	}

	.target-book {
		background: #eff6ff;
		border-color: #bfdbfe;
	}

	.book-cover {
		width: 60px;
		height: 80px;
		object-fit: cover;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.book-info {
		flex: 1;
		min-width: 0;
	}

	.book-info h4,
	.book-info h5 {
		margin: 0 0 0.25rem 0;
		font-weight: 600;
		line-height: 1.2;
	}

	.book-info h4 {
		font-size: 1rem;
		color: #1f2937;
	}

	.book-info h5 {
		font-size: 0.875rem;
		color: #374151;
	}

	.book-author {
		margin: 0 0 0.5rem 0;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.books-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
	}

	.book-option {
		cursor: pointer;
		display: block;
		position: relative;
	}

	.book-option input[type="radio"] {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.book-option .book-card {
		transition: all 0.2s;
		border: 2px solid #e2e8f0;
	}

	.book-option:hover .book-card {
		border-color: #bfdbfe;
		background: #f0f9ff;
	}

	.book-option.selected .book-card {
		border-color: #3b82f6;
		background: #eff6ff;
		box-shadow: 0 0 0 1px #3b82f6;
	}

	.loading-state,
	.empty-state {
		text-align: center;
		padding: 2rem;
		color: #6b7280;
	}

	.empty-note {
		font-size: 0.875rem;
		margin-top: 0.5rem;
	}

	textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		font-family: inherit;
		resize: vertical;
		min-height: 80px;
	}

	textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 1px #3b82f6;
	}

	.char-count {
		text-align: right;
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}

	.modal-footer {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		padding: 1.5rem;
		border-top: 1px solid #e2e8f0;
		background: #f8fafc;
		border-radius: 0 0 12px 12px;
	}

	.btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-secondary {
		background: #6b7280;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #4b5563;
	}

	@media (max-width: 640px) {
		.modal-content {
			margin: 0;
			border-radius: 0;
			height: 100vh;
			max-height: none;
		}

		.books-grid {
			grid-template-columns: 1fr;
		}

		.modal-footer {
			flex-direction: column;
		}

		.btn {
			width: 100%;
		}
	}
</style>
