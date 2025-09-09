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
	let imageLoadFailed = false;

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

	function handleImageError(e: Event) {
		// Only log in development mode to keep production consoles clean
		if (import.meta.env.DEV) {
			console.error('Failed to load cover for:', request.book.title, e);
		}
		// Set state to show fallback placeholder
		imageLoadFailed = true;
	}

	function formatExactTimestamp(dateString: string): string {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZoneName: 'short'
		}).format(date);
	}
</script>

<style>
	/* Books & Booze Theme Variables */
	:root {
		--primary-burgundy: #8B2635;
		--secondary-gold: #D4AF37;
		--accent-cream: #F5F5DC;
		--warm-brown: #8B4513;
		--deep-red: #722F37;
		--light-cream: #FFF8DC;
		--parchment: #F4F1E8;
	}

	.card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 0;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		transition: all 0.2s ease;
	}

	.card:hover {
		box-shadow: 0 6px 12px -2px rgba(0, 0, 0, 0.15);
		transform: translateY(-1px);
	}

	.card-header {
		padding: 1.5rem;
		border-bottom: 1px solid #f1f5f9;
	}

	.card-section {
		padding: 1.5rem;
		border-bottom: 1px solid #f1f5f9;
	}

	.card-actions {
		padding: 1.5rem;
	}

	.book-thumbnail {
		width: 80px;
		height: 120px;
		object-fit: cover;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(139, 38, 53, 0.15);
		border: 1px solid var(--accent-cream);
	}

	.book-placeholder {
		width: 80px;
		height: 120px;
		background: var(--parchment);
		border: 1px solid var(--accent-cream);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(139, 38, 53, 0.15);
	}

	.offered-book-thumbnail {
		width: 80px;
		height: 120px;
		object-fit: cover;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(139, 38, 53, 0.15);
		border: 1px solid var(--accent-cream);
	}

	.offered-book-placeholder {
		width: 80px;
		height: 120px;
		background: var(--parchment);
		border: 1px solid var(--accent-cream);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(139, 38, 53, 0.15);
	}

	.book-icon {
		width: 24px;
		height: 24px;
		color: #9ca3af;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status-badge.pending {
		background: #fef5e7;
		color: #d69e2e;
		border: 1px solid #f6e05e;
	}

	.swap-request-status {
		background: #e6fffa;
		border: 1px solid #81e6d9;
		border-radius: 8px;
		padding: 1rem;
		margin: 1rem 1.5rem;
	}

	.status-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.status-label {
		color: #2d3748;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.offered-book-info {
		color: #4a5568;
		font-size: 0.85rem;
		line-height: 1.4;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.875rem;
		box-shadow: 0 4px 12px rgba(139, 38, 53, 0.3);
		transition: all 0.2s ease;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-primary:hover {
		background: linear-gradient(135deg, #722F37 0%, #8B2635 100%);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(139, 38, 53, 0.4);
	}

	.btn-primary:disabled {
		opacity: 0.6;
		transform: none;
		box-shadow: 0 4px 12px rgba(139, 38, 53, 0.3);
		cursor: not-allowed;
	}

	.btn-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: #f8f9fa;
		color: #8B2635;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.875rem;
		transition: all 0.2s ease;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-secondary:hover {
		background: #F5F5DC;
		border-color: #8B2635;
		color: #722F37;
	}

	.btn-danger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: #fef2f2;
		color: #dc2626;
		border: 1px solid #fecaca;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.875rem;
		transition: all 0.2s ease;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-danger:hover {
		background: #fee2e2;
		border-color: #f87171;
		color: #b91c1c;
	}

	.btn-success {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: #dcfce7;
		color: #16a34a;
		border: 1px solid #bbf7d0;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.875rem;
		transition: all 0.2s ease;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-success:hover {
		background: #bbf7d0;
		border-color: #4ade80;
		color: #15803d;
	}

	.action-buttons {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	.button-row {
		display: flex;
		gap: 0.75rem;
	}

	.button-row {
		justify-content: flex-start;
		align-items: center;
	}

	.loading-spinner {
		width: 1rem;
		height: 1rem;
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

	/* Modern Contact Information Styles */
	.contact-information-section {
		background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
		border: 1px solid #0ea5e9;
		border-radius: 12px;
		padding: 1.5rem;
		margin: 1rem 1.5rem;
		box-shadow: 0 4px 12px rgba(14, 165, 233, 0.1);
	}

	.contact-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid rgba(14, 165, 233, 0.2);
	}

	.contact-icon {
		width: 48px;
		height: 48px;
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		flex-shrink: 0;
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
	}

	.contact-header-content {
		flex: 1;
	}

	.contact-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: #0c4a6e;
		margin: 0 0 0.25rem 0;
	}

	.contact-subtitle {
		color: #0369a1;
		font-size: 0.95rem;
		margin: 0;
	}

	.contact-details {
		margin-bottom: 1.5rem;
	}

	.contact-card {
		background: white;
		border: 1px solid rgba(14, 165, 233, 0.2);
		border-radius: 12px;
		padding: 1.25rem;
		box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);
	}

	.contact-person-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.contact-avatar {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		overflow: hidden;
		flex-shrink: 0;
		border: 2px solid #e0f2fe;
	}

	.contact-avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.contact-avatar-placeholder {
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, #64748b 0%, #475569 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.contact-person-info {
		flex: 1;
	}

	.contact-person-name {
		font-size: 1.1rem;
		font-weight: 600;
		color: #0c4a6e;
		margin: 0 0 0.25rem 0;
	}

	.contact-person-role {
		font-size: 0.875rem;
		color: #0369a1;
		margin: 0;
		font-weight: 500;
	}

	.contact-email-button {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.25rem;
		background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.9rem;
		text-decoration: none;
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
	}

	.contact-email-button:hover {
		background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
		text-decoration: none;
		color: white;
	}

	.contact-email-address {
		font-weight: 500;
		opacity: 0.9;
	}

	.next-steps-card {
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid rgba(14, 165, 233, 0.2);
		border-radius: 12px;
		padding: 1.25rem;
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.next-steps-icon {
		width: 40px;
		height: 40px;
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		flex-shrink: 0;
		box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
	}

	.next-steps-content {
		flex: 1;
	}

	.next-steps-title {
		font-size: 1rem;
		font-weight: 600;
		color: #0c4a6e;
		margin: 0 0 0.75rem 0;
	}

	.next-steps-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.next-steps-list li {
		color: #0369a1;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.offered-book-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
	}

	.counter-offer-card {
		background: #faf5ff;
		border: 1px solid #d8b4fe;
		border-radius: 8px;
		padding: 1rem;
	}

	.contact-section {
		background: #f0fdf4;
		border-radius: 8px;
		padding: 1rem;
		border: 1px solid #bbf7d0;
	}

	.completion-section {
		background: #eff6ff;
		border-radius: 8px;
		padding: 1rem;
		border: 1px solid #bfdbfe;
	}

	.meta-text {
		color: #6b7280;
		font-size: 0.875rem;
		margin: 0;
	}

	.title-text {
		color: #1f2937;
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		line-height: 1.4;
	}

	.author-text {
		color: #6b7280;
		font-size: 0.875rem;
		margin: 0;
		line-height: 1.4;
	}

	.message-text {
		color: #374151;
		font-size: 0.875rem;
		line-height: 1.6;
		margin: 0;
		font-style: italic;
	}
</style>

<div class="card">
	<!-- Header -->
	<div class="card-header">
		
		<div class="flex items-start gap-4">
			{#if request.book.google_volume_id && !imageLoadFailed}
				<img
					src="https://books.google.com/books/content?id={request.book.google_volume_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api"
					alt="{request.book.title} cover"
					class="book-thumbnail"
					loading="lazy"
					on:error={handleImageError}
				/>
			{:else}
				<div class="book-placeholder">
					<svg class="book-icon" fill="currentColor" viewBox="0 0 20 20">
						<path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 715.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
					</svg>
				</div>
			{/if}
			<div class="flex-1 min-w-0">
				<h3 class="title-text">{request.book.title}</h3>
				<p class="author-text">by {request.book.authors.join(', ')}</p>
				
				<!-- Book Condition -->
				<div class="mt-2">
					<ConditionIndicator condition={request.book.condition} size="small" />
				</div>
				
				<!-- Book Description -->
				{#if request.book.description}
					<p class="mt-2 text-sm text-gray-600 line-clamp-2">{request.book.description}</p>
				{/if}
				
				<div class="mt-3 flex flex-col gap-1 text-xs text-gray-500">
					<div class="flex items-center">
						{#if type === 'incoming'}
							<span>From: {request.requester_profile?.username || request.requester_profile?.full_name || 'Unknown User'}</span>
						{:else}
							<span>To: {request.owner_profile?.username || request.owner_profile?.full_name || 'Unknown User'}</span>
						{/if}
					</div>
					<div class="flex items-center">
						<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>Requested: {formatExactTimestamp(request.created_at)}</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Status Section -->
	<div class="swap-request-status">
		<div class="status-info">
			<span class="status-label">Swap Request:</span>
			<span class="status-badge pending">{statusDisplay}</span>
		</div>
		{#if request.offered_book}
			<div class="offered-book-info">
				{#if type === 'incoming'}
					They offered: <strong>{request.offered_book.title}</strong>
				{:else}
					You offered: <strong>{request.offered_book.title}</strong>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Message -->
	{#if request.message}
		<div class="card-section">
			<p class="message-text">"{request.message}"</p>
		</div>
	{/if}

	<!-- Offered Books Section -->
	{#if request.offered_book || request.counter_offered_book}
		<div class="card-section" style="background: #f8fafc;">
			<div class="space-y-3">
				<!-- Original offered book (from requester) -->
				{#if request.offered_book}
					<div class="offered-book-card">
						<div class="text-xs font-medium text-gray-500 uppercase tracking-wide" style="margin-bottom: 24px;">
							{type === 'incoming' ? 'They are offering:' : 'You are offering:'}
						</div>
						<div class="flex items-start gap-4">
							{#if request.offered_book.google_volume_id}
								<img
									src="https://books.google.com/books/content?id={request.offered_book.google_volume_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api"
									alt="{request.offered_book.title} cover"
									class="offered-book-thumbnail"
									loading="lazy"
								/>
							{:else}
								<div class="offered-book-placeholder">
									<svg class="book-icon" fill="currentColor" viewBox="0 0 20 20">
										<path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
									</svg>
								</div>
							{/if}
							<div class="flex-1 min-w-0">
								<h4 class="title-text">{request.offered_book.title}</h4>
								<p class="author-text">by {request.offered_book.authors.join(', ')}</p>
								
								<!-- Book Condition -->
								<div class="mt-2">
									<ConditionIndicator condition={request.offered_book.condition} size="small" />
								</div>
								
								<!-- Book Description -->
								{#if request.offered_book.description}
									<p class="mt-2 text-sm text-gray-600 line-clamp-2">{request.offered_book.description}</p>
								{/if}
							</div>
						</div>
					</div>
				{/if}

				<!-- Counter offered book (from owner) -->
				{#if request.counter_offered_book}
					<div class="counter-offer-card">
						<div class="text-xs font-medium text-purple-600 uppercase tracking-wide" style="margin-bottom: 24px;">
							Counter-offer: {type === 'outgoing' ? 'They are offering instead:' : 'You are offering instead:'}
						</div>
						<div class="flex items-start gap-4">
							{#if request.counter_offered_book.google_volume_id}
								<img
									src="https://books.google.com/books/content?id={request.counter_offered_book.google_volume_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api"
									alt="{request.counter_offered_book.title} cover"
									class="offered-book-thumbnail"
									loading="lazy"
								/>
							{:else}
								<div class="offered-book-placeholder">
									<svg class="book-icon" fill="currentColor" viewBox="0 0 20 20">
										<path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
									</svg>
								</div>
							{/if}
							<div class="flex-1 min-w-0">
								<h4 class="title-text" style="color: #581c87;">{request.counter_offered_book.title}</h4>
								<p class="author-text" style="color: #7c3aed;">by {request.counter_offered_book.authors.join(', ')}</p>
								
								<!-- Book Condition -->
								<div class="mt-2">
									<ConditionIndicator condition={request.counter_offered_book.condition} size="small" />
								</div>
								
								<!-- Book Description -->
								{#if request.counter_offered_book.description}
									<p class="mt-2 text-sm text-purple-600 line-clamp-2">{request.counter_offered_book.description}</p>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Contact Information (ACCEPTED status only) -->
	{#if isAccepted && (isOwner || isRequester)}
		<div class="contact-information-section">
			<div class="contact-header">
				<div class="contact-icon">
					<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div class="contact-header-content">
					<h3 class="contact-title">🎉 Swap Approved!</h3>
					<p class="contact-subtitle">
						Great news! You can now coordinate the book exchange directly.
					</p>
				</div>
			</div>
			
			<div class="contact-details">
				{#if type === 'incoming'}
					<!-- Show requester's contact info to owner -->
					{#if request.requester_profile?.email || request.requester_profile?.full_name || request.requester_profile?.username}
						<div class="contact-card">
							<div class="contact-person-header">
								<div class="contact-avatar">
									{#if request.requester_profile?.avatar_url}
										<img src="{request.requester_profile?.avatar_url}" alt="Profile" class="contact-avatar-img">
									{:else}
										<div class="contact-avatar-placeholder">
											<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
											</svg>
										</div>
									{/if}
								</div>
								<div class="contact-person-info">
									<h4 class="contact-person-name">
										{request.requester_profile?.full_name || request.requester_profile?.username || 'Requester'}
									</h4>
									<p class="contact-person-role">Book Requester</p>
								</div>
							</div>
							
							{#if request.requester_profile?.email}
								<a href="mailto:{request.requester_profile?.email}" class="contact-email-button">
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
									Send Email
									<span class="contact-email-address">{request.requester_profile?.email}</span>
								</a>
							{/if}
						</div>
					{/if}
				{:else}
					<!-- Show owner's contact info to requester -->
					{#if request.owner_profile?.email || request.owner_profile?.full_name || request.owner_profile?.username}
						<div class="contact-card">
							<div class="contact-person-header">
								<div class="contact-avatar">
									{#if request.owner_profile?.avatar_url}
										<img src="{request.owner_profile?.avatar_url}" alt="Profile" class="contact-avatar-img">
									{:else}
										<div class="contact-avatar-placeholder">
											<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
											</svg>
										</div>
									{/if}
								</div>
								<div class="contact-person-info">
									<h4 class="contact-person-name">
										{request.owner_profile?.full_name || request.owner_profile?.username || 'Book Owner'}
									</h4>
									<p class="contact-person-role">Book Owner</p>
								</div>
							</div>
							
							{#if request.owner_profile?.email}
								<a href="mailto:{request.owner_profile?.email}" class="contact-email-button">
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
									Send Email
									<span class="contact-email-address">{request.owner_profile?.email}</span>
								</a>
							{/if}
						</div>
					{/if}
				{/if}
			</div>
			
			<div class="next-steps-card">
				<div class="next-steps-icon">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div class="next-steps-content">
					<h4 class="next-steps-title">Next Steps</h4>
					<ul class="next-steps-list">
						<li>📧 Send an email to coordinate pickup/delivery details</li>
						<li>📍 Agree on a meeting location and time</li>
						<li>📚 Exchange your books safely</li>
						<li>⭐ Return here to mark as completed and leave a rating</li>
					</ul>
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
					<span class="text-xs text-blue-700">{formatExactTimestamp(request.completion_date)}</span>
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
		<div class="card-actions">
			{#if isPending && isOwner}
				<!-- Owner actions for PENDING: Accept/Counter-Offer/Cancel -->
				<div class="action-buttons">
					<div class="button-row">
						<button
							type="button"
							class="btn-success"
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
							class="btn-secondary"
							on:click={handleCounterOffer}
							disabled={isLoading}
						>
							Counter-Offer
						</button>
					</div>
					<button
						type="button"
						class="btn-danger"
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
					class="btn-danger"
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
						class="btn-success"
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
						class="btn-danger"
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
					class="btn-danger"
					on:click={handleCancel}
					disabled={isLoading}
				>
					Cancel Counter-Offer
				</button>

			{:else if isAccepted && canComplete}
				<!-- Complete swap action -->
				<button
					type="button"
					class="btn-primary"
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