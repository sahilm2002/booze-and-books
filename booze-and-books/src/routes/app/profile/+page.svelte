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

<svelte:head>
	<title>Profile - Booze & Books</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
	<div class="mb-8">
		<nav class="text-sm text-gray-500 mb-4">
			<a href="/app" class="hover:text-gray-700">Dashboard</a>
			<span class="mx-2">/</span>
			<span class="text-gray-900">Profile</span>
		</nav>
		
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">My Profile</h1>
				<p class="text-gray-600">Manage your personal information and preferences</p>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<div class="lg:col-span-2">
			{#if editMode}
				<ProfileEditForm onSave={handleSave} onCancel={handleCancel} />
			{:else}
				<ProfileCard showEditButton={true} onEdit={handleEdit} />
			{/if}
		</div>

		<div class="space-y-6">
			<!-- User Rating Section -->
			<UserRating 
				userRating={$userRating} 
				completedSwaps={$swapStatistics.total_completed}
				size="medium"
			/>

			<div class="bg-white shadow rounded-lg p-6">
				<h3 class="text-lg font-medium text-gray-900 mb-4">Account Stats</h3>
				<div class="space-y-3">
					<div class="flex justify-between">
						<span class="text-gray-600">Member since</span>
						<span class="font-medium">
							{#if $profile}
								{new Date($profile.created_at).toLocaleDateString()}
							{:else}
								-
							{/if}
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600">Total swaps</span>
						<span class="font-medium">{$swapStatistics.total_swaps}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600">Completion rate</span>
						<span class="font-medium">{Math.round($swapStatistics.completion_rate)}%</span>
					</div>
				</div>
			</div>

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
		</div>
	</div>
</div>