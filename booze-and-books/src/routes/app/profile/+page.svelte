<script lang="ts">
	import ProfileCard from '../../../components/profile/ProfileCard.svelte';
	import ProfileEditForm from '../../../components/profile/ProfileEditForm.svelte';
	import UserRating from '../../../components/profile/UserRating.svelte';
	import { profile } from '$lib/stores/profile';
	import { userRating, swapStatistics } from '$lib/stores/swaps';

	let editMode = false;

	function handleEdit() {
		editMode = true;
	}

	function handleSave() {
		editMode = false;
	}

	function handleCancel() {
		editMode = false;
	}
</script>

<style>
	/* Breadcrumb Navigation */
	.breadcrumb-nav {
		display: flex;
		align-items: center;
		margin-bottom: 2rem;
		font-size: 0.875rem;
	}

	.breadcrumb-link {
		color: #718096;
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.breadcrumb-link:hover {
		color: #8B2635;
	}

	.breadcrumb-separator {
		color: #cbd5e0;
		margin: 0 0.5rem;
	}

	.breadcrumb-current {
		color: #2d3748;
		font-weight: 500;
	}

	/* Page Header */
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		gap: 1rem;
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1.5rem;
		}
	}

	.header-content {
		flex: 1;
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

	/* Profile Grid Layout */
	.profile-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
	}

	@media (min-width: 1024px) {
		.profile-grid {
			grid-template-columns: 2fr 1fr;
		}
	}

	.profile-main {
		min-width: 0;
	}

	.profile-sidebar {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Stats Card */
	.stats-card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.card-header {
		background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
		border-bottom: 1px solid #e2e8f0;
		padding: 1.25rem 1.5rem;
	}

	.card-title {
		color: #2d3748;
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
	}

	.card-content {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.stat-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 0;
		border-bottom: 1px solid #f1f3f4;
	}

	.stat-item:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.stat-item:first-child {
		padding-top: 0;
	}

	.stat-label {
		color: #718096;
		font-size: 0.95rem;
		font-weight: 500;
	}

	.stat-value {
		color: #2d3748;
		font-weight: 600;
		font-size: 0.95rem;
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

<svelte:head>
	<title>Profile - Booze & Books</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Breadcrumb Navigation -->
	<nav class="breadcrumb-nav">
		<a href="/app" class="breadcrumb-link">Dashboard</a>
		<span class="breadcrumb-separator">/</span>
		<span class="breadcrumb-current">Profile</span>
	</nav>
	
	<!-- Header -->
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title">My Profile</h1>
			<p class="page-subtitle">
				Manage your personal information and preferences
			</p>
		</div>
	</div>

	<div class="profile-grid">
		<div class="profile-main">
			{#if editMode}
				<ProfileEditForm onSave={handleSave} onCancel={handleCancel} />
			{:else}
				<ProfileCard showEditButton={true} onEdit={handleEdit} />
			{/if}
		</div>

		<div class="profile-sidebar">
			<!-- User Rating Section -->
			<UserRating 
				userRating={$userRating} 
				completedSwaps={$swapStatistics.total_completed}
				size="medium"
			/>

			<div class="stats-card">
				<div class="card-header">
					<h3 class="card-title">Account Stats</h3>
				</div>
				<div class="card-content">
					<div class="stat-item">
						<span class="stat-label">Member since</span>
						<span class="stat-value">
							{#if $profile}
								{new Date($profile.created_at).toLocaleDateString()}
							{:else}
								-
							{/if}
						</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Total swaps</span>
						<span class="stat-value">{$swapStatistics.total_swaps}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Completion rate</span>
						<span class="stat-value">{Math.round($swapStatistics.completion_rate)}%</span>
					</div>
				</div>
			</div>

			<!-- TODO: Quick Actions Section - Hidden until features are ready
			<div class="bg-white shadow rounded-lg p-6">
				<h3 class="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
				<div class="space-y-2">
					<button 
						class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
						disabled
					>
						Export reading list
						<span class="text-xs text-gray-400 block">Coming soon</span>
					</button>
					<button 
						class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
						disabled
					>
						Privacy settings
						<span class="text-xs text-gray-400 block">Coming soon</span>
					</button>
				</div>
			</div>
			-->
		</div>
	</div>
</div>