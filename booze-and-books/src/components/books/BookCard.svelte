<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Book, BookWithOwner } from '$lib/types/book';
	import { getConditionDisplayName } from '$lib/validation/book';
	import { user } from '$lib/stores/auth';
	import { bookStore } from '$lib/stores/books';
	import SwapRequestDialog from '../swaps/SwapRequestDialog.svelte';
	import ConditionIndicator from './ConditionIndicator.svelte';

	export let book: Book | BookWithOwner;
	export let showActions = true;
	export let showOwner = false;
	export let enableSwapRequests = false;

	const dispatch = createEventDispatcher<{
		edit: { book: Book };
		delete: { book: Book };
		swapRequested: { message: string };
		'view-details': { book: Book };
	}>();

	$: isOwner = $user?.id === book.owner_id;
	$: bookWithOwner = book as BookWithOwner;
	$: conditionDisplayName = getConditionDisplayName(book.condition);
	$: authorsText = book.authors.join(', ');
	$: isAvailable = book.is_available ?? true;
	$: canRequestSwap = enableSwapRequests && !isOwner && isAvailable && $user?.id;

	let showSwapDialog = false;
	let isToggling = false;

	function handleEdit() {
		if (isOwner) {
			dispatch('edit', { book });
		}
	}

	function handleDelete() {
		if (isOwner && confirm('Are you sure you want to delete this book?')) {
			dispatch('delete', { book });
		}
	}

	async function toggleAvailability() {
		if (!isOwner || isToggling) return;
		
		isToggling = true;
		const success = await bookStore.toggleAvailability(book.id, !isAvailable);
		if (success) {
			// Update the local book object
			book = { ...book, is_available: !isAvailable };
		}
		isToggling = false;
	}

	function handleSwapRequest() {
		if (canRequestSwap) {
			showSwapDialog = true;
		}
	}

	function handleSwapRequestSuccess(event: CustomEvent<{ message: string }>) {
		dispatch('swapRequested', event.detail);
		showSwapDialog = false;
	}

	function handleViewDetails() {
		dispatch('view-details', { book });
	}

	function getConditionBadgeClass(condition: string): string {
		const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		
		switch (condition) {
			case 'AS_NEW':
				return `${baseClasses} bg-green-100 text-green-800`;
			case 'FINE':
				return `${baseClasses} bg-blue-100 text-blue-800`;
			case 'VERY_GOOD':
				return `${baseClasses} bg-indigo-100 text-indigo-800`;
			case 'GOOD':
				return `${baseClasses} bg-yellow-100 text-yellow-800`;
			case 'FAIR':
				return `${baseClasses} bg-orange-100 text-orange-800`;
			case 'POOR':
				return `${baseClasses} bg-red-100 text-red-800`;
			default:
				return `${baseClasses} bg-gray-100 text-gray-800`;
		}
	}
</script>

<div class="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow" class:opacity-60={!isAvailable && !isOwner}>
	<div class="p-6">
		<div class="flex gap-4">
			<!-- Book Cover -->
			<div class="flex-shrink-0">
				{#if book.thumbnail_url}
					<img 
						src={book.thumbnail_url} 
						alt="{book.title} cover"
						class="w-16 h-24 object-cover rounded shadow-sm"
						loading="lazy"
					/>
				{:else}
					<div class="w-16 h-24 bg-gray-200 rounded shadow-sm flex items-center justify-center">
						<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
						</svg>
					</div>
				{/if}
			</div>

			<!-- Book Details -->
			<div class="flex-1 min-w-0">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<h3 class="text-lg font-semibold text-gray-900 line-clamp-2">
							{book.title}
						</h3>
						<p class="text-sm text-gray-600 mt-1 line-clamp-1">
							by {authorsText}
						</p>
					</div>
					
					<!-- Condition Indicator -->
					<div class="ml-2 flex-shrink-0">
						<ConditionIndicator condition={book.condition} size="small" />
					</div>
				</div>

				<!-- Genre -->
				{#if book.genre}
					<p class="text-sm text-gray-500 mt-2">
						<span class="font-medium">Genre:</span> {book.genre}
					</p>
				{/if}

				<!-- Owner Info (if showing) -->
				{#if showOwner && bookWithOwner.profile}
					<p class="text-sm text-gray-500 mt-2">
						<span class="font-medium">Owner:</span> 
						{bookWithOwner.profile.full_name || bookWithOwner.profile.username || 'Anonymous'}
					</p>
				{/if}

				<!-- Description -->
				{#if book.description}
					<p class="text-sm text-gray-700 mt-3 line-clamp-3">
						{book.description}
					</p>
				{/if}

				<!-- ISBN -->
				{#if book.isbn}
					<p class="text-xs text-gray-500 mt-2">
						<span class="font-medium">ISBN:</span> {book.isbn}
					</p>
				{/if}

				<!-- Availability Status -->
				{#if isOwner}
					<div class="flex items-center justify-between mt-4 p-2 bg-gray-50 rounded-md">
						<span class="text-sm font-medium text-gray-700">Available for swap:</span>
						<label class="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								checked={isAvailable}
								on:change={toggleAvailability}
								disabled={isToggling}
								class="sr-only peer"
							/>
							<div class="w-11 h-6 bg-gray-200 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
							{#if isToggling}
								<div class="absolute inset-0 flex items-center justify-center">
									<svg class="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
								</div>
							{/if}
						</label>
					</div>
				{/if}

				<!-- Unavailable Notice -->
				{#if !isAvailable && !isOwner}
					<div class="mt-4 p-2 bg-gray-100 rounded-md">
						<p class="text-sm text-gray-600 text-center">
							This book is not currently available for swap
						</p>
					</div>
				{/if}

				<!-- Actions -->
				{#if showActions}
					<div class="flex gap-2 mt-4">
						<!-- Always show View Details button -->
						<button
							on:click={handleViewDetails}
							class="text-sm px-3 py-1.5 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-colors"
						>
							View Details
						</button>
						
						{#if isOwner}
							<button
								on:click={handleEdit}
								class="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
							>
								Edit
							</button>
							<button
								on:click={handleDelete}
								class="text-sm px-3 py-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
							>
								Delete
							</button>
						{:else if canRequestSwap}
							<button
								on:click={handleSwapRequest}
								class="flex-1 text-sm px-3 py-1.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors font-medium"
							>
								Request Swap
							</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Footer with metadata -->
	<div class="bg-gray-50 px-6 py-3">
		<div class="flex justify-between items-center text-xs text-gray-500">
			<span>Added {new Date(book.created_at).toLocaleDateString()}</span>
			{#if book.updated_at !== book.created_at}
				<span>Updated {new Date(book.updated_at).toLocaleDateString()}</span>
			{/if}
		</div>
	</div>
</div>

<!-- Swap Request Dialog -->
<SwapRequestDialog
	book={bookWithOwner}
	isOpen={showSwapDialog}
	on:close={() => showSwapDialog = false}
	on:success={handleSwapRequestSuccess}
/>

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
	
	.line-clamp-3 {
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
	}
</style>