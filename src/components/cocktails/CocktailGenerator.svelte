<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { CocktailService } from '$lib/services/cocktailService';
	import { StoreLocatorService } from '$lib/services/storeLocatorService';
	import type { 
		Cocktail, 
		CocktailUIState, 
		USStore,
		AgeVerification,
		UserCocktailPreferences
	} from '$lib/types/cocktail';
	import type { Book } from '$lib/types/book';
	import AgeVerificationModal from './AgeVerificationModal.svelte';
	import CocktailModal from './CocktailModal.svelte';
	import StoreSelectionModal from './StoreSelectionModal.svelte';

	export let book: Book;
	export let isOpen: boolean = false;

	const dispatch = createEventDispatcher();

	let state: CocktailUIState = {
		isLoading: false,
		isGenerating: false,
		isRefreshing: false,
		showAgeVerification: false,
		showCocktailModal: false,
		showStoreSelector: false,
		currentCocktails: [],
		availableStores: [],
		selectedCocktail: undefined,
		error: undefined
	};

	let ageVerification: AgeVerification | null = null;
	let userPreferences: UserCocktailPreferences | null = null;
	let refreshCount = 0;

	$: currentUser = $auth.user;

	onMount(async () => {
		if (currentUser && isOpen) {
			await loadUserData();
		}
	});

	// Load user data when modal opens
	$: if (isOpen && currentUser && !ageVerification) {
		loadUserData();
	}

	async function loadUserData() {
		if (!currentUser) return;

		try {
			state.isLoading = true;
			
			// Load age verification status
			ageVerification = await CocktailService.getAgeVerificationStatus(currentUser.id);
			
			// Load user preferences
			userPreferences = await CocktailService.getUserPreferences(currentUser.id);

			// If age verified, load existing cocktails for this book
			if (ageVerification.isVerified) {
				const existingCocktails = await CocktailService.getUserCocktails(currentUser.id, book.id);
				if (existingCocktails.length > 0) {
					state.currentCocktails = existingCocktails.slice(0, 3); // Show latest 3
				}
			} else {
				state.showAgeVerification = true;
			}
		} catch (error) {
			console.error('Failed to load user data:', error);
			state.error = 'Failed to load user data';
		} finally {
			state.isLoading = false;
		}
	}

	async function handleAgeVerification() {
		if (!currentUser) return;

		try {
			ageVerification = await CocktailService.verifyAge(currentUser.id);
			state.showAgeVerification = false;
			
			// Generate initial cocktails after verification
			await generateCocktails();
		} catch (error) {
			console.error('Age verification failed:', error);
			state.error = 'Age verification failed';
		}
	}

	function handleAgeVerificationCancel() {
		state.showAgeVerification = false;
		closeModal();
	}

	async function generateCocktails() {
		if (!currentUser || !ageVerification?.isVerified) return;

		try {
			state.isGenerating = true;
			state.error = undefined;

			const response = await CocktailService.generateCocktails({
				bookId: book.id,
				bookTitle: book.title,
				bookAuthors: Array.isArray(book.authors) ? book.authors : [book.authors],
				bookDescription: book.description || undefined
			}, currentUser.id);

			state.currentCocktails = response.cocktails as Cocktail[];
			refreshCount = 1;
		} catch (error) {
			console.error('Failed to generate cocktails:', error);
			state.error = 'Failed to generate cocktails. Please try again.';
		} finally {
			state.isGenerating = false;
		}
	}

	async function refreshCocktails() {
		if (!currentUser || state.isRefreshing) return;

		try {
			state.isRefreshing = true;
			state.error = undefined;

			// Get IDs of current cocktails to exclude
			const excludeIds = state.currentCocktails.map(c => c.id);

			const response = await CocktailService.refreshCocktails(
				book.id,
				currentUser.id,
				excludeIds
			);

			state.currentCocktails = response.cocktails as Cocktail[];
			refreshCount++;
		} catch (error) {
			console.error('Failed to refresh cocktails:', error);
			state.error = 'Failed to refresh cocktails. Please try again.';
		} finally {
			state.isRefreshing = false;
		}
	}

	async function handleFavorite(cocktailId: string) {
		if (!currentUser) return;

		try {
			const newStatus = await CocktailService.toggleFavorite(cocktailId, currentUser.id);
			
			// Update local state
			state.currentCocktails = state.currentCocktails.map(cocktail => 
				cocktail.id === cocktailId 
					? { ...cocktail, isFavorited: newStatus }
					: cocktail
			);
		} catch (error) {
			console.error('Failed to toggle favorite:', error);
		}
	}

	async function handleOrderIngredients(cocktail: Cocktail) {
		if (!userPreferences?.zipCode) {
			// Ask for zip code first
			const zipCode = prompt('Please enter your zip code to find nearby stores:');
			if (!zipCode || !StoreLocatorService.validateZipCode(zipCode)) {
				alert('Please enter a valid US zip code (e.g., 12345 or 12345-6789)');
				return;
			}

			// Save zip code
			if (currentUser) {
				await CocktailService.updateUserPreferences(currentUser.id, { zipCode });
				userPreferences = { ...userPreferences!, zipCode };
			}
		}

		try {
			// Find nearby stores
			const stores = await StoreLocatorService.findNearbyStores({
				zipCode: userPreferences!.zipCode!,
				radiusMiles: 10,
				includeAlcoholOnly: true
			});

			if (stores.length === 0) {
				alert('No stores found within 10 miles of your location. Please try a different zip code.');
				return;
			}

			state.availableStores = stores;
			state.selectedCocktail = cocktail;
			state.showStoreSelector = true;
		} catch (error) {
			console.error('Failed to find stores:', error);
			alert('Failed to find nearby stores. Please try again.');
		}
	}

	function handleStoreSelect(store: USStore, cocktail: Cocktail) {
		// Build shopping cart items from cocktail ingredients
		const cartItems = cocktail.ingredients.map(ingredient => ({
			ingredientName: ingredient.name,
			quantity: 1,
			estimatedPrice: 0
		}));

		// Build shopping cart URL
		const cartUrl = StoreLocatorService.buildShoppingCartUrl(store, cartItems);

		// Track selection for analytics
		if (currentUser) {
			StoreLocatorService.trackStoreSelection(currentUser.id, store.id, cocktail.id);
		}

		// Open store website in new tab
		window.open(cartUrl, '_blank', 'noopener,noreferrer');

		state.showStoreSelector = false;
	}

	function openCocktailModal(cocktail: Cocktail) {
		state.selectedCocktail = cocktail;
		state.showCocktailModal = true;
	}

	function closeModal() {
		isOpen = false;
		dispatch('close');
	}

	function handleOverlayClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closeModal();
		}
	}

	// Mobile gesture support for refresh
	let touchStartY = 0;
	let touchEndY = 0;

	function handleTouchStart(event: TouchEvent) {
		touchStartY = event.changedTouches[0].screenY;
	}

	function handleTouchEnd(event: TouchEvent) {
		touchEndY = event.changedTouches[0].screenY;
		handleSwipeGesture();
	}

	function handleSwipeGesture() {
		const swipeDistance = touchEndY - touchStartY;
		const minSwipeDistance = 100;

		// Swipe down to refresh
		if (swipeDistance > minSwipeDistance && state.currentCocktails.length > 0) {
			refreshCocktails();
		}
	}
