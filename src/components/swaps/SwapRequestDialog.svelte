<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Book } from '$lib/types/book';
	import type { SwapRequestInput } from '$lib/types/swap';
	import { swapStore } from '$lib/stores/swaps';
	import { auth } from '$lib/stores/auth';
	import BookCard from '../books/BookCard.svelte';
	import ConditionIndicator from '../books/ConditionIndicator.svelte';

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

	// Auto-select the book if there's only one available
	$: if (userBooks.length === 1 && !selectedBookId) {
		selectedBookId = userBooks[0].id;
	}

	// Google Books image URL utility function
	const GOOGLE_BOOKS_IMAGE_URL = (volumeId: string) => 
		`https://books.google.com/books/content?id=${volumeId}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;

	async function loadUserBooks() {
		if (!currentUser) return;
		
		loadingUserBooks = true;
		try {
			// Import SwapService for this specific method since it's not in the store
			const { SwapService } = await import('$lib/services/swapService');
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

			await swapStore.createSwapRequest(swapInput);
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
						<div class="book-image">
							{#if targetBook.google_volume_id}
								<img 
									src={GOOGLE_BOOKS_IMAGE_URL(targetBook.google_volume_id)} 
									alt="{targetBook.title} cover"
									class="book-cover"
									loading="lazy"
								/>
							{:else}
								<div class="cover-placeholder">
									<svg class="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
									</svg>
								</div>
							{/if}
						</div>
						<div class="book-info">
							<h4>{targetBook.title}</h4>
							<p class="book-author">{Array.isArray(targetBook.authors) ? targetBook.authors.join(', ') : targetBook.authors}</p>
							<ConditionIndicator condition={targetBook.condition} />
							{#if targetBook.description}
								<div class="book-description-container">
									<p class="book-description">{targetBook.description}</p>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Book Selection -->
				<div class="section">
					<h3>Your Book to Offer</h3>
					<p class="section-description">Select one of your books to offer in exchange:</p>
					
					{#if loadingUserBooks}
						<div class="loading-state">
							<div class="loading-spinner">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
									<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.25"/>
									<path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
								</svg>
							</div>
							<p>Loading your available books...</p>
						</div>
					{:else if userBooks.length === 0}
						<div class="empty-state">
							<div class="empty-icon">
								<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
									<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
								</svg>
							</div>
							<h4>No Available Books</h4>
							<p>You don't have any available books to offer for swaps.</p>
							<p class="empty-note">Add some books to your collection first, then come back to make swap requests.</p>
						</div>
					{:else}
						<div class="books-grid">
							{#each userBooks as book (book.id)}
								<div 
									class="book-option" 
									class:selected={selectedBookId === book.id}
									on:click={() => {
										if (selectedBookId === book.id) {
											selectedBookId = '';
										} else {
											selectedBookId = book.id;
										}
									}}
									role="button"
									tabindex="0"
									on:keydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											if (selectedBookId === book.id) {
												selectedBookId = '';
											} else {
												selectedBookId = book.id;
											}
										}
									}}
								>
									<div class="book-card">
										<div class="book-image">
											{#if book.google_volume_id}
												<img 
													src={GOOGLE_BOOKS_IMAGE_URL(book.google_volume_id)} 
													alt="{book.title} cover"
													class="book-cover"
													loading="lazy"
												/>
											{:else}
												<div class="cover-placeholder">
													<svg class="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
													</svg>
												</div>
											{/if}
										</div>
										<div class="book-info">
											<h5>{book.title}</h5>
											<p class="book-author">{Array.isArray(book.authors) ? book.authors.join(', ') : book.authors}</p>
											<ConditionIndicator condition={book.condition} />
											{#if book.description}
												<div class="book-description-container">
													<p class="book-description">{book.description}</p>
												</div>
											{/if}
										</div>
									</div>
									<div class="selection-indicator">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<polyline points="20,6 9,17 4,12"/>
										</svg>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Message -->
				<div class="section">
					<h3>Personal Message <span class="optional">(Optional)</span></h3>
					<textarea 
						bind:value={message}
						placeholder="Add a personal message to the book owner... Why do you want this book? What makes your offer special?"
						rows="4"
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
					{#if loading}
						<svg class="btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none">
							<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.25"/>
							<path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
						</svg>
						Sending Request...
					{:else}
						Send Swap Request
					{/if}
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
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
		backdrop-filter: blur(4px);
	}

	.modal-content {
		background: white;
		border-radius: 16px;
		width: 100%;
		max-width: 1000px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		animation: modalSlideIn 0.3s ease-out;
	}

	@keyframes modalSlideIn {
		from {
			opacity: 0;
			transform: translateY(-20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 2rem 2rem 1rem 2rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
		color: #1f2937;
	}

	.close-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.75rem;
		border-radius: 8px;
		color: #6b7280;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		background: #f3f4f6;
		color: #374151;
	}

	.modal-body {
		padding: 2rem;
	}

	.section {
		margin-bottom: 2.5rem;
	}

	.section:last-child {
		margin-bottom: 0;
	}

	.section h3 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.optional {
		font-size: 0.875rem;
		font-weight: 400;
		color: #6b7280;
	}

	.section-description {
		margin: 0 0 1.5rem 0;
		color: #6b7280;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.book-card {
		display: flex;
		gap: 1.5rem;
		padding: 1.5rem;
		border: 2px solid #e2e8f0;
		border-radius: 12px;
		background: #f8fafc;
		transition: all 0.2s;
	}

	.target-book {
		background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
		border-color: #bfdbfe;
	}

	.book-image {
		flex-shrink: 0;
	}

	.book-cover {
		width: 80px;
		height: 120px;
		object-fit: cover;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.book-info {
		flex: 1;
		min-width: 0;
	}

	.book-info h4,
	.book-info h5 {
		margin: 0 0 0.5rem 0;
		font-weight: 600;
		line-height: 1.3;
		color: #1f2937;
	}

	.book-info h4 {
		font-size: 1.125rem;
	}

	.book-info h5 {
		font-size: 1rem;
	}

	.book-author {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.book-description {
		margin: 0.75rem 0 0 0;
		font-size: 0.875rem;
		color: #4b5563;
		line-height: 1.5;
	}

	.books-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 1.5rem;
	}

	.book-option {
		display: block;
		position: relative;
		transition: all 0.2s;
	}

	.book-selection-btn {
		width: 100%;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
		display: block;
	}

	.book-option .book-card {
		transition: all 0.2s;
		border: 2px solid #e2e8f0;
		position: relative;
	}

	.book-option:hover .book-card {
		border-color: #bfdbfe;
		background: #f0f9ff;
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
	}

	.book-option.selected .book-card {
		border-color: #3b82f6;
		background: #eff6ff;
		box-shadow: 0 0 0 1px #3b82f6, 0 8px 25px rgba(59, 130, 246, 0.15);
	}

	/* Placeholder icon styles - shared between target book and user books */
	.cover-placeholder {
		width: 80px;
		height: 120px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.placeholder-icon {
		width: 32px;
		height: 32px;
		color: #9ca3af;
	}

	/* Scrollable description container - shared between target book and user books */
	.book-description-container {
		margin-top: 0.75rem;
		max-height: 80px;
		overflow-y: auto;
		border-radius: 6px;
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.5);
		border: 1px solid rgba(0, 0, 0, 0.05);
	}

	.book-description-container::-webkit-scrollbar {
		width: 4px;
	}

	.book-description-container::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.05);
		border-radius: 2px;
	}

	.book-description-container::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 2px;
	}

	.book-description-container::-webkit-scrollbar-thumb:hover {
		background: rgba(0, 0, 0, 0.3);
	}

	.book-description {
		margin: 0;
		font-size: 0.875rem;
		color: #4b5563;
		line-height: 1.5;
	}

	/* Ensure consistent styling between target book and user books */
	.target-book .cover-placeholder,
	.book-option .cover-placeholder {
		width: 80px;
		height: 120px;
	}

	.target-book .book-description-container,
	.book-option .book-description-container {
		max-height: 80px;
		overflow-y: auto;
	}

	.selection-indicator {
		position: absolute;
		top: 1rem;
		right: 1rem;
		width: 32px;
		height: 32px;
		background: #3b82f6;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		opacity: 0;
		transform: scale(0.8);
		transition: all 0.2s;
	}

	.book-option.selected .selection-indicator {
		opacity: 1;
		transform: scale(1);
	}

	.loading-state,
	.empty-state {
		text-align: center;
		padding: 3rem 2rem;
		color: #6b7280;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.loading-spinner {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.empty-state {
		background: #f9fafb;
		border: 2px dashed #d1d5db;
		border-radius: 12px;
	}

	.empty-icon {
		margin: 0 auto 1rem;
		color: #9ca3af;
	}

	.empty-state h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #374151;
	}

	.empty-state p {
		margin: 0.5rem 0;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.empty-note {
		font-size: 0.875rem;
		color: #9ca3af;
		font-style: italic;
	}

	textarea {
		width: 100%;
		padding: 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		font-size: 0.95rem;
		font-family: inherit;
		resize: vertical;
		min-height: 100px;
		transition: all 0.2s;
		line-height: 1.5;
	}

	textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 1px #3b82f6;
	}

	textarea::placeholder {
		color: #9ca3af;
	}

	.char-count {
		text-align: right;
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.5rem;
	}

	.modal-footer {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		padding: 1.5rem 2rem 2rem 2rem;
		border-top: 1px solid #e2e8f0;
		background: #f8fafc;
		border-radius: 0 0 16px 16px;
	}

	.btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		white-space: nowrap;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none !important;
	}

	.btn-primary {
		background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
		color: white;
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
	}

	.btn-primary:hover:not(:disabled) {
		background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
	}

	.btn-secondary {
		background: #6b7280;
		color: white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.btn-secondary:hover:not(:disabled) {
		background: #4b5563;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.btn-spinner {
		animation: spin 1s linear infinite;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.modal-content {
			margin: 0;
			border-radius: 0;
			height: 100vh;
			max-height: none;
		}

		.modal-header,
		.modal-body,
		.modal-footer {
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}

		.modal-header h2 {
			font-size: 1.5rem;
		}

		.books-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.book-card {
			gap: 1rem;
			padding: 1rem;
		}

		.book-cover {
			width: 60px;
			height: 90px;
		}

		.modal-footer {
			flex-direction: column;
		}

		.btn {
			width: 100%;
			justify-content: center;
		}
	}

	@media (max-width: 480px) {
		.modal-overlay {
			padding: 0;
		}

		.book-card {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.book-image {
			align-self: center;
		}
	}
</style>
