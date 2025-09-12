<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import GoogleBookSearch from './GoogleBookSearch.svelte';
	import { bookStore, booksError } from '$lib/stores/books';
	import { validateBookInput } from '$lib/validation/book';
	import { getConditionOptions } from '$lib/validation/book';
	import { BookCondition } from '$lib/types/book';
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
		condition: BookCondition.GOOD,
		genre: '',
		description: '',
		google_volume_id: ''
	};

	// Predefined genre options (sorted alphabetically)
	const genreOptions = [
		'Art & Design',
		'Biography',
		'Business',
		'Children\'s Books',
		'Comedy/Humor',
		'Cooking',
		'Drama',
		'Fiction',
		'Health & Wellness',
		'History',
		'Horror',
		'Mystery/Thriller',
		'Non-Fiction',
		'Philosophy',
		'Poetry',
		'Politics',
		'Religion & Spirituality',
		'Romance',
		'Science & Nature',
		'Science Fiction',
		'Self-Help',
		'Sports',
		'Travel',
		'Young Adult'
	];

	let selectedGenres: string[] = [];

	// Update formData.genre when selectedGenres changes
	$: formData.genre = selectedGenres.join(', ');

	function toggleGenre(genre: string) {
		if (selectedGenres.includes(genre)) {
			selectedGenres = selectedGenres.filter(g => g !== genre);
		} else {
			selectedGenres = [...selectedGenres, genre];
		}
	}

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
					if (!$auth.user) {
						goto('/auth/login?redirectTo=/app/books');
						return;
					}
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
			google_volume_id: extracted.google_volume_id,
			genre: extracted.genre || formData.genre
		};

		// Parse and set genres for multi-select
		if (extracted.genre) {
			const extractedGenres = extracted.genre.split(',').map((g: string) => g.trim());
			selectedGenres = extractedGenres.filter((g: string) => genreOptions.includes(g));
		}
		
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
			if (!$auth.user) {
				goto('/auth/login?redirectTo=/app/books');
				return;
			}
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
				condition: BookCondition.GOOD,
				genre: '',
				description: '',
				google_volume_id: ''
			};
			searchValue = '';
		}
	}
</script>

