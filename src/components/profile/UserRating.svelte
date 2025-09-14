<script lang="ts">
	export let rating: number = 0;
	export let showNumber: boolean = true;
	export let size: 'small' | 'medium' | 'large' = 'medium';

	$: stars = Array.from({ length: 5 }, (_, i) => ({
		filled: i < Math.floor(rating),
		half: i === Math.floor(rating) && rating % 1 >= 0.5
	}));

	$: sizeClass = `rating-${size}`;
</script>

<div class="user-rating {sizeClass}">
	<div class="stars">
		{#each stars as star, i}
			<span class="star" class:filled={star.filled} class:half={star.half}>
				{#if star.half}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<defs>
							<linearGradient id="half-fill-{i}">
								<stop offset="50%" stop-color="currentColor"/>
								<stop offset="50%" stop-color="transparent"/>
							</linearGradient>
						</defs>
						<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" 
								 fill="url(#half-fill-{i})" stroke="currentColor"/>
					</svg>
				{:else}
					<svg viewBox="0 0 24 24" fill={star.filled ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
						<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
					</svg>
				{/if}
			</span>
		{/each}
	</div>
	{#if showNumber && rating > 0}
		<span class="rating-number">({rating.toFixed(1)})</span>
	{/if}
</div>

<style>
	.user-rating {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.stars {
		display: flex;
		gap: 0.125rem;
	}

	.star {
		color: #d1d5db;
		transition: color 0.2s;
	}

	.star.filled {
		color: #fbbf24;
	}

	.star.half {
		color: #fbbf24;
	}

	.star svg {
		display: block;
	}

	.rating-number {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}

	/* Size variants */
	.rating-small .star svg {
		width: 12px;
		height: 12px;
	}

	.rating-small .rating-number {
		font-size: 0.75rem;
	}

	.rating-medium .star svg {
		width: 16px;
		height: 16px;
	}

	.rating-medium .rating-number {
		font-size: 0.875rem;
	}

	.rating-large .star svg {
		width: 20px;
		height: 20px;
	}

	.rating-large .rating-number {
		font-size: 1rem;
	}
</style>
