<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { USStore, Cocktail, StoreSelectionModalProps } from '$lib/types/cocktail';
	import { getStoreDisplayName } from '$lib/types/cocktail';
	import { StoreLocatorService } from '$lib/services/storeLocatorService';

	export let isOpen: boolean = false;
	export let stores: USStore[] = [];
	export let cocktail: Cocktail;
	export let onStoreSelect: (store: USStore, cocktail: Cocktail) => void;
	export let onClose: () => void;
	export let userZipCode: string | undefined = undefined;

	const dispatch = createEventDispatcher();

	function handleStoreSelect(store: USStore) {
		onStoreSelect(store, cocktail);
		dispatch('storeSelected', { store, cocktail });
	}

	function handleClose() {
		onClose();
		dispatch('close');
	}

	function handleOverlayClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	function formatDistance(distance: number | undefined): string {
		if (!distance) return '';
		return distance < 1 ? `${(distance * 5280).toFixed(0)} ft` : `${distance.toFixed(1)} mi`;
	}

	function getStoreHours(store: USStore): string {
		const todayHours = StoreLocatorService.getTodayHours(store);
		return todayHours || 'Hours not available';
	}

	function isStoreOpen(store: USStore): boolean {
		return StoreLocatorService.isStoreOpen(store);
	}
</script>

