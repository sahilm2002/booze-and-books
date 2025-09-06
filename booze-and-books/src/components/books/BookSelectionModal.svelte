<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { SwapService } from '$lib/services/swapService';
	import { user } from '$lib/stores/auth';
	import ConditionIndicator from './ConditionIndicator.svelte';
	import type { Book } from '$lib/types/book';

	export let isOpen = false;
	export let title = 'Select a Book';
	export let confirmText = 'Select Book';
	export let excludeBookIds: string[] = [];
	
	const dispatch = createEventDispatcher<{
		close: void;
		select: { book: Book };
	}>();

	let searchTerm = '';
	let selectedBook: Book | null = null;
	let availableBooks: Book[] = [];
	let filteredBooks: Book[] = [];
	let loading = true;
	let error = '';
	let showDropdown = false;

	$: if (isOpen && $user?.id) {
		loadAvailableBooks();
	}

	$: filteredBooks = availableBooks.filter(book => 
		!excludeBookIds.includes(book.id) &&
		(book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
		 book.authors.some(author => author.toLowerCase().includes(searchTerm.toLowerCase())) ||
		 (book.genre && book.genre.toLowerCase().includes(searchTerm.toLowerCase())))
	);

	async function loadAvailableBooks() {
		if (!$user?.id) return;
		
		loading = true;
		error = '';
		
		try {
			availableBooks = await SwapService.getUserAvailableBooksForOffering($user.id);
		} catch (err) {
			console.error('Failed to load available books:', err);
			error = 'Failed to load your books. Please try again.';
			availableBooks = [];
		} finally {
			loading = false;
		}
	}

	function handleBookSelect(book: Book) {
		selectedBook = book;
		showDropdown = false;
		searchTerm = `${book.title} by ${book.authors.join(', ')}`;
	}

	function handleConfirm() {
		if (selectedBook) {
			dispatch('select', { book: selectedBook });
			handleClose();
		}
	}

	function handleClose() {
		dispatch('close');
		selectedBook = null;
		searchTerm = '';
		showDropdown = false;
		error = '';
	}

	function toggleDropdown() {
		showDropdown = !showDropdown;
	}

	function clearSelection() {
		selectedBook = null;
		searchTerm = '';
		showDropdown = false;
	}

	// Close dropdown when clicking outside
	function handleDocumentClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.book-selection-container')) {
			showDropdown = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleDocumentClick);
		return () => {
			document.removeEventListener('click', handleDocumentClick);
		};
	});
</script>

