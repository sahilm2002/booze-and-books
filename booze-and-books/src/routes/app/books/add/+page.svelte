<script lang="ts">
	import BookAddForm from '../../../../components/books/BookAddForm.svelte';
</script>

<svelte:head>
	<title>Add Book - Booze & Books</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Breadcrumb -->
	<nav class="flex mb-8" aria-label="Breadcrumb">
		<ol class="inline-flex items-center space-x-1 md:space-x-3">
			<li class="inline-flex items-center">
				<a 
					href="/app" 
					class="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
				>
					<svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
						<path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
					</svg>
					Dashboard
				</a>
			</li>
			<li>
				<div class="flex items-center">
					<svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
					</svg>
					<a 
						href="/app/books" 
						class="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2"
					>
						My Books
					</a>
				</div>
			</li>
			<li>
				<div class="flex items-center">
					<svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
					</svg>
					<span class="ml-1 text-sm font-medium text-gray-500 md:ml-2">Add Book</span>
				</div>
			</li>
		</ol>
	</nav>

	<!-- Main Content -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Add New Book</h1>
		<p class="mt-2 text-gray-600">
			Search Google Books for automatic details or enter book information manually.
		</p>
	</div>

	<BookAddForm />
</div>