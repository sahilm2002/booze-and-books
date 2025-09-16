<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>Dashboard - Booze and Books</title>
	<meta name="description" content="Your personal book swap dashboard" />
</svelte:head>

<div class="container">
	<h1>📚 Your Dashboard</h1>
	<p>Welcome back! (Minimal debugging mode)</p>
	
	<div class="stats">
		<div class="stat-card">
			<h3>Books Listed</h3>
			<p class="stat-number">{data.bookCount || 0}</p>
		</div>
		
		<div class="stat-card">
			<h3>Completed Swaps</h3>
			<p class="stat-number">{data.swapStatistics?.total_completed || 0}</p>
		</div>
		
		<div class="stat-card">
			<h3>Completion Rate</h3>
			<p class="stat-number">{Math.round(data.swapStatistics?.completion_rate || 0)}%</p>
		</div>
	</div>
	
	<div class="debug-info">
		<h2>Debug Information</h2>
		<p>If you can see this page, the infinite loading issue is resolved!</p>
		<p>Data loaded successfully from server.</p>
	</div>
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		color: #2d3748;
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		text-align: center;
	}

	p {
		color: #718096;
		font-size: 1.1rem;
		margin: 0 0 2rem 0;
		text-align: center;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 1.5rem;
		text-align: center;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.stat-card h3 {
		color: #718096;
		font-size: 0.875rem;
		font-weight: 500;
		margin: 0 0 0.5rem 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-number {
		color: #2d3748;
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0;
		line-height: 1;
	}

	.debug-info {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 8px;
		padding: 1.5rem;
		margin-top: 2rem;
	}

	.debug-info h2 {
		color: #15803d;
		font-size: 1.25rem;
		margin: 0 0 1rem 0;
	}

	.debug-info p {
		color: #166534;
		font-size: 0.95rem;
		margin: 0.5rem 0;
		text-align: left;
	}
</style>
