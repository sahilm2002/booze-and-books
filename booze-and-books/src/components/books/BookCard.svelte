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
	$: isDescriptionLong = book.description && book.description.length > 150;

	let showSwapDialog = false;
	let isToggling = false;
	let isDescriptionExpanded = false;

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

	async function toggleAvailability(event: Event) {
		// Prevent multiple clicks and ensure only owner can toggle
		if (!isOwner || isToggling) {
			event.preventDefault();
			return;
		}
		
		// Prevent default label click behavior
		event.preventDefault();
		
		isToggling = true;
		const newAvailability = !isAvailable;
		
		try {
			const success = await bookStore.toggleAvailability(book.id, newAvailability);
			if (success) {
				// Update the local book object
				book = { ...book, is_available: newAvailability };
			}
		} catch (error) {
			console.error('Failed to toggle availability:', error);
		} finally {
			isToggling = false;
		}
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

	function toggleDescription() {
		isDescriptionExpanded = !isDescriptionExpanded;
	}

	function getConditionBadgeClass(condition: string): string {
		const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		
		switch (condition) {
			case 'LIKE_NEW':
				return `${baseClasses} bg-green-100 text-green-800`;
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

<div class="book-card" class:opacity-60={!isAvailable && !isOwner}>
	<div class="book-card-content">
		<div class="book-cover-section">
			{#if book.thumbnail_url}
				<img 
					src={book.thumbnail_url} 
					alt="{book.title} cover"
					class="book-cover"
					loading="lazy"
				/>
			{:else}
				<div class="book-cover-placeholder">
					<svg class="book-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
					</svg>
				</div>
			{/if}
		</div>

		<div class="book-details">
			<h3 class="book-title">{book.title}</h3>
			<p class="book-author">by {authorsText}</p>
			
			{#if book.genre}
				<p class="book-genre">{book.genre}</p>
			{/if}

			<div class="condition-section">
				<ConditionIndicator condition={book.condition} size="small" />
			</div>

			{#if book.description && isDescriptionLong}
				<div class="description-section">
					<p class="book-description" 
					   class:expanded={isDescriptionExpanded}>
						{book.description}
					</p>
					<button
						type="button"
						on:click={toggleDescription}
						class="show-more-btn"
					>
						{isDescriptionExpanded ? 'Show Less' : 'Show More'}
					</button>
				</div>
			{:else if book.description}
				<p class="book-description-short">{book.description}</p>
			{/if}

			<p class="book-date">Added {new Date(book.created_at).toLocaleDateString()}</p>
		</div>
	</div>

	<!-- Availability Status -->
	{#if isOwner}
		<div class="availability-section">
			<span class="availability-label">Available for swap:</span>
			<label class="toggle-switch" class:disabled={isToggling} on:click={toggleAvailability}>
				<input
					type="checkbox"
					checked={isAvailable}
					disabled={isToggling}
					readonly
				/>
				<span class="toggle-slider"></span>
			</label>
		</div>
	{/if}

	<!-- Actions -->
	{#if showActions}
		<div class="actions-section">
			{#if isOwner}
				<button on:click={handleEdit} class="btn-edit">Edit</button>
				<button on:click={handleDelete} class="btn-delete">Delete</button>
			{:else if canRequestSwap}
				<button on:click={handleSwapRequest} class="btn-swap">Request Swap</button>
			{/if}
		</div>
	{/if}
</div>

<!-- Swap Request Dialog -->
<SwapRequestDialog
	book={bookWithOwner}
	isOpen={showSwapDialog}
	on:close={() => showSwapDialog = false}
	on:success={handleSwapRequestSuccess}
/>

<style>
	.book-card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		padding: 1.5rem;
		margin-bottom: 1rem;
		transition: all 0.2s;
	}

	.book-card:hover {
		box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1);
	}

	.book-card-content {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.book-cover-section {
		flex-shrink: 0;
	}

	.book-cover {
		width: 60px;
		height: 84px;
		object-fit: cover;
		border-radius: 6px;
		border: 1px solid #e2e8f0;
	}

	.book-cover-placeholder {
		width: 60px;
		height: 84px;
		background: #f8f9fa;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.book-icon {
		width: 24px;
		height: 24px;
		color: #718096;
	}

	.book-details {
		flex: 1;
		min-width: 0;
	}

	.book-title {
		color: #2d3748;
		font-weight: 600;
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
		line-height: 1.4;
	}

	.book-author {
		color: #4a5568;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}

	.book-genre {
		color: #718096;
		font-size: 0.85rem;
		margin-bottom: 0.5rem;
		font-style: italic;
	}

	.condition-section {
		margin-bottom: 0.75rem;
	}

	.description-section {
		margin-bottom: 0.75rem;
	}

	.book-description {
		color: #4a5568;
		font-size: 0.85rem;
		line-height: 1.4;
		max-height: 3.6em;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
	}

	.book-description.expanded {
		max-height: 150px;
		overflow-y: auto;
		-webkit-line-clamp: unset;
		display: block;
	}

	.book-description-short {
		color: #4a5568;
		font-size: 0.85rem;
		line-height: 1.4;
		margin-bottom: 0.75rem;
	}

	.show-more-btn {
		color: #8B2635;
		font-size: 0.75rem;
		font-weight: 500;
		background: none;
		border: none;
		padding: 0;
		margin-top: 0.25rem;
		cursor: pointer;
		transition: color 0.2s;
	}

	.show-more-btn:hover {
		color: #722F37;
	}

	.book-date {
		color: #718096;
		font-size: 0.75rem;
		margin-top: auto;
	}

	.availability-section {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 8px;
		margin-bottom: 1rem;
		border: 1px solid #e2e8f0;
	}

	.availability-label {
		color: #4a5568;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 44px;
		height: 24px;
		cursor: pointer;
	}
	
	.toggle-switch.disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: #cbd5e0;
		transition: 0.4s;
		border-radius: 24px;
	}

	.toggle-slider:before {
		position: absolute;
		content: "";
		height: 18px;
		width: 18px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		transition: 0.4s;
		border-radius: 50%;
	}

	input:checked + .toggle-slider {
		background-color: #48bb78;
	}

	input:checked + .toggle-slider:before {
		transform: translateX(20px);
	}

	.actions-section {
		display: flex;
		gap: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid #e2e8f0;
	}

	.btn-edit {
		background: #f7fafc;
		color: #4299e1;
		border: 1px solid #e2e8f0;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-edit:hover {
		background: #edf2f7;
		border-color: #cbd5e0;
	}

	.btn-delete {
		background: #fed7d7;
		color: #c53030;
		border: 1px solid #feb2b2;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-delete:hover {
		background: #fc8181;
		color: white;
	}

	.btn-swap {
		background: #c6f6d5;
		color: #2f855a;
		border: 1px solid #9ae6b4;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		flex: 1;
	}

	.btn-swap:hover {
		background: #48bb78;
		color: white;
	}
</style>