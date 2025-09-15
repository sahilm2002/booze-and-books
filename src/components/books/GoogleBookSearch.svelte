<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { GoogleBooksService } from '$lib/services/googleBooksService';
	import type { GoogleBookResult } from '$lib/types/book';

	export let placeholder = 'Search for books...';
	export let value = '';
	export let disabled = false;

	const dispatch = createEventDispatcher<{
		select: { book: GoogleBookResult; extracted: any };
		input: { value: string };
	}>();

	let searchInput: HTMLInputElement;
	let searchResults: any[] = [];
	let isSearching = false;
	let showDropdown = false;
	let searchError: string | null = null;
	let debounceTimeout: ReturnType<typeof setTimeout> | undefined;
	
	// Request cancellation and race condition prevention
	let currentAbortController: AbortController | null = null;
	let requestId = 0;

	onMount(() => {
		return () => {
			if (debounceTimeout) {
				clearTimeout(debounceTimeout);
			}
			if (currentAbortController) {
				currentAbortController.abort();
				currentAbortController = null;
			}
		};
	});

	onDestroy(() => {
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
		}
		if (currentAbortController) {
			currentAbortController.abort();
			currentAbortController = null;
		}
	});

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const query = target.value.trim();
		
		dispatch('input', { value: target.value });

		// Cancel any pending debounced search
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
		}

		// Cancel any ongoing request
		if (currentAbortController) {
			currentAbortController.abort();
			currentAbortController = null;
		}

		if (query.length < 2) {
			searchResults = [];
			showDropdown = false;
			return;
		}

		debounceTimeout = setTimeout(async () => {
			await performSearch(query);
		}, 300);
	}

	async function performSearch(query: string) {
		if (!query.trim()) return;

		// Cancel any existing request before starting a new one
		if (currentAbortController) {
			currentAbortController.abort();
		}

		// Create new AbortController for this request
		currentAbortController = new AbortController();
		const currentRequestId = ++requestId;
		const currentQuery = query;

		isSearching = true;
		searchError = null;
		showDropdown = true;

		try {
			const smartQuery = GoogleBooksService.buildSmartQuery(query);
			const apiResponse = await fetch(
				`/api/google-books/search?q=${encodeURIComponent(smartQuery)}&maxResults=8`,
				{ signal: currentAbortController.signal }
			);
			
			// Check if this response is still relevant (not superseded by newer request)
			if (currentRequestId !== requestId || currentQuery !== query) {
				return; // Ignore outdated response
			}
			
			if (!apiResponse.ok) {
				const errorData = await apiResponse.json();
				throw new Error(errorData.message || 'Search failed');
			}
			
			const response = await apiResponse.json();
			
			// Double-check we're still on the same request
			if (currentRequestId !== requestId || currentQuery !== query) {
				return; // Ignore outdated response
			}
			
			searchResults = GoogleBooksService.formatSearchResults(response.items || []);
			
			if (searchResults.length === 0) {
				searchError = 'No books found. Try a different search term.';
			}
		} catch (error) {
			// Ignore aborted requests - they're not real errors
			if (error instanceof Error && error.name === 'AbortError') {
				return;
			}
			
			// Only show error if this is still the current request
			if (currentRequestId === requestId && currentQuery === query) {
				console.error('Google Books search error:', error);
				searchError = error instanceof Error ? error.message : 'Search failed. Please try again.';
				searchResults = [];
			}
		} finally {
			// Only update loading state if this is still the current request
			if (currentRequestId === requestId && currentQuery === query) {
				isSearching = false;
			}
			
			// Clean up the controller if it's the current one
			if (currentAbortController && !currentAbortController.signal.aborted) {
				currentAbortController = null;
			}
		}
	}

	function selectBook(result: any, googleBook: GoogleBookResult) {
		// Clear any pending search timeout
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
			debounceTimeout = undefined;
		}
		
		// Immediately hide dropdown and clear results
		showDropdown = false;
		searchResults = [];
		isSearching = false;
		searchError = null;
		
		// Update the input value
		value = result.displayText;
		
		// Dispatch the selection event
		dispatch('select', { 
			book: googleBook,
			extracted: GoogleBooksService.extractBookData(googleBook)
		});
		
		// Blur the input to remove focus
		searchInput.blur();
	}

	function closeDropdown() {
		setTimeout(() => {
			showDropdown = false;
		}, 200);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			showDropdown = false;
			searchInput.blur();
		}
	}
</script>

