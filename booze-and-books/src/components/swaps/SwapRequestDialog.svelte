<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { swapStore } from '$lib/stores/swaps';
	import { validateSwapRequestInput } from '$lib/validation/swap';
	import type { BookWithOwner } from '$lib/types/book';
	import type { SwapRequestInput } from '$lib/types/swap';

	export let book: BookWithOwner;
	export let isOpen = false;

	const dispatch = createEventDispatcher<{
		close: void;
		success: { message: string };
	}>();

	let message = '';
	let isLoading = false;
	let errors: Record<string, string> = {};

	async function handleSubmit() {
		isLoading = true;
		errors = {};

		const input: SwapRequestInput = {
			book_id: book.id,
			message: message.trim() || null
		};

		// Validate input
		const validation = validateSwapRequestInput(input);
		if (!validation.success) {
			errors = validation.errors;
			isLoading = false;
			return;
		}

		try {
			const result = await swapStore.createSwapRequest(input);
			if (result) {
				dispatch('success', {
					message: `Swap request sent to ${book.profile.username || book.profile.full_name || 'book owner'}!`
				});
				handleClose();
			}
		} catch (error) {
			console.error('Error creating swap request:', error);
		} finally {
			isLoading = false;
		}
	}

	function handleClose() {
		message = '';
		errors = {};
		isLoading = false;
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<!-- Modal backdrop -->
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
		on:click={handleClose}
		on:keydown={handleKeydown}
		role="button"
		tabindex="0"
	>
		<!-- Modal content -->
		<div 
			class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
			on:click|stopPropagation
			role="dialog"
			aria-labelledby="swap-dialog-title"
			aria-describedby="swap-dialog-description"
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<h2 id="swap-dialog-title" class="text-lg font-semibold text-gray-900">
						Request Book Swap
					</h2>
					<button
						type="button"
						class="text-gray-400 hover:text-gray-600 transition-colors"
						on:click={handleClose}
						aria-label="Close dialog"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Book info -->
			<div class="px-6 py-4 border-b border-gray-100">
				<div class="flex items-start space-x-3">
					{#if book.thumbnail_url}
						<img
							src={book.thumbnail_url}
							alt="{book.title} cover"
							class="w-16 h-24 object-cover rounded shadow-sm"
						/>
					{:else}
						<div class="w-16 h-24 bg-gray-200 rounded flex items-center justify-center">
							<svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
								<path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
							</svg>
						</div>
					{/if}
					<div class="flex-1">
						<h3 class="font-medium text-gray-900">{book.title}</h3>
						<p class="text-sm text-gray-600">by {book.authors.join(', ')}</p>
						<div class="mt-2 flex items-center text-xs text-gray-500">
							<span>Owner: {book.profile.username || book.profile.full_name || 'Unknown'}</span>
							<span class="mx-2">•</span>
							<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
								{book.condition}
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Form -->
			<form on:submit|preventDefault={handleSubmit} class="px-6 py-4">
				<div id="swap-dialog-description" class="mb-4">
					<p class="text-sm text-gray-600">
						Send a message to the book owner to request a swap. Be polite and explain what you're looking for!
					</p>
				</div>

				<div class="mb-4">
					<label for="message" class="block text-sm font-medium text-gray-700 mb-2">
						Message (Optional)
					</label>
					<textarea
						id="message"
						bind:value={message}
						placeholder="Hi! I'm interested in swapping for this book. I have..."
						rows="4"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
						class:border-red-300={errors.message}
						disabled={isLoading}
					></textarea>
					{#if errors.message}
						<p class="mt-1 text-sm text-red-600">{errors.message}</p>
					{/if}
				</div>

				{#if errors.book_id}
					<div class="mb-4">
						<p class="text-sm text-red-600">{errors.book_id}</p>
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex justify-end space-x-3 pt-4 border-t border-gray-100">
					<button
						type="button"
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
						on:click={handleClose}
						disabled={isLoading}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						disabled={isLoading}
					>
						{#if isLoading}
							<div class="flex items-center">
								<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Sending...
							</div>
						{:else}
							Send Request
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}