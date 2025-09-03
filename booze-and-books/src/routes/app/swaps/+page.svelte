<script lang="ts">
	import { onMount } from 'svelte';
	import SwapRequestCard from '$lib/components/swaps/SwapRequestCard.svelte';
	import { swapStore, incomingSwapRequests, outgoingSwapRequests, swapRequestsLoading, swapRequestsError } from '$lib/stores/swaps';
	import type { PageData } from './$types';

	export let data: PageData;

	let activeTab: 'incoming' | 'outgoing' = 'incoming';
	let statusFilter: 'all' | 'pending' | 'accepted' | 'declined' | 'cancelled' = 'all';

	// Initialize stores with server data
	onMount(() => {
		incomingSwapRequests.set(data.incomingRequests);
		outgoingSwapRequests.set(data.outgoingRequests);
		
		// Set page title
		document.title = 'Swap Requests - Booze & Books';
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
			declined: requests.filter(r => r.status === 'DECLINED').length,
			cancelled: requests.filter(r => r.status === 'CANCELLED').length
		};
	}

	$: incomingCounts = getStatusCounts($incomingSwapRequests);
	$: outgoingCounts = getStatusCounts($outgoingSwapRequests);
	$: currentCounts = activeTab === 'incoming' ? incomingCounts : outgoingCounts;
</script>

<svelte:head>
	<title>Swap Requests - Booze & Books</title>
	<meta name="description" content="Manage your book swap requests" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Swap Requests</h1>
			<p class="text-lg text-gray-600">Manage your incoming and outgoing book swap requests</p>
		</div>

		<!-- Error Message -->
		{#if $swapRequestsError}
			<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
				<div class="flex items-center">
					<svg class="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="text-red-800">{$swapRequestsError}</p>
				</div>
			</div>
		{/if}

		<!-- Tabs -->
		<div class="mb-6">
			<nav class="flex space-x-8 border-b border-gray-200" aria-label="Tabs">
				<button
					type="button"
					class="py-2 px-1 border-b-2 font-medium text-sm transition-colors"
					class:border-blue-500={activeTab === 'incoming'}
					class:text-blue-600={activeTab === 'incoming'}
					class:border-transparent={activeTab !== 'incoming'}
					class:text-gray-500={activeTab !== 'incoming'}
					class:hover:text-gray-700={activeTab !== 'incoming'}
					class:hover:border-gray-300={activeTab !== 'incoming'}
					on:click={() => activeTab = 'incoming'}
				>
					Incoming Requests
					{#if incomingCounts.pending > 0}
						<span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
							{incomingCounts.pending}
						</span>
					{/if}
				</button>
				<button
					type="button"
					class="py-2 px-1 border-b-2 font-medium text-sm transition-colors"
					class:border-blue-500={activeTab === 'outgoing'}
					class:text-blue-600={activeTab === 'outgoing'}
					class:border-transparent={activeTab !== 'outgoing'}
					class:text-gray-500={activeTab !== 'outgoing'}
					class:hover:text-gray-700={activeTab !== 'outgoing'}
					class:hover:border-gray-300={activeTab !== 'outgoing'}
					on:click={() => activeTab = 'outgoing'}
				>
					My Requests
					{#if outgoingCounts.pending > 0}
						<span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
							{outgoingCounts.pending}
						</span>
					{/if}
				</button>
			</nav>
		</div>

		<!-- Status Filter -->
		<div class="mb-6 flex items-center space-x-4">
			<span class="text-sm font-medium text-gray-700">Filter by status:</span>
			<div class="flex space-x-2">
				{#each [
					{ value: 'all', label: `All (${currentRequests.length})` },
					{ value: 'pending', label: `Pending (${currentCounts.pending})` },
					{ value: 'accepted', label: `Accepted (${currentCounts.accepted})` },
					{ value: 'declined', label: `Declined (${currentCounts.declined})` },
					{ value: 'cancelled', label: `Cancelled (${currentCounts.cancelled})` }
				] as filterOption}
					<button
						type="button"
						class="px-3 py-1 text-sm border rounded-full transition-colors"
						class:bg-blue-100={statusFilter === filterOption.value}
						class:border-blue-300={statusFilter === filterOption.value}
						class:text-blue-800={statusFilter === filterOption.value}
						class:bg-white={statusFilter !== filterOption.value}
						class:border-gray-300={statusFilter !== filterOption.value}
						class:text-gray-700={statusFilter !== filterOption.value}
						class:hover:bg-gray-50={statusFilter !== filterOption.value}
						on:click={() => statusFilter = filterOption.value}
					>
						{filterOption.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Loading State -->
		{#if $swapRequestsLoading}
			<div class="flex items-center justify-center py-12">
				<div class="flex items-center space-x-3">
					<svg class="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					<span class="text-gray-600">Loading swap requests...</span>
				</div>
			</div>
		{:else}
			<!-- Content -->
			{#if currentRequests.length === 0}
				<div class="text-center py-12">
					<div class="mx-auto h-12 w-12 text-gray-300 mb-4">
						{#if activeTab === 'incoming'}
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
							</svg>
						{:else}
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
							</svg>
						{/if}
					</div>
					<h3 class="text-lg font-medium text-gray-900 mb-2">
						{#if activeTab === 'incoming'}
							No incoming swap requests
						{:else}
							No outgoing swap requests
						{/if}
					</h3>
					<p class="text-gray-500 mb-4">
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
							class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
						>
							Discover Books
						</a>
					{:else if statusFilter !== 'all'}
						<button
							type="button"
							class="text-blue-600 hover:text-blue-800 transition-colors"
							on:click={() => statusFilter = 'all'}
						>
							Show all requests
						</button>
					{/if}
				</div>
			{:else}
				<div class="space-y-4">
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
</div>