<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { bookStore, booksError } from '$lib/stores/books';
	import { validateBookUpdate } from '$lib/validation/book';
	import { getConditionOptions } from '$lib/validation/book';
	import type { Book, BookUpdate } from '$lib/types/book';

	export let book: Book;
	export let onSave: (() => void) | undefined = undefined;
	export let onCancel: (() => void) | undefined = undefined;

	const dispatch = createEventDispatcher<{
		save: { book: Book };
		cancel: void;
	}>();

	let formData: BookUpdate = {
		condition: book.condition,
		genre: book.genre || '',
		description: book.description || ''
	};

	let saving = false;
	let errors: Record<string, string> = {};

	$: conditionOptions = getConditionOptions();

	function validateForm(): boolean {
		const validation = validateBookUpdate(formData);
		if (validation.success) {
			errors = {};
			return true;
		} else {
			errors = validation.errors;
			return false;
		}
	}

	async function handleSubmit() {
		if (!validateForm()) return;

		saving = true;
		
		try {
			const success = await bookStore.updateBook(book.id, formData);
			
			if (success) {
				dispatch('save', { book });
				if (onSave) {
					onSave();
				}
			}
		} catch (error) {
			console.error('Failed to update book:', error);
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		// Reset form data
		formData = {
			condition: book.condition,
			genre: book.genre || '',
			description: book.description || ''
		};
		errors = {};
		
		dispatch('cancel');
		if (onCancel) {
			onCancel();
		}
	}
</script>

<div class="bg-white shadow rounded-lg overflow-hidden">
	<div class="px-6 py-4 border-b border-gray-200">
		<h3 class="text-lg font-medium text-gray-900">Edit Book</h3>
		<p class="mt-1 text-sm text-gray-600">
			{book.title} by {book.authors.join(', ')}
		</p>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="p-6 space-y-6">
		<!-- Read-only book info -->
		<div class="bg-gray-50 p-4 rounded-md">
			<h4 class="font-medium text-gray-900 mb-2">Book Information</h4>
			<div class="text-sm text-gray-600 space-y-1">
				<p><span class="font-medium">Title:</span> {book.title}</p>
				<p><span class="font-medium">Authors:</span> {book.authors.join(', ')}</p>
				{#if book.isbn}
					<p><span class="font-medium">ISBN:</span> {book.isbn}</p>
				{/if}
			</div>
		</div>

		<!-- Editable fields -->
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
			<div>
				<label for="condition" class="block text-sm font-medium text-gray-700">Condition *</label>
				<select
					id="condition"
					bind:value={formData.condition}
					class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
					required
				>
					{#each conditionOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
				{#if errors.condition}
					<p class="mt-1 text-sm text-red-600">{errors.condition}</p>
				{/if}
			</div>

			<div>
				<label for="genre" class="block text-sm font-medium text-gray-700">Genre</label>
				<input
					type="text"
					id="genre"
					bind:value={formData.genre}
					class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
					placeholder="e.g., Fiction, Science Fiction, Biography"
				/>
				{#if errors.genre}
					<p class="mt-1 text-sm text-red-600">{errors.genre}</p>
				{/if}
			</div>
		</div>

		<div>
			<label for="description" class="block text-sm font-medium text-gray-700">Personal Notes</label>
			<textarea
				id="description"
				rows="4"
				bind:value={formData.description}
				class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
				placeholder="Add your personal notes about this book..."
			></textarea>
			{#if errors.description}
				<p class="mt-1 text-sm text-red-600">{errors.description}</p>
			{/if}
			<p class="mt-1 text-xs text-gray-500">
				{formData.description?.length || 0}/2000 characters
			</p>
		</div>

		{#if $booksError}
			<div class="rounded-md bg-red-50 p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
						</svg>
					</div>
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">Error</h3>
						<p class="mt-1 text-sm text-red-700">{$booksError}</p>
					</div>
				</div>
			</div>
		{/if}

		<div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
			<button
				type="button"
				on:click={handleCancel}
				class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				disabled={saving}
			>
				Cancel
			</button>
			<button
				type="submit"
				class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
				disabled={saving}
			>
				{#if saving}
					<div class="flex items-center">
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
						Saving...
					</div>
				{:else}
					Save Changes
				{/if}
			</button>
		</div>
	</form>
</div>