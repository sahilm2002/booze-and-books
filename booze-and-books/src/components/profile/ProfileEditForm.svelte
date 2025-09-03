<script lang="ts">
	import { profile, profileStore } from '$lib/stores/profile';
	import AvatarUpload from './AvatarUpload.svelte';
	import { validateProfileUpdate } from '$lib/validation/profile';
	import type { ProfileUpdate } from '$lib/types/profile';

	export let onSave: (() => void) | undefined = undefined;
	export let onCancel: (() => void) | undefined = undefined;

	let formData: ProfileUpdate = {
		username: $profile?.username || '',
		full_name: $profile?.full_name || '',
		bio: $profile?.bio || '',
		location: $profile?.location || ''
	};

	let saving = false;
	let uploading = false;
	let errors: Record<string, string> = {};

	function validateForm(): boolean {
		const validation = validateProfileUpdate(formData);
		if (validation.success) {
			errors = {};
			return true;
		} else {
			errors = validation.errors;
			return false;
		}
	}

	async function handleSubmit() {
		if (!validateForm()) return;

		saving = true;
		
		try {
			const success = await profileStore.updateProfile(formData);
			
			if (success && onSave) {
				onSave();
			}
		} catch (error) {
			console.error('Failed to save profile:', error);
		} finally {
			saving = false;
		}
	}

	async function handleAvatarUpload(file: File) {
		uploading = true;
		
		try {
			await profileStore.uploadAvatar(file);
		} catch (error) {
			console.error('Failed to upload avatar:', error);
		} finally {
			uploading = false;
		}
	}

	function handleCancel() {
		formData = {
			username: $profile?.username || '',
			full_name: $profile?.full_name || '',
			bio: $profile?.bio || '',
			location: $profile?.location || ''
		};

		if (onCancel) {
			onCancel();
		}
	}

	$: if ($profile) {
		formData = {
			username: $profile.username || '',
			full_name: $profile.full_name || '',
			bio: $profile.bio || '',
			location: $profile.location || ''
		};
	}
</script>

<div class="bg-white shadow rounded-lg overflow-hidden">
	<div class="px-6 py-4 border-b border-gray-200">
		<h3 class="text-lg font-medium text-gray-900">Edit Profile</h3>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="p-6 space-y-6">
		<div class="flex justify-center">
			<AvatarUpload
				currentAvatarUrl={$profile?.avatar_url}
				onUpload={handleAvatarUpload}
				size="lg"
			/>
		</div>

		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
			<div>
				<label for="username" class="block text-sm font-medium text-gray-700">Username</label>
				<input
					type="text"
					id="username"
					bind:value={formData.username}
					class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
					placeholder="Enter username"
				/>
				{#if errors.username}
					<p class="mt-1 text-sm text-red-600">{errors.username}</p>
				{/if}
			</div>

			<div>
				<label for="full_name" class="block text-sm font-medium text-gray-700">Full Name</label>
				<input
					type="text"
					id="full_name"
					bind:value={formData.full_name}
					class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
					placeholder="Enter your full name"
				/>
			</div>
		</div>

		<div>
			<label for="location" class="block text-sm font-medium text-gray-700">Location</label>
			<input
				type="text"
				id="location"
				bind:value={formData.location}
				class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
				placeholder="Enter your location"
			/>
		</div>

		<div>
			<label for="bio" class="block text-sm font-medium text-gray-700">Bio</label>
			<textarea
				id="bio"
				rows="4"
				bind:value={formData.bio}
				class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
				placeholder="Tell us about yourself..."
			></textarea>
			{#if errors.bio}
				<p class="mt-1 text-sm text-red-600">{errors.bio}</p>
			{/if}
			<p class="mt-1 text-xs text-gray-500">
				{formData.bio?.length || 0}/500 characters
			</p>
		</div>

		<div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
			<button
				type="button"
				on:click={handleCancel}
				class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				disabled={saving || uploading}
			>
				Cancel
			</button>
			<button
				type="submit"
				class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
				disabled={saving || uploading}
			>
				{#if saving}
					<div class="flex items-center">
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
						Saving...
					</div>
				{:else}
					Save Changes
				{/if}
			</button>
		</div>
	</form>
</div>