</script>

{#if isOpen}
	<div class="modal-overlay" on:click={handleOverlayClick}>
		<div 
			class="modal-content" 
			on:click|stopPropagation
			on:touchstart={handleTouchStart}
			on:touchend={handleTouchEnd}
		>
			<div class="modal-header">
				<div class="header-content">
					<h2>🍸 Book-Themed Cocktails</h2>
					<p class="book-title">Inspired by "{book.title}"</p>
				</div>
				<button class="close-btn" on:click={closeModal} aria-label="Close">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 6L6 18M6 6l12 12"/>
					</svg>
				</button>
			</div>

			<div class="modal-body">
				{#if state.isLoading}
					<div class="loading-state">
						<div class="loading-spinner"></div>
						<p>Loading cocktail preferences...</p>
					</div>
				{:else if state.error}
					<div class="error-state">
						<div class="error-icon">⚠️</div>
						<h3>Something went wrong</h3>
						<p>{state.error}</p>
						<button class="btn btn-primary" on:click={() => { state.error = undefined; generateCocktails(); }}>
							Try Again
						</button>
					</div>
				{:else if state.currentCocktails.length === 0 && !state.isGenerating}
					<div class="empty-state">
						<div class="cocktail-icon">🍹</div>
						<h3>Ready to mix some magic?</h3>
						<p>Generate cocktails inspired by the themes, characters, and story of "{book.title}"</p>
						<button 
							class="btn btn-primary generate-btn" 
							on:click={generateCocktails}
							disabled={state.isGenerating}
						>
							{#if state.isGenerating}
								<svg class="btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none">
									<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.25"/>
									<path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
								</svg>
								Generating Cocktails...
							{:else}
								🎯 Generate Cocktails
							{/if}
						</button>
					</div>
				{:else}
					<div class="cocktails-section">
						<div class="section-header">
							<h3>Your Cocktails {refreshCount > 1 ? `(Set ${refreshCount})` : ''}</h3>
							<button 
								class="refresh-btn" 
								on:click={refreshCocktails}
								disabled={state.isRefreshing}
								title="Get different cocktails"
							>
								{#if state.isRefreshing}
									<svg class="refresh-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
										<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.25"/>
										<path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
									</svg>
								{:else}
									🔄
								{/if}
								Refresh
							</button>
						</div>

						<div class="cocktails-grid">
							{#each state.currentCocktails as cocktail (cocktail.id)}
								<div class="cocktail-card" class:alcoholic={cocktail.type === 'alcoholic'}>
									<div class="card-header">
										<div class="cocktail-type">
											{cocktail.type === 'alcoholic' ? '🍸' : '🥤'} 
											{cocktail.type === 'alcoholic' ? 'Alcoholic' : 'Non-Alcoholic'}
										</div>
										<button 
											class="favorite-btn" 
											class:favorited={cocktail.isFavorited}
											on:click={() => handleFavorite(cocktail.id)}
											title={cocktail.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
										>
											{cocktail.isFavorited ? '❤️' : '🤍'}
										</button>
									</div>

									<h4 class="cocktail-name">{cocktail.name}</h4>
									
									<p class="cocktail-description">{cocktail.description}</p>

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
										>
											🛒 Order Ingredients
										</button>
									</div>
								</div>
							{/each}
						</div>

						<div class="mobile-refresh-hint">
							<p>💡 <strong>Mobile tip:</strong> Swipe down to refresh cocktails</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Age Verification Modal -->
<AgeVerificationModal 
	isOpen={state.showAgeVerification}
	onVerify={handleAgeVerification}
	onCancel={handleAgeVerificationCancel}
/>

<!-- Cocktail Detail Modal -->
{#if state.selectedCocktail && state.showCocktailModal}
	<CocktailModal 
		cocktail={state.selectedCocktail}
		isOpen={state.showCocktailModal}
		onClose={() => { state.showCocktailModal = false; }}
		onFavorite={handleFavorite}
		onOrderIngredients={handleOrderIngredients}
	/>
{/if}

<!-- Store Selection Modal -->
{#if state.selectedCocktail && state.showStoreSelector}
	<StoreSelectionModal 
		isOpen={state.showStoreSelector}
		stores={state.availableStores}
		cocktail={state.selectedCocktail}
		onStoreSelect={handleStoreSelect}
		onClose={() => { state.showStoreSelector = false; }}
		userZipCode={userPreferences?.zipCode}
	/>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
		backdrop-filter: blur(4px);
	}

	.modal-content {
		background: white;
		border-radius: 16px;
		width: 100%;
		max-width: 900px;
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
		align-items: center;
		padding: 2rem 2rem 1rem 2rem;
		border-bottom: 1px solid #e2e8f0;
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		border-radius: 16px 16px 0 0;
	}

	.header-content h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.75rem;
		font-weight: 700;
	}

	.book-title {
		margin: 0;
		font-size: 1rem;
		opacity: 0.9;
		font-style: italic;
	}

	.close-btn {
		background: rgba(245, 245, 220, 0.2);
		border: none;
		border-radius: 8px;
		padding: 0.75rem;
		cursor: pointer;
		color: #F5F5DC;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background: rgba(245, 245, 220, 0.3);
	}

	.modal-body {
		padding: 2rem;
	}

	.loading-state,
	.error-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 3rem 2rem;
		color: #6b7280;
	}

	.loading-spinner,
	.refresh-spinner {
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #e5e7eb;
		border-top: 3px solid #8B2635;
		border-radius: 50%;
	}

	.cocktail-icon,
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

	.generate-btn {
		margin-top: 1.5rem;
		font-size: 1.1rem;
		padding: 1rem 2rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.section-header h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #374151;
	}

	.refresh-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		padding: 0.5rem 1rem;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		transition: all 0.2s;
	}

	.refresh-btn:hover:not(:disabled) {
		background: #e5e7eb;
		border-color: #9ca3af;
	}

	.refresh-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.cocktails-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.cocktail-card {
		background: white;
		border: 2px solid #e2e8f0;
		border-radius: 12px;
		padding: 1.5rem;
		transition: all 0.2s;
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

	.btn-spinner {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.mobile-refresh-hint {
		text-align: center;
		padding: 1rem;
		background: #f8fafc;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
	}

	.mobile-refresh-hint p {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.modal-content {
			margin: 0;
			border-radius: 0;
			height: 100vh;
			max-height: none;
		}

		.modal-header,
		.modal-body {
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}

		.cocktails-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.card-actions {
			flex-direction: column;
		}

		.section-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.refresh-btn {
			align-self: flex-end;
		}
	}

	@media (max-width: 480px) {
		.modal-header h2 {
			font-size: 1.5rem;
		}

		.cocktail-card {
			padding: 1rem;
		}
	}
</style>
