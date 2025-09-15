<script lang="ts">
	import ConditionIndicator from '../books/ConditionIndicator.svelte';
	
	export let book: any;
	export let label: string;
	export let isDeclined: boolean = false;
	export let isCounterOffer: boolean = false;
	export let isIncoming: boolean = false;
</script>

<div class="book-item" class:declined-book={isDeclined} class:counter-offer-book={isCounterOffer}>
	<h5>
		{label}
		{#if isDeclined}
			<span class="declined-label">(declined)</span>
		{/if}
		{#if isCounterOffer}
			<span class="counter-offer-label">(new)</span>
		{/if}
	</h5>
	<div class="book-card" class:declined={isDeclined} class:counter-offer={isCounterOffer}>
		{#if book.google_volume_id}
		<div class="book-image">
			<img 
				src="https://books.google.com/books/content?id={book.google_volume_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api"
				alt="{book.title} cover"
				class="book-cover"
				loading="lazy"
			/>
		</div>
		{/if}
		<div class="book-info">
			<h6>{book.title}</h6>
			<p class="book-author">
				{Array.isArray(book.authors) 
					? book.authors.join(', ') 
					: book.authors}
			</p>
			<ConditionIndicator condition={book.condition} />
		</div>
	</div>
</div>

<style>
	.book-item h5 {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.declined-label {
		color: #dc2626;
		font-weight: 500;
		font-size: 0.75rem;
	}

	.counter-offer-label {
		color: #059669;
		font-weight: 500;
		font-size: 0.75rem;
	}

	.book-card {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #f8fafc;
	}

	.book-card.declined {
		background: #fef2f2;
		border-color: #fecaca;
		opacity: 0.8;
	}

	.book-card.counter-offer {
		background: #f0fdf4;
		border-color: #bbf7d0;
		box-shadow: 0 0 0 1px #10b981;
	}

	.book-cover {
		width: 60px;
		height: 80px;
		object-fit: cover;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.book-info {
		flex: 1;
		min-width: 0;
	}

	.book-info h6 {
		margin: 0 0 0.25rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.2;
	}

	.book-author {
		margin: 0 0 0.5rem 0;
		font-size: 0.75rem;
		color: #64748b;
	}
</style>
