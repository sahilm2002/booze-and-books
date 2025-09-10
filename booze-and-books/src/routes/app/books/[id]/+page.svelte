<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import BookDetailView from '../../../../components/books/BookDetailView.svelte';
	import SwapRequestDialog from '../../../../components/swaps/SwapRequestDialog.svelte';
	import { swapStore } from '$lib/stores/swaps.js';
	import type { PageData } from './$types.js';

	export let data: PageData;

	let showSwapDialog = false;

	async function handleRequestSwap(event: CustomEvent<{ bookId: string }>) {
		showSwapDialog = true;
	}

	function handleSwapSuccess(event: CustomEvent<{ message: string }>) {
		showSwapDialog = false;
		
		if (!$auth.user) {
			goto('/auth/login?redirectTo=/app/books?success=swap-requested');
			return;
		}
		
		goto('/app/books?success=swap-requested');
	}

	function handleCloseDetail() {
		if (!$auth.user) {
			goto('/auth/login?redirectTo=/app/books');
			return;
		}
		
		goto('/app/books');
	}

	function handleCloseSwapDialog() {
		showSwapDialog = false;
	}
</script>

<svelte:head>
	<title>{data.book.title} - Booze and Books</title>
	<meta name="description" content="View details for {data.book.title} by {data.book.authors?.join(', ') || 'Unknown Author'}. Available for book swap." />
</svelte:head>

<main class="book-detail-page">
	<div class="page-header">
		<div class="breadcrumb">
			<a href="/app/books" class="breadcrumb-link">
				<svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				Back to Books
			</a>
		</div>
		
		{#if data.isOwner}
			<div class="owner-badge">
				<svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
				</svg>
				Your Book
			</div>
		{/if}
	</div>

	<BookDetailView 
		book={data.book}
		userRating={data.ownerRating}
		canRequestSwap={data.canRequestSwap}
		on:close={handleCloseDetail}
		on:request-swap={handleRequestSwap}
	/>

	<SwapRequestDialog
		book={data.book}
		isOpen={showSwapDialog}
		on:close={handleCloseSwapDialog}
		on:success={handleSwapSuccess}
	/>
</main>

<style>
	.book-detail-page {
		min-height: 100vh;
		background: #f9fafb;
	}

	.page-header {
		background: white;
		border-bottom: 1px solid #e5e7eb;
		padding: 1rem 0;
		margin-bottom: 2rem;
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.page-header {
		max-width: 1200px;
		margin: 0 auto;
		padding-left: 1rem;
		padding-right: 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
	}

	.breadcrumb-link {
		display: flex;
		align-items: center;
		color: #6b7280;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: color 0.2s;
	}

	.breadcrumb-link:hover {
		color: #4f46e5;
	}

	.owner-badge {
		display: flex;
		align-items: center;
		background: #dbeafe;
		color: #1e40af;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		border: 1px solid #bfdbfe;
	}

	/* Remove the modal overlay styles since BookDetailView now handles its own display */
	:global(.book-detail-page .book-detail-overlay) {
		position: static;
		background: none;
		padding: 0;
	}

	:global(.book-detail-page .book-detail-modal) {
		box-shadow: none;
		max-height: none;
		border-radius: 0;
	}

	:global(.book-detail-page .close-button) {
		display: none;
	}

	@media (max-width: 768px) {
		.page-header {
			position: relative;
			padding: 1rem;
		}

		.owner-badge {
			font-size: 0.75rem;
			padding: 0.375rem 0.75rem;
		}
	}
</style>