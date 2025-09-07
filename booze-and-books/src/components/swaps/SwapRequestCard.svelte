<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { 
		getStatusDisplayName, 
		getStatusColor, 
		formatRating, 
		canCompleteSwap,
		canMakeCounterOffer,
		canAcceptCounterOffer,
		canCancelSwap
	} from '$lib/validation/swap';
	import { SwapStatus } from '$lib/types/swap';
	import { swapStore } from '$lib/stores/swaps';
	import { auth } from '$lib/stores/auth';
	import SwapCompletionDialog from './SwapCompletionDialog.svelte';
	import BookSelectionModal from '../books/BookSelectionModal.svelte';
	import ConditionIndicator from '../books/ConditionIndicator.svelte';
	import type { SwapRequestWithBook, SwapCompletion } from '$lib/types/swap';
	import type { Book } from '$lib/types/book';

	export let request: SwapRequestWithBook;
	export let type: 'incoming' | 'outgoing' = 'incoming';

	const dispatch = createEventDispatcher<{
		updated: void;
	}>();

	$: currentUser = $auth.user;
	$: isRequester = currentUser?.id === request.requester_id;
	$: isOwner = currentUser?.id === request.owner_id;
	$: isPending = request.status === SwapStatus.PENDING;
	$: isCounterOffer = request.status === SwapStatus.COUNTER_OFFER;
	$: isAccepted = request.status === SwapStatus.ACCEPTED;
	$: isCompleted = request.status === SwapStatus.COMPLETED;
	$: isCancelled = request.status === SwapStatus.CANCELLED;
	$: statusDisplay = getStatusDisplayName(request.status);
	$: statusColor = getStatusColor(request.status);
	$: canComplete = canCompleteSwap(request.status, currentUser?.id || '', request.requester_id, request.owner_id);
	$: canMakeCounter = canMakeCounterOffer(request.status, currentUser?.id || '', request.owner_id);
	$: canAcceptCounter = canAcceptCounterOffer(request.status, currentUser?.id || '', request.requester_id);
	$: canCancel = canCancelSwap(request.status, currentUser?.id || '', request.requester_id, request.owner_id);

	let isLoading = false;
	let showCompletionDialog = false;
	let showCounterOfferModal = false;

	async function handleAccept() {
		if (!(isPending && isOwner) && !(isCounterOffer && isRequester)) return;
		
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

	async function handleCancel() {
		if (!canCancel) return;
		
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

	function handleCounterOffer() {
		if (canMakeCounter) {
			showCounterOfferModal = true;
		}
	}

	async function handleCounterOfferSelection(event: CustomEvent<{ book: Book }>) {
		const counterOfferedBook = event.detail.book;
		
		isLoading = true;
		try {
			await swapStore.makeCounterOffer(request.id, counterOfferedBook.id);
			showCounterOfferModal = false;
			dispatch('updated');
		} catch (error) {
			console.error('Error making counter offer:', error);
		} finally {
			isLoading = false;
		}
	}

	function handleCounterOfferModalClose() {
		showCounterOfferModal = false;
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

	<!-- Offered Books Section -->
	{#if request.offered_book || request.counter_offered_book}
		<div class="px-4 py-3 border-b border-gray-100 bg-gray-50">
			<div class="space-y-3">
				<!-- Original offered book (from requester) -->
				{#if request.offered_book}
					<div class="bg-white rounded-lg p-3 border border-gray-200">
						<div class="flex items-center gap-3">
							<div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
								{type === 'incoming' ? 'They are offering:' : 'You are offering:'}
							</div>
						</div>
						<div class="flex items-start gap-3">
							{#if request.offered_book.google_volume_id || request.offered_book.thumbnail_url}
								<div class="w-10 h-14 flex-shrink-0">
									{#if request.offered_book.google_volume_id}
										<img
											src="https://books.google.com/books/content?id={request.offered_book.google_volume_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api"
											alt="{request.offered_book.title} cover"
											class="w-full h-full object-cover rounded shadow-sm"
										/>
									{:else if request.offered_book.thumbnail_url}
										<img
											src={request.offered_book.thumbnail_url}
											alt="{request.offered_book.title} cover"
											class="w-full h-full object-cover rounded shadow-sm"
										/>
									{/if}
								</div>
							{:else}
								<div class="w-10 h-14 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
									<svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
										<path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
									</svg>
								</div>
							{/if}
							<div class="flex-1 min-w-0">
								<h4 class="font-medium text-sm text-gray-900 truncate">{request.offered_book.title}</h4>
								<p class="text-xs text-gray-600 truncate">by {request.offered_book.authors.join(', ')}</p>
								<div class="mt-1">
									<ConditionIndicator condition={request.offered_book.condition} size="small" />
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Counter offered book (from owner) -->
				{#if request.counter_offered_book}
					<div class="bg-purple-50 rounded-lg p-3 border border-purple-200">
						<div class="flex items-center gap-3">
							<div class="text-xs font-medium text-purple-600 uppercase tracking-wide mb-2">
								Counter-offer: {type === 'outgoing' ? 'They are offering instead:' : 'You are offering instead:'}
							</div>
						</div>
						<div class="flex items-start gap-3">
							{#if request.counter_offered_book.google_volume_id || request.counter_offered_book.thumbnail_url}
								<div class="w-10 h-14 flex-shrink-0">
									{#if request.counter_offered_book.google_volume_id}
										<img
											src="https://books.google.com/books/content?id={request.counter_offered_book.google_volume_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api"
											alt="{request.counter_offered_book.title} cover"
											class="w-full h-full object-cover rounded shadow-sm"
										/>
									{:else if request.counter_offered_book.thumbnail_url}
										<img
											src={request.counter_offered_book.thumbnail_url}
											alt="{request.counter_offered_book.title} cover"
											class="w-full h-full object-cover rounded shadow-sm"
										/>
									{/if}
								</div>
							{:else}
								<div class="w-10 h-14 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
									<svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
										<path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
									</svg>
								</div>
							{/if}
							<div class="flex-1 min-w-0">
								<h4 class="font-medium text-sm text-purple-900 truncate">{request.counter_offered_book.title}</h4>
								<p class="text-xs text-purple-700 truncate">by {request.counter_offered_book.authors.join(', ')}</p>
								<div class="mt-1">
									<ConditionIndicator condition={request.counter_offered_book.condition} size="small" />
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Contact Information (ACCEPTED status only) -->
	{#if isAccepted && (isOwner || isRequester)}
		<div class="px-4 py-3 border-b border-gray-100 bg-green-50">
			<div class="flex items-start gap-3">
				<div class="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
					<svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
					</svg>
				</div>
				<div class="flex-1">
					<h4 class="text-sm font-medium text-green-900 mb-2">Swap Approved - Contact Information</h4>
					<p class="text-sm text-green-800 mb-3">
						Your swap has been approved! You can now contact each other to arrange the exchange.
					</p>
					
					<div class="space-y-2">
						{#if type === 'incoming'}
							<!-- Show requester's contact info to owner -->
							{#if request.requester_profile.email}
								<div class="flex items-center gap-2">
									<span class="text-xs font-medium text-green-700 uppercase tracking-wide">Requester Contact:</span>
									<a 
										href="mailto:{request.requester_profile.email}" 
										class="text-sm text-green-800 hover:text-green-900 underline font-medium"
									>
										{request.requester_profile.email}
									</a>
								</div>
							{/if}
							{#if request.requester_profile.full_name || request.requester_profile.username}
								<div class="text-xs text-green-700">
									Name: {request.requester_profile.full_name || request.requester_profile.username}
								</div>
							{/if}
						{:else}
							<!-- Show owner's contact info to requester -->
							{#if request.owner_profile.email}
								<div class="flex items-center gap-2">
									<span class="text-xs font-medium text-green-700 uppercase tracking-wide">Owner Contact:</span>
									<a 
										href="mailto:{request.owner_profile.email}" 
										class="text-sm text-green-800 hover:text-green-900 underline font-medium"
									>
										{request.owner_profile.email}
									</a>
								</div>
							{/if}
							{#if request.owner_profile.full_name || request.owner_profile.username}
								<div class="text-xs text-green-700">
									Name: {request.owner_profile.full_name || request.owner_profile.username}
								</div>
							{/if}
						{/if}
					</div>
					
					<div class="mt-3 p-2 bg-green-100 rounded-md">
						<p class="text-xs text-green-800">
							<strong>Next steps:</strong> Send an email to coordinate the book exchange. 
							Once you've completed the swap, come back here to mark it as completed and leave a rating.
						</p>
					</div>
				</div>
			</div>
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
	{#if (isPending && (isOwner || isRequester)) || (isCounterOffer && (isOwner || isRequester)) || (isAccepted && canComplete)}
		<div class="px-4 py-3">
			{#if isPending && isOwner}
				<!-- Owner actions for PENDING: Accept/Counter-Offer/Cancel -->
				<div class="space-y-2">
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
							class="flex-1 px-3 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							on:click={handleCounterOffer}
							disabled={isLoading}
						>
							Counter-Offer
						</button>
					</div>
					<button
						type="button"
						class="w-full px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						on:click={handleCancel}
						disabled={isLoading}
					>
						Cancel
					</button>
				</div>

			{:else if isPending && isRequester}
				<!-- Requester actions for PENDING: Cancel -->
				<button
					type="button"
					class="w-full px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					on:click={handleCancel}
					disabled={isLoading}
				>
					Cancel Request
				</button>

			{:else if isCounterOffer && isRequester}
				<!-- Requester actions for COUNTER_OFFER: Accept/Cancel -->
				<div class="space-y-2">
					<button
						type="button"
						class="w-full px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						on:click={handleAccept}
						disabled={isLoading}
					>
						{#if isLoading}
							<div class="flex items-center justify-center">
								<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Processing...
							</div>
						{:else}
							Accept Counter-Offer
						{/if}
					</button>
					<button
						type="button"
						class="w-full px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						on:click={handleCancel}
						disabled={isLoading}
					>
						Decline Counter-Offer
					</button>
				</div>

			{:else if isCounterOffer && isOwner}
				<!-- Owner actions for COUNTER_OFFER: Cancel -->
				<button
					type="button"
					class="w-full px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					on:click={handleCancel}
					disabled={isLoading}
				>
					Cancel Counter-Offer
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

<!-- Counter Offer Modal -->
{#if showCounterOfferModal}
	<BookSelectionModal
		bind:isOpen={showCounterOfferModal}
		title="Select a Book to Counter-Offer"
		confirmText="Make Counter-Offer"
		excludeBookIds={[request.book.id, ...(request.offered_book ? [request.offered_book.id] : [])]}
		on:select={handleCounterOfferSelection}
		on:close={handleCounterOfferModalClose}
	/>
{/if}