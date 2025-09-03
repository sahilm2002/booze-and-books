<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import GoogleBookSearch from './GoogleBookSearch.svelte';
	import { bookStore, booksError } from '$lib/stores/books';
	import { validateBookInput } from '$lib/validation/book';
	import { getConditionOptions } from '$lib/validation/book';
	import type { BookCondition } from '$lib/types/book';
	import type { BookInput, GoogleBookResult } from '$lib/types/book';

	export let onSave: (() => void) | undefined = undefined;
	export let onCancel: (() => void) | undefined = undefined;

	const dispatch = createEventDispatcher<{
		save: { book: any };
		cancel: void;
	}>();

	let formData: BookInput = {
		title: '',
		authors: [''],
		isbn: '',
		condition: 'GOOD' as BookCondition,
		genre: '',
		description: '',
		thumbnail_url: '',
		google_volume_id: ''
	};

	let saving = false;
	let errors: Record<string, string> = {};
	let searchValue = '';
	let isManualEntry = false;

	$: conditionOptions = getConditionOptions();

	function validateForm(): boolean {
		const validation = validateBookInput(formData);
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
			const book = await bookStore.addBook(formData);
			
			if (book) {
				dispatch('save', { book });
				if (onSave) {
					onSave();
				} else {
					goto('/app/books');
				}
			}
		} catch (error) {
			console.error('Failed to add book:', error);
		} finally {
			saving = false;
		}
	}

	function handleGoogleBookSelect(event: CustomEvent<{ book: GoogleBookResult; extracted: any }>) {
		const { extracted } = event.detail;
		
		formData = {
			...formData,
			title: extracted.title,
			authors: extracted.authors,
			isbn: extracted.isbn,
			description: extracted.description,
			thumbnail_url: extracted.thumbnail_url,
			google_volume_id: extracted.google_volume_id,
			genre: extracted.genre || formData.genre
		};
		
		isManualEntry = false;
	}

	function addAuthorField() {
		formData.authors = [...formData.authors, ''];
	}

	function removeAuthorField(index: number) {
		if (formData.authors.length > 1) {
			formData.authors = formData.authors.filter((_, i) => i !== index);
		}
	}

	function handleCancel() {
		dispatch('cancel');
		if (onCancel) {
			onCancel();
		} else {
			goto('/app/books');
		}
	}

	function toggleManualEntry() {
		isManualEntry = !isManualEntry;
		if (isManualEntry) {
			// Reset form for manual entry
			formData = {
				title: '',
				authors: [''],
				isbn: '',
				condition: 'GOOD' as BookCondition,
				genre: '',
				description: '',
				thumbnail_url: '',
				google_volume_id: ''
			};
			searchValue = '';
		}
	}
</script>

<div class="bg-white shadow rounded-lg overflow-hidden">
	<div class="px-6 py-4 border-b border-gray-200">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-medium text-gray-900">Add New Book</h3>
			<button
				type="button"
				on:click={toggleManualEntry}
				class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
			>
				{isManualEntry ? 'Search Google Books' : 'Enter manually'}
			</button>
		</div>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="p-6 space-y-6">
		{#if !isManualEntry}
			<div>
				<label for="book-search" class="block text-sm font-medium text-gray-700 mb-2">
					Search for a book
				</label>
				<GoogleBookSearch
					bind:value={searchValue}
					on:select={handleGoogleBookSelect}
					placeholder="Search by title, author, or ISBN..."
				/>
				<p class="mt-1 text-xs text-gray-500">
					Search Google Books to automatically fill in book details, or switch to manual entry.
				</p>
			</div>
		{/if}

		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<label for="title" class="block text-sm font-medium text-gray-700">Title *</label>
				<input
					type="text"
					id="title"
					bind:value={formData.title}
					class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
					placeholder="Enter book title"
					required
				/>
				{#if errors.title}
					<p class="mt-1 text-sm text-red-600">{errors.title}</p>
				{/if}
			</div>

			<div class="sm:col-span-2">
				<label class="block text-sm font-medium text-gray-700 mb-2">Authors *</label>
				{#each formData.authors as author, index}
					<div class="flex gap-2 mb-2">
						<input
							type="text"
							bind:value={formData.authors[index]}
							class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							placeholder="Enter author name"
							required
						/>
						{#if formData.authors.length > 1}
							<button
								type="button"
								on:click={() => removeAuthorField(index)}
								class="px-3 py-2 text-red-600 hover:text-red-800 focus:outline-none"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
								</svg>
							</button>
						{/if}
					</div>
				{/each}
				<button
					type="button"
					on:click={addAuthorField}
					class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
				>
					+ Add another author
				</button>
				{#if errors.authors}
					<p class="mt-1 text-sm text-red-600">{errors.authors}</p>
				{/if}
			</div>

			<div>
				<label for="isbn" class="block text-sm font-medium text-gray-700">ISBN</label>
				<input
					type="text"
					id="isbn"
					bind:value={formData.isbn}
					class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
					placeholder="ISBN-10 or ISBN-13"
				/>
				{#if errors.isbn}
					<p class="mt-1 text-sm text-red-600">{errors.isbn}</p>
				{/if}
			</div>

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

			<div class="sm:col-span-2">
				<label for="genre" class="block text-sm font-medium text-gray-700">Genre</label>
				<input
					type="text"
					id="genre"
					bind:value={formData.genre}
					class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
					placeholder="e.g., Fiction, Science Fiction, Biography"
				/>
			</div>

			<div class="sm:col-span-2">
				<label for="thumbnail_url" class="block text-sm font-medium text-gray-700">Cover Image URL</label>
				<input
					type="url"
					id="thumbnail_url"
					bind:value={formData.thumbnail_url}
					class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
					placeholder="https://example.com/book-cover.jpg"
				/>
				{#if errors.thumbnail_url}
					<p class="mt-1 text-sm text-red-600">{errors.thumbnail_url}</p>
				{/if}
			</div>
		</div>

		<div>
			<label for="description" class="block text-sm font-medium text-gray-700">Description</label>
			<textarea
				id="description"
				rows="4"
				bind:value={formData.description}
				class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
				placeholder="Add your personal notes or a book description..."
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
						Adding Book...
					</div>
				{:else}
					Add Book
				{/if}
			</button>
		</div>
	</form>
</div>