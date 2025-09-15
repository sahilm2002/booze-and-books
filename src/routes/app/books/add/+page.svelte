<script lang="ts">
	import BookAddForm from '../../../../components/books/BookAddForm.svelte';
</script>

<svelte:head>
	<title>Add Book - Booze & Books</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Page Header -->
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title">Add New Book</h1>
			<p class="page-subtitle">
				Search Google Books for automatic details or enter book information manually.
			</p>
		</div>
	</div>

	<div class="form-wrapper">
		<BookAddForm />
	</div>
</div>

<style>
	/* Page Header */
	.page-header {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-bottom: 2rem;
		text-align: center;
	}

	.header-content {
		max-width: 600px;
	}

	.page-title {
		color: #2d3748;
		font-size: 2rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		line-height: 1.2;
	}

	.page-subtitle {
		color: #718096;
		font-size: 1rem;
		margin: 0;
	}

	/* Form Wrapper */
	.form-wrapper {
		max-width: 900px;
		margin: 0 auto;
	}

	/* Override Tailwind classes for consistency */
	:global(.max-w-7xl) {
		max-width: 1200px;
	}

	:global(.mx-auto) {
		margin-left: auto;
		margin-right: auto;
	}

	:global(.px-4) {
		padding-left: 1rem;
		padding-right: 1rem;
	}

	:global(.py-8) {
		padding-top: 2rem;
		padding-bottom: 2rem;
	}

	@media (min-width: 640px) {
		:global(.sm\:px-6) {
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}
	}

	@media (min-width: 1024px) {
		:global(.lg\:px-8) {
			padding-left: 2rem;
			padding-right: 2rem;
		}
	}
</style>
