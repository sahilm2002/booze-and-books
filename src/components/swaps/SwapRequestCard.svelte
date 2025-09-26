<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import { swapStore } from '$lib/stores/swaps';
	import ConditionIndicator from '../books/ConditionIndicator.svelte';
	import SwapBookCard from './SwapBookCard.svelte';
	import type { SwapRequestWithDetails } from '$lib/types/swap';
	import { 
		SwapStatus,
		getSwapStatusDisplayName, 
		getSwapStatusColor,
		canUserCancelSwap,
		canUserAcceptSwap,
		canUserCreateCounterOffer,
		canUserAcceptCounterOffer,
		canUserCompleteSwap,
		getCompletionStatusMessage,
		getDetailedCompletionStatus,
		getExchangedBooks
	} from '$lib/types/swap';

	export let swapRequest: SwapRequestWithDetails;
	export let isIncoming: boolean = false; // true if this user is receiving the request

	const dispatch = createEventDispatcher<{
		updated: SwapRequestWithDetails;
		error: string;
	}>();

	let loading = false;
	let showCounterOfferDialog = false;
	let showCompletionDialog = false;
	let counterOfferBookId = '';
	let counterOfferMessage = '';
	let userBooks: any[] = [];
	let loadingUserBooks = false;
	let completionFeedback = '';

	$: currentUser = $auth.user;
	$: canAccept = currentUser && canUserAcceptSwap(swapRequest, currentUser.id);
	$: canAcceptCounterOffer = currentUser && canUserAcceptCounterOffer(swapRequest, currentUser.id);
	$: canCreateCounterOffer = currentUser && canUserCreateCounterOffer(swapRequest, currentUser.id);
	$: canCancel = currentUser && canUserCancelSwap(swapRequest, currentUser.id);
	$: canComplete = currentUser && canUserCompleteSwap(swapRequest, currentUser.id);
	$: statusColor = getSwapStatusColor(swapRequest.status);
	$: statusDisplay = getSwapStatusDisplayName(swapRequest.status);
	$: completionMessage = currentUser ? getCompletionStatusMessage(swapRequest, currentUser.id) : null;
	$: exchangedBooks = getExchangedBooks(swapRequest);
	$: otherUser = getOtherUserProfile();


	// Get the books that will actually be exchanged
	$: actualRequestedBook = swapRequest.status === SwapStatus.COUNTER_OFFER && swapRequest.counter_offered_book 
		? swapRequest.counter_offered_book 
		: swapRequest.book;

	async function handleAccept() {
		if (!currentUser || loading) return;
		
		loading = true;
		try {
			await swapStore.acceptSwapRequest(swapRequest.id);
			dispatch('updated', swapRequest);
		} catch (error) {
			dispatch('error', error instanceof Error ? error.message : 'Failed to accept swap request');
		} finally {
			loading = false;
		}
	}

	async function handleCancel() {
		if (!currentUser || loading) return;
		
		loading = true;
		try {
			await swapStore.cancelSwapRequest(swapRequest.id);
			dispatch('updated', swapRequest);
		} catch (error) {
			dispatch('error', error instanceof Error ? error.message : 'Failed to cancel swap request');
		} finally {
			loading = false;
		}
	}

	async function handleCreateCounterOffer() {
		if (!currentUser || loading || !counterOfferBookId) return;
		
		loading = true;
		try {
			await swapStore.createCounterOffer(swapRequest.id, {
				counter_offered_book_id: counterOfferBookId,
				counter_offer_message: counterOfferMessage || undefined
			});
			showCounterOfferDialog = false;
			counterOfferBookId = '';
			counterOfferMessage = '';
			dispatch('updated', swapRequest);
		} catch (error) {
			dispatch('error', error instanceof Error ? error.message : 'Failed to create counter-offer');
		} finally {
			loading = false;
		}
	}

	async function handleComplete() {
		if (!currentUser || loading) return;
		
		loading = true;
		try {
			await swapStore.completeSwapRequest(swapRequest.id, {
				feedback: completionFeedback || undefined
			});
			showCompletionDialog = false;
			completionFeedback = '';
			dispatch('updated', swapRequest);
		} catch (error) {
			dispatch('error', error instanceof Error ? error.message : 'Failed to complete swap');
		} finally {
			loading = false;
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getOtherUserProfile() {
		return isIncoming ? swapRequest.requester_profile : swapRequest.owner_profile;
	}

	function getUserInitials(user: any): string {
		if (user.full_name) {
			return user.full_name
				.split(' ')
				.map((name: string) => name.charAt(0).toUpperCase())
				.slice(0, 2)
				.join('');
		} else if (user.username) {
			return user.username.charAt(0).toUpperCase();
		}
		return '?';
	}

	// Load user's available books when counter-offer dialog opens
	$: if (showCounterOfferDialog && currentUser) {
		loadUserBooks();
	}

	// Auto-select the book if there's only one available
	$: if (userBooks.length === 1 && !counterOfferBookId) {
		counterOfferBookId = userBooks[0].id;
	}

	let swapServiceError = false;
	let swapServiceErrorMessage = '';

	async function loadUserBooks() {
		if (!currentUser) return;
		
		loadingUserBooks = true;
		swapServiceError = false;
		swapServiceErrorMessage = '';
		
		try {
			// Import SwapService for this specific method since it's not in the store
			// Wrap the dynamic import in a timeout to prevent infinite loading
			const importPromise = import('$lib/services/swapService');
			const timeoutPromise = new Promise((_, reject) => 
				setTimeout(() => reject(new Error('Import timeout - SwapService took too long to load')), 5000)
			);
			
			const { SwapService } = await Promise.race([importPromise, timeoutPromise]) as { SwapService: any };
			
			// Also add timeout to the service call itself
			const booksPromise = SwapService.getUserAvailableBooksForOffering(currentUser.id);
			const serviceTimeoutPromise = new Promise((_, reject) => 
				setTimeout(() => reject(new Error('Service timeout - getUserAvailableBooksForOffering took too long')), 5000)
			);
			
			userBooks = await Promise.race([booksPromise, serviceTimeoutPromise]);
		} catch (error) {
			// Log the full error for debugging
			console.error('Error loading SwapService or user books:', error);
			
			// Set local error state for UI feedback
			swapServiceError = true;
			
			// Determine user-friendly error message based on error type
			if (error instanceof Error) {
				if (error.message.includes('Import timeout') || error.message.includes('Service timeout')) {
					swapServiceErrorMessage = 'Loading is taking longer than expected. Please try again or refresh the page.';
				} else if (error.message.includes('Failed to resolve module') || 
					error.message.includes('import') || 
					error.message.includes('module')) {
					swapServiceErrorMessage = 'Unable to load swap functionality. Please refresh the page and try again.';
				} else {
					swapServiceErrorMessage = `Failed to load your available books: ${error.message}`;
				}
			} else {
				swapServiceErrorMessage = 'An unexpected error occurred while loading your books. Please try again.';
			}
			
			// Also dispatch error for parent component handling
			dispatch('error', swapServiceErrorMessage);
			
			// Prevent further execution that depends on SwapService
			return;
		} finally {
			loadingUserBooks = false;
		}
	}
</script>

<div class="swap-card">
	<div class="swap-header">
		<div class="status-badge" style="background-color: {statusColor}">
			{statusDisplay}
		</div>
		<div class="swap-date">
			{formatDate(swapRequest.created_at)}
		</div>
	</div>

	<div class="swap-content">
	<!-- Other User Info -->
	<div class="user-section">
		<div class="user-info">
			{#if otherUser.avatar_url}
				<img 
					src={otherUser.avatar_url} 
					alt="{otherUser.username}'s avatar"
					class="user-avatar"
				/>
			{:else}
				<div class="user-avatar user-initials">
					{getUserInitials(otherUser)}
				</div>
			{/if}
			<div class="user-details">
				<h4>
					<button 
						class="username-link"
						on:click={() => goto(`/app/profile/${otherUser.username}`)}
						disabled={!otherUser.username}
					>
						{otherUser.username || 'Unknown User'}
					</button>
				</h4>
				<div class="user-role">
					{isIncoming ? 'Requesting your book' : 'Book owner'}
				</div>
			</div>
		</div>
	</div>

		<!-- Books Exchange -->
		<div class="books-section">
			{#if (swapRequest.status === SwapStatus.COUNTER_OFFER || (swapRequest.status === SwapStatus.ACCEPTED && (swapRequest.counter_offered_book || swapRequest.counter_offered_book_id))) && (swapRequest.counter_offered_book || swapRequest.counter_offered_book_id)}
				<!-- Counter-Offer: Show 3-book flow -->
				<div class="counter-offer-flow">
					<!-- Book 1: What they want -->
					<SwapBookCard 
						book={swapRequest.book}
						label={isIncoming ? 'Your book' : 'Their book'}
						{isIncoming}
					/>

					<div class="exchange-arrow">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M7 17L17 7M17 7H7M17 7V17"/>
						</svg>
					</div>

					<!-- Book 2: What they originally offered (declined) -->
					{#if swapRequest.offered_book}
					<SwapBookCard 
						book={swapRequest.offered_book}
						label={isIncoming ? 'Their book (you declined)' : 'Your book (they declined)'}
						isDeclined={true}
						{isIncoming}
					/>

					<div class="exchange-arrow">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M7 17L17 7M17 7H7M17 7V17"/>
						</svg>
					</div>
					{/if}

					<!-- Book 3: Counter-offered book (new offer) -->
					{#if swapRequest.counter_offered_book}
					<SwapBookCard 
						book={swapRequest.counter_offered_book}
						label={isIncoming ? 'Your counter-offer' : 'Their counter-offer'}
						isCounterOffer={true}
						{isIncoming}
					/>
					{:else}
					<div class="book-item counter-offer-book">
						<h5>{isIncoming ? 'Your counter-offer' : 'Their counter-offer'} <span class="counter-offer-label">(new)</span></h5>
						<div class="book-card counter-offer">
							<div class="book-info">
								<h6>Counter-offer book details loading...</h6>
								<p class="book-author">Book ID: {swapRequest.counter_offered_book_id}</p>
							</div>
						</div>
					</div>
					{/if}
				</div>
			{:else}
				<!-- Regular swap: Show 2-book flow -->
				<div class="book-exchange">
					<!-- Requested Book (what they want) -->
					<SwapBookCard 
						book={actualRequestedBook}
						label={isIncoming ? 'Your book' : 'Their book'}
						{isIncoming}
					/>

					<div class="exchange-arrow">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M7 17L17 7M17 7H7M17 7V17"/>
						</svg>
					</div>

					<!-- Offered Book (what they're giving) - Only show if exists -->
					{#if swapRequest.offered_book}
					<SwapBookCard 
						book={swapRequest.offered_book}
						label={isIncoming ? 'Their book' : 'Your book'}
						{isIncoming}
					/>
					{:else}
					<!-- Simple swap request - no offered book in current schema -->
					<div class="book-item">
						<h5>Simple Request</h5>
						<div class="simple-request-note">
							<p>This is a simple swap request. The requester is interested in your book.</p>
						</div>
					</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Messages -->
		{#if swapRequest.message}
			<div class="message-section">
				<h5>Request Message</h5>
				<p class="message-text">{swapRequest.message}</p>
			</div>
		{/if}

		{#if swapRequest.status === SwapStatus.COUNTER_OFFER && swapRequest.counter_offer_message}
			<div class="message-section counter-offer">
				<h5>Counter-Offer Message</h5>
				<p class="message-text">{swapRequest.counter_offer_message}</p>
			</div>
		{/if}

		<!-- Completion Status -->
		{#if swapRequest.status === SwapStatus.ACCEPTED}
			{@const detailedStatus = getDetailedCompletionStatus(swapRequest, swapRequest.requester_profile, swapRequest.owner_profile)}
			<div class="completion-section">
				<h5>Completion Status</h5>
				<p class="completion-message">{detailedStatus.message}</p>
				
				<div class="completion-checklist">
					<div class="completion-item" class:completed={detailedStatus.requesterCompleted}>
						<div class="completion-checkbox">
							{#if detailedStatus.requesterCompleted}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="20,6 9,17 4,12"/>
								</svg>
							{:else}
								<div class="empty-checkbox"></div>
							{/if}
						</div>
						<span class="completion-label">
							{detailedStatus.requesterName} 
							{detailedStatus.requesterCompleted ? 'has completed' : 'needs to complete'}
						</span>
					</div>
					
					<div class="completion-item" class:completed={detailedStatus.ownerCompleted}>
						<div class="completion-checkbox">
							{#if detailedStatus.ownerCompleted}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="20,6 9,17 4,12"/>
								</svg>
							{:else}
								<div class="empty-checkbox"></div>
							{/if}
						</div>
						<span class="completion-label">
							{detailedStatus.ownerName} 
							{detailedStatus.ownerCompleted ? 'has completed' : 'needs to complete'}
						</span>
					</div>
				</div>
			</div>
		{/if}

		<!-- Contact Info (for accepted swaps only, not completed) -->
		{#if swapRequest.status === SwapStatus.ACCEPTED}
			<div class="contact-section">
				<h5>Contact Information</h5>
				<div class="contact-details">
					<div class="contact-user">
						<h6>{isIncoming ? 'Requester' : 'Book Owner'}: {otherUser.username}</h6>
						{#if otherUser.full_name && otherUser.full_name !== otherUser.username}
							<p><strong>Name:</strong> {otherUser.full_name}</p>
						{/if}
						{#if otherUser.location}
							<p><strong>Location:</strong> {otherUser.location}</p>
						{/if}
						<p class="contact-note-small">
							<strong>Email:</strong> Contact {otherUser.username} directly to exchange email addresses
						</p>
					</div>
					
					<div class="contact-user">
						<h6>Your Information</h6>
						{#if $profile?.email || $auth.user?.email}
							<p><strong>Email:</strong> {$profile?.email || $auth.user?.email}</p>
						{/if}
						{#if $profile?.full_name}
							<p><strong>Name:</strong> {$profile.full_name}</p>
						{:else if $auth.user?.user_metadata?.full_name}
							<p><strong>Name:</strong> {$auth.user.user_metadata.full_name}</p>
						{/if}
						{#if $profile?.location}
							<p><strong>Location:</strong> {$profile.location}</p>
						{/if}
					</div>
				</div>
				<div class="contact-instructions">
					<p class="contact-note">
						<strong>Next Steps:</strong> Contact {otherUser.username} via email to coordinate the physical book exchange. 
						Exchange phone numbers or arrange a meetup location and time.
					</p>
					<p class="safety-note">
						<strong>Safety Tip:</strong> Meet in a public place for the book exchange.
					</p>
				</div>
			</div>
		{/if}

		<!-- Feedback (for completed swaps) -->
		{#if swapRequest.status === SwapStatus.COMPLETED && (swapRequest.requester_feedback || swapRequest.owner_feedback)}
			<div class="feedback-section">
				<h5>Swap Feedback</h5>
				{#if swapRequest.requester_feedback}
					<p><strong>Requester:</strong> {swapRequest.requester_feedback}</p>
				{/if}
				{#if swapRequest.owner_feedback}
					<p><strong>Owner:</strong> {swapRequest.owner_feedback}</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Action Buttons -->
	<div class="swap-actions">
		{#if canAccept}
			<button 
				class="btn btn-primary" 
				on:click={handleAccept}
				disabled={loading}
			>
				{loading ? 'Accepting...' : 'Accept Swap'}
			</button>
		{/if}

		{#if canAcceptCounterOffer}
			<button 
				class="btn btn-primary" 
				on:click={handleAccept}
				disabled={loading}
			>
				{loading ? 'Accepting...' : 'Accept Counter-Offer'}
			</button>
		{/if}

		{#if canCreateCounterOffer}
			<button 
				class="btn btn-secondary" 
				on:click={() => showCounterOfferDialog = true}
				disabled={loading}
			>
				Counter-Offer
			</button>
		{/if}

		{#if canCancel}
			<button 
				class="btn btn-outline" 
				on:click={handleCancel}
				disabled={loading}
			>
				{loading ? 'Cancelling...' : 'Cancel'}
			</button>
		{/if}

		{#if canComplete}
			<button 
				class="btn btn-success" 
				on:click={() => showCompletionDialog = true}
				disabled={loading}
			>
				Mark as Completed
			</button>
		{/if}
	</div>
</div>

<!-- Counter-Offer Dialog -->
{#if showCounterOfferDialog}
	<div class="modal-overlay" on:click={() => showCounterOfferDialog = false}>
		<div class="counter-offer-modal" on:click|stopPropagation>
			<div class="modal-header">
				<h2>Create Counter-Offer</h2>
				<button class="close-btn" on:click={() => showCounterOfferDialog = false} aria-label="Close">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 6L6 18M6 6l12 12"/>
					</svg>
				</button>
			</div>

			<div class="modal-body">
				<!-- Target Book -->
				<div class="section">
					<h3>They Want</h3>
					<div class="book-card target-book">
						<div class="book-image">
							{#if swapRequest.book.google_volume_id}
								<img 
									src="https://books.google.com/books/content?id={swapRequest.book.google_volume_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api" 
									alt="{swapRequest.book.title} cover"
									class="book-cover"
									loading="lazy"
								/>
							{:else}
								<div class="cover-placeholder">
									<svg class="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
									</svg>
								</div>
							{/if}
						</div>
						<div class="book-info">
							<h4>{swapRequest.book.title}</h4>
							<p class="book-author">{Array.isArray(swapRequest.book.authors) ? swapRequest.book.authors.join(', ') : swapRequest.book.authors}</p>
							<ConditionIndicator condition={swapRequest.book.condition} />
						</div>
					</div>
				</div>

				<!-- Book Selection -->
				<div class="section">
					<h3>Your Counter-Offer</h3>
					<p class="section-description">Instead of the book they offered, select one of your books to counter-offer:</p>
					
					{#if loadingUserBooks}
						<div class="loading-state">
							<div class="loading-spinner">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
									<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.25"/>
									<path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
								</svg>
							</div>
							<p>Loading your available books...</p>
						</div>
					{:else if swapServiceError}
						<div class="error-state">
							<div class="error-icon">
								<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="12" cy="12" r="10"/>
									<line x1="15" y1="9" x2="9" y2="15"/>
									<line x1="9" y1="9" x2="15" y2="15"/>
								</svg>
							</div>
							<h4>Unable to Load Books</h4>
							<p class="error-message">{swapServiceErrorMessage}</p>
							<button 
								type="button" 
								class="btn btn-secondary retry-btn" 
								on:click={loadUserBooks}
								disabled={loadingUserBooks}
							>
								{loadingUserBooks ? 'Retrying...' : 'Try Again'}
							</button>
						</div>
					{:else if userBooks.length === 0}
						<div class="empty-state">
							<div class="empty-icon">
								<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
									<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
								</svg>
							</div>
							<h4>No Available Books</h4>
							<p>You don't have any available books to offer as counter-offers.</p>
							<p class="empty-note">Add some books to your collection first, then come back to make counter-offers.</p>
						</div>
					{:else}
						<div class="books-grid">
							{#each userBooks as book (book.id)}
								<div 
									class="book-option" 
									class:selected={counterOfferBookId === book.id}
									on:click={() => {
										if (counterOfferBookId === book.id) {
											counterOfferBookId = '';
										} else {
											counterOfferBookId = book.id;
										}
									}}
									role="button"
									tabindex="0"
									on:keydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											if (counterOfferBookId === book.id) {
												counterOfferBookId = '';
											} else {
												counterOfferBookId = book.id;
											}
										}
									}}
								>
									<div class="book-card">
										<div class="book-image">
											{#if book.google_volume_id}
												<img 
													src="https://books.google.com/books/content?id={book.google_volume_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api" 
													alt="{book.title} cover"
													class="book-cover"
													loading="lazy"
												/>
											{:else}
												<div class="cover-placeholder">
													<svg class="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
													</svg>
												</div>
											{/if}
										</div>
										<div class="book-info">
											<h5>{book.title}</h5>
											<p class="book-author">{Array.isArray(book.authors) ? book.authors.join(', ') : book.authors}</p>
											<ConditionIndicator condition={book.condition} />
											{#if book.description}
												<div class="book-description-container">
													<p class="book-description">{book.description}</p>
												</div>
											{/if}
										</div>
									</div>
									<div class="selection-indicator">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<polyline points="20,6 9,17 4,12"/>
										</svg>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Message -->
				<div class="section">
					<h3>Counter-Offer Message <span class="optional">(Optional)</span></h3>
					<textarea 
						bind:value={counterOfferMessage}
						placeholder="Explain why you're offering this book instead... What makes it a great alternative?"
						rows="4"
						maxlength="500"
					></textarea>
					<div class="char-count">{counterOfferMessage.length}/500</div>
				</div>
			</div>

			<div class="modal-footer">
				<button 
					type="button" 
					class="btn btn-secondary" 
					on:click={() => showCounterOfferDialog = false}
					disabled={loading}
				>
					Cancel
				</button>
				<button 
					type="button" 
					class="btn btn-primary" 
					on:click={handleCreateCounterOffer}
					disabled={loading || !counterOfferBookId || userBooks.length === 0}
				>
					{#if loading}
						<svg class="btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none">
							<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.25"/>
							<path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
						</svg>
						Creating Counter-Offer...
					{:else}
						Create Counter-Offer
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Completion Dialog -->
{#if showCompletionDialog}
	<div class="modal-overlay" on:click={() => showCompletionDialog = false}>
		<div class="modal-content" on:click|stopPropagation>
			<h3>Complete Swap</h3>
			<p>Confirm that you've received your book from {otherUser.username} and rate your experience.</p>
			
			<form on:submit|preventDefault={handleComplete}>
				<div class="form-group">
					<label for="feedback">Message for {otherUser.username} (optional):</label>
					<textarea 
						bind:value={completionFeedback}
						rows="3" 
						placeholder="Leave a message about the swap experience, book condition, or just say thanks!"
					></textarea>
				</div>

				<div class="completion-note">
					<p><strong>Note:</strong> Once both parties mark the swap as completed, book ownership will be transferred and the swap will be finalized.</p>
				</div>

				<div class="modal-actions">
					<button type="button" class="btn btn-secondary" on:click={() => showCompletionDialog = false}>
						Cancel
					</button>
					<button type="submit" class="btn btn-primary" disabled={loading}>
						{loading ? 'Completing...' : 'Mark as Completed'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.swap-card {
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 1.5rem;
		background: white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		margin-bottom: 1rem;
	}

	.swap-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.swap-date {
		color: #64748b;
		font-size: 0.875rem;
	}

	.user-section {
		margin-bottom: 1.5rem;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.user-avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		object-fit: cover;
	}

	.user-initials {
		background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 1.125rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.user-details h4 {
		margin: 0 0 0.25rem 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.username-link {
		background: none;
		border: none;
		color: #3b82f6;
		font-size: inherit;
		font-weight: inherit;
		cursor: pointer;
		padding: 0;
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.username-link:hover:not(:disabled) {
		color: #2563eb;
		text-decoration: underline;
	}

	.username-link:disabled {
		color: inherit;
		cursor: default;
	}

	.user-role {
		font-size: 0.875rem;
		color: #64748b;
	}

	.books-section {
		margin-bottom: 1.5rem;
	}

	.book-exchange {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 1rem;
		align-items: center;
	}

	.counter-offer-flow {
		display: grid;
		grid-template-columns: 1fr auto 1fr auto 1fr;
		gap: 1rem;
		align-items: center;
	}

	.book-item h5 {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.counter-offer-label {
		color: #059669;
		font-weight: 500;
		font-size: 0.75rem;
	}

	.book-card {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #f8fafc;
	}

	.book-card.counter-offer {
		background: #f0fdf4;
		border-color: #bbf7d0;
		box-shadow: 0 0 0 1px #10b981;
	}

	.book-cover {
		width: 60px;
		height: 80px;
		object-fit: cover;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.book-info {
		flex: 1;
		min-width: 0;
	}

	.book-info h6 {
		margin: 0 0 0.25rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.2;
	}

	.book-author {
		margin: 0 0 0.5rem 0;
		font-size: 0.75rem;
		color: #64748b;
	}

	.exchange-arrow {
		display: flex;
		justify-content: center;
		color: #64748b;
	}

	.message-section, .completion-section, .contact-section, .ratings-section {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #f1f5f9;
		border-radius: 8px;
	}

	.message-section.counter-offer {
		background: #fef3c7;
		border-left: 4px solid #f59e0b;
	}

	.message-section h5, .completion-section h5, .contact-section h5, .ratings-section h5 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.message-text, .completion-message {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.contact-details {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.contact-user {
		padding: 0.75rem;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
	}

	.contact-user h6 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.contact-user p {
		margin: 0.25rem 0;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.contact-instructions {
		padding: 0.75rem;
		background: #fef3c7;
		border: 1px solid #f59e0b;
		border-radius: 6px;
	}

	.contact-note {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		color: #92400e;
		line-height: 1.4;
	}

	.safety-note {
		margin: 0;
		font-size: 0.75rem;
		color: #b45309;
		font-style: italic;
	}

	.ratings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.rating-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.feedback-section p {
		margin: 0.5rem 0;
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.swap-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-secondary {
		background: #8b5cf6;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #7c3aed;
	}

	.btn-success {
		background: #10b981;
		color: white;
	}

	.btn-success:hover:not(:disabled) {
		background: #059669;
	}

	.btn-outline {
		background: transparent;
		color: #6b7280;
		border: 1px solid #d1d5db;
	}

	.btn-outline:hover:not(:disabled) {
		background: #f9fafb;
		border-color: #9ca3af;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		background: white;
		padding: 2rem;
		border-radius: 12px;
		width: 90%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-content h3 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.form-group select,
	.form-group textarea {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.form-group textarea {
		resize: vertical;
		min-height: 80px;
	}

	.completion-note {
		padding: 0.75rem;
		background: #dbeafe;
		border: 1px solid #3b82f6;
		border-radius: 6px;
		margin-bottom: 1rem;
	}

	.completion-note p {
		margin: 0;
		font-size: 0.75rem;
		color: #1e40af;
		line-height: 1.4;
	}

	.completion-checklist {
		margin-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.completion-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.completion-item.completed {
		background: #dcfce7;
		border: 1px solid #16a34a;
	}

	.completion-item:not(.completed) {
		background: #fef3c7;
		border: 1px solid #f59e0b;
	}

	.completion-checkbox {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.completion-item.completed .completion-checkbox {
		background: #16a34a;
		color: white;
	}

	.completion-item:not(.completed) .completion-checkbox {
		background: #f3f4f6;
		border: 2px solid #d1d5db;
	}

	.empty-checkbox {
		width: 12px;
		height: 12px;
		border-radius: 2px;
		background: #e5e7eb;
	}

	.completion-label {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.completion-item.completed .completion-label {
		color: #15803d;
	}

	.completion-item:not(.completed) .completion-label {
		color: #92400e;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
	}

	/* Counter-Offer Modal Styles - matching SwapRequestDialog */
	.counter-offer-modal {
		background: white;
		border-radius: 16px;
		width: 100%;
		max-width: 1000px;
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
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
		color: #1f2937;
	}

	.close-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.75rem;
		border-radius: 8px;
		color: #6b7280;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		background: #f3f4f6;
		color: #374151;
	}

	.modal-body {
		padding: 2rem;
	}

	.section {
		margin-bottom: 2.5rem;
	}

	.section:last-child {
		margin-bottom: 0;
	}

	.section h3 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.optional {
		font-size: 0.875rem;
		font-weight: 400;
		color: #6b7280;
	}

	.section-description {
		margin: 0 0 1.5rem 0;
		color: #6b7280;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.target-book {
		background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
		border-color: #bfdbfe;
		border: 2px solid #bfdbfe;
		padding: 1.5rem;
	}

	.target-book .book-cover {
		width: 80px;
		height: 120px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.target-book .book-info h4 {
		font-size: 1.125rem;
		margin: 0 0 0.5rem 0;
		font-weight: 600;
		color: #1f2937;
	}

	.books-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 1.5rem;
	}

	.book-option {
		display: block;
		position: relative;
		transition: all 0.2s;
		cursor: pointer;
	}

	.book-option .book-card {
		transition: all 0.2s;
		border: 2px solid #e2e8f0;
		position: relative;
		padding: 1.5rem;
		gap: 1.5rem;
	}

	.book-option:hover .book-card {
		border-color: #bfdbfe;
		background: #f0f9ff;
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
	}

	.book-option.selected .book-card {
		border-color: #3b82f6;
		background: #eff6ff;
		box-shadow: 0 0 0 1px #3b82f6, 0 8px 25px rgba(59, 130, 246, 0.15);
	}

	.book-option .book-cover {
		width: 80px;
		height: 120px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.book-option .book-info h5 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
	}

	.cover-placeholder {
		width: 80px;
		height: 120px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.placeholder-icon {
		width: 32px;
		height: 32px;
		color: #9ca3af;
	}

	.book-description-container {
		margin-top: 0.75rem;
		max-height: 80px;
		overflow-y: auto;
		border-radius: 6px;
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.5);
		border: 1px solid rgba(0, 0, 0, 0.05);
	}

	.book-description-container::-webkit-scrollbar {
		width: 4px;
	}

	.book-description-container::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.05);
		border-radius: 2px;
	}

	.book-description-container::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 2px;
	}

	.book-description-container::-webkit-scrollbar-thumb:hover {
		background: rgba(0, 0, 0, 0.3);
	}

	.book-description {
		margin: 0;
		font-size: 0.875rem;
		color: #4b5563;
		line-height: 1.5;
	}

	.selection-indicator {
		position: absolute;
		top: 1rem;
		right: 1rem;
		width: 32px;
		height: 32px;
		background: #3b82f6;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		opacity: 0;
		transform: scale(0.8);
		transition: all 0.2s;
	}

	.book-option.selected .selection-indicator {
		opacity: 1;
		transform: scale(1);
	}

	.loading-state,
	.empty-state,
	.error-state {
		text-align: center;
		padding: 3rem 2rem;
		color: #6b7280;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.loading-spinner {
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

	.error-state {
		background: #fef2f2;
		border: 2px dashed #fca5a5;
		border-radius: 12px;
	}

	.error-state h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #dc2626;
	}

	.error-message {
		margin: 0.5rem 0 1.5rem 0;
		font-size: 0.95rem;
		line-height: 1.5;
		color: #991b1b;
	}

	.error-icon {
		margin: 0 auto 1rem;
		color: #dc2626;
	}

	.retry-btn {
		margin-top: 1rem;
	}

	.empty-state {
		background: #f9fafb;
		border: 2px dashed #d1d5db;
		border-radius: 12px;
	}

	.empty-icon {
		margin: 0 auto 1rem;
		color: #9ca3af;
	}

	.empty-state h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #374151;
	}

	.empty-state p {
		margin: 0.5rem 0;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.empty-note {
		font-size: 0.875rem;
		color: #9ca3af;
		font-style: italic;
	}

	.counter-offer-modal textarea {
		width: 100%;
		padding: 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		font-size: 0.95rem;
		font-family: inherit;
		resize: vertical;
		min-height: 100px;
		transition: all 0.2s;
		line-height: 1.5;
	}

	.counter-offer-modal textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 1px #3b82f6;
	}

	.counter-offer-modal textarea::placeholder {
		color: #9ca3af;
	}

	.char-count {
		text-align: right;
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.5rem;
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

	.modal-footer .btn {
		display: flex;
		align-items: center;
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

	.modal-footer .btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none !important;
	}

	.modal-footer .btn-primary {
		background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
		color: white;
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
	}

	.modal-footer .btn-primary:hover:not(:disabled) {
		background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
	}

	.modal-footer .btn-secondary {
		background: #6b7280;
		color: white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.modal-footer .btn-secondary:hover:not(:disabled) {
		background: #4b5563;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.btn-spinner {
		animation: spin 1s linear infinite;
	}

	@media (max-width: 768px) {
		.book-exchange {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.exchange-arrow {
			transform: rotate(90deg);
		}

		.swap-actions {
			flex-direction: column;
		}

		.btn {
			width: 100%;
		}

		.counter-offer-modal {
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

		.modal-header h2 {
			font-size: 1.5rem;
		}

		.books-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.book-card {
			gap: 1rem;
			padding: 1rem;
		}

		.book-cover,
		.cover-placeholder {
			width: 60px;
			height: 90px;
		}

		.modal-footer {
			flex-direction: column;
		}

		.modal-footer .btn {
			width: 100%;
			justify-content: center;
		}
	}

	@media (max-width: 480px) {
		.modal-overlay {
			padding: 0;
		}

		.book-card {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.book-image {
			align-self: center;
		}
	}
</style>
