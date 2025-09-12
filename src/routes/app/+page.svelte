<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import ProfileCard from '../../components/profile/ProfileCard.svelte';
	import { ProfileService } from '$lib/services/profileService';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>Dashboard - Booze and Books</title>
	<meta name="description" content="Your personal book swap dashboard" />
</svelte:head>

<div class="container">
	<header class="dashboard-header">
		<h1>📚 Your Dashboard</h1>
		{#if $profile}
			<p class="welcome-text">
				Welcome back, <strong>{$profile.full_name || $profile.username || $auth.user?.email}</strong>!
			</p>
		{:else if $auth.user}
			<p class="welcome-text">Welcome back, <strong>{$auth.user.email}</strong>!</p>
		{/if}
	</header>

	<div class="dashboard-content">
		<div class="dashboard-grid">
			<div class="main-content">
				<section class="quick-stats">
					<div class="stat-card">
						<h3>Your Books</h3>
						<p class="stat-number">{data.bookCount || 0}</p>
						<p class="stat-label">Books listed</p>
					</div>
					
					<div class="stat-card">
						<h3>Completed Swaps</h3>
						<p class="stat-number">{data.swapStatistics.total_completed || 0}</p>
						<p class="stat-label">Successful swaps</p>
					</div>
					
					<div class="stat-card">
						<h3>Completion Rate</h3>
						<p class="stat-number">{Math.round(data.swapStatistics.completion_rate || 0)}%</p>
						<p class="stat-label">Of all swaps</p>
					</div>
					
					<div class="stat-card">
						<h3>Average Rating</h3>
						{#if data.swapStatistics.average_rating > 0}
							<p class="stat-number">{data.swapStatistics.average_rating.toFixed(1)}</p>
							<p class="stat-label">★ From other users</p>
						{:else}
							<p class="stat-number">--</p>
							<p class="stat-label">No ratings yet</p>
						{/if}
					</div>
				</section>

				<section class="recent-activity">
					<h2>{data.bookCount > 0 ? 'Recent Books' : 'Get Started'}</h2>
					{#if data.bookCount > 0}
						{#if data.recentBooks?.length > 0}
							<div class="recent-books">
								{#each data.recentBooks as book}
									<div class="book-item">
										{#if book.google_volume_id}
											<img 
												src="https://books.google.com/books/content?id={book.google_volume_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api" 
												alt="Cover of {book.title}"
												class="book-cover"
												loading="lazy"
												on:error={(e) => {
													e.currentTarget.style.display = 'none';
													e.currentTarget.nextElementSibling.style.display = 'flex';
												}}
											/>
											<div class="book-cover-placeholder" style="display: none;">
												<svg class="book-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
												</svg>
											</div>
										{:else}
											<div class="book-cover-placeholder">
												<svg class="book-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
												</svg>
											</div>
										{/if}
										<div class="book-details">
											<h4 class="book-title">{book.title}</h4>
											<p class="book-author">by {book.authors.join(', ')}</p>
											<p class="book-date">Added {new Date(book.created_at).toLocaleDateString()}</p>
										</div>
									</div>
								{/each}
							</div>
							<div class="view-all-books">
								<a href="/app/books" class="btn secondary">View My Books</a>
							</div>
						{/if}
					{:else}
						<div class="activity-empty">
							<p>No books yet. Start by adding your first book!</p>
							<div class="action-buttons">
								<button type="button" class="btn primary" on:click={async () => {
									if (!$auth.user) {
										goto('/auth/login?redirectTo=/app/books/add');
										return;
									}
									goto('/app/books/add');
								}}>Add Your First Book</button>
							</div>
						</div>
					{/if}
				</section>
			</div>

			<div class="sidebar">
				<div class="profile-summary">
					<ProfileCard showEditButton={false} />
					<div class="profile-actions">
						<a href="/app/profile" class="btn profile-btn">View Full Profile</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.dashboard-header h1 {
		color: #2d3748;
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.welcome-text {
		color: #718096;
		font-size: 1.1rem;
	}

	.dashboard-content {
		display: grid;
		gap: 2rem;
	}

	.dashboard-grid {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: 2rem;
	}

	@media (max-width: 1024px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
		}

		.sidebar {
			order: -1;
		}
	}

	.main-content {
		display: grid;
		gap: 2rem;
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.profile-summary {
		position: sticky;
		top: 2rem;
	}

	.profile-actions {
		margin-top: 1rem;
		padding: 1rem;
	}

	.profile-btn {
		display: block;
		width: 100%;
		text-align: center;
		text-decoration: none;
		padding: 0.75rem 1rem;
		background: #f7fafc;
		color: #4299e1;
		border-radius: 6px;
		font-weight: 500;
		transition: all 0.2s;
		border: 1px solid #e2e8f0;
	}

	.profile-btn:hover {
		background: #edf2f7;
		border-color: #cbd5e0;
	}

	.quick-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		background: white;
		padding: 1.5rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		text-align: center;
		border: 1px solid #e2e8f0;
	}

	.stat-card h3 {
		color: #4a5568;
		font-size: 1rem;
		margin-bottom: 1rem;
		font-weight: 500;
	}

	.stat-number {
		color: #2d3748;
		font-size: 2rem;
		font-weight: bold;
		margin-bottom: 0.25rem;
	}

	.stat-label {
		color: #718096;
		font-size: 0.9rem;
	}

	.recent-activity {
		background: white;
		padding: 2rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		border: 1px solid #e2e8f0;
	}

	.recent-activity h2 {
		color: #2d3748;
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.activity-empty {
		text-align: center;
		color: #718096;
		padding: 2rem 0;
	}

	.activity-empty p {
		margin-bottom: 2rem;
		font-size: 1.1rem;
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		border: none;
		transition: all 0.2s;
		font-size: 1rem;
	}

	.btn.primary {
		background: #4299e1;
		color: white;
	}

	.btn.primary:hover {
		background: #3182ce;
	}

	.btn.secondary {
		background: white;
		color: #4299e1;
		border: 2px solid #4299e1;
	}

	.btn.secondary:hover {
		background: #f7fafc;
	}

	.recent-books {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.book-item {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
	}

	.book-cover {
		width: 40px;
		height: 56px;
		object-fit: cover;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.book-cover-placeholder {
		width: 40px;
		height: 56px;
		background: #e2e8f0;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.book-icon {
		width: 20px;
		height: 20px;
		color: #718096;
	}

	.book-details {
		flex: 1;
		min-width: 0;
	}

	.book-title {
		color: #2d3748;
		font-weight: 600;
		font-size: 0.95rem;
		margin-bottom: 0.25rem;
		line-height: 1.3;
	}

	.book-author {
		color: #4a5568;
		font-size: 0.85rem;
		margin-bottom: 0.25rem;
	}

	.book-date {
		color: #718096;
		font-size: 0.75rem;
	}

	.view-all-books {
		text-align: center;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e2e8f0;
	}

	.btn {
		display: inline-block;
		text-decoration: none;
	}
</style>