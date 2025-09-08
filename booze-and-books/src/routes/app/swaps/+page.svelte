<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import SwapRequestCard from '../../../components/swaps/SwapRequestCard.svelte';
	import { swapStore, incomingSwapRequests, outgoingSwapRequests, swapRequestsLoading, swapRequestsError } from '$lib/stores/swaps';
	import type { PageData } from './$types';

	export let data: PageData;

	let activeTab: 'incoming' | 'outgoing' = 'incoming';
	let statusFilter: 'all' | 'pending' | 'accepted' | 'counter_offer' | 'cancelled' | 'completed' = 'all';

	// Load swap requests on client side to avoid server-side issues
	onMount(async () => {
		console.log('Swaps page mounted, loading data...');
		
		// Set page title
		document.title = 'Swap Requests - Booze & Books';
		
		// Check for tab parameter in URL
		const tabParam = $page.url.searchParams.get('tab');
		if (tabParam === 'outgoing') {
			activeTab = 'outgoing';
		} else if (tabParam === 'incoming') {
			activeTab = 'incoming';
		}
		
		console.log('Initial tab:', activeTab);
		
		// Only fetch swap requests if stores are empty (avoid reloading on navigation)
		if ($incomingSwapRequests.length === 0 && $outgoingSwapRequests.length === 0) {
			console.log('Stores are empty, fetching swap requests...');
			await swapStore.refresh();
		} else {
			console.log('Using cached swap requests:', {
				incoming: $incomingSwapRequests.length,
				outgoing: $outgoingSwapRequests.length
			});
		}
		
		console.log('After mount:', {
			incoming: $incomingSwapRequests.length,
			outgoing: $outgoingSwapRequests.length,
			loading: $swapRequestsLoading,
			error: $swapRequestsError
		});
	});

	// Filter requests based on status
	$: filteredIncoming = $incomingSwapRequests.filter(request => 
		statusFilter === 'all' || request.status.toLowerCase() === statusFilter.toLowerCase()
	);

	$: filteredOutgoing = $outgoingSwapRequests.filter(request => 
		statusFilter === 'all' || request.status.toLowerCase() === statusFilter.toLowerCase()
	);

	$: currentRequests = activeTab === 'incoming' ? filteredIncoming : filteredOutgoing;

	async function handleRequestUpdated() {
		// Refresh swap requests from the server
		await swapStore.refresh();
	}

	function getStatusCounts(requests: typeof $incomingSwapRequests) {
		return {
			pending: requests.filter(r => r.status === 'PENDING').length,
			accepted: requests.filter(r => r.status === 'ACCEPTED').length,
			counter_offer: requests.filter(r => r.status === 'COUNTER_OFFER').length,
			cancelled: requests.filter(r => r.status === 'CANCELLED').length,
			completed: requests.filter(r => r.status === 'COMPLETED').length
		};
	}

	$: incomingCounts = getStatusCounts($incomingSwapRequests);
	$: outgoingCounts = getStatusCounts($outgoingSwapRequests);
	$: currentCounts = activeTab === 'incoming' ? incomingCounts : outgoingCounts;
</script>