{#if isOpen}
	<div class="modal-overlay" on:click={handleOverlayClick}>
		<div class="modal-content" on:click|stopPropagation>
			<div class="modal-header">
				<div class="header-content">
					<h2>🛒 Choose Your Store</h2>
					<p class="subtitle">
						Select a store to order ingredients for <strong>{cocktail.name}</strong>
						{#if userZipCode}
							<br><span class="location">Near {userZipCode}</span>
						{/if}
					</p>
				</div>
				<button class="close-btn" on:click={handleClose} aria-label="Close">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 6L6 18M6 6l12 12"/>
					</svg>
				</button>
			</div>

			<div class="modal-body">
				{#if stores.length === 0}
					<div class="empty-state">
						<div class="empty-icon">🏪</div>
						{#if !userZipCode}
							<h3>Zip Code Required</h3>
							<p>To find nearby stores for cocktail ingredients, please add your zip code to your profile.</p>
							<div class="empty-actions">
								<a href="/app/profile" class="btn btn-primary">
									📍 Add Zip Code to Profile
								</a>
							</div>
						{:else}
							<h3>No stores found</h3>
							<p>We couldn't find any stores within 10 miles of your location ({userZipCode}) that sell alcohol.</p>
							<p class="empty-note">Try updating your zip code or check back later.</p>
							<div class="empty-actions">
								<a href="/app/profile" class="btn btn-secondary">
									📍 Update Zip Code
								</a>
							</div>
						{/if}
					</div>
				{:else}
					<div class="stores-list">
						{#each stores as store (store.id)}
							<div class="store-card" class:open={isStoreOpen(store)}>
								<div class="store-header">
									<div class="store-info">
										<h3 class="store-name">{getStoreDisplayName(store.chain)}</h3>
										<p class="store-address">{StoreLocatorService.formatStoreAddress(store)}</p>
									</div>
									<div class="store-meta">
										{#if store.distance}
											<div class="distance">
												📍 {formatDistance(store.distance)}
											</div>
										{/if}
										<div class="store-status" class:open={isStoreOpen(store)}>
											{isStoreOpen(store) ? '🟢 Open' : '🔴 Closed'}
										</div>
									</div>
								</div>

								<div class="store-details">
									<div class="store-hours">
										<span class="hours-label">Today:</span>
										<span class="hours-value">{getStoreHours(store)}</span>
									</div>

									<div class="store-features">
										{#if store.supportsDelivery}
											<span class="feature">🚚 Delivery</span>
										{/if}
										{#if store.supportsPickup}
											<span class="feature">🏪 Pickup</span>
										{/if}
										{#if store.supportsAlcohol}
											<span class="feature">🍷 Alcohol</span>
										{/if}
									</div>

									{#if store.phone}
										<div class="store-contact">
											<span class="contact-label">Phone:</span>
											<a href="tel:{store.phone}" class="phone-link">{store.phone}</a>
										</div>
									{/if}
								</div>

								<div class="store-actions">
									<button 
										class="btn btn-primary" 
										on:click={() => handleStoreSelect(store)}
									>
										🛒 Shop at {getStoreDisplayName(store.chain)}
									</button>
								</div>
							</div>
						{/each}
					</div>

					<div class="ingredients-preview">
						<h4>🧾 Ingredients you'll need:</h4>
						<div class="ingredients-list">
							{#each cocktail.ingredients as ingredient}
								<span class="ingredient-tag" class:alcoholic={ingredient.isAlcoholic}>
									{ingredient.name}
									{#if ingredient.isAlcoholic}
										🍷
									{/if}
								</span>
							{/each}
						</div>
					</div>

					<div class="disclaimer">
						<p class="disclaimer-text">
							<strong>Note:</strong> We'll redirect you to the store's website with a search for these ingredients. 
							Availability and prices may vary. You must be 21+ to purchase alcoholic beverages.
						</p>
					</div>
				{/if}
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
		z-index: 1002;
		padding: 1rem;
		backdrop-filter: blur(4px);
	}

	.modal-content {
		background: white;
		border-radius: 16px;
		width: 100%;
		max-width: 700px;
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
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		border-radius: 16px 16px 0 0;
	}

	.header-content {
		flex: 1;
	}

	.modal-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.75rem;
		font-weight: 700;
	}

	.subtitle {
		margin: 0;
		font-size: 1rem;
		opacity: 0.9;
		line-height: 1.5;
	}

	.location {
		font-size: 0.875rem;
		opacity: 0.8;
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

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 3rem 2rem;
		color: #6b7280;
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-state h3 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #374151;
	}

	.empty-note {
		font-size: 0.875rem;
		color: #9ca3af;
		font-style: italic;
	}

	.empty-actions {
		margin-top: 1.5rem;
	}

	.btn-secondary {
		background: #f8f9fa;
		color: #6b7280;
		border: 1px solid #e2e8f0;
	}

	.btn-secondary:hover {
		background: #f1f3f4;
		border-color: #d1d5db;
		color: #374151;
		transform: translateY(-2px);
	}

	.stores-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.store-card {
		background: white;
		border: 2px solid #e2e8f0;
		border-radius: 12px;
		padding: 1.5rem;
		transition: all 0.2s;
	}

	.store-card:hover {
		border-color: #8B2635;
		box-shadow: 0 8px 25px rgba(139, 38, 53, 0.15);
		transform: translateY(-2px);
	}

	.store-card.open {
		border-color: #10b981;
		background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
	}

	.store-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.store-info {
		flex: 1;
	}

	.store-name {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
	}

	.store-address {
		margin: 0;
		color: #6b7280;
		font-size: 0.95rem;
		line-height: 1.4;
	}

	.store-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.distance {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}

	.store-status {
		font-size: 0.875rem;
		font-weight: 600;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		background: #fee2e2;
		color: #dc2626;
	}

	.store-status.open {
		background: #d1fae5;
		color: #065f46;
	}

	.store-details {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #f8fafc;
		border-radius: 8px;
	}

	.store-hours {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.hours-label {
		font-weight: 600;
		color: #374151;
	}

	.hours-value {
		color: #6b7280;
	}

	.store-features {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.feature {
		font-size: 0.75rem;
		background: #e5e7eb;
		color: #374151;
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-weight: 500;
	}

	.store-contact {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.contact-label {
		font-weight: 600;
		color: #374151;
	}

	.phone-link {
		color: #8B2635;
		text-decoration: none;
		font-weight: 500;
	}

	.phone-link:hover {
		text-decoration: underline;
	}

	.store-actions {
		display: flex;
		justify-content: center;
	}

	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		white-space: nowrap;
		width: 100%;
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

	.ingredients-preview {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.ingredients-preview h4 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #374151;
	}

	.ingredients-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.ingredient-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.875rem;
		background: #e5e7eb;
		color: #374151;
		padding: 0.5rem 0.75rem;
		border-radius: 20px;
		font-weight: 500;
	}

	.ingredient-tag.alcoholic {
		background: rgba(139, 38, 53, 0.1);
		color: #8B2635;
	}

	.disclaimer {
		background: #fffbeb;
		border: 1px solid #fbbf24;
		border-radius: 8px;
		padding: 1rem;
	}

	.disclaimer-text {
		margin: 0;
		font-size: 0.875rem;
		color: #92400e;
		line-height: 1.5;
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
		.modal-body {
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}

		.modal-header h2 {
			font-size: 1.5rem;
		}

		.store-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.store-meta {
			align-items: flex-start;
			flex-direction: row;
			gap: 1rem;
		}

		.store-details {
			padding: 0.75rem;
		}

		.store-features {
			justify-content: flex-start;
		}
	}
</style>
