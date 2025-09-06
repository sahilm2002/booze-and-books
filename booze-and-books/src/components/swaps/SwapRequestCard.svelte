<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { getStatusDisplayName, getStatusColor, formatRating, canCompleteSwap } from '$lib/validation/swap';
	import { swapStore } from '$lib/stores/swaps';
	import { auth } from '$lib/stores/auth';
	import SwapCompletionDialog from './SwapCompletionDialog.svelte';
	import type { SwapRequestWithBook, SwapCompletion } from '$lib/types/swap';

	export let request: SwapRequestWithBook;
	export let type: 'incoming' | 'outgoing' = 'incoming';

	const dispatch = createEventDispatcher<{
		updated: void;
	}>();

	$: currentUser = $auth.user;
	$: isRequester = currentUser?.id === request.requester_id;
	$: isOwner = currentUser?.id === request.owner_id;
	$: isPending = request.status === 'PENDING';
	$: isAccepted = request.status === 'ACCEPTED';
	$: isCompleted = request.status === 'COMPLETED';
	$: statusDisplay = getStatusDisplayName(request.status);
	$: statusColor = getStatusColor(request.status);
	$: canComplete = canCompleteSwap(request.status, currentUser?.id || '', request.requester_id, request.owner_id);

	let isLoading = false;
	let showCompletionDialog = false;

	async function handleAccept() {
		if (!isOwner || !isPending) return;
		
		isLoading = true;
		try {
			await swapStore.acceptSwapRequest(request.id);
			dispatch('updated');
		} catch (error) {
			console.error('Error accepting swap request:', error);
		} finally {
			isLoading = false;
		}
	}

	async function handleDecline() {
		if (!isOwner || !isPending) return;
		
		isLoading = true;
		try {
			await swapStore.declineSwapRequest(request.id);
			dispatch('updated');
		} catch (error) {
			console.error('Error declining swap request:', error);
		} finally {
			isLoading = false;
		}
	}

	async function handleCancel() {
		if (!isRequester || !isPending) return;
		
		isLoading = true;
		try {
			await swapStore.cancelSwapRequest(request.id);
			dispatch('updated');
		} catch (error) {
			console.error('Error cancelling swap request:', error);
		} finally {
			isLoading = false;
		}
	}

	function handleCompleteSwap() {
		if (canComplete) {
			showCompletionDialog = true;
		}
	}

	async function handleCompletionSubmit(event: CustomEvent<SwapCompletion>) {
		isLoading = true;
		try {
			await swapStore.completeSwapRequest(request.id, event.detail);
			showCompletionDialog = false;
			dispatch('updated');
		} catch (error) {
			console.error('Error completing swap request:', error);
		} finally {
			isLoading = false;
		}
	}

	function handleCompletionCancel() {
		showCompletionDialog = false;
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	function getRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
		
		if (diffInHours < 1) return 'Just now';
		if (diffInHours < 24) return `${diffInHours}h ago`;
		
		const diffInDays = Math.floor(diffInHours / 24);
		if (diffInDays < 7) return `${diffInDays}d ago`;
		
		return formatDate(dateString);
	}
</script>

<div class="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
	<!-- Header -->
	<div class="p-4 border-b border-gray-100">
		<div class="flex items-start justify-between">
			<div class="flex items-start space-x-3">
				{#if request.book.thumbnail_url}
					<img
						src={request.book.thumbnail_url}
						alt="{request.book.title} cover"
						class="w-12 h-18 object-cover rounded shadow-sm"
					/>
				{:else}
					<div class="w-12 h-18 bg-gray-200 rounded flex items-center justify-center">
						<svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
							<path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
						</svg>
					</div>
				{/if}
				<div class="flex-1 min-w-0">
					<h3 class="font-medium text-gray-900 truncate">{request.book.title}</h3>
					<p class="text-sm text-gray-600 truncate">by {request.book.authors.join(', ')}</p>
					<div class="mt-1 flex items-center text-xs text-gray-500">
						{#if type === 'incoming'}
							<span>From: {request.requester_profile.username || request.requester_profile.full_name || 'Unknown'}</span>
						{:else}
							<span>To: {request.owner_profile.username || request.owner_profile.full_name || 'Unknown'}</span>
						{/if}
						<span class="mx-2">•</span>
						<span>{getRelativeTime(request.created_at)}</span>
					</div>
				</div>
			</div>
			<span class="px-2 py-1 text-xs font-medium rounded-full {statusColor}">
				{statusDisplay}
			</span>
		</div>
	</div>

	<!-- Message -->
	{#if request.message}
		<div class="px-4 py-3 border-b border-gray-100">
			<p class="text-sm text-gray-700 leading-relaxed">"{request.message}"</p>
		</div>
	{/if}

	<!-- Completion Details -->
	{#if isCompleted}
		<div class="px-4 py-3 bg-blue-50 border-b border-gray-100">
			<div class="flex items-center justify-between mb-2">
				<h4 class="text-sm font-medium text-blue-900">Swap Completed</h4>
				{#if request.completion_date}
					<span class="text-xs text-blue-700">{formatDate(request.completion_date)}</span>
				{/if}
			</div>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
				<!-- Requester Rating -->
				{#if request.requester_rating}
					<div class="flex items-center justify-between">
						<span class="text-blue-700">
							{isRequester ? 'Your rating:' : 'Their rating:'}
						</span>
						<span class="text-yellow-600 font-medium">
							{formatRating(request.requester_rating)}
						</span>
					</div>
				{/if}

				<!-- Owner Rating -->
				{#if request.owner_rating}
					<div class="flex items-center justify-between">
						<span class="text-blue-700">
							{isOwner ? 'Your rating:' : 'Their rating:'}
						</span>
						<span class="text-yellow-600 font-medium">
							{formatRating(request.owner_rating)}
						</span>
					</div>
				{/if}
			</div>

			<!-- Feedback -->
			{#if (isRequester && request.requester_feedback) || (isOwner && request.owner_feedback)}
				<div class="mt-3 pt-3 border-t border-blue-200">
					<p class="text-sm text-blue-800 italic">
						"{isRequester ? request.requester_feedback : request.owner_feedback}"
					</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Actions -->
	{#if (isPending && (isOwner || isRequester)) || (isAccepted && canComplete)}
		<div class="px-4 py-3">
			{#if isPending && isOwner}
				<!-- Owner actions: Accept/Decline -->
				<div class="flex space-x-2">
					<button
						type="button"
						class="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						on:click={handleAccept}
						disabled={isLoading}
					>
						{#if isLoading}
							<div class="flex items-center justify-center">
								<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Processing...
							</div>
						{:else}
							Accept
						{/if}
					</button>
					<button
						type="button"
						class="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						on:click={handleDecline}
						disabled={isLoading}
					>
						Decline
					</button>
				</div>
			{:else if isPending && isRequester}
				<!-- Requester actions: Cancel -->
				<button
					type="button"
					class="w-full px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					on:click={handleCancel}
					disabled={isLoading}
				>
					Cancel Request
				</button>
			{:else if isAccepted && canComplete}
				<!-- Complete swap action -->
				<button
					type="button"
					class="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					on:click={handleCompleteSwap}
					disabled={isLoading}
				>
					<div class="flex items-center justify-center">
						<svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Mark as Completed
					</div>
				</button>
			{/if}
		</div>
	{/if}
</div>

<!-- Completion Dialog -->
{#if showCompletionDialog}
	<SwapCompletionDialog
		swapRequest={request}
		isSubmitting={isLoading}
		on:submit={handleCompletionSubmit}
		on:cancel={handleCompletionCancel}
	/>
{/if}