<style>
	/* Page Header */
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		gap: 1rem;
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1.5rem;
		}
	}

	.header-content {
		flex: 1;
	}

	.page-title {
		color: #2d3748;
		font-size: 2rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		line-height: 1.2;
	}

	.page-subtitle {
		color: #718096;
		font-size: 1rem;
		margin: 0;
	}

	/* Error Message */
	.error-message {
		background: #fed7d7;
		border: 1px solid #feb2b2;
		border-radius: 8px;
		padding: 1rem 1.5rem;
		margin-bottom: 1.5rem;
	}

	.error-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.error-icon {
		width: 20px;
		height: 20px;
		color: #c53030;
		flex-shrink: 0;
	}

	.error-text {
		color: #c53030;
		font-weight: 500;
		margin: 0;
	}

	/* Tabs Section */
	.tabs-section {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.tabs-nav {
		display: flex;
		gap: 1rem;
		border-bottom: 2px solid #f1f3f4;
		margin-bottom: -1.5rem;
		padding-bottom: 0;
	}

	@media (max-width: 640px) {
		.tabs-nav {
			gap: 0.5rem;
		}
	}

	.tab-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: #718096;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
		margin-bottom: -2px;
	}

	.tab-button:hover {
		color: #8B2635;
		border-bottom-color: #e2e8f0;
	}

	.tab-button.active {
		color: #8B2635;
		border-bottom-color: #8B2635;
		font-weight: 600;
	}

	.tab-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 20px;
		padding: 0 6px;
		border-radius: 10px;
		font-size: 0.75rem;
		font-weight: 700;
		line-height: 1;
	}

	.tab-badge.incoming {
		background: #dc2626;
		color: white;
	}

	.tab-badge.outgoing {
		background: #D4AF37;
		color: #8B2635;
	}

	/* Filters Section */
	.filters-section {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.filters-header {
		margin-bottom: 1rem;
	}

	.filters-title {
		color: #2d3748;
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
	}

	.filter-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.filter-tag {
		padding: 0.5rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 20px;
		background: white;
		color: #374151;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.filter-tag:hover {
		background: #f8f9fa;
		border-color: #8B2635;
	}

	.filter-tag.active {
		background: #8B2635;
		border-color: #8B2635;
		color: #F5F5DC;
	}

	/* Loading State */
	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
	}

	.loading-content {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.loading-spinner {
		width: 1.5rem;
		height: 1.5rem;
		color: #8B2635;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.loading-text {
		color: #718096;
		font-weight: 500;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
	}

	.empty-icon {
		width: 3rem;
		height: 3rem;
		color: #9ca3af;
		margin: 0 auto 1rem;
	}

	.empty-title {
		color: #2d3748;
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.empty-subtitle {
		color: #718096;
		font-size: 0.95rem;
		margin: 0 0 1.5rem 0;
		max-width: 400px;
		margin-left: auto;
		margin-right: auto;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		text-decoration: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.95rem;
		box-shadow: 0 4px 12px rgba(139, 38, 53, 0.3);
		transition: all 0.2s ease;
		border: none;
		cursor: pointer;
	}

	.btn-primary:hover {
		background: linear-gradient(135deg, #722F37 0%, #8B2635 100%);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(139, 38, 53, 0.4);
	}

	.btn-clear {
		padding: 0.75rem 1rem;
		background: #f8f9fa;
		color: #8B2635;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.btn-clear:hover {
		background: #F5F5DC;
		border-color: #8B2635;
		color: #722F37;
	}

	/* Requests Grid */
	.requests-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Override Tailwind classes for consistency */
	:global(.max-w-7xl) {
		max-width: 1200px;
	}

	:global(.mx-auto) {
		margin-left: auto;
		margin-right: auto;
	}

	:global(.px-4) {
		padding-left: 1rem;
		padding-right: 1rem;
	}

	:global(.py-8) {
		padding-top: 2rem;
		padding-bottom: 2rem;
	}

	@media (min-width: 640px) {
		:global(.sm\:px-6) {
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}
	}

	@media (min-width: 1024px) {
		:global(.lg\:px-8) {
			padding-left: 2rem;
			padding-right: 2rem;
		}
	}
</style>

<svelte:head>
	<title>Swap Requests - Booze & Books</title>
	<meta name="description" content="Manage your book swap requests" />
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Header -->
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title">Swap Requests</h1>
			<p class="page-subtitle">
				Manage your incoming and outgoing book swap requests
			</p>
		</div>
	</div>

	<!-- Error Message -->
	{#if $swapRequestsError}
		<div class="error-message">
			<div class="error-content">
				<svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p class="error-text">{$swapRequestsError}</p>
			</div>
		</div>
	{/if}

	<!-- Tabs -->
	<div class="tabs-section">
		<nav class="tabs-nav" aria-label="Tabs">
			<button
				type="button"
				class="tab-button"
				class:active={activeTab === 'incoming'}
				on:click={() => activeTab = 'incoming'}
			>
				Incoming Requests
				{#if incomingCounts.pending > 0}
					<span class="tab-badge incoming">
						{incomingCounts.pending}
					</span>
				{/if}
			</button>
			<button
				type="button"
				class="tab-button"
				class:active={activeTab === 'outgoing'}
				on:click={() => {
					console.log('My Requests tab clicked!', {
						currentTab: activeTab,
						outgoingRequests: $outgoingSwapRequests.length,
						loading: $swapRequestsLoading,
						error: $swapRequestsError
					});
					activeTab = 'outgoing';
				}}
			>
				My Requests
				{#if outgoingCounts.pending > 0}
					<span class="tab-badge outgoing">
						{outgoingCounts.pending}
					</span>
				{/if}
			</button>
		</nav>
	</div>

	<!-- Status Filter -->
	<div class="filters-section">
		<div class="filters-header">
			<h3 class="filters-title">Filter by Status</h3>
		</div>
		<div class="filter-tags">
			{#each [
				{ value: 'all', label: `All (${currentRequests.length})` },
				{ value: 'pending', label: `Pending (${currentCounts.pending})` },
				{ value: 'accepted', label: `Accepted (${currentCounts.accepted})` },
				{ value: 'counter_offer', label: `Counter Offer (${currentCounts.counter_offer})` },
				{ value: 'cancelled', label: `Cancelled (${currentCounts.cancelled})` },
				{ value: 'completed', label: `Completed (${currentCounts.completed})` }
			] as filterOption}
				<button
					type="button"
					class="filter-tag"
					class:active={statusFilter === filterOption.value}
					on:click={() => statusFilter = filterOption.value}
				>
					{filterOption.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Loading State -->
	{#if $swapRequestsLoading}
		<div class="loading-state">
			<div class="loading-content">
				<svg class="loading-spinner" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				<span class="loading-text">Loading swap requests...</span>
			</div>
		</div>
		{:else}
		<!-- Content -->
		{#if currentRequests.length === 0}
			<div class="empty-state">
				<div class="empty-icon">
					{#if activeTab === 'incoming'}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
						</svg>
					{:else}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
						</svg>
					{/if}
				</div>
				<h3 class="empty-title">
					{#if activeTab === 'incoming'}
						No incoming swap requests
					{:else}
						No outgoing swap requests
					{/if}
				</h3>
				<p class="empty-subtitle">
					{#if activeTab === 'incoming'}
						When someone requests to swap one of your books, it will appear here.
					{:else}
						{#if statusFilter === 'all'}
							Start by discovering books and requesting swaps.
						{:else}
							No requests match the selected filter.
						{/if}
					{/if}
				</p>
				{#if activeTab === 'outgoing' && statusFilter === 'all'}
					<a 
						href="/app/discover"
						class="btn-primary"
					>
						Discover Books
					</a>
				{:else if statusFilter !== 'all'}
					<button
						type="button"
						class="btn-clear"
						on:click={() => statusFilter = 'all'}
					>
						Show all requests
					</button>
				{/if}
			</div>
		{:else}
			<div class="requests-grid">
				{#each currentRequests as request (request.id)}
					<SwapRequestCard
						{request}
						type={activeTab}
						on:updated={handleRequestUpdated}
					/>
				{/each}
			</div>
		{/if}
	{/if}
</div>