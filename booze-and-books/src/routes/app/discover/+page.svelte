<script lang="ts">
	import { onMount } from 'svelte';
	import BookCard from '../../../components/books/BookCard.svelte';
	import type { PageData } from './$types';
	import type { BookWithOwner } from '$lib/types/book';

	export let data: PageData;

	let searchQuery = '';
	let filteredBooks = data.availableBooks;
	let selectedGenres: string[] = [];
	let selectedConditions: string[] = [];
	let showSuccessMessage = '';

	// Get unique genres and conditions for filters
	$: uniqueGenres = [...new Set(data.availableBooks.map(book => book.genre).filter(Boolean))].sort() as string[];
	$: uniqueConditions = [...new Set(data.availableBooks.map(book => book.condition))].sort();

	// Filter books based on search and filters
	$: {
		filteredBooks = data.availableBooks.filter(book => {
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

	function handleSwapRequested(event: CustomEvent<{ message: string }>) {
		showSuccessMessage = event.detail.message;
		// Hide success message after 5 seconds
		setTimeout(() => {
			showSuccessMessage = '';
		}, 5000);
	}

	onMount(() => {
		// Set page title
		document.title = 'Discover Books - Booze & Books';
	});
</script>

<svelte:head>
	<title>Discover Books - Booze & Books</title>
	<meta name="description" content="Discover books available for swap from other readers" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Discover Books</h1>
			<p class="text-lg text-gray-600">Find books available for swap from other readers</p>
		</div>

		<!-- Success Message -->
		{#if showSuccessMessage}
			<div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
				<div class="flex items-center">
					<svg class="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="text-green-800">{showSuccessMessage}</p>
				</div>
			</div>
		{/if}

		<!-- Filters Section -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Filter Books</h2>
			
			<!-- Search -->
			<div class="mb-6">
				<label for="search" class="block text-sm font-medium text-gray-700 mb-2">
					Search by title, author, or genre
				</label>
				<div class="relative">
					<input
						id="search"
						type="text"
						bind:value={searchQuery}
						placeholder="Search books..."
						class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
					/>
					<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
				</div>
			</div>

			<!-- Genre Filter -->
			{#if uniqueGenres.length > 0}
				<div class="mb-4">
					<h3 class="text-sm font-medium text-gray-700 mb-2">Genres</h3>
					<div class="flex flex-wrap gap-2">
						{#each uniqueGenres as genre}
							<button
								type="button"
								class="px-3 py-1 text-sm border rounded-full transition-colors"
								class:bg-blue-100={selectedGenres.includes(genre)}
								class:border-blue-300={selectedGenres.includes(genre)}
								class:text-blue-800={selectedGenres.includes(genre)}
								class:bg-white={!selectedGenres.includes(genre)}
								class:border-gray-300={!selectedGenres.includes(genre)}
								class:text-gray-700={!selectedGenres.includes(genre)}
								class:hover:bg-gray-50={!selectedGenres.includes(genre)}
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
				<div class="mb-4">
					<h3 class="text-sm font-medium text-gray-700 mb-2">Conditions</h3>
					<div class="flex flex-wrap gap-2">
						{#each uniqueConditions as condition}
							<button
								type="button"
								class="px-3 py-1 text-sm border rounded-full transition-colors"
								class:bg-blue-100={selectedConditions.includes(condition)}
								class:border-blue-300={selectedConditions.includes(condition)}
								class:text-blue-800={selectedConditions.includes(condition)}
								class:bg-white={!selectedConditions.includes(condition)}
								class:border-gray-300={!selectedConditions.includes(condition)}
								class:text-gray-700={!selectedConditions.includes(condition)}
								class:hover:bg-gray-50={!selectedConditions.includes(condition)}
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
				<button
					type="button"
					class="text-sm text-blue-600 hover:text-blue-800 transition-colors"
					on:click={clearFilters}
				>
					Clear all filters
				</button>
			{/if}
		</div>

		<!-- Results -->
		<div class="mb-4 flex items-center justify-between">
			<p class="text-sm text-gray-600">
				{filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''} available
			</p>
		</div>

		<!-- Books Grid -->
		{#if filteredBooks.length === 0}
			<div class="text-center py-12">
				{#if data.availableBooks.length === 0}
					<svg class="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
					</svg>
					<h3 class="mt-2 text-sm font-medium text-gray-900">No books available yet</h3>
					<p class="mt-1 text-sm text-gray-500">No other users have made books available for swap yet.</p>
				{:else}
					<svg class="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<h3 class="mt-2 text-sm font-medium text-gray-900">No books match your filters</h3>
					<p class="mt-1 text-sm text-gray-500">Try adjusting your search or filters to find more books.</p>
					<button
						type="button"
						class="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors"
						on:click={clearFilters}
					>
						Clear all filters
					</button>
				{/if}
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each filteredBooks as book (book.id)}
					<BookCard
						{book}
						showActions={true}
						showOwner={true}
						enableSwapRequests={true}
						on:swapRequested={handleSwapRequested}
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>