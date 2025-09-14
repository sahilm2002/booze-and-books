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
	let selectedBookPreview: {
		title: string;
		authors: string[];
		thumbnail_url?: string;
		genre?: string;
		description?: string;
		isbn?: string;
	} | null = null;

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
		const { book, extracted } = event.detail;
		
		// Store preview data for the book card
		selectedBookPreview = {
			title: extracted.title,
			authors: extracted.authors,
			thumbnail_url: book.volumeInfo?.imageLinks?.thumbnail,
			genre: extracted.genre,
			description: extracted.description,
			isbn: extracted.isbn
		};
		
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

<div class="form-container card">
	<div class="form-header">
		<div class="form-header-content">
			<h3 class="form-title">Book Details</h3>
			<button type="button" on:click={toggleManualEntry} class="toggle-btn">
				{#if isManualEntry}
					<svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
					</svg>
					Search Google Books
				{:else}
					<svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
					</svg>
					Enter Manually
				{/if}
			</button>
		</div>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="form-content">
		{#if !isManualEntry}
			<div class="search-section">
				<h4 class="section-title">Search Google Books</h4>
				<div class="search-input-wrapper">
					<GoogleBookSearch
						bind:value={searchValue}
						on:select={handleGoogleBookSelect}
						placeholder="Search by title, author, or ISBN..."
					/>
				</div>
			</div>
		{/if}

		<!-- Book Preview Card -->
		{#if selectedBookPreview && !isManualEntry}
			<div class="book-preview-section">
				<h4 class="section-title">Selected Book</h4>
				<div class="book-preview-card">
					<div class="book-cover">
						{#if selectedBookPreview.thumbnail_url}
							<img 
								src={selectedBookPreview.thumbnail_url} 
								alt="{selectedBookPreview.title} cover"
								class="cover-image"
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
					
					<div class="book-details">
						<h5 class="book-title">{selectedBookPreview.title}</h5>
						<p class="book-authors">by {selectedBookPreview.authors.join(', ')}</p>
						{#if selectedBookPreview.genre}
							<span class="book-genre">{selectedBookPreview.genre}</span>
						{/if}
						{#if selectedBookPreview.isbn}
							<p class="book-isbn">ISBN: {selectedBookPreview.isbn}</p>
						{/if}
						{#if selectedBookPreview.description}
							<p class="book-description">{selectedBookPreview.description.length > 200 ? selectedBookPreview.description.substring(0, 200) + '...' : selectedBookPreview.description}</p>
						{/if}
					</div>

					<button
						type="button"
						class="remove-selection-btn"
						on:click={() => {
							selectedBookPreview = null;
							formData = {
								title: '',
								authors: [''],
								isbn: '',
								condition: BookCondition.GOOD,
								genre: '',
								description: '',
								google_volume_id: ''
							};
							selectedGenres = [];
							searchValue = '';
						}}
						aria-label="Remove selected book"
					>
						<svg class="remove-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
						</svg>
					</button>
				</div>
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
				<div class="genre-section">
					<div class="selected-genres-display">
						{#if selectedGenres.length === 0}
							<span class="no-genres-text">No genres selected - choose from options below</span>
						{:else}
							<div class="selected-genres-tags">
								{#each selectedGenres as genre}
									<span class="selected-genre-tag">
										{genre}
										<button
											type="button"
											class="remove-genre-btn"
											on:click={() => toggleGenre(genre)}
											aria-label="Remove {genre}"
										>
											<svg class="remove-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
											</svg>
										</button>
									</span>
								{/each}
							</div>
						{/if}
					</div>
					<div class="genre-options-grid">
						{#each genreOptions as genre}
							<button
								type="button"
								class="genre-option-tag"
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
		background: white;
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
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		border: none;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 12px rgba(139, 38, 53, 0.3);
	}

	.toggle-btn:hover {
		background: linear-gradient(135deg, #722F37 0%, #8B2635 100%);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(139, 38, 53, 0.4);
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

	/* Search Section */
	.search-section {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.section-title {
		color: #2d3748;
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
	}

	.search-input-wrapper {
		max-width: 500px;
	}

	/* Genre Section */
	.genre-section {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.selected-genres-display {
		margin-bottom: 1.5rem;
		min-height: 2.5rem;
		display: flex;
		align-items: center;
	}

	.no-genres-text {
		color: #718096;
		font-size: 0.95rem;
		font-style: italic;
	}

	.selected-genres-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.selected-genre-tag {
		display: inline-flex;
		align-items: center;
		background: #8B2635;
		color: #F5F5DC;
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 500;
		gap: 0.5rem;
	}

	.remove-genre-btn {
		background: none;
		border: none;
		color: #F5F5DC;
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

	.remove-genre-btn:hover {
		background: rgba(245, 245, 220, 0.2);
	}

	.remove-icon {
		width: 12px;
		height: 12px;
	}

	.genre-options-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		border-top: 1px solid #e2e8f0;
		padding-top: 1.5rem;
	}

	.genre-option-tag {
		padding: 0.5rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 20px;
		background: white;
		color: #374151;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.genre-option-tag:hover {
		background: #f8f9fa;
		border-color: #8B2635;
	}

	.genre-option-tag.selected {
		background: #8B2635;
		border-color: #8B2635;
		color: #F5F5DC;
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

	/* Book preview styles */
	.book-preview-section {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 1rem;
		margin-bottom: 1rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06);
	}

	.book-preview-card {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		position: relative;
		padding: 0.75rem;
		border-radius: 12px;
		border: 1px solid #eef2f6;
		background: #fff;
	}

	.book-cover {
		flex-shrink: 0;
		width: 96px;
		height: 128px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
		background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
	}

	.cover-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.cover-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.book-details {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.book-title {
		color: #2d3748;
		font-size: 1rem;
		font-weight: 700;
		margin: 0;
		line-height: 1.2;
		overflow-wrap: break-word;
	}

	.book-authors {
		color: #6b7280;
		font-size: 0.9rem;
		margin: 0;
	}

	.book-genre {
		display: inline-block;
		background: #f1f3f4;
		color: #8B2635;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		margin-top: 0.25rem;
	}

	.book-isbn {
		color: #718096;
		font-size: 0.85rem;
		margin: 0.25rem 0 0 0;
	}

	.book-description {
		color: #4b5563;
		font-size: 0.9rem;
		margin-top: 0.5rem;
	}

	.remove-selection-btn {
		position: absolute;
		top: 8px;
		right: 8px;
		background: none;
		border: none;
		color: #8B2635;
		padding: 0.25rem;
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.remove-selection-btn:hover {
		background: rgba(139, 38, 53, 0.08);
	}
</style>
