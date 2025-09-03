<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ConditionIndicator from './ConditionIndicator.svelte';
	import type { BookWithOwner } from '$lib/types/book.js';

	export let book: BookWithOwner;
	export let userRating: {
		average_rating: number;
		total_ratings: number;
		ratings_breakdown: { [key: number]: number };
	} | null = null;
	export let canRequestSwap = false;

	const dispatch = createEventDispatcher<{
		close: void;
		'request-swap': { bookId: string };
	}>();

	function handleRequestSwap() {
		dispatch('request-swap', { bookId: book.id });
	}

	function handleClose() {
		dispatch('close');
	}

	function formatAuthors(authors: string[]): string {
		if (authors.length === 0) return 'Unknown Author';
		if (authors.length === 1) return authors[0];
		if (authors.length === 2) return authors.join(' and ');
		return `${authors.slice(0, -1).join(', ')}, and ${authors[authors.length - 1]}`;
	}

	function formatRating(rating: number): string {
		return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
	}
</script>

<div class="book-detail-overlay" on:click={handleClose}>
	<div class="book-detail-modal" on:click|stopPropagation>
		<button class="close-button" on:click={handleClose}>
			<span class="sr-only">Close</span>
			<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>

		<div class="book-detail-content">
			<div class="book-header">
				<div class="book-cover">
					{#if book.thumbnail_url}
						<img 
							src={book.thumbnail_url} 
							alt="Cover of {book.title}" 
							class="cover-image"
						/>
					{:else}
						<div class="cover-placeholder">
							<svg class="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
							</svg>
						</div>
					{/if}
				</div>

				<div class="book-info">
					<h1 class="book-title">{book.title}</h1>
					<p class="book-authors">by {formatAuthors(book.authors)}</p>
					
					{#if book.isbn_10 || book.isbn_13}
						<div class="isbn-info">
							{#if book.isbn_13}<p class="isbn">ISBN-13: {book.isbn_13}</p>{/if}
							{#if book.isbn_10}<p class="isbn">ISBN-10: {book.isbn_10}</p>{/if}
						</div>
					{/if}

					<div class="condition-section">
						<h3 class="section-title">Condition</h3>
						<ConditionIndicator condition={book.condition} size="large" showTooltip={false} />
					</div>

					<div class="availability-section">
						<div class="availability-status">
							{#if book.is_available}
								<span class="status-badge available">
									<span class="status-dot"></span>
									Available for Swap
								</span>
							{:else}
								<span class="status-badge unavailable">
									<span class="status-dot"></span>
									Currently Unavailable
								</span>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<div class="book-tabs">
				<div class="tab-content">
					<div class="tab-section">
						<h3 class="section-title">Description</h3>
						{#if book.description}
							<div class="description-text">
								{book.description}
							</div>
						{:else}
							<p class="no-description">No description available for this book.</p>
						{/if}
					</div>

					{#if book.owner_profile}
						<div class="tab-section">
							<h3 class="section-title">Owner Information</h3>
							<div class="owner-card">
								<div class="owner-info">
									{#if book.owner_profile.avatar_url}
										<img 
											src={book.owner_profile.avatar_url} 
											alt="{book.owner_profile.full_name || book.owner_profile.username}'s avatar"
											class="owner-avatar"
										/>
									{:else}
										<div class="owner-avatar-placeholder">
											<svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
											</svg>
										</div>
									{/if}
									<div class="owner-details">
										<h4 class="owner-name">
											{book.owner_profile.full_name || book.owner_profile.username || 'Anonymous User'}
										</h4>
										{#if userRating}
											<div class="owner-rating">
												<span class="rating-stars">{formatRating(userRating.average_rating)}</span>
												<span class="rating-text">
													{userRating.average_rating.toFixed(1)} 
													({userRating.total_ratings} rating{userRating.total_ratings !== 1 ? 's' : ''})
												</span>
											</div>
										{/if}
									</div>
								</div>
							</div>
						</div>
					{/if}

					{#if book.category || book.published_year || book.page_count || book.language}
						<div class="tab-section">
							<h3 class="section-title">Book Details</h3>
							<div class="details-grid">
								{#if book.category}
									<div class="detail-item">
										<span class="detail-label">Category:</span>
										<span class="detail-value">{book.category}</span>
									</div>
								{/if}
								{#if book.published_year}
									<div class="detail-item">
										<span class="detail-label">Published:</span>
										<span class="detail-value">{book.published_year}</span>
									</div>
								{/if}
								{#if book.page_count}
									<div class="detail-item">
										<span class="detail-label">Pages:</span>
										<span class="detail-value">{book.page_count}</span>
									</div>
								{/if}
								{#if book.language}
									<div class="detail-item">
										<span class="detail-label">Language:</span>
										<span class="detail-value">{book.language}</span>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>

			{#if canRequestSwap && book.is_available}
				<div class="action-section">
					<button class="request-swap-button" on:click={handleRequestSwap}>
						<svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
						</svg>
						Request Book Swap
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.book-detail-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		padding: 1rem;
	}

	.book-detail-modal {
		background: white;
		border-radius: 16px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		max-width: 4xl;
		width: 100%;
		max-height: 90vh;
		position: relative;
		overflow: hidden;
	}

	.close-button {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: rgba(255, 255, 255, 0.9);
		border: 1px solid #e5e7eb;
		border-radius: 50%;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #6b7280;
		hover:background: white;
		hover:color: #374151;
		transition: all 0.2s;
		z-index: 10;
	}

	.close-button:hover {
		background: white;
		color: #374151;
		transform: scale(1.05);
	}

	.book-detail-content {
		padding: 2rem;
		overflow-y: auto;
		max-height: 90vh;
	}

	.book-header {
		display: flex;
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.book-cover {
		flex-shrink: 0;
		width: 12rem;
	}

	.cover-image {
		width: 100%;
		height: auto;
		border-radius: 8px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
	}

	.cover-placeholder {
		width: 100%;
		aspect-ratio: 3/4;
		background: #f3f4f6;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px dashed #d1d5db;
	}

	.book-info {
		flex: 1;
		min-width: 0;
	}

	.book-title {
		font-size: 2rem;
		font-weight: 700;
		color: #111827;
		margin-bottom: 0.5rem;
		line-height: 1.2;
	}

	.book-authors {
		font-size: 1.25rem;
		color: #6b7280;
		margin-bottom: 1.5rem;
		font-style: italic;
	}

	.isbn-info {
		margin-bottom: 1.5rem;
	}

	.isbn {
		font-size: 0.875rem;
		color: #6b7280;
		margin-bottom: 0.25rem;
		font-family: 'Courier New', monospace;
	}

	.condition-section,
	.availability-section {
		margin-bottom: 1.5rem;
	}

	.section-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.75rem;
	}

	.availability-status {
		display: flex;
		align-items: center;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.status-badge.available {
		background: #dcfce7;
		color: #166534;
		border: 1px solid #bbf7d0;
	}

	.status-badge.unavailable {
		background: #fef2f2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}

	.status-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}

	.available .status-dot {
		background: #22c55e;
	}

	.unavailable .status-dot {
		background: #ef4444;
	}

	.book-tabs {
		border-top: 1px solid #e5e7eb;
		padding-top: 2rem;
	}

	.tab-section {
		margin-bottom: 2rem;
	}

	.tab-section:last-child {
		margin-bottom: 0;
	}

	.description-text {
		color: #374151;
		line-height: 1.6;
		font-size: 0.95rem;
	}

	.no-description {
		color: #6b7280;
		font-style: italic;
	}

	.owner-card {
		background: #f9fafb;
		border-radius: 8px;
		padding: 1rem;
		border: 1px solid #e5e7eb;
	}

	.owner-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.owner-avatar {
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		object-fit: cover;
	}

	.owner-avatar-placeholder {
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		background: #e5e7eb;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.owner-details {
		flex: 1;
	}

	.owner-name {
		font-weight: 600;
		color: #111827;
		margin-bottom: 0.25rem;
	}

	.owner-rating {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.rating-stars {
		color: #fbbf24;
		font-size: 0.875rem;
	}

	.rating-text {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.details-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 6px;
		border: 1px solid #e5e7eb;
	}

	.detail-label {
		font-weight: 500;
		color: #6b7280;
	}

	.detail-value {
		font-weight: 600;
		color: #111827;
	}

	.action-section {
		border-top: 1px solid #e5e7eb;
		padding-top: 2rem;
		display: flex;
		justify-content: center;
	}

	.request-swap-button {
		background: #4f46e5;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.875rem 2rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 1rem;
	}

	.request-swap-button:hover {
		background: #4338ca;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.book-detail-content {
			padding: 1rem;
		}

		.book-header {
			flex-direction: column;
			align-items: center;
			text-align: center;
			gap: 1.5rem;
		}

		.book-cover {
			width: 10rem;
		}

		.book-title {
			font-size: 1.5rem;
		}

		.book-authors {
			font-size: 1.125rem;
		}

		.details-grid {
			grid-template-columns: 1fr;
		}

		.detail-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
	}
</style>