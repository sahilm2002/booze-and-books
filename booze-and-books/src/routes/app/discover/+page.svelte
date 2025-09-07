<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import BookCard from '../../../components/books/BookCard.svelte';
	import type { PageData } from './$types';
	import type { BookWithOwner } from '$lib/types/book';
	import { discoveryBooks, discoveryBooksLoading, discoveryBooksError, bookStore } from '$lib/stores/books';
	import { user } from '$lib/stores/auth';

	export let data: PageData;

	let searchQuery = '';
	let filteredBooks: BookWithOwner[] = [];
	let selectedGenres: string[] = [];
	let selectedConditions: string[] = [];

	// Subscribe to discovery books store
	$: availableBooks = $discoveryBooks.length > 0 ? $discoveryBooks : data.availableBooks;
	$: loading = $discoveryBooksLoading;
	$: error = $discoveryBooksError;

	// Get unique genres and conditions for filters
	$: uniqueGenres = [...new Set(availableBooks.map(book => book.genre).filter(Boolean))].sort() as string[];
	$: uniqueConditions = [...new Set(availableBooks.map(book => book.condition))].sort();

	// Filter books based on search and filters
	$: {
		filteredBooks = availableBooks.filter(book => {
			// Search filter
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				const matchesTitle = book.title.toLowerCase().includes(query);
				const matchesAuthor = book.authors.some(author => 
					author.toLowerCase().includes(query)
				);
				const matchesGenre = book.genre?.toLowerCase().includes(query);
				
				if (!matchesTitle && !matchesAuthor && !matchesGenre) {
					return false;
				}
			}

			// Genre filter
			if (selectedGenres.length > 0) {
				if (!book.genre || !selectedGenres.includes(book.genre)) {
					return false;
				}
			}

			// Condition filter
			if (selectedConditions.length > 0) {
				if (!selectedConditions.includes(book.condition)) {
					return false;
				}
			}

			return true;
		});
	}

	function handleGenreFilter(genre: string) {
		if (selectedGenres.includes(genre)) {
			selectedGenres = selectedGenres.filter(g => g !== genre);
		} else {
			selectedGenres = [...selectedGenres, genre];
		}
	}

	function handleConditionFilter(condition: string) {
		if (selectedConditions.includes(condition)) {
			selectedConditions = selectedConditions.filter(c => c !== condition);
		} else {
			selectedConditions = [...selectedConditions, condition];
		}
	}

	function clearFilters() {
		searchQuery = '';
		selectedGenres = [];
		selectedConditions = [];
	}


	onMount(async () => {
		// Set page title
		document.title = 'Discover Books - Booze & Books';
		
		// Initialize discovery books with real-time updates
		if ($user?.id) {
			// Hydrate store with server data first, then load with realtime
			bookStore.hydrateDiscoveryBooks(data.availableBooks);
			await bookStore.loadDiscoveryBooks($user.id);
		}
	});
</script>