<div class="relative">
	<div class="relative">
		<input
			bind:this={searchInput}
			bind:value
			on:input={handleInput}
			on:focus={() => {
				if (value.length >= 2 && searchResults.length > 0) {
					showDropdown = true;
				}
			}}
			on:blur={closeDropdown}
			on:keydown={handleKeydown}
			{placeholder}
			{disabled}
			class="form-input"
			type="text"
			autocomplete="off"
		/>
		
		{#if isSearching}
			<div class="absolute right-3 top-3">
				<svg class="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
			</div>
		{/if}
	</div>

	{#if showDropdown && (searchResults.length > 0 || searchError || isSearching)}
		<div class="search-dropdown">
			{#if isSearching}
				<div class="search-state">
					<div class="search-loading">
						<svg class="loading-icon" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						<span class="search-text">Searching books...</span>
					</div>
				</div>
			{:else if searchError}
				<div class="search-state">
					<div class="search-error">
						<svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
						<span class="error-text">{searchError}</span>
					</div>
				</div>
			{:else}
				<div class="search-results">
					{#each searchResults as result, index (result.googleBookId)}
						<button
							type="button"
							on:click|preventDefault={() => selectBook(result, { id: result.googleBookId, volumeInfo: { title: result.title, authors: result.authors, description: result.description, categories: result.genre ? [result.genre] : [], imageLinks: result.thumbnail_url ? { thumbnail: result.thumbnail_url } : undefined, industryIdentifiers: result.isbn ? [{ type: 'ISBN_13', identifier: result.isbn }] : [] } })}
							class="search-result-item"
						>
							<div class="result-content">
								<div class="book-cover">
									{#if result.thumbnail_url}
										<img 
											src={result.thumbnail_url} 
											alt="{result.title} cover"
											class="cover-image"
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
								
								<div class="book-details">
									<h4 class="book-title">{result.title}</h4>
									<p class="book-authors">by {result.authors.join(', ')}</p>
									{#if result.genre}
										<span class="book-genre">{result.genre}</span>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Form Input Styling to match BookAddForm */
	.form-input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #f8f9fa;
		font-size: 0.95rem;
		color: #374151;
		transition: all 0.2s ease;
	}

	.form-input:focus {
		outline: none;
		border-color: #8B2635;
		background: white;
		box-shadow: 0 0 0 3px rgba(139, 38, 53, 0.1);
	}

	.form-input:disabled {
		background: #f3f4f6;
		color: #9ca3af;
		cursor: not-allowed;
	}

	.form-input::placeholder {
		color: #9ca3af;
	}

	/* Search Dropdown */
	.search-dropdown {
		position: absolute;
		z-index: 50;
		width: 100%;
		max-width: 500px;
		margin-top: 0.5rem;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		max-height: 400px;
		overflow: hidden;
	}

	/* Search States */
	.search-state {
		padding: 2rem 1.5rem;
		text-align: center;
	}

	.search-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.loading-icon {
		width: 2rem;
		height: 2rem;
		color: #8B2635;
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

	.search-text {
		color: #718096;
		font-size: 0.95rem;
		font-weight: 500;
	}

	.search-error {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.error-icon {
		width: 2rem;
		height: 2rem;
		color: #dc2626;
	}

	.error-text {
		color: #dc2626;
		font-size: 0.95rem;
		font-weight: 500;
	}

	/* Search Results */
	.search-results {
		max-height: 400px;
		overflow-y: auto;
	}

	.search-result-item {
		width: 100%;
		text-align: left;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		transition: all 0.2s ease;
		border-bottom: 1px solid #f1f3f4;
	}

	.search-result-item:last-child {
		border-bottom: none;
	}

	.search-result-item:hover {
		background: #f8f9fa;
	}

	.search-result-item:focus {
		outline: none;
		background: #f8f9fa;
		box-shadow: inset 3px 0 0 #8B2635;
	}

	.result-content {
		display: flex;
		gap: 1rem;
		padding: 1rem 1.5rem;
		align-items: flex-start;
	}

	/* Book Cover */
	.book-cover {
		flex-shrink: 0;
		width: 3rem;
		height: 4rem;
	}

	.cover-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 6px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.cover-placeholder {
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, #f1f3f4 0%, #e2e8f0 100%);
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.placeholder-icon {
		width: 1.5rem;
		height: 1.5rem;
		color: #9ca3af;
	}

	/* Book Details */
	.book-details {
		flex: 1;
		min-width: 0;
		max-width: calc(100% - 4rem);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.book-title {
		color: #2d3748;
		font-size: 0.95rem;
		font-weight: 600;
		line-height: 1.4;
		margin: 0;
		word-wrap: break-word;
		overflow-wrap: break-word;
		hyphens: auto;
		max-width: 100%;
	}

	.book-authors {
		color: #718096;
		font-size: 0.85rem;
		font-weight: 500;
		margin: 0;
		line-height: 1.3;
		word-wrap: break-word;
		overflow-wrap: break-word;
		max-width: 100%;
	}

	.book-genre {
		display: inline-block;
		background: #f1f3f4;
		color: #8B2635;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		margin-top: 0.25rem;
		align-self: flex-start;
	}

	/* Responsive Design */
	@media (max-width: 640px) {
		.search-dropdown {
			margin-top: 0.25rem;
			border-radius: 8px;
			max-width: 400px;
		}

		.result-content {
			padding: 0.75rem 1rem;
			gap: 0.75rem;
		}

		.book-cover {
			width: 2.5rem;
			height: 3.5rem;
		}

		.book-details {
			max-width: calc(100% - 3.25rem);
		}

		.book-title {
			font-size: 0.9rem;
		}

		.book-authors {
			font-size: 0.8rem;
		}
	}
</style>