<div class="form-container">
	<div class="form-header">
		<div class="form-header-content">
			<h3 class="form-title">Book Details</h3>
			<button type="button" on:click={toggleManualEntry} class="toggle-btn">
				{isManualEntry ? '🔍 Search Google Books' : '✏️ Enter Manually'}
			</button>
		</div>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="form-content">
		{#if !isManualEntry}
			<div class="field-group full-width">
				<label class="field-label">Search Google Books</label>
				<GoogleBookSearch
					bind:value={searchValue}
					on:select={handleGoogleBookSelect}
					placeholder="Search by title, author, or ISBN..."
				/>
			</div>
		{/if}

		<div class="form-grid">
			<div class="field-group full-width">
				<label for="title" class="field-label">Title *</label>
				<input
					type="text"
					id="title"
					bind:value={formData.title}
					class="form-input"
					placeholder="Enter book title"
					required
				/>
				{#if errors.title}
					<p class="field-error">{errors.title}</p>
				{/if}
			</div>

			<div class="field-group full-width">
				<label class="field-label">Authors *</label>
				{#each formData.authors as author, index}
					<div class="author-input-group">
						<input
							type="text"
							bind:value={formData.authors[index]}
							class="form-input"
							placeholder="Enter author name"
							required
						/>
						{#if formData.authors.length > 1}
							<button
								type="button"
								on:click={() => removeAuthorField(index)}
								class="remove-author-btn"
							>
								<svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
								</svg>
							</button>
						{/if}
					</div>
				{/each}
				<button type="button" on:click={addAuthorField} class="add-author-btn">
					+ Add another author
				</button>
				{#if errors.authors}
					<p class="field-error">{errors.authors}</p>
				{/if}
			</div>

			<div class="field-group">
				<label for="isbn" class="field-label">ISBN</label>
				<input
					type="text"
					id="isbn"
					bind:value={formData.isbn}
					class="form-input"
					placeholder="ISBN-10 or ISBN-13"
				/>
				{#if errors.isbn}
					<p class="field-error">{errors.isbn}</p>
				{/if}
			</div>

			<div class="field-group">
				<label for="condition" class="field-label">Condition *</label>
				<select id="condition" bind:value={formData.condition} class="form-select" required>
					{#each conditionOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
				{#if errors.condition}
					<p class="field-error">{errors.condition}</p>
				{/if}
			</div>

			<div class="field-group full-width">
				<label class="field-label">Genres</label>
				<div class="genre-selector">
					<div class="selected-genres">
						{#if selectedGenres.length === 0}
							<span class="no-genres">No genres selected</span>
						{:else}
							{#each selectedGenres as genre}
								<span class="selected-genre">
									{genre}
									<button
										type="button"
										class="remove-genre"
										on:click={() => toggleGenre(genre)}
										aria-label="Remove {genre}"
									>
										×
									</button>
								</span>
							{/each}
						{/if}
					</div>
					<div class="genre-options">
						{#each genreOptions as genre}
							<button
								type="button"
								class="genre-option"
								class:selected={selectedGenres.includes(genre)}
								on:click={() => toggleGenre(genre)}
							>
								{genre}
							</button>
						{/each}
					</div>
				</div>
			</div>

		</div>

		<div class="field-group full-width">
			<label for="description" class="field-label">Description</label>
			<textarea
				id="description"
				rows="4"
				bind:value={formData.description}
				class="form-textarea"
				placeholder="Add your personal notes or a book description..."
			></textarea>
			{#if errors.description}
				<p class="field-error">{errors.description}</p>
			{/if}
			<p class="character-count">
				{formData.description?.length || 0}/2000 characters
			</p>
		</div>

		{#if $booksError}
			<div class="error-message">
				<div class="error-content">
					<svg class="error-icon" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
					</svg>
					<div class="error-text">
						<h3 class="error-title">Error</h3>
						<p class="error-detail">{$booksError}</p>
					</div>
				</div>
			</div>
		{/if}

		<div class="form-actions">
			<button type="button" on:click={handleCancel} class="btn-cancel" disabled={saving}>
				Cancel
			</button>
			<button type="submit" class="btn-submit" disabled={saving}>
				{#if saving}
					<div class="btn-loading">
						<div class="loading-spinner"></div>
						Adding Book...
					</div>
				{:else}
					<svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
					</svg>
					Add Book
				{/if}
			</button>
		</div>
	</form>
</div>

<style>
	.form-container {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.form-header {
		background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
		border-bottom: 1px solid #e2e8f0;
		padding: 1.25rem 1.5rem;
	}

	.form-header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	@media (max-width: 640px) {
		.form-header-content {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	.form-title {
		color: #2d3748;
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
	}

	.toggle-btn {
		background: #8B2635;
		color: #F5F5DC;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.toggle-btn:hover {
		background: #722F37;
		transform: translateY(-1px);
	}

	.form-content {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}


	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	@media (max-width: 640px) {
		.form-grid {
			grid-template-columns: 1fr;
		}
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field-group.full-width {
		grid-column: 1 / -1;
	}

	.field-label {
		color: #374151;
		font-size: 0.95rem;
		font-weight: 600;
		margin: 0;
	}

	.form-input, .form-select {
		padding: 0.75rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #f8f9fa;
		font-size: 0.95rem;
		color: #374151;
		transition: all 0.2s ease;
		width: 100%;
		box-sizing: border-box;
	}

	.form-input:focus, .form-select:focus {
		outline: none;
		border-color: #8B2635;
		background: white;
		box-shadow: 0 0 0 3px rgba(139, 38, 53, 0.1);
	}

	.form-input:hover, .form-select:hover {
		background: #f1f3f4;
	}

	.form-textarea {
		padding: 0.75rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #f8f9fa;
		font-size: 0.95rem;
		color: #374151;
		transition: all 0.2s ease;
		width: 100%;
		box-sizing: border-box;
		resize: vertical;
		min-height: 100px;
		font-family: inherit;
	}

	.form-textarea:focus {
		outline: none;
		border-color: #8B2635;
		background: white;
		box-shadow: 0 0 0 3px rgba(139, 38, 53, 0.1);
	}

	.form-textarea:hover {
		background: #f1f3f4;
	}

	.author-input-group {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}

	.remove-author-btn {
		background: #fee;
		color: #dc2626;
		border: 1px solid #fecaca;
		padding: 0.75rem;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.remove-author-btn:hover {
		background: #fecaca;
		border-color: #f87171;
	}

	.add-author-btn {
		background: none;
		color: #8B2635;
		border: 1px solid #e2e8f0;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-top: 0.25rem;
	}

	.add-author-btn:hover {
		background: #f8f9fa;
		border-color: #8B2635;
	}

	.field-error {
		color: #dc2626;
		font-size: 0.85rem;
		margin: 0;
	}

	.field-hint {
		color: #6b7280;
		font-size: 0.85rem;
		margin: 0;
		line-height: 1.4;
	}

	.character-count {
		color: #9ca3af;
		font-size: 0.8rem;
		text-align: right;
		margin: 0;
	}

	/* Genre Selector */
	.genre-selector {
		background: #f8f9fa;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		padding: 1rem;
	}

	.selected-genres {
		margin-bottom: 1rem;
		min-height: 2.5rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.no-genres {
		color: #9ca3af;
		font-style: italic;
		font-size: 0.9rem;
	}

	.selected-genre {
		display: inline-flex;
		align-items: center;
		background: #8B2635;
		color: #F5F5DC;
		padding: 0.375rem 0.75rem;
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 500;
		gap: 0.5rem;
	}

	.remove-genre {
		background: none;
		border: none;
		color: #F5F5DC;
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
		padding: 0;
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: all 0.2s ease;
	}

	.remove-genre:hover {
		background: rgba(245, 245, 220, 0.2);
	}

	.genre-options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.5rem;
		max-height: 200px;
		overflow-y: auto;
		border-top: 1px solid #e2e8f0;
		padding-top: 1rem;
	}

	.genre-option {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		background: white;
		color: #374151;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
	}

	.genre-option:hover {
		border-color: #8B2635;
		background: #f8f9fa;
	}

	.genre-option.selected {
		background: #8B2635;
		border-color: #8B2635;
		color: #F5F5DC;
		font-weight: 500;
	}

	.error-message {
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		padding: 1rem;
	}

	.error-content {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.error-icon {
		width: 20px;
		height: 20px;
		color: #dc2626;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.error-text {
		flex: 1;
	}

	.error-title {
		color: #991b1b;
		font-size: 0.9rem;
		font-weight: 600;
		margin: 0 0 0.25rem 0;
	}

	.error-detail {
		color: #b91c1c;
		font-size: 0.85rem;
		margin: 0;
		line-height: 1.4;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		padding-top: 1.5rem;
		border-top: 1px solid #e2e8f0;
	}

	@media (max-width: 640px) {
		.form-actions {
			flex-direction: column-reverse;
		}
	}

	.btn-cancel {
		background: #f8f9fa;
		color: #6b7280;
		border: 1px solid #e2e8f0;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-cancel:hover:not(:disabled) {
		background: #f1f3f4;
		border-color: #d1d5db;
		color: #374151;
	}

	.btn-cancel:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-submit {
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 12px rgba(139, 38, 53, 0.3);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-submit:hover:not(:disabled) {
		background: linear-gradient(135deg, #722F37 0%, #8B2635 100%);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(139, 38, 53, 0.4);
	}

	.btn-submit:disabled {
		opacity: 0.7;
		cursor: not-allowed;
		transform: none;
	}

	.btn-icon {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	.btn-loading {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>