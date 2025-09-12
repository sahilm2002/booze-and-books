<script lang="ts">
	export let userRating: {
		average_rating: number;
		total_ratings: number;
		ratings_breakdown: { [key: number]: number };
	};
	export let completedSwaps: number = 0;
	export let size: 'small' | 'medium' | 'large' = 'medium';
	export let showBreakdown = true;

	$: ratingPercentage = userRating.average_rating ? (userRating.average_rating / 5) * 100 : 0;
	$: hasRatings = userRating.total_ratings > 0;

	function formatRating(rating: number): string {
		return rating.toFixed(1);
	}

	function getStarDisplay(rating: number): string {
		const fullStars = Math.floor(rating);
		const hasHalfStar = rating % 1 >= 0.5;
		const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
		
		return '★'.repeat(fullStars) + 
			   (hasHalfStar ? '☆' : '') + 
			   '☆'.repeat(emptyStars);
	}

	$: sizeClasses = {
		small: 'text-sm',
		medium: 'text-base',
		large: 'text-lg'
	}[size];

	$: starSize = {
		small: 'text-sm',
		medium: 'text-base',
		large: 'text-xl'
	}[size];
</script>

<div class="user-rating {sizeClasses}">
	{#if hasRatings}
		<div class="rating-summary">
			<div class="rating-main">
				<div class="star-rating {starSize}">
					<span class="stars" style="color: #fbbf24;">
						{getStarDisplay(userRating.average_rating)}
					</span>
				</div>
				<div class="rating-text">
					<span class="rating-value">{formatRating(userRating.average_rating)}</span>
					<span class="rating-count">
						({userRating.total_ratings} rating{userRating.total_ratings !== 1 ? 's' : ''})
					</span>
				</div>
			</div>
			
			{#if completedSwaps > 0}
				<div class="swap-count">
					<span class="swap-count-value">{completedSwaps}</span>
					<span class="swap-count-label">completed swap{completedSwaps !== 1 ? 's' : ''}</span>
				</div>
			{/if}
		</div>

		{#if showBreakdown && size !== 'small'}
			<div class="rating-breakdown">
				<div class="breakdown-title">Rating Breakdown</div>
				<div class="breakdown-bars">
					{#each [5, 4, 3, 2, 1] as starCount}
						{@const count = userRating.ratings_breakdown[starCount] || 0}
						{@const percentage = userRating.total_ratings > 0 ? (count / userRating.total_ratings) * 100 : 0}
						<div class="breakdown-row">
							<span class="star-label">{starCount} ★</span>
							<div class="progress-bar">
								<div 
									class="progress-fill"
									style="width: {percentage}%"
								></div>
							</div>
							<span class="count-label">{count}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{:else}
		<div class="no-ratings">
			<div class="no-ratings-icon">
				<svg class="w-8 h-8 text-gray-400" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
				</svg>
			</div>
			<div class="no-ratings-text">
				<div class="no-ratings-title">No ratings yet</div>
				<div class="no-ratings-subtitle">
					Complete some book swaps to start building your reputation
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.user-rating {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		border: 1px solid #e5e7eb;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.rating-summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.rating-main {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.star-rating {
		display: flex;
		align-items: center;
	}

	.stars {
		letter-spacing: 1px;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	.rating-text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.rating-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
		line-height: 1;
	}

	.rating-count {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}

	.swap-count {
		text-align: right;
		background: #f3f4f6;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		border: 1px solid #e5e7eb;
	}

	.swap-count-value {
		display: block;
		font-size: 1.25rem;
		font-weight: 700;
		color: #4f46e5;
	}

	.swap-count-label {
		display: block;
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}

	.rating-breakdown {
		border-top: 1px solid #e5e7eb;
		padding-top: 1rem;
	}

	.breakdown-title {
		font-weight: 600;
		color: #374151;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.breakdown-bars {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.breakdown-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.875rem;
	}

	.star-label {
		width: 2rem;
		color: #374151;
		font-weight: 500;
		flex-shrink: 0;
	}

	.progress-bar {
		flex: 1;
		height: 0.5rem;
		background: #f3f4f6;
		border-radius: 4px;
		overflow: hidden;
		position: relative;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #fbbf24, #f59e0b);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.count-label {
		width: 1.5rem;
		text-align: right;
		color: #6b7280;
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.no-ratings {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem 1rem;
		text-align: center;
	}

	.no-ratings-icon {
		margin-bottom: 1rem;
	}

	.no-ratings-title {
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.no-ratings-subtitle {
		color: #6b7280;
		font-size: 0.875rem;
		line-height: 1.4;
	}

	/* Size-specific adjustments */
	.text-sm .rating-value {
		font-size: 1.25rem;
	}

	.text-sm .swap-count-value {
		font-size: 1rem;
	}

	.text-sm .user-rating {
		padding: 1rem;
	}

	.text-large .rating-value {
		font-size: 2rem;
	}

	.text-large .swap-count-value {
		font-size: 1.5rem;
	}

	.text-large .user-rating {
		padding: 2rem;
	}

	/* Responsive design */
	@media (max-width: 640px) {
		.rating-summary {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.rating-main {
			width: 100%;
		}

		.swap-count {
			align-self: stretch;
			text-align: center;
		}

		.breakdown-row {
			gap: 0.5rem;
		}

		.star-label {
			width: 1.5rem;
		}
	}
</style>