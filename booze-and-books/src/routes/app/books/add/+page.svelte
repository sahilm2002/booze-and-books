<script lang="ts">
	import BookAddForm from '../../../../components/books/BookAddForm.svelte';
</script>

<svelte:head>
	<title>Add Book - Booze & Books</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Main Content -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Add New Book</h1>
		<p class="mt-2 text-gray-600">
			Search Google Books for automatic details or enter book information manually.
		</p>
	</div>

	<BookAddForm />
</div>