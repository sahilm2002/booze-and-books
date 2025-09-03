<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import BookCard from '$components/books/BookCard.svelte';
	import BookEditForm from '$components/books/BookEditForm.svelte';
	import { bookStore, books, booksLoading, booksError } from '$lib/stores/books';
	import type { Book } from '$lib/types/book';
	import type { PageData } from './$types';

	export let data: PageData;

	let searchTerm = '';
	let selectedGenre = '';
	let selectedCondition = '';
	let editingBook: Book | null = null;
	let showEditModal = false;

	// Hydrate store with SSR data
	bookStore.hydrate(data.books, data.bookCount);

	$: filteredBooks = $books.filter(book => {
		const matchesSearch = !searchTerm || 
			book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			book.authors.some(author => author.toLowerCase().includes(searchTerm.toLowerCase())) ||
			(book.genre && book.genre.toLowerCase().includes(searchTerm.toLowerCase()));
		
		const matchesGenre = !selectedGenre || book.genre === selectedGenre;
		const matchesCondition = !selectedCondition || book.condition === selectedCondition;
		
		return matchesSearch && matchesGenre && matchesCondition;
	});

	$: genres = Array.from(new Set($books.map(book => book.genre).filter(Boolean))).sort();
	$: conditions = Array.from(new Set($books.map(book => book.condition))).sort();

	onMount(() => {
		// Initialize books from server data if store is empty
		if ($books.length === 0 && data.books?.length) {
			books.set(data.books);
		}
	});

	function handleEditBook(event: CustomEvent<{ book: Book }>) {
		editingBook = event.detail.book;
		showEditModal = true;
	}

	async function handleDeleteBook(event: CustomEvent<{ book: Book }>) {
		const { book } = event.detail;
		await bookStore.deleteBook(book.id);
	}

	function handleEditSave() {
		showEditModal = false;
		editingBook = null;
	}

	function handleEditCancel() {
		showEditModal = false;
		editingBook = null;
	}

	function clearFilters() {
		searchTerm = '';
		selectedGenre = '';
		selectedCondition = '';
	}
</script>

<svelte:head>
	<title>My Books - Booze & Books</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">My Books</h1>
			<p class="mt-2 text-gray-600">
				{data.bookCount || $books.length} book{(data.bookCount || $books.length) !== 1 ? 's' : ''} in your collection
			</p>
		</div>
		<div class="mt-4 sm:mt-0">
			<a
				href="/app/books/add"
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
				</svg>
				Add Book
			</a>
		</div>
	</div>

	<!-- Filters -->
	{#if $books.length > 0}
		<div class="bg-white shadow rounded-lg p-6 mb-8">
			<div class="flex flex-col lg:flex-row lg:items-center gap-4">
				<div class="flex-1">
					<label for="search" class="sr-only">Search books</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
							</svg>
						</div>
						<input
							type="text"
							id="search"
							bind:value={searchTerm}
							class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							placeholder="Search by title, author, or genre..."
						/>
					</div>
				</div>
				
				<div class="flex flex-col sm:flex-row gap-4">
					<div>
						<label for="genre-filter" class="sr-only">Filter by genre</label>
						<select
							id="genre-filter"
							bind:value={selectedGenre}
							class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
						>
							<option value="">All Genres</option>
							{#each genres as genre}
								<option value={genre}>{genre}</option>
							{/each}
						</select>
					</div>
					
					<div>
						<label for="condition-filter" class="sr-only">Filter by condition</label>
						<select
							id="condition-filter"
							bind:value={selectedCondition}
							class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
						>
							<option value="">All Conditions</option>
							{#each conditions as condition}
								<option value={condition}>{condition.replace('_', ' ')}</option>
							{/each}
						</select>
					</div>
					
					{#if searchTerm || selectedGenre || selectedCondition}
						<button
							type="button"
							on:click={clearFilters}
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Clear
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Error State -->
	{#if $booksError}
		<div class="rounded-md bg-red-50 p-4 mb-8">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
					</svg>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">Error loading books</h3>
					<p class="mt-1 text-sm text-red-700">{$booksError}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Loading State -->
	{#if $booksLoading}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each Array(6) as _}
				<div class="bg-white shadow rounded-lg p-6 animate-pulse">
					<div class="flex gap-4">
						<div class="w-16 h-24 bg-gray-300 rounded"></div>
						<div class="flex-1">
							<div class="h-4 bg-gray-300 rounded mb-2"></div>
							<div class="h-3 bg-gray-300 rounded mb-4 w-2/3"></div>
							<div class="h-3 bg-gray-300 rounded mb-2"></div>
							<div class="h-3 bg-gray-300 rounded w-1/2"></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	<!-- Empty State -->
	{:else if filteredBooks.length === 0 && !$booksError}
		<div class="text-center py-12">
			{#if $books.length === 0}
				<svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z"/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">No books yet</h3>
				<p class="mt-1 text-sm text-gray-500">Get started by adding your first book.</p>
				<div class="mt-6">
					<a
						href="/app/books/add"
						class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
						</svg>
						Add Your First Book
					</a>
				</div>
			{:else}
				<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">No books found</h3>
				<p class="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
				<div class="mt-6">
					<button
						type="button"
						on:click={clearFilters}
						class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						Clear Filters
					</button>
				</div>
			{/if}
		</div>
	<!-- Books Grid -->
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each filteredBooks as book (book.id)}
				<BookCard
					{book}
					on:edit={handleEditBook}
					on:delete={handleDeleteBook}
				/>
			{/each}
		</div>
	{/if}
</div>

<!-- Edit Book Modal -->
{#if showEditModal && editingBook}
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" on:click={handleEditCancel} role="dialog" aria-modal="true">
		<div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white" on:click|stopPropagation>
			<BookEditForm 
				book={editingBook}
				onSave={handleEditSave}
				onCancel={handleEditCancel}
			/>
		</div>
	</div>
{/if}