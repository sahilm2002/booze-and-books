<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { validateSwapCompletion } from '$lib/validation/swap.js';
	import type { SwapCompletion, SwapRequestWithBook } from '$lib/types/swap.js';

	export let swapRequest: SwapRequestWithBook;
	export let isSubmitting = false;

	const dispatch = createEventDispatcher<{
		submit: SwapCompletion;
		cancel: void;
	}>();

	let rating = 5;
	let feedback = '';
	let errors: Record<string, string> = {};

	// Determine if current user is the requester or owner for display
	$: isRequester = true; // This would be determined by comparing with current user ID
	$: otherParty = isRequester ? 
		swapRequest.owner_profile?.full_name || swapRequest.owner_profile?.username || 'Book Owner' :
		swapRequest.requester_profile?.full_name || swapRequest.requester_profile?.username || 'Book Requester';

	function handleSubmit() {
		const completionData = { rating, feedback: feedback.trim() || null };
		
		const validation = validateSwapCompletion(completionData);
		if (!validation.success) {
			errors = validation.errors;
			return;
		}

		errors = {};
		dispatch('submit', validation.data);
	}

	function handleCancel() {
		dispatch('cancel');
	}

	function setRating(newRating: number) {
		rating = newRating;
		// Clear rating error when user selects a rating
		if (errors.rating) {
			errors = { ...errors };
			delete errors.rating;
		}
	}

	function clearFeedbackError() {
		if (errors.feedback) {
			errors = { ...errors };
			delete errors.feedback;
		}
	}
</script>

<div class="completion-overlay">
	<div class="completion-modal">
		<div class="modal-header">
			<h2 class="modal-title">Complete Book Swap</h2>
			<button class="close-button" on:click={handleCancel} disabled={isSubmitting}>
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<div class="modal-content">
			<div class="swap-info">
				<div class="book-info">
					<div class="book-cover">
						{#if swapRequest.book.thumbnail_url}
							<img 
								src={swapRequest.book.thumbnail_url} 
								alt="Cover of {swapRequest.book.title}"
								class="cover-image"
							/>
						{:else}
							<div class="cover-placeholder">
								<svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
								</svg>
							</div>
						{/if}
					</div>
					<div class="book-details">
						<h3 class="book-title">{swapRequest.book.title}</h3>
						<p class="book-authors">
							{#if swapRequest.book.authors && swapRequest.book.authors.length > 0}
								by {swapRequest.book.authors.join(', ')}
							{:else}
								by Unknown Author
							{/if}
						</p>
						<p class="swap-partner">Swapped with: <span class="partner-name">{otherParty}</span></p>
					</div>
				</div>
			</div>

			<form on:submit|preventDefault={handleSubmit} class="completion-form">
				<div class="rating-section">
					<label class="section-label">
						How would you rate this swap experience?
						<span class="required">*</span>
					</label>
					<p class="section-description">
						Consider factors like book condition, communication, and timeliness.
					</p>
					
					<div class="rating-input">
						{#each [1, 2, 3, 4, 5] as star}
							<button
								type="button"
								class="star-button {star <= rating ? 'filled' : 'empty'}"
								on:click={() => setRating(star)}
								disabled={isSubmitting}
							>
								<span class="sr-only">{star} star{star !== 1 ? 's' : ''}</span>
								<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
									<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
								</svg>
							</button>
						{/each}
					</div>
					
					<div class="rating-labels">
						<span class="rating-label">Poor</span>
						<span class="rating-label">Excellent</span>
					</div>

					{#if errors.rating}
						<p class="error-message">{errors.rating}</p>
					{/if}
				</div>

				<div class="feedback-section">
					<label for="feedback" class="section-label">
						Additional Feedback <span class="optional">(optional)</span>
					</label>
					<p class="section-description">
						Share your thoughts about the swap to help build trust in our community.
					</p>
					
					<textarea
						id="feedback"
						bind:value={feedback}
						on:input={clearFeedbackError}
						placeholder="The book was exactly as described and arrived quickly. Great communication throughout the process!"
						rows="4"
						maxlength="1000"
						class="feedback-input"
						disabled={isSubmitting}
					></textarea>
					
					<div class="character-count">
						{feedback.length}/1000 characters
					</div>

					{#if errors.feedback}
						<p class="error-message">{errors.feedback}</p>
					{/if}
				</div>

				<div class="form-actions">
					<button 
						type="button" 
						class="cancel-button" 
						on:click={handleCancel}
						disabled={isSubmitting}
					>
						Cancel
					</button>
					<button 
						type="submit" 
						class="submit-button"
						disabled={isSubmitting || rating === 0}
					>
						{#if isSubmitting}
							<svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Completing...
						{:else}
							Complete Swap
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>

<style>
	.completion-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		padding: 1rem;
	}

	.completion-modal {
		background: white;
		border-radius: 16px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		width: 100%;
		max-width: 600px;
		max-height: 90vh;
		overflow: hidden;
		position: relative;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
		margin: 0;
	}

	.close-button {
		background: none;
		border: none;
		color: #6b7280;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.close-button:hover:not(:disabled) {
		background: #f3f4f6;
		color: #374151;
	}

	.close-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.modal-content {
		padding: 2rem;
		overflow-y: auto;
		max-height: calc(90vh - 80px);
	}

	.swap-info {
		margin-bottom: 2rem;
	}

	.book-info {
		display: flex;
		gap: 1rem;
		align-items: center;
		background: #f9fafb;
		border-radius: 12px;
		padding: 1.5rem;
		border: 1px solid #e5e7eb;
	}

	.book-cover {
		flex-shrink: 0;
		width: 60px;
	}

	.cover-image {
		width: 100%;
		height: auto;
		border-radius: 6px;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	.cover-placeholder {
		width: 60px;
		height: 80px;
		background: #e5e7eb;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px dashed #d1d5db;
	}

	.book-details {
		flex: 1;
		min-width: 0;
	}

	.book-title {
		font-weight: 600;
		color: #111827;
		margin-bottom: 0.25rem;
		line-height: 1.3;
	}

	.book-authors {
		color: #6b7280;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
	}

	.swap-partner {
		color: #374151;
		font-size: 0.875rem;
	}

	.partner-name {
		font-weight: 500;
		color: #111827;
	}

	.completion-form {
		space-y: 2rem;
	}

	.rating-section,
	.feedback-section {
		margin-bottom: 2rem;
	}

	.section-label {
		display: block;
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.5rem;
		font-size: 1rem;
	}

	.required {
		color: #dc2626;
	}

	.optional {
		color: #6b7280;
		font-weight: 400;
	}

	.section-description {
		color: #6b7280;
		font-size: 0.875rem;
		margin-bottom: 1rem;
		line-height: 1.4;
	}

	.rating-input {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.5rem;
	}

	.star-button {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.star-button:hover:not(:disabled) {
		transform: scale(1.1);
	}

	.star-button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.star-button.filled {
		color: #fbbf24;
	}

	.star-button.empty {
		color: #d1d5db;
	}

	.star-button.empty:hover:not(:disabled) {
		color: #f59e0b;
	}

	.rating-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 0.5rem;
	}

	.rating-label {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.feedback-input {
		width: 100%;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		padding: 0.875rem;
		font-size: 0.875rem;
		line-height: 1.5;
		resize: vertical;
		min-height: 100px;
		font-family: inherit;
	}

	.feedback-input:focus {
		outline: none;
		border-color: #4f46e5;
		ring: 2px solid rgba(79, 70, 229, 0.2);
	}

	.feedback-input:disabled {
		background: #f9fafb;
		color: #6b7280;
		cursor: not-allowed;
	}

	.character-count {
		text-align: right;
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.5rem;
	}

	.error-message {
		color: #dc2626;
		font-size: 0.875rem;
		margin-top: 0.5rem;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.cancel-button {
		background: white;
		border: 1px solid #d1d5db;
		color: #374151;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.cancel-button:hover:not(:disabled) {
		background: #f9fafb;
		border-color: #9ca3af;
	}

	.cancel-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-button {
		background: #4f46e5;
		border: 1px solid #4f46e5;
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
	}

	.submit-button:hover:not(:disabled) {
		background: #4338ca;
		border-color: #4338ca;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	@media (max-width: 640px) {
		.completion-modal {
			margin: 1rem;
		}

		.modal-content {
			padding: 1rem;
		}

		.book-info {
			padding: 1rem;
		}

		.form-actions {
			flex-direction: column-reverse;
		}

		.form-actions button {
			width: 100%;
		}
	}
</style>