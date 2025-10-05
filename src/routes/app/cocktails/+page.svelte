<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { CocktailService } from '$lib/services/cocktailService';
	import type { Cocktail, UserCocktailPreferences, USStore } from '$lib/types/cocktail';
	import CocktailModal from '../../../components/cocktails/CocktailModal.svelte';
	import ZipCodeModal from '../../../components/cocktails/ZipCodeModal.svelte';
	import StoreSelectionModal from '../../../components/cocktails/StoreSelectionModal.svelte';
	import { StoreLocatorService } from '$lib/services/storeLocatorService';

	let favoriteCocktails: Cocktail[] = [];
	let loading = true;
	let error: string | null = null;
	let selectedCocktail: Cocktail | null = null;
	let showCocktailModal = false;

	// UI state for zip code flow and errors
	let userPreferences: UserCocktailPreferences | null = null;
	let showZipCodePrompt = false;
	let uiError: string | null = null;
	let pendingCocktailForZip: Cocktail | null = null;

	// Store selection modal flow
	let showStoreSelector: boolean = false;
	let availableStores: USStore[] = [];
	// UX: indicate when a store search is in progress
	let isFindingStores: boolean = false;

	function handleZipSubmit(zip: string) {
		if (currentUser) {
			// persist server-side
			return CocktailService.updateUserPreferences(currentUser.id, { zipCode: zip })
				.then(() => {
					// merge with existing prefs while satisfying type
					userPreferences = userPreferences
						? { ...userPreferences, zipCode: zip }
						: { ageVerified: false, zipCode: zip };
					showZipCodePrompt = false;
					if (pendingCocktailForZip) {
						const c = pendingCocktailForZip;
						pendingCocktailForZip = null;
						handleOrderIngredients(c);
					}
				});
		}
		showZipCodePrompt = false;
	}

	$: currentUser = $auth.user;

	onMount(async () => {
		if (currentUser) {
			await loadFavorites();
		}
	});

	$: if (currentUser) {
		loadFavorites();
	}

	async function loadFavorites() {
		if (!currentUser) return;

		try {
			loading = true;
			error = null;
			// Preload user preferences for zipcode
			userPreferences = await CocktailService.getUserPreferences(currentUser.id);
			favoriteCocktails = await CocktailService.getFavoriteCocktails(currentUser.id);
		} catch (err) {
			console.error('Failed to load favorite cocktails:', err);
			error = 'Failed to load favorite cocktails';
		} finally {
			loading = false;
		}
	}

	async function handleFavorite(cocktailId: string) {
		if (!currentUser) return;

		try {
			const newStatus = await CocktailService.toggleFavorite(cocktailId, currentUser.id);
			
			if (!newStatus) {
				// Remove from favorites list if unfavorited
				favoriteCocktails = favoriteCocktails.filter(c => c.id !== cocktailId);
			} else {
				// Update local state
				favoriteCocktails = favoriteCocktails.map(cocktail => 
					cocktail.id === cocktailId 
						? { ...cocktail, isFavorited: newStatus }
						: cocktail
				);
			}
		} catch (error) {
			console.error('Failed to toggle favorite:', error);
		}
	}

	async function handleOrderIngredients(cocktail: Cocktail) {
		// If no ZIP, prompt and resume after submit
		if (!userPreferences?.zipCode) {
			pendingCocktailForZip = cocktail;
			showZipCodePrompt = true;
			return;
		}

		isFindingStores = true;
		try {
			const stores = await StoreLocatorService.findNearbyStores({
				zipCode: userPreferences!.zipCode!,
				radiusMiles: 10,
				includeAlcoholOnly: true
			});

			if (!stores || stores.length === 0) {
				uiError = 'No stores found within 10 miles of your location. Please try a different zip code.';
				return;
			}

			// Modal-first UX: show the selector and let the user pick
			availableStores = stores;
			selectedCocktail = cocktail;
			showStoreSelector = true;
		} catch (error) {
			console.error('Failed to find stores:', error);
			uiError = 'Failed to find nearby stores. Please try again.';
		} finally {
			isFindingStores = false;
		}
	}

	function openCocktailModal(cocktail: Cocktail) {
		selectedCocktail = cocktail;
		showCocktailModal = true;
	}

	function closeCocktailModal() {
		selectedCocktail = null;
		showCocktailModal = false;
	}

	function handleStoreSelect(store: USStore, cocktail: Cocktail) {
		// Build shopping items (informational)
		const cartItems = cocktail.ingredients.map((ingredient) => ({
			ingredientName: ingredient.name,
			quantity: 1,
			estimatedPrice: 0
		}));

		// Build deep link; prefer chain URL with ZIP when supported
		const cartUrl = StoreLocatorService.buildShoppingCartUrl(
			store,
			cartItems,
			userPreferences?.zipCode
		);

		let url = (cartUrl && cartUrl.trim()) ? cartUrl : '';

		// Fallbacks for independent stores or missing website
		if (!url) {
			if (store.websiteUrl && /^https?:\/\//i.test(store.websiteUrl)) {
				url = store.websiteUrl;
			} else {
				const query = [`${store.name}`, userPreferences?.zipCode || ''].filter(Boolean).join(' near ');
				url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
			}
		}

		// Open in new tab and close modal
		window.open(url, '_blank', 'noopener,noreferrer');
		showStoreSelector = false;

		// Optional: track selection (no-op server for now)
		if (currentUser) {
			StoreLocatorService.trackStoreSelection(currentUser.id, store.id, cocktail.id);
		}
	}
