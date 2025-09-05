<script lang="ts">
	import BookAddForm from '../../../../components/books/BookAddForm.svelte';
</script>

<svelte:head>
	<title>Add Book - Booze & Books</title>
</svelte:head>

<div class="container">
	<!-- Page Header -->
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title">Add New Book</h1>
			<p class="page-subtitle">
				Search Google Books for automatic details or enter book information manually.
			</p>
		</div>
	</div>

	<BookAddForm />
</div>

<style>
	.container {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem;
	}

	@media (max-width: 640px) {
		.container {
			padding: 1rem;
		}
	}

	.page-header {
		margin-bottom: 2rem;
		text-align: center;
	}

	.header-content {
		max-width: 600px;
		margin: 0 auto;
	}

	.page-title {
		color: #2d3748;
		font-size: 2rem;
		font-weight: 700;
		margin-bottom: 0.75rem;
		line-height: 1.2;
	}

	.page-subtitle {
		color: #718096;
		font-size: 1.1rem;
		line-height: 1.5;
		margin: 0;
	}
</style>