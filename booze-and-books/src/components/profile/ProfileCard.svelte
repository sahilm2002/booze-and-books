<script lang="ts">
	import { profileWithUser, profileLoading } from '$lib/stores/profile';
	import { ProfileService } from '$lib/services/profileService';

	export let showEditButton = true;
	export let onEdit: (() => void) | undefined = undefined;

	$: avatarUrl = ProfileService.getAvatarUrl($profileWithUser?.avatar_url);
	$: initials = ProfileService.generateInitials(
		$profileWithUser?.full_name,
		$profileWithUser?.username,
		$profileWithUser?.email
	);
</script>

{#if $profileLoading}
	<div class="bg-white shadow rounded-lg p-6">
		<div class="animate-pulse">
			<div class="w-20 h-20 bg-gray-300 rounded-full mx-auto mb-4"></div>
			<div class="h-4 bg-gray-300 rounded mb-2"></div>
			<div class="h-3 bg-gray-300 rounded mb-4 w-2/3 mx-auto"></div>
			<div class="h-3 bg-gray-300 rounded mb-2"></div>
			<div class="h-3 bg-gray-300 rounded"></div>
		</div>
	</div>
{:else if $profileWithUser}
	<div class="bg-white shadow rounded-lg overflow-hidden">
		<div class="p-6">
			<div class="flex flex-col items-center">
				<div class="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600 mb-4">
					{#if avatarUrl}
						<img src={avatarUrl} alt="Profile" class="w-full h-full rounded-full object-cover" />
					{:else}
						{initials}
					{/if}
				</div>
				
				<h2 class="text-xl font-bold text-gray-900 mb-1">
					{$profileWithUser.full_name || $profileWithUser.username || 'Anonymous User'}
				</h2>
				
				{#if $profileWithUser.username && $profileWithUser.full_name}
					<p class="text-gray-600 mb-2">@{$profileWithUser.username}</p>
				{/if}
				
				{#if $profileWithUser.bio}
					<p class="text-gray-700 text-center mb-4">{$profileWithUser.bio}</p>
				{/if}
				
				{#if $profileWithUser.location}
					<div class="flex items-center text-gray-600 mb-4">
						<svg class="w-4 h-4 mr-1" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
						</svg>
						{$profileWithUser.location}
					</div>
				{/if}
				
				{#if showEditButton && onEdit}
					<button
						on:click={onEdit}
						class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
					>
						Edit Profile
					</button>
				{/if}
			</div>
		</div>
		
		<div class="bg-gray-50 px-6 py-3">
			<div class="flex justify-between text-sm text-gray-600">
				<span>Member since</span>
				<span>{new Date($profileWithUser.created_at).toLocaleDateString()}</span>
			</div>
		</div>
	</div>
{:else}
	<div class="bg-white shadow rounded-lg p-6">
		<div class="text-center text-gray-600">
			<p>Profile not found</p>
		</div>
	</div>
{/if}