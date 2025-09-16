<svelte:head>
	<title>Dashboard - Booze and Books</title>
</svelte:head>

<div class="container">
	<h1>📚 Dashboard Test</h1>
	<p>Static page - no server data, no stores, no components</p>
	
	<div class="test-info">
		<h2>Infinite Loading Debug Test</h2>
		<p>✅ If you can see this page, the issue is in server data loading</p>
		<p>❌ If this page still hangs, the issue is in SvelteKit framework or authentication</p>
		<p>🔍 This page uses ZERO server data and ZERO reactive functionality</p>
	</div>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, sans-serif;
	}

	h1 {
		color: #2d3748;
		font-size: 2rem;
		text-align: center;
		margin-bottom: 1rem;
	}

	p {
		color: #718096;
		font-size: 1rem;
		text-align: center;
		margin-bottom: 2rem;
	}

	.test-info {
		background: #f0fdf4;
		border: 2px solid #22c55e;
		border-radius: 8px;
		padding: 2rem;
		text-align: center;
	}

	.test-info h2 {
		color: #15803d;
		font-size: 1.5rem;
		margin: 0 0 1rem 0;
	}

	.test-info p {
		color: #166534;
		font-size: 1rem;
		margin: 0.5rem 0;
		text-align: left;
	}
</style>
