<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import BookCard from '../../../components/books/BookCard.svelte';
	import BookEditForm from '../../../components/books/BookEditForm.svelte';
	import { bookStore, books, booksLoading, booksError } from '$lib/stores/books';
	import { getConditionDisplayName } from '$lib/validation/book';
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

	function handleViewDetails(event: CustomEvent<{ book: Book }>) {
		const { book } = event.detail;
		
		if (!$auth.user) {
			goto(`/auth/login?redirectTo=/app/books/${book.id}`);
			return;
		}
		
		goto(`/app/books/${book.id}`);
	}
</script>

<svelte:head>
	<title>My Books - Booze & Books</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Header -->
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title">My Books</h1>
			<p class="page-subtitle">
				{data.bookCount || $books.length} book{(data.bookCount || $books.length) !== 1 ? 's' : ''} in your collection
			</p>
		</div>
		{#if $books.length > 0}
			<div class="header-actions">
				<button type="button" class="btn-add" on:click={async () => {
					console.log('Add Book clicked - Auth state:', $auth.user ? 'Logged in' : 'Not logged in');
					
					if (!$auth.user) {
						console.log('User not authenticated, redirecting to login');
						goto('/auth/login?redirectTo=/app/books/add');
						return;
					}
					
					console.log('User authenticated, navigating to /app/books/add');
					goto('/app/books/add');
				}}>
					<svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
					</svg>
					Add Book
				</button>
			</div>
		{/if}
	</div>

	<!-- Filters -->
	{#if $books.length > 0}
		<div class="filters-section">
			<div class="search-container">
				<div class="search-input-wrapper">
					<svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
					</svg>
					<input
						type="text"
						bind:value={searchTerm}
						class="search-input"
						placeholder="Search by title, author, or genre..."
					/>
				</div>
			</div>
			
			<div class="filters-container">
				<div class="filter-group">
					<select bind:value={selectedGenre} class="filter-select">
						<option value="">All Genres</option>
						{#each genres as genre}
							<option value={genre}>{genre}</option>
						{/each}
					</select>
				</div>
				
				<div class="filter-group">
					<select bind:value={selectedCondition} class="filter-select">
						<option value="">All Conditions</option>
						{#each conditions as condition}
							<option value={condition}>{getConditionDisplayName(condition)}</option>
						{/each}
					</select>
				</div>
				
				{#if searchTerm || selectedGenre || selectedCondition}
					<button type="button" on:click={clearFilters} class="btn-clear">
						Clear
					</button>
				{/if}
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
					<button type="button" class="btn-add" on:click={async () => {
						console.log('Add Your First Book clicked');
						console.log('Auth state:', $auth.user ? 'Logged in' : 'Not logged in');
						console.log('Auth user:', $auth.user);
						console.log('Window location:', window.location.href);
						
						if (!$auth.user) {
							console.log('User not authenticated, redirecting to login');
							goto('/auth/login?redirectTo=/app/books/add');
							return;
						}
						
						console.log('User authenticated, navigating to /app/books/add');
						
						// Try direct navigation first
						try {
							await goto('/app/books/add');
							console.log('Navigation completed successfully');
						} catch (error) {
							console.error('Navigation failed:', error);
							// Fallback to window.location for debugging
							window.location.href = '/app/books/add';
						}
					}}>
						<svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
						</svg>
						Add Your First Book
					</button>
				</div>
			{:else}
				<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">No books found</h3>
				<p class="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
				<div class="mt-6">
					<button type="button" on:click={clearFilters} class="btn-clear">
						Clear Filters
					</button>
				</div>
			{/if}
		</div>
	<!-- Books Grid -->
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
			{#each filteredBooks as book (book.id)}
				<div class="flex">
					<BookCard
						{book}
						on:edit={handleEditBook}
						on:delete={handleDeleteBook}
						on:view-details={handleViewDetails}
					/>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Edit Book Modal -->
{#if showEditModal && editingBook}
	<div class="modal-overlay" on:click={handleEditCancel} role="dialog" aria-modal="true">
		<div class="modal-container" on:click|stopPropagation>
			<BookEditForm 
				book={editingBook}
				onSave={handleEditSave}
				onCancel={handleEditCancel}
			/>
		</div>
	</div>
{/if}

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

	.header-actions {
		flex-shrink: 0;
	}

	.btn-add {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		text-decoration: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.95rem;
		box-shadow: 0 4px 12px rgba(139, 38, 53, 0.3);
		transition: all 0.2s ease;
		border: none;
		cursor: pointer;
		z-index: 10;
		position: relative;
	}

	.btn-add:hover {
		background: linear-gradient(135deg, #722F37 0%, #8B2635 100%);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(139, 38, 53, 0.4);
	}

	.btn-icon {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
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

	.search-container {
		margin-bottom: 1rem;
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
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	@media (max-width: 640px) {
		.filters-container {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}
	}

	.filter-group {
		flex-shrink: 0;
	}

	.filter-select {
		padding: 0.75rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #f8f9fa;
		font-size: 0.95rem;
		color: #374151;
		min-width: 140px;
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.filter-select:focus {
		outline: none;
		border-color: #8B2635;
		background: white;
		box-shadow: 0 0 0 3px rgba(139, 38, 53, 0.1);
	}

	.filter-select:hover {
		background: #f1f3f4;
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
	}

	.btn-clear:hover {
		background: #F5F5DC;
		border-color: #8B2635;
		color: #722F37;
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

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(2px);
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		overflow-y: auto;
	}

	.modal-container {
		background: white;
		border-radius: 12px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		max-width: 90%;
		width: 600px;
		max-height: 90vh;
		overflow-y: auto;
		animation: modal-appear 0.2s ease-out;
	}

	@keyframes modal-appear {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(-10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	@media (max-width: 768px) {
		.modal-container {
			max-width: 95%;
			width: auto;
			margin: 0.5rem;
		}

		.modal-overlay {
			padding: 0.5rem;
		}
	}
</style>
