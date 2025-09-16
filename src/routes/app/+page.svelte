<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import ProfileCard from '../../components/profile/ProfileCard.svelte';
	import { ProfileService } from '$lib/services/profileService';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;

	function handleImageError(e: Event) {
		const img = e.currentTarget as HTMLImageElement | null;
		if (!img) return;
		try {
			img.style.display = 'none';
			const next = img.nextElementSibling as HTMLElement | null;
			if (next) next.style.display = 'flex';
		} catch (err) {
			// Ignore DOM errors
			console.warn('handleImageError failed', err);
		}
	}
</script>

<svelte:head>
	<title>Dashboard - Booze and Books</title>
	<meta name="description" content="Your personal book swap dashboard" />
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Header -->
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title">📚 Your Dashboard</h1>
			{#if $profile}
				<p class="page-subtitle">
					Welcome back, <strong>{$profile.full_name || $profile.username || $auth.user?.email}</strong>!
				</p>
			{:else if $auth.user}
				<p class="page-subtitle">Welcome back, <strong>{$auth.user.email}</strong>!</p>
			{/if}
		</div>
	</div>

	<div class="dashboard-grid">
		<div class="main-content">
			<!-- Quick Stats -->
			<section class="stats-section card">
				<h2 class="section-title">Your Statistics</h2>
				<div class="stats-grid">
					<div class="stat-card">
						<div class="stat-icon">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
							</svg>
						</div>
						<div class="stat-content">
							<p class="stat-number">{data.bookCount || 0}</p>
							<p class="stat-label">Books Listed</p>
						</div>
					</div>
					
					<div class="stat-card">
						<div class="stat-icon">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
							</svg>
						</div>
						<div class="stat-content">
							<p class="stat-number">{data.swapStatistics.total_completed || 0}</p>
							<p class="stat-label">Completed Swaps</p>
						</div>
					</div>
					
					<div class="stat-card">
						<div class="stat-icon">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
							</svg>
						</div>
						<div class="stat-content">
							<p class="stat-number">{Math.round(data.swapStatistics.completion_rate || 0)}%</p>
							<p class="stat-label">Completion Rate</p>
						</div>
					</div>
					
					<div class="stat-card">
						<div class="stat-icon">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
							</svg>
						</div>
						<div class="stat-content">
							{#if data.swapStatistics.average_rating > 0}
								<p class="stat-number">{data.swapStatistics.average_rating.toFixed(1)}</p>
								<p class="stat-label">Average Rating</p>
							{:else}
								<p class="stat-number">--</p>
								<p class="stat-label">No Ratings Yet</p>
							{/if}
						</div>
					</div>
				</div>
			</section>

			<!-- Recent Activity -->
			<section class="activity-section card">
				<h2 class="section-title">{data.bookCount > 0 ? 'Recent Books' : 'Get Started'}</h2>
				{#if data.bookCount > 0}
					{#if data.recentBooks?.length > 0}
						<div class="recent-books">
							{#each data.recentBooks as book}
								<div class="book-item">
									<div class="book-cover-container">
										{#if book.google_volume_id}
											<img 
												src="https://books.google.com/books/content?id={book.google_volume_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api" 
												alt="Cover of {book.title}"
												class="book-cover"
												loading="lazy"
												on:error={handleImageError}
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
									</div>
									<div class="book-details">
										<h4 class="book-title">{book.title}</h4>
										<p class="book-author">by {book.authors.join(', ')}</p>
										<p class="book-date">Added {new Date(book.created_at).toLocaleDateString()}</p>
									</div>
								</div>
							{/each}
						</div>
						<div class="section-actions">
							<a href="/app/books" class="btn-secondary">View All Books</a>
						</div>
					{/if}
				{:else}
					<div class="empty-state">
						<div class="empty-icon">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
							</svg>
						</div>
						<h3 class="empty-title">No books yet</h3>
						<p class="empty-subtitle">Start by adding your first book to begin swapping!</p>
						<button type="button" class="btn-primary" on:click={async () => {
							if (!$auth.user) {
								goto('/auth/login?redirectTo=/app/books/add');
								return;
							}
							goto('/app/books/add');
						}}>
							<svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
							</svg>
							Add Your First Book
						</button>
					</div>
				{/if}
			</section>
		</div>

		<div class="sidebar">
			<div class="profile-section">
				<div class="profile-card-wrapper card">
					<ProfileCard />
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Page Header */
	.page-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.page-title {
		color: #2d3748;
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		line-height: 1.2;
	}

	.page-subtitle {
		color: #718096;
		font-size: 1.1rem;
		margin: 0;
	}

	/* Dashboard Grid */
	.dashboard-grid {
		display: grid;
		grid-template-columns: 1fr 320px;
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
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Card Base */
	.card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	/* Section Titles */
	.section-title {
		color: #2d3748;
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 1.5rem 0;
		padding: 1.5rem 1.5rem 0 1.5rem;
	}

	/* Stats Section */
	.stats-section {
		padding: 0 0 1.5rem 0;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		padding: 0 1.5rem;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		transition: all 0.2s ease;
	}

	.stat-card:hover {
		background: #f1f5f9;
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	.stat-icon {
		width: 48px;
		height: 48px;
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #F5F5DC;
		flex-shrink: 0;
		box-shadow: 0 4px 12px rgba(139, 38, 53, 0.3);
	}

	.stat-icon svg {
		width: 24px;
		height: 24px;
	}

	.stat-content {
		flex: 1;
	}

	.stat-number {
		color: #2d3748;
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0 0 0.25rem 0;
		line-height: 1;
	}

	.stat-label {
		color: #718096;
		font-size: 0.875rem;
		font-weight: 500;
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Activity Section */
	.activity-section {
		padding: 0 0 1.5rem 0;
	}

	.recent-books {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 0 1.5rem;
	}

	.book-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		transition: all 0.2s ease;
	}

	.book-item:hover {
		background: #f1f5f9;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.book-cover-container {
		flex-shrink: 0;
	}

	.book-cover {
		width: 48px;
		height: 64px;
		object-fit: cover;
		border-radius: 6px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.book-cover-placeholder {
		width: 48px;
		height: 64px;
		background: linear-gradient(135deg, #f1f3f4 0%, #e2e8f0 100%);
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.book-icon {
		width: 20px;
		height: 20px;
		color: #9ca3af;
	}

	.book-details {
		flex: 1;
		min-width: 0;
	}

	.book-title {
		color: #2d3748;
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 0.25rem 0;
		line-height: 1.3;
		overflow-wrap: break-word;
	}

	.book-author {
		color: #718096;
		font-size: 0.875rem;
		margin: 0 0 0.25rem 0;
		line-height: 1.3;
	}

	.book-date {
		color: #9ca3af;
		font-size: 0.75rem;
		margin: 0;
	}

	.section-actions {
		padding: 1.5rem 1.5rem 0 1.5rem;
		border-top: 1px solid #e2e8f0;
		text-align: center;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 3rem 1.5rem;
	}

	.empty-icon {
		width: 4rem;
		height: 4rem;
		color: #9ca3af;
		margin: 0 auto 1.5rem;
	}

	.empty-title {
		color: #2d3748;
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.empty-subtitle {
		color: #718096;
		font-size: 1rem;
		margin: 0 0 2rem 0;
		max-width: 400px;
		margin-left: auto;
		margin-right: auto;
	}

	/* Buttons */
	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.95rem;
		box-shadow: 0 4px 12px rgba(139, 38, 53, 0.3);
		transition: all 0.2s ease;
		cursor: pointer;
		text-decoration: none;
	}

	.btn-primary:hover {
		background: linear-gradient(135deg, #722F37 0%, #8B2635 100%);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(139, 38, 53, 0.4);
		text-decoration: none;
		color: #F5F5DC;
	}

	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: #f8f9fa;
		color: #8B2635;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.95rem;
		transition: all 0.2s ease;
		cursor: pointer;
		text-decoration: none;
	}

	.btn-secondary:hover {
		background: #F5F5DC;
		border-color: #8B2635;
		color: #722F37;
		text-decoration: none;
	}

	.btn-icon {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	/* Profile Section */
	.profile-section {
		position: sticky;
		top: 2rem;
	}

	.profile-card-wrapper {
		padding: 0;
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

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.page-title {
			font-size: 2rem;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.stat-card {
			flex-direction: column;
			text-align: center;
			gap: 0.75rem;
		}

		.stat-icon {
			width: 40px;
			height: 40px;
		}

		.stat-icon svg {
			width: 20px;
			height: 20px;
		}

		.book-item {
			flex-direction: column;
			text-align: center;
			gap: 0.75rem;
		}

		.book-cover,
		.book-cover-placeholder {
			width: 64px;
			height: 88px;
		}
	}
</style>
