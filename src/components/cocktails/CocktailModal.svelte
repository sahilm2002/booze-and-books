<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Cocktail, CocktailModalProps } from '$lib/types/cocktail';
	import { formatCocktailType, formatDifficulty, formatPrepTime } from '$lib/types/cocktail';

	export let cocktail: Cocktail;
	export let isOpen: boolean = false;
	export let onClose: () => void;
	export let onFavorite: (cocktailId: string) => void;
	export let onOrderIngredients: (cocktail: Cocktail) => void;

	const dispatch = createEventDispatcher();

	function handleClose() {
		onClose();
		dispatch('close');
	}

	function handleFavorite() {
		onFavorite(cocktail.id);
		dispatch('favorite', cocktail.id);
	}

	function handleOrderIngredients() {
		onOrderIngredients(cocktail);
		dispatch('orderIngredients', cocktail);
	}

	function handleOverlayClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}
</script>

{#if isOpen}
	<div class="modal-overlay" on:click={handleOverlayClick}>
		<div class="modal-content" on:click|stopPropagation>
			<div class="modal-header">
				<div class="header-content">
					<div class="cocktail-type-badge" class:alcoholic={cocktail.type === 'alcoholic'}>
						{cocktail.type === 'alcoholic' ? '🍸' : '🥤'} {formatCocktailType(cocktail.type)}
					</div>
					<h2>{cocktail.name}</h2>
					{#if cocktail.description}
						<p class="description">{cocktail.description}</p>
					{/if}
				</div>
				<div class="header-actions">
					<button 
						class="favorite-btn" 
						class:favorited={cocktail.isFavorited}
						on:click={handleFavorite}
						title={cocktail.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
					>
						{cocktail.isFavorited ? '❤️' : '🤍'}
					</button>
					<button class="close-btn" on:click={handleClose} aria-label="Close">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M18 6L6 18M6 6l12 12"/>
						</svg>
					</button>
				</div>
			</div>

			<div class="modal-body">
				<!-- Theme Explanation -->
				<div class="theme-section">
					<h3>🎭 Why This Cocktail Fits the Book</h3>
					<div class="theme-explanation">
						<p>{cocktail.themeExplanation}</p>
						<div class="theme-aspect">
							<span class="aspect-label">Theme Focus:</span>
							<span class="aspect-value">{cocktail.themeAspect}</span>
						</div>
					</div>
				</div>

				<!-- Recipe Details -->
				<div class="recipe-section">
					<div class="recipe-header">
						<h3>🍹 Recipe</h3>
						<div class="recipe-meta">
							<span class="difficulty">📊 {formatDifficulty(cocktail.difficulty)}</span>
							<span class="prep-time">⏱️ {formatPrepTime(cocktail.prepTimeMinutes)}</span>
						</div>
					</div>

					<!-- Ingredients -->
					<div class="ingredients-section">
						<h4>Ingredients</h4>
						<ul class="ingredients-list">
							{#each cocktail.ingredients as ingredient}
								<li class="ingredient-item" class:alcoholic={ingredient.isAlcoholic}>
									<div class="ingredient-info">
										<span class="ingredient-name">{ingredient.name}</span>
										<span class="ingredient-amount">{ingredient.amount} {ingredient.unit}</span>
									</div>
									<div class="ingredient-category">
										{ingredient.category}
										{#if ingredient.isAlcoholic}
											<span class="alcohol-indicator">🍷</span>
										{/if}
									</div>
								</li>
							{/each}
						</ul>
					</div>

					<!-- Instructions -->
					<div class="instructions-section">
						<h4>Instructions</h4>
						<div class="instructions-content">
							<p>{cocktail.instructions}</p>
						</div>
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<button class="btn btn-secondary" on:click={handleClose}>
					Close Recipe
				</button>
				<button class="btn btn-primary" on:click={handleOrderIngredients}>
					🛒 Order Ingredients
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1001;
		padding: 1rem;
		backdrop-filter: blur(4px);
	}

	.modal-content {
		background: white;
		border-radius: 16px;
		width: 100%;
		max-width: 600px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		animation: modalSlideIn 0.3s ease-out;
	}

	@keyframes modalSlideIn {
		from {
			opacity: 0;
			transform: translateY(-20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 2rem 2rem 1rem 2rem;
		border-bottom: 1px solid #e2e8f0;
		background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
		border-radius: 16px 16px 0 0;
	}

	.header-content {
		flex: 1;
	}

	.cocktail-type-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
		background: #e5e7eb;
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		margin-bottom: 1rem;
	}

	.cocktail-type-badge.alcoholic {
		color: #8B2635;
		background: rgba(139, 38, 53, 0.1);
	}

	.modal-header h2 {
		margin: 0 0 0.75rem 0;
		font-size: 1.75rem;
		font-weight: 700;
		color: #1f2937;
		line-height: 1.3;
	}

	.description {
		margin: 0;
		color: #6b7280;
		font-size: 1rem;
		line-height: 1.5;
	}

	.header-actions {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.favorite-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 8px;
		transition: all 0.2s;
	}

	.favorite-btn:hover {
		background: rgba(139, 38, 53, 0.1);
	}

	.close-btn {
		background: rgba(107, 114, 128, 0.1);
		border: none;
		border-radius: 8px;
		padding: 0.75rem;
		cursor: pointer;
		color: #6b7280;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background: rgba(107, 114, 128, 0.2);
		color: #374151;
	}

	.modal-body {
		padding: 2rem;
	}

	.theme-section {
		margin-bottom: 2rem;
	}

	.theme-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #374151;
	}

	.theme-explanation {
		background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
		border: 2px solid #bfdbfe;
		border-radius: 12px;
		padding: 1.5rem;
	}

	.theme-explanation p {
		margin: 0 0 1rem 0;
		color: #1e3a8a;
		line-height: 1.6;
	}

	.theme-aspect {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.aspect-label {
		font-weight: 600;
		color: #1e40af;
	}

	.aspect-value {
		background: #3b82f6;
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-weight: 500;
		text-transform: capitalize;
	}

	.recipe-section h3 {
		margin: 0 0 1.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #374151;
	}

	.recipe-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.recipe-meta {
		display: flex;
		gap: 1rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.ingredients-section,
	.instructions-section {
		margin-bottom: 2rem;
	}

	.ingredients-section h4,
	.instructions-section h4 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #374151;
	}

	.ingredients-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.ingredient-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		transition: all 0.2s;
	}

	.ingredient-item:hover {
		background: #f1f5f9;
		border-color: #cbd5e1;
	}

	.ingredient-item.alcoholic {
		background: linear-gradient(135deg, #fef7f0 0%, #fed7aa 100%);
		border-color: #fdba74;
	}

	.ingredient-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.ingredient-name {
		font-weight: 600;
		color: #1f2937;
	}

	.ingredient-amount {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.ingredient-category {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: #9ca3af;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.alcohol-indicator {
		font-size: 1rem;
	}

	.instructions-content {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 1.5rem;
	}

	.instructions-content p {
		margin: 0;
		color: #374151;
		line-height: 1.6;
	}

	.modal-footer {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		padding: 1.5rem 2rem 2rem 2rem;
		border-top: 1px solid #e2e8f0;
		background: #f8fafc;
		border-radius: 0 0 16px 16px;
	}

	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		white-space: nowrap;
	}

	.btn-primary {
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		box-shadow: 0 4px 12px rgba(139, 38, 53, 0.3);
	}

	.btn-primary:hover {
		background: linear-gradient(135deg, #722F37 0%, #8B2635 100%);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(139, 38, 53, 0.4);
	}

	.btn-secondary {
		background: #6b7280;
		color: white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.btn-secondary:hover {
		background: #4b5563;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	/* Mobile responsive */
	@media (max-width: 640px) {
		.modal-content {
			margin: 0;
			border-radius: 0;
			height: 100vh;
			max-height: none;
		}

		.modal-header,
		.modal-body,
		.modal-footer {
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}

		.modal-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.header-actions {
			align-self: flex-end;
		}

		.modal-header h2 {
			font-size: 1.5rem;
		}

		.recipe-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.recipe-meta {
			align-self: flex-start;
		}

		.ingredient-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.modal-footer {
			flex-direction: column;
		}

		.btn {
			width: 100%;
		}
	}
</style>