</script>

<svelte:head>
	<title>My Favorite Cocktails - Booze & Books</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<h1>🍸 My Favorite Cocktails</h1>
		<p>Your collection of book-inspired cocktail recipes</p>
		{#if uiError}
		<div class="error-state">
			<div class="error-icon">⚠️</div>
			<p>{uiError}</p>
			<button class="btn btn-primary" on:click={() => (uiError = null)}>Dismiss</button>
		</div>
	{/if}
</div>

	{#if loading}
		<div class="loading-state">
			<div class="loading-spinner"></div>
			<p>Loading your favorite cocktails...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<div class="error-icon">⚠️</div>
			<h3>Something went wrong</h3>
			<p>{error}</p>
			<button class="btn btn-primary" on:click={loadFavorites}>
				Try Again
			</button>
		</div>
	{:else if favoriteCocktails.length === 0}
		<div class="empty-state">
			<div class="empty-icon">🤍</div>
			<h3>No favorite cocktails yet</h3>
			<p>Start exploring books and save your favorite cocktail recipes!</p>
			<a href="/app/discover" class="btn btn-primary">
				📚 Discover Books
			</a>
		</div>
	{:else}
		<div class="cocktails-grid">
			{#each favoriteCocktails as cocktail (cocktail.id)}
				<div class="cocktail-card" class:alcoholic={cocktail.type === 'alcoholic'}>
					<div class="card-header">
						<div class="cocktail-type">
							{cocktail.type === 'alcoholic' ? '🍸' : '🥤'} 
							{cocktail.type === 'alcoholic' ? 'Alcoholic' : 'Non-Alcoholic'}
						</div>
						<button 
							class="favorite-btn favorited" 
							on:click={() => handleFavorite(cocktail.id)}
							title="Remove from favorites"
						>
							❤️
						</button>
					</div>

					<h4 class="cocktail-name">{cocktail.name}</h4>
					
					<p class="cocktail-description">{cocktail.description}</p>

					{#if cocktail.themeExplanation}
						<div class="theme-explanation">
							<p><strong>Book Connection:</strong> {cocktail.themeExplanation}</p>
						</div>
					{/if}

<!-- Zip Code Modal -->
<ZipCodeModal
	isOpen={showZipCodePrompt}
	initialZipCode={userPreferences?.zipCode || null}
	onSubmit={handleZipSubmit}
	onCancel={() => {
		showZipCodePrompt = false;
		pendingCocktailForZip = null;
	}}
/>

{#if selectedCocktail && showStoreSelector}
	<StoreSelectionModal
		isOpen={showStoreSelector}
		stores={availableStores}
		cocktail={selectedCocktail}
		onStoreSelect={handleStoreSelect}
		onClose={() => { showStoreSelector = false; }}
		userZipCode={userPreferences?.zipCode}
	/>
{/if}

					<div class="cocktail-meta">
						<span class="difficulty">📊 {cocktail.difficulty}</span>
						<span class="prep-time">⏱️ {cocktail.prepTimeMinutes} min</span>
					</div>

					<div class="card-actions">
						<button 
							class="btn btn-secondary" 
							on:click={() => openCocktailModal(cocktail)}
						>
							📖 View Recipe
						</button>
						<button 
							class="btn btn-primary" 
							on:click={() => handleOrderIngredients(cocktail)}
							disabled={isFindingStores}
						>
							{#if isFindingStores}
								⏳ Finding stores...
							{:else}
								🛒 Order Ingredients
							{/if}
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Cocktail Detail Modal -->
{#if selectedCocktail && showCocktailModal}
	<CocktailModal 
		cocktail={selectedCocktail}
		isOpen={showCocktailModal}
		onClose={closeCocktailModal}
		onFavorite={handleFavorite}
		onOrderIngredients={handleOrderIngredients}
	/>
{/if}

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.page-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.page-header h1 {
		margin: 0 0 1rem 0;
		font-size: 2.5rem;
		font-weight: 700;
		color: #8B2635;
	}

	.page-header p {
		margin: 0;
		font-size: 1.1rem;
		color: #6b7280;
	}

	.loading-state,
	.error-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 4rem 2rem;
		color: #6b7280;
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #e5e7eb;
		border-top: 3px solid #8B2635;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	.empty-icon,
	.error-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-state h3,
	.error-state h3 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #374151;
	}

	.cocktails-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: 2rem;
	}

	.cocktail-card {
		background: white;
		border: 2px solid #e2e8f0;
		border-radius: 12px;
		padding: 1.5rem;
		transition: all 0.2s;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.cocktail-card:hover {
		border-color: #8B2635;
		box-shadow: 0 8px 25px rgba(139, 38, 53, 0.15);
		transform: translateY(-2px);
	}

	.cocktail-card.alcoholic {
		background: linear-gradient(135deg, #fef7f0 0%, #fed7aa 100%);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.cocktail-type {
		font-size: 0.875rem;
		font-weight: 500;
		color: #8B2635;
		background: rgba(139, 38, 53, 0.1);
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
	}

	.favorite-btn {
		background: none;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.favorite-btn:hover {
		background: rgba(139, 38, 53, 0.1);
	}

	.cocktail-name {
		margin: 0 0 0.75rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		line-height: 1.3;
	}

	.cocktail-description {
		margin: 0 0 1rem 0;
		color: #6b7280;
		line-height: 1.5;
		font-size: 0.95rem;
	}

	.theme-explanation {
		margin: 0 0 1rem 0;
		padding: 1rem;
		background: rgba(139, 38, 53, 0.05);
		border-radius: 8px;
		border-left: 4px solid #8B2635;
	}

	.theme-explanation p {
		margin: 0;
		font-size: 0.875rem;
		color: #4a5568;
		line-height: 1.4;
	}

	.cocktail-meta {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.card-actions {
		display: flex;
		gap: 0.75rem;
	}

	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		white-space: nowrap;
		flex: 1;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none !important;
	}

	.btn-primary {
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		box-shadow: 0 4px 12px rgba(139, 38, 53, 0.3);
	}

	.btn-primary:hover:not(:disabled) {
		background: linear-gradient(135deg, #722F37 0%, #8B2635 100%);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(139, 38, 53, 0.4);
	}

	.btn-secondary {
		background: #f8f9fa;
		color: #8B2635;
		border: 1px solid #e2e8f0;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #F5F5DC;
		border-color: #8B2635;
		color: #722F37;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.container {
			padding: 1rem;
		}

		.page-header h1 {
			font-size: 2rem;
		}

		.cocktails-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.card-actions {
			flex-direction: column;
		}
	}

	@media (max-width: 480px) {
		.cocktail-card {
			padding: 1rem;
		}
	}
</style>