{#if isOpen}
	<div class="modal-overlay" on:click={handleClose} role="dialog" aria-modal="true">
		<div class="modal-content" on:click|stopPropagation>
			<div class="modal-header">
				<h2>{title}</h2>
				<button class="close-button" on:click={handleClose} aria-label="Close modal">
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
					</svg>
				</button>
			</div>

			<div class="modal-body">
				{#if error}
					<div class="error-message">
						<svg class="error-icon" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
						</svg>
						{error}
					</div>
				{:else if loading}
					<div class="loading-container">
						<div class="spinner"></div>
						<p>Loading your available books...</p>
					</div>
				{:else if availableBooks.length === 0}
					<div class="empty-state">
						<svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
						</svg>
						<h3>No Available Books</h3>
						<p>You don't have any books available for offering. Add some books to your collection first.</p>
					</div>
				{:else}
					<div class="book-selection-container">
						<!-- Search/Selection Input -->
						<div class="search-container">
							<div class="search-input-wrapper">
								<input
									type="text"
									class="search-input"
									placeholder="Search or select a book..."
									bind:value={searchTerm}
									on:focus={() => showDropdown = true}
									on:input={() => showDropdown = true}
								/>
								<div class="search-actions">
									{#if selectedBook}
										<button class="clear-button" on:click={clearSelection} title="Clear selection">
											<svg width="16" height="16" viewBox="0 0 20 20" fill="none">
												<path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
											</svg>
										</button>
									{/if}
									<button class="dropdown-toggle" on:click={toggleDropdown} title="Show all books">
										<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" class:rotated={showDropdown}>
											<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
										</svg>
									</button>
								</div>
							</div>

							<!-- Results count -->
							{#if searchTerm && !showDropdown}
								<div class="results-info">
									{filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''} found
								</div>
							{/if}
						</div>

						<!-- Dropdown List -->
						{#if showDropdown}
							<div class="dropdown-container">
								<div class="dropdown-header">
									<span>Available Books ({filteredBooks.length})</span>
									{#if searchTerm}
										<button class="clear-search" on:click={() => searchTerm = ''}>
											Clear search
										</button>
									{/if}
								</div>
								<div class="dropdown-list">
									{#each filteredBooks as book (book.id)}
										<button 
											class="book-option"
											class:selected={selectedBook?.id === book.id}
											on:click={() => handleBookSelect(book)}
										>
											<div class="book-option-content">
												{#if book.google_volume_id || book.thumbnail_url}
													<div class="book-cover-small">
														{#if book.google_volume_id}
															<img 
																src="https://books.google.com/books/content?id={book.google_volume_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api"
																alt="{book.title} cover"
																loading="lazy"
															/>
														{:else if book.thumbnail_url}
															<img 
																src={book.thumbnail_url} 
																alt="{book.title} cover"
																loading="lazy"
															/>
														{/if}
													</div>
												{:else}
													<div class="book-cover-placeholder">
														<svg class="book-icon" fill="currentColor" viewBox="0 0 20 20">
															<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
														</svg>
													</div>
												{/if}

												<div class="book-info">
													<div class="book-title">{book.title}</div>
													<div class="book-authors">by {book.authors.join(', ')}</div>
													{#if book.genre}
														<div class="book-genre">{book.genre}</div>
													{/if}
													<div class="condition-wrapper">
														<ConditionIndicator condition={book.condition} size="small" showTooltip={false} />
													</div>
												</div>
											</div>
										</button>
									{:else}
										<div class="no-results">
											<p>No books found matching "{searchTerm}"</p>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Selected Book Details -->
						{#if selectedBook}
							<div class="selected-book-preview">
								<h3>Selected Book:</h3>
								<div class="selected-book-card">
									<div class="selected-book-content">
										{#if selectedBook.google_volume_id || selectedBook.thumbnail_url}
											<div class="selected-book-cover">
												{#if selectedBook.google_volume_id}
													<img 
														src="https://books.google.com/books/content?id={selectedBook.google_volume_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api"
														alt="{selectedBook.title} cover"
													/>
												{:else if selectedBook.thumbnail_url}
													<img 
														src={selectedBook.thumbnail_url} 
														alt="{selectedBook.title} cover"
													/>
												{/if}
											</div>
										{/if}

										<div class="selected-book-details">
											<h4>{selectedBook.title}</h4>
											<p class="authors">by {selectedBook.authors.join(', ')}</p>
											{#if selectedBook.genre}
												<p class="genre">{selectedBook.genre}</p>
											{/if}
											<div class="condition-section">
												<ConditionIndicator condition={selectedBook.condition} size="large" />
											</div>
											{#if selectedBook.description}
												<div class="description">
													<p>{selectedBook.description}</p>
												</div>
											{/if}
										</div>
									</div>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<div class="modal-footer">
				<button class="btn-secondary" on:click={handleClose}>
					Cancel
				</button>
				<button 
					class="btn-primary" 
					on:click={handleConfirm}
					disabled={!selectedBook}
				>
					{confirmText}
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
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
		background: #f9fafb;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
	}

	.close-button {
		background: none;
		border: none;
		color: #6b7280;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.close-button:hover {
		background: #e5e7eb;
		color: #374151;
	}

	.modal-body {
		padding: 1.5rem;
		flex: 1;
		overflow-y: auto;
	}

	.modal-footer {
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		background: #f9fafb;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #dc2626;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		padding: 1rem;
	}

	.error-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		gap: 1rem;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #e5e7eb;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: #6b7280;
	}

	.empty-icon {
		width: 48px;
		height: 48px;
		margin: 0 auto 1rem;
		color: #d1d5db;
	}

	.empty-state h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.book-selection-container {
		position: relative;
	}

	.search-container {
		margin-bottom: 1rem;
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 3rem 0.75rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		transition: all 0.2s;
	}

	.search-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.search-actions {
		position: absolute;
		right: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.clear-button, .dropdown-toggle {
		background: none;
		border: none;
		padding: 0.375rem;
		border-radius: 4px;
		color: #6b7280;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.clear-button:hover, .dropdown-toggle:hover {
		background: #f3f4f6;
		color: #374151;
	}

	.dropdown-toggle svg.rotated {
		transform: rotate(180deg);
	}

	.results-info {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.5rem;
	}

	.dropdown-container {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
		z-index: 10;
		max-height: 300px;
		overflow: hidden;
	}

	.dropdown-header {
		padding: 0.75rem 1rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.clear-search {
		background: none;
		border: none;
		color: #3b82f6;
		cursor: pointer;
		font-size: 0.875rem;
		padding: 0.25rem;
	}

	.clear-search:hover {
		text-decoration: underline;
	}

	.dropdown-list {
		max-height: 250px;
		overflow-y: auto;
	}

	.book-option {
		width: 100%;
		background: none;
		border: none;
		padding: 0.75rem 1rem;
		cursor: pointer;
		transition: background-color 0.2s;
		border-bottom: 1px solid #f3f4f6;
	}

	.book-option:hover {
		background: #f9fafb;
	}

	.book-option.selected {
		background: #eff6ff;
		border-color: #dbeafe;
	}

	.book-option-content {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		text-align: left;
	}

	.book-cover-small {
		width: 40px;
		height: 56px;
		flex-shrink: 0;
		border-radius: 4px;
		overflow: hidden;
		border: 1px solid #e5e7eb;
	}

	.book-cover-small img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.book-cover-placeholder {
		width: 40px;
		height: 56px;
		background: #f3f4f6;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #9ca3af;
	}

	.book-icon {
		width: 20px;
		height: 20px;
	}

	.book-info {
		flex: 1;
		min-width: 0;
	}

	.book-title {
		font-weight: 500;
		color: #111827;
		margin-bottom: 0.25rem;
		line-height: 1.4;
	}

	.book-authors {
		font-size: 0.875rem;
		color: #6b7280;
		margin-bottom: 0.25rem;
	}

	.book-genre {
		font-size: 0.75rem;
		color: #9ca3af;
		font-style: italic;
		margin-bottom: 0.5rem;
	}

	.condition-wrapper {
		display: flex;
	}

	.no-results {
		padding: 2rem 1rem;
		text-align: center;
		color: #6b7280;
	}

	.selected-book-preview {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.selected-book-preview h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #374151;
	}

	.selected-book-card {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
	}

	.selected-book-content {
		display: flex;
		gap: 1rem;
	}

	.selected-book-cover {
		width: 60px;
		height: 84px;
		flex-shrink: 0;
		border-radius: 6px;
		overflow: hidden;
		border: 1px solid #e5e7eb;
	}

	.selected-book-cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.selected-book-details {
		flex: 1;
	}

	.selected-book-details h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: #111827;
	}

	.authors {
		color: #6b7280;
		margin-bottom: 0.5rem;
	}

	.genre {
		color: #9ca3af;
		font-size: 0.875rem;
		font-style: italic;
		margin-bottom: 0.75rem;
	}

	.condition-section {
		margin-bottom: 0.75rem;
	}

	.description {
		font-size: 0.875rem;
		color: #4b5563;
		line-height: 1.4;
	}

	.description p {
		margin: 0;
		max-height: 3rem;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.btn-primary, .btn-secondary {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: 1px solid transparent;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:not(:disabled):hover {
		background: #2563eb;
	}

	.btn-primary:disabled {
		background: #d1d5db;
		color: #9ca3af;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: white;
		color: #374151;
		border-color: #d1d5db;
	}

	.btn-secondary:hover {
		background: #f9fafb;
		border-color: #9ca3af;
	}
</style>