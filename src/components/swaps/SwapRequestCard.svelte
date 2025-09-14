<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { SwapRequest } from '$lib/types/swap';
	import type { Book } from '$lib/types/book';
	import type { Profile } from '$lib/types/profile';
	import { getSwapStatusDisplayName, getSwapStatusColor, canUserAcceptSwap, canUserCancelSwap, canUserCompleteSwap } from '$lib/types/swap';
	import { SwapService } from '$lib/services/swapService';
	import { auth } from '$lib/stores/auth';
	import ConditionIndicator from '../books/ConditionIndicator.svelte';

	export let swapRequest: SwapRequest;
	export let requestedBook: Book;
	export let offeredBook: Book;
	export let otherUserProfile: Profile;
	export let isIncoming: boolean = false; // true if this user is receiving the request

	const dispatch = createEventDispatcher<{
		updated: SwapRequest;
		error: string;
	}>();

	let loading = false;
	let showCompletionDialog = false;

	$: currentUser = $auth.user;
	$: canAccept = currentUser && canUserAcceptSwap(swapRequest, currentUser.id);
	$: canCancel = currentUser && canUserCancelSwap(swapRequest, currentUser.id);
	$: canComplete = currentUser && canUserCompleteSwap(swapRequest, currentUser.id);
	$: statusColor = getSwapStatusColor(swapRequest.status);
	$: statusDisplay = getSwapStatusDisplayName(swapRequest.status);

	async function handleAccept() {
		if (!currentUser || loading) return;
		
		loading = true;
		try {
			const updatedSwap = await SwapService.acceptSwapRequest(swapRequest.id, currentUser.id);
			dispatch('updated', updatedSwap);
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
			const updatedSwap = await SwapService.cancelSwapRequest(swapRequest.id, currentUser.id);
			dispatch('updated', updatedSwap);
		} catch (error) {
			dispatch('error', error instanceof Error ? error.message : 'Failed to cancel swap request');
		} finally {
			loading = false;
		}
	}

	async function handleComplete(rating: number, feedback?: string) {
		if (!currentUser || loading) return;
		
		loading = true;
		try {
			const updatedSwap = await SwapService.completeSwapRequest(swapRequest.id, currentUser.id, { rating, feedback });
			dispatch('updated', updatedSwap);
			showCompletionDialog = false;
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
				<img 
					src={otherUserProfile.avatar_url || '/images/default-avatar.png'} 
					alt="{otherUserProfile.username}'s avatar"
					class="user-avatar"
				/>
				<div class="user-details">
					<h4>{otherUserProfile.username}</h4>
					<!-- UserRating component will be created later -->
					<div class="rating-placeholder">Rating: N/A</div>
				</div>
			</div>
		</div>

		<!-- Books Exchange -->
		<div class="books-section">
			<div class="book-exchange">
				<!-- Requested Book (what they want) -->
				<div class="book-item">
					<h5>{isIncoming ? 'They want' : 'You want'}</h5>
					<div class="book-card">
						<img 
							src="/images/book-placeholder.png" 
							alt="{requestedBook.title} cover"
							class="book-cover"
						/>
						<div class="book-info">
							<h6>{requestedBook.title}</h6>
							<p class="book-author">{Array.isArray(requestedBook.authors) ? requestedBook.authors.join(', ') : requestedBook.authors}</p>
							<ConditionIndicator condition={requestedBook.condition} />
						</div>
					</div>
				</div>

				<div class="exchange-arrow">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M7 17L17 7M17 7H7M17 7V17"/>
					</svg>
				</div>

				<!-- Offered Book (what they're giving) -->
				<div class="book-item">
					<h5>{isIncoming ? 'They offer' : 'You offer'}</h5>
					<div class="book-card">
						<img 
							src="/images/book-placeholder.png" 
							alt="{offeredBook.title} cover"
							class="book-cover"
						/>
						<div class="book-info">
							<h6>{offeredBook.title}</h6>
							<p class="book-author">{Array.isArray(offeredBook.authors) ? offeredBook.authors.join(', ') : offeredBook.authors}</p>
							<ConditionIndicator condition={offeredBook.condition} />
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Contact Info (for accepted swaps) -->
		{#if swapRequest.status === 'ACCEPTED'}
			<div class="contact-section">
				<h5>Contact Information</h5>
				<p>Username: {otherUserProfile.username}</p>
				<p class="contact-note">Coordinate the physical exchange directly with {otherUserProfile.username}</p>
			</div>
		{/if}

		<!-- Ratings (for completed swaps) -->
		{#if swapRequest.status === 'COMPLETED'}
			<div class="ratings-section">
				<h5>Swap Ratings</h5>
				<div class="ratings-grid">
					{#if swapRequest.requester_rating}
						<div class="rating-item">
							<span>Requester Rating: {swapRequest.requester_rating}/5</span>
						</div>
					{/if}
					{#if swapRequest.owner_rating}
						<div class="rating-item">
							<span>Owner Rating: {swapRequest.owner_rating}/5</span>
						</div>
					{/if}
				</div>
				{#if swapRequest.requester_feedback || swapRequest.owner_feedback}
					<div class="feedback-section">
						{#if swapRequest.requester_feedback}
							<p><strong>Requester:</strong> {swapRequest.requester_feedback}</p>
						{/if}
						{#if swapRequest.owner_feedback}
							<p><strong>Owner:</strong> {swapRequest.owner_feedback}</p>
						{/if}
					</div>
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

		{#if canCancel}
			<button 
				class="btn btn-secondary" 
				on:click={handleCancel}
				disabled={loading}
			>
				{loading ? 'Cancelling...' : 'Cancel Swap'}
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

<!-- Completion Dialog -->
{#if showCompletionDialog}
	<div class="modal-overlay" on:click={() => showCompletionDialog = false}>
		<div class="modal-content" on:click|stopPropagation>
			<h3>Complete Swap</h3>
			<p>Rate your experience with {otherUserProfile.username}</p>
			
			<form on:submit|preventDefault={(e) => {
				const target = e.target as HTMLFormElement;
				const formData = new FormData(target);
				const ratingValue = formData.get('rating') as string;
				const feedbackValue = formData.get('feedback') as string;
				const rating = parseInt(ratingValue);
				handleComplete(rating, feedbackValue || undefined);
			}}>
				<div class="form-group">
					<label for="rating">Rating (1-5 stars):</label>
					<select name="rating" required>
						<option value="">Select rating</option>
						<option value="1">1 Star</option>
						<option value="2">2 Stars</option>
						<option value="3">3 Stars</option>
						<option value="4">4 Stars</option>
						<option value="5">5 Stars</option>
					</select>
				</div>

				<div class="form-group">
					<label for="feedback">Feedback (optional):</label>
					<textarea name="feedback" rows="3" placeholder="How was the swap experience?"></textarea>
				</div>

				<div class="modal-actions">
					<button type="button" class="btn btn-secondary" on:click={() => showCompletionDialog = false}>
						Cancel
					</button>
					<button type="submit" class="btn btn-primary" disabled={loading}>
						{loading ? 'Completing...' : 'Complete Swap'}
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

	.user-details h4 {
		margin: 0 0 0.25rem 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.rating-placeholder {
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

	.book-item h5 {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.book-card {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #f8fafc;
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

	.contact-section, .ratings-section {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #f1f5f9;
		border-radius: 8px;
	}

	.contact-section h5, .ratings-section h5 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.contact-note {
		margin: 0.5rem 0 0 0;
		font-size: 0.875rem;
		color: #64748b;
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
		background: #6b7280;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #4b5563;
	}

	.btn-success {
		background: #10b981;
		color: white;
	}

	.btn-success:hover:not(:disabled) {
		background: #059669;
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

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
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
	}
</style>
