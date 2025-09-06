<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
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

	$: if (value) {
		handleInput();
	}

	onMount(() => {
		return () => {
			if (debounceTimeout) {
				clearTimeout(debounceTimeout);
			}
		};
	});

	function handleInput() {
		const query = value.trim();
		dispatch('input', { value });

		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
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

		isSearching = true;
		searchError = null;
		showDropdown = true;

		try {
			const smartQuery = GoogleBooksService.buildSmartQuery(query);
			const apiResponse = await fetch(`/api/google-books/search?q=${encodeURIComponent(smartQuery)}&maxResults=8`);
			
			if (!apiResponse.ok) {
				const errorData = await apiResponse.json();
				throw new Error(errorData.message || 'Search failed');
			}
			
			const response = await apiResponse.json();
			searchResults = GoogleBooksService.formatSearchResults(response.items || []);
			
			if (searchResults.length === 0) {
				searchError = 'No books found. Try a different search term.';
			}
		} catch (error) {
			console.error('Google Books search error:', error);
			searchError = error instanceof Error ? error.message : 'Search failed. Please try again.';
			searchResults = [];
		} finally {
			isSearching = false;
		}
	}

	function selectBook(result: any, googleBook: GoogleBookResult) {
		value = result.displayText;
		searchResults = [];
		showDropdown = false;
		
		dispatch('select', { 
			book: googleBook,
			extracted: GoogleBooksService.extractBookData(googleBook)
		});
		
		searchInput.blur();
	}

	function closeDropdown() {
		setTimeout(() => {
			showDropdown = false;
		}, 150);
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
			on:focus={() => value.length >= 2 && (showDropdown = true)}
			on:blur={closeDropdown}
			on:keydown={handleKeydown}
			{placeholder}
			{disabled}
			class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
			type="text"
			autocomplete="off"
		/>
		
		{#if isSearching}
			<div class="absolute right-3 top-2.5">
				<svg class="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
			</div>
		{/if}
	</div>

	{#if showDropdown && (searchResults.length > 0 || searchError || isSearching)}
		<div class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
			{#if isSearching}
				<div class="p-3 text-center text-gray-500">
					<svg class="animate-spin mx-auto h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					Searching...
				</div>
			{:else if searchError}
				<div class="p-3 text-center text-gray-500">
					<svg class="mx-auto h-6 w-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
					</svg>
					{searchError}
				</div>
			{:else}
				{#each searchResults as result, index (result.googleBookId)}
					<button
						type="button"
						on:mousedown|preventDefault={() => selectBook(result, { id: result.googleBookId, volumeInfo: { title: result.title, authors: result.authors, description: result.description, categories: result.genre ? [result.genre] : [], imageLinks: result.thumbnail_url ? { thumbnail: result.thumbnail_url } : undefined, industryIdentifiers: result.isbn ? [{ type: 'ISBN_13', identifier: result.isbn }] : [] } })}
						class="w-full text-left p-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
					>
						<div class="flex gap-3">
							{#if result.thumbnail_url}
								<img 
									src={result.thumbnail_url} 
									alt="{result.title} cover"
									class="w-12 h-16 object-cover rounded shadow-sm flex-shrink-0"
									loading="lazy"
								/>
							{:else}
								<div class="w-12 h-16 bg-gray-200 rounded shadow-sm flex items-center justify-center flex-shrink-0">
									<svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
									</svg>
								</div>
							{/if}
							
							<div class="flex-1 min-w-0">
								<h4 class="font-medium text-gray-900 text-sm line-clamp-2">{result.title}</h4>
								<p class="text-gray-600 text-sm line-clamp-1">by {result.authors.join(', ')}</p>
								{#if result.genre}
									<p class="text-gray-500 text-xs mt-1">{result.genre}</p>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<style>
	.line-clamp-1 {
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
	}
	
	.line-clamp-2 {
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}
</style>