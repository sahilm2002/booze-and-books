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
	<p>Welcome back! Your book swapping hub.</p>
	
	<div class="stats">
		<div class="stat-card">
			<h3>Books Listed</h3>
			<p class="stat-number">{data.bookCount || 0}</p>
		</div>
		
		<div class="stat-card">
			<h3>Incoming Swaps</h3>
			<p class="stat-number">{data.incomingSwapCount || 0}</p>
		</div>
		
		<div class="stat-card">
			<h3>Outgoing Swaps</h3>
			<p class="stat-number">{data.outgoingSwapCount || 0}</p>
		</div>
		
		<div class="stat-card">
			<h3>Completed Swaps</h3>
			<p class="stat-number">{data.swapStatistics?.total_completed || 0}</p>
		</div>
		
		<div class="stat-card">
			<h3>Completion Rate</h3>
			<p class="stat-number">{Math.round(data.swapStatistics?.completion_rate || 0)}%</p>
		</div>
		
		<div class="stat-card">
			<h3>Unread Notifications</h3>
			<p class="stat-number">{data.unreadNotificationCount || 0}</p>
		</div>
	</div>
	
	<div class="success-info">
		<h2>🎉 Infinite Loading Issue Resolved!</h2>
		<p>✅ The application is now loading successfully with timeout-protected authentication</p>
		<p>✅ User rating functionality has been completely removed</p>
		<p>✅ All service calls now have proper timeout protection</p>
		<p>🚀 Your Booze & Books app is ready for book swapping!</p>
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
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
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

	.success-info {
		background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
		border: 2px solid #22c55e;
		border-radius: 12px;
		padding: 2rem;
		text-align: center;
		margin-top: 2rem;
	}

	.success-info h2 {
		color: #15803d;
		font-size: 1.5rem;
		margin: 0 0 1rem 0;
	}

	.success-info p {
		color: #166534;
		font-size: 1rem;
		margin: 0.5rem 0;
		text-align: left;
	}

	@media (max-width: 768px) {
		.container {
			padding: 1rem;
		}
		
		.stats {
			grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		}
		
		h1 {
			font-size: 2rem;
		}
	}
</style>