<style>
	/* Page Header */
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		gap: 1rem;
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1.5rem;
		}
	}

	.header-content {
		flex: 1;
	}

	.page-title {
		color: #2d3748;
		font-size: 2rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		line-height: 1.2;
	}

	.page-subtitle {
		color: #718096;
		font-size: 1rem;
		margin: 0;
	}


	/* Filters Section */
	.filters-section {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.filters-title {
		color: #2d3748;
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 1.5rem 0;
	}

	.search-container {
		margin-bottom: 1.5rem;
	}

	.search-input-wrapper {
		position: relative;
		max-width: 400px;
	}

	.search-icon {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		width: 20px;
		height: 20px;
		color: #9ca3af;
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.5rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.95rem;
		background: #f8f9fa;
		transition: all 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: #8B2635;
		background: white;
		box-shadow: 0 0 0 3px rgba(139, 38, 53, 0.1);
	}

	.search-input::placeholder {
		color: #9ca3af;
	}

	.filters-container {
		display: flex;
		gap: 2rem;
		align-items: flex-start;
		flex-wrap: wrap;
	}

	@media (max-width: 640px) {
		.filters-container {
			flex-direction: column;
			gap: 1.5rem;
		}
	}

	.filter-group {
		flex-shrink: 0;
	}

	.filter-label {
		color: #374151;
		font-size: 0.9rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.filter-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.filter-tag {
		padding: 0.5rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 20px;
		background: white;
		color: #374151;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.filter-tag:hover {
		background: #f8f9fa;
		border-color: #8B2635;
	}

	.filter-tag.active {
		background: #8B2635;
		border-color: #8B2635;
		color: #F5F5DC;
	}

	.btn-clear {
		padding: 0.75rem 1rem;
		background: #f8f9fa;
		color: #8B2635;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
		margin-top: 1rem;
	}

	.btn-clear:hover {
		background: #F5F5DC;
		border-color: #8B2635;
		color: #722F37;
	}

	/* Results Header */
	.results-header {
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.results-count {
		color: #718096;
		font-size: 0.9rem;
		margin: 0;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
	}

	.empty-icon {
		width: 3rem;
		height: 3rem;
		color: #9ca3af;
		margin: 0 auto 1rem;
	}

	.empty-title {
		color: #2d3748;
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.empty-subtitle {
		color: #718096;
		font-size: 0.95rem;
		margin: 0 0 1.5rem 0;
		max-width: 400px;
		margin-left: auto;
		margin-right: auto;
	}

	/* Override Tailwind classes for consistency */
	:global(.max-w-7xl) {
		max-width: 1200px;
	}

	:global(.mx-auto) {
		margin-left: auto;
		margin-right: auto;
	}

	:global(.px-4) {
		padding-left: 1rem;
		padding-right: 1rem;
	}

	:global(.py-8) {
		padding-top: 2rem;
		padding-bottom: 2rem;
	}

	@media (min-width: 640px) {
		:global(.sm\:px-6) {
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}
	}

	@media (min-width: 1024px) {
		:global(.lg\:px-8) {
			padding-left: 2rem;
			padding-right: 2rem;
		}
	}
</style>

<svelte:head>
	<title>Discover Books - Booze & Books</title>
	<meta name="description" content="Discover books available for swap from other readers" />
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Header -->
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title">Discover Books</h1>
			<p class="page-subtitle">
				Find books available for swap from other readers
			</p>
		</div>
	</div>


	<!-- Error Display -->
	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
			<p class="font-medium">Error loading books:</p>
			<p class="text-sm">{error}</p>
		</div>
	{/if}

	<!-- Loading State -->
	{#if loading}
		<div class="flex justify-center items-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
			<span class="ml-3 text-gray-600">Loading books...</span>
		</div>
	{/if}

	<!-- Filters Section -->
	{#if availableBooks.length > 0}
		<div class="filters-section">
			<h2 class="filters-title">Filter Books</h2>
			
			<!-- Search -->
			<div class="search-container">
				<div class="search-input-wrapper">
					<svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
					</svg>
					<input
						id="search"
						type="text"
						bind:value={searchQuery}
						class="search-input"
						placeholder="Search by title, author, or genre..."
					/>
				</div>
			</div>

			
			<div class="filters-container">
				<!-- Genre Filter -->
				{#if uniqueGenres.length > 0}
					<div class="filter-group">
						<h3 class="filter-label">Genres</h3>
						<div class="filter-tags">
							{#each uniqueGenres as genre}
								<button
									type="button"
									class="filter-tag"
									class:active={selectedGenres.includes(genre)}
									on:click={() => handleGenreFilter(genre)}
								>
									{genre}
								</button>
							{/each}
						</div>
				</div>
				{/if}

				<!-- Condition Filter -->
				{#if uniqueConditions.length > 0}
					<div class="filter-group">
						<h3 class="filter-label">Conditions</h3>
						<div class="filter-tags">
							{#each uniqueConditions as condition}
								<button
									type="button"
									class="filter-tag"
									class:active={selectedConditions.includes(condition)}
									on:click={() => handleConditionFilter(condition)}
								>
									{condition.replace(/_/g, ' ')}
								</button>
							{/each}
						</div>
				</div>
				{/if}

				<!-- Clear Filters -->
				{#if searchQuery || selectedGenres.length > 0 || selectedConditions.length > 0}
					<button type="button" on:click={clearFilters} class="btn-clear">
						Clear Filters
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Results -->
	<div class="results-header">
		<p class="results-count">
			{filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''} available
		</p>
	</div>

	<!-- Books Grid -->
	{#if filteredBooks.length === 0}
		<div class="empty-state">
			{#if availableBooks.length === 0}
				<svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
				</svg>
				<h3 class="empty-title">No books available yet</h3>
				<p class="empty-subtitle">No other users have made books available for swap yet.</p>
			{:else}
				<svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<h3 class="empty-title">No books match your filters</h3>
				<p class="empty-subtitle">Try adjusting your search or filters to find more books.</p>
				<button type="button" class="btn-clear" on:click={clearFilters}>
					Clear all filters
				</button>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
			{#each filteredBooks as book (book.id)}
				<div class="flex">
					<BookCard
						{book}
						showActions={true}
						showOwner={true}
						enableSwapRequests={true}
					/>
				</div>
			{/each}
		</div>
	{/if}
</div>