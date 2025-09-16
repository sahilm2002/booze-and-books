<script lang="ts">
	export let rating: number = 0;
	export let size: string = 'medium';
</script>

<div class="user-rating">
	<div class="rating-display">
		<span class="rating-value">{rating.toFixed(1)}</span>
		<div class="stars">
			{#each Array(5) as _, i}
				<span class="star" class:filled={i < Math.floor(rating)}>★</span>
			{/each}
		</div>
	</div>
</div>

<style>
	.user-rating {
		text-align: center;
	}
	
	.rating-value {
		font-size: 1.5rem;
		font-weight: 600;
		color: #2d3748;
		display: block;
		margin-bottom: 0.5rem;
	}
	
	.stars {
		display: flex;
		justify-content: center;
		gap: 0.25rem;
	}
	
	.star {
		color: #e2e8f0;
		font-size: 1.25rem;
	}
	
	.star.filled {
		color: #d4af37;
	}
</style>
