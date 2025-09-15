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

	// Predefined genre options (same as BookAddForm)
	const genreOptions = [
		'Fiction',
		'Non-Fiction',
		'Mystery/Thriller',
		'Science Fiction',
		'Fantasy',
		'Romance',
		'Historical Fiction',
		'Biography',
		'Self-Help',
		'Business',
		'Health & Wellness',
		'Cooking',
		'Travel',
		'Art & Design',
		'Science & Nature',
		'Philosophy',
		'Religion & Spirituality',
		'Poetry',
		'Drama',
		'Children\'s Books',
		'Young Adult',
		'Horror',
		'Comedy/Humor',
		'Sports',
		'Politics',
		'History'
	];

	// Parse existing genres into selectedGenres array
	let selectedGenres: string[] = book.genre ? book.genre.split(',').map(g => g.trim()).filter(g => g.length > 0) : [];

	let formData: BookUpdate = {
		condition: book.condition,
		genre: book.genre || '',
		description: book.description || ''
	};

	// Update formData.genre when selectedGenres changes
	$: formData.genre = selectedGenres.join(', ');

	let saving = false;
	let errors: Record<string, string> = {};

	let conditionOptions: Array<{label: string; value: string}> = [];
	$: conditionOptions = getConditionOptions();

	function toggleGenre(genre: string) {
		if (selectedGenres.includes(genre)) {
			selectedGenres = selectedGenres.filter(g => g !== genre);
		} else {
			selectedGenres = [...selectedGenres, genre];
		}
	}

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
		selectedGenres = book.genre ? book.genre.split(',').map(g => g.trim()).filter(g => g.length > 0) : [];
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

<div class="edit-form-container">
	<div class="form-header">
		<h3 class="form-title">Edit Book</h3>
		<p class="form-subtitle">
			{book.title} by {book.authors.join(', ')}
		</p>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="form-content">
		<!-- Read-only book info -->
		<div class="book-info-section">
			<h4 class="info-title">Book Information</h4>
			<div class="info-content">
				<p><span class="info-label">Title:</span> {book.title}</p>
				<p><span class="info-label">Authors:</span> {book.authors.join(', ')}</p>
				{#if book.isbn}
					<p><span class="info-label">ISBN:</span> {book.isbn}</p>
				{/if}
			</div>
		</div>

		<!-- Editable fields -->
		<div class="fields-grid">
			<div class="field-group">
				<label for="condition" class="field-label">Condition *</label>
				<select
					id="condition"
					bind:value={formData.condition}
					class="field-select"
					required
				>
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
				{#if errors.genre}
					<p class="field-error">{errors.genre}</p>
				{/if}
			</div>
		</div>

		<div class="field-group full-width">
			<label for="description" class="field-label">Personal Notes</label>
			<textarea
				id="description"
				rows="4"
				bind:value={formData.description}
				class="field-textarea"
				placeholder="Add your personal notes about this book..."
			></textarea>
			{#if errors.description}
				<p class="field-error">{errors.description}</p>
			{/if}
			<p class="char-counter">
				{formData.description?.length || 0}/2000 characters
			</p>
		</div>

		{#if $booksError}
			<div class="error-message">
				<div class="error-content">
					<svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="error-text">{$booksError}</p>
				</div>
			</div>
		{/if}

		<div class="form-actions">
			<button
				type="button"
				on:click={handleCancel}
				class="btn-cancel"
				disabled={saving}
			>
				Cancel
			</button>
			<button
				type="submit"
				class="btn-save"
				disabled={saving}
			>
				{saving ? 'Saving...' : 'Save Changes'}
			</button>
		</div>
	</form>
</div>

<style>
	.edit-form-container {
		background: white;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.form-header {
		padding: 1.5rem 1.5rem 1rem 1.5rem;
		border-bottom: 1px solid #e2e8f0;
		background: #f8f9fa;
	}

	.form-title {
		color: #2d3748;
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
	}

	.form-subtitle {
		color: #718096;
		font-size: 0.9rem;
		margin: 0;
	}

	.form-content {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.book-info-section {
		background: #f8f9fa;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 1rem;
	}

	.info-title {
		color: #2d3748;
		font-size: 0.95rem;
		font-weight: 600;
		margin: 0 0 0.75rem 0;
	}

	.info-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.info-content p {
		color: #4a5568;
		font-size: 0.85rem;
		margin: 0;
		line-height: 1.4;
	}

	.info-label {
		font-weight: 600;
		color: #2d3748;
	}

	.fields-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	@media (max-width: 640px) {
		.fields-grid {
			grid-template-columns: 1fr;
		}
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field-group.full-width {
		grid-column: span 2;
	}

	@media (max-width: 640px) {
		.field-group.full-width {
			grid-column: span 1;
		}
	}

	.field-label {
		color: #2d3748;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.field-input,
	.field-select,
	.field-textarea {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.9rem;
		background: white;
		transition: all 0.2s ease;
	}

	.field-input:focus,
	.field-select:focus,
	.field-textarea:focus {
		outline: none;
		border-color: #8B2635;
		box-shadow: 0 0 0 3px rgba(139, 38, 53, 0.1);
	}

	.field-textarea {
		resize: vertical;
		min-height: 4rem;
		font-family: inherit;
	}

	.field-error {
		color: #dc2626;
		font-size: 0.8rem;
		font-weight: 500;
		margin: 0;
	}

	.char-counter {
		color: #718096;
		font-size: 0.75rem;
		margin: 0;
		align-self: flex-end;
	}

	.error-message {
		background: #fed7d7;
		border: 1px solid #feb2b2;
		border-radius: 8px;
		padding: 1rem;
	}

	.error-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.error-icon {
		width: 20px;
		height: 20px;
		color: #c53030;
		flex-shrink: 0;
	}

	.error-text {
		color: #c53030;
		font-weight: 500;
		margin: 0;
		font-size: 0.9rem;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding-top: 1rem;
		border-top: 1px solid #e2e8f0;
	}

	.btn-cancel {
		padding: 0.75rem 1.5rem;
		background: white;
		color: #4a5568;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-cancel:hover:not(:disabled) {
		background: #f8f9fa;
		border-color: #8B2635;
		color: #8B2635;
	}

	.btn-cancel:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-save {
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		border: none;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 12px rgba(139, 38, 53, 0.3);
	}

	.btn-save:hover:not(:disabled) {
		background: linear-gradient(135deg, #722F37 0%, #8B2635 100%);
		transform: translateY(-1px);
		box-shadow: 0 6px 20px rgba(139, 38, 53, 0.4);
	}

	.btn-save:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: 0 4px 12px rgba(139, 38, 53, 0.2);
	}

	/* Genre Selector Styles (same as BookAddForm) */
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
		display: flex;
		align-items: center;
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		padding: 0.375rem 0.75rem;
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 500;
		gap: 0.5rem;
		box-shadow: 0 2px 4px rgba(139, 38, 53, 0.2);
	}

	.remove-genre {
		background: none;
		border: none;
		color: #F5F5DC;
		font-size: 1.1rem;
		line-height: 1;
		cursor: pointer;
		padding: 0;
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: background 0.2s;
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
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		text-align: center;
	}

	.genre-option:hover {
		border-color: #8B2635;
		color: #8B2635;
		background: #fef7f7;
	}

	.genre-option.selected {
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		border-color: #8B2635;
		box-shadow: 0 2px 4px rgba(139, 38, 53, 0.2);
	}

	.genre-option.selected:hover {
		background: linear-gradient(135deg, #722F37 0%, #8B2635 100%);
		color: #F5F5DC;
	}
</style>
