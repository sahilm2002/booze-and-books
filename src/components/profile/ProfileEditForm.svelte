<script lang="ts">
	import { profile, profileStore, profileWithUser } from '$lib/stores/profile';
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

<div class="edit-profile-container">
	<div class="edit-profile-header">
		<h2 class="edit-profile-title">Edit Profile</h2>
		<p class="edit-profile-subtitle">Update your personal information and profile picture</p>
	</div>

	<form on:submit|preventDefault={handleSubmit} class="edit-profile-form">
		<!-- Profile Picture Section -->
		<div class="form-section">
			<h3 class="section-title">Profile Picture</h3>
			<div class="avatar-section">
				<AvatarUpload
					currentAvatarUrl={$profile?.avatar_url}
					onUpload={handleAvatarUpload}
					size="lg"
				/>
			</div>
		</div>

		<!-- Account Information Section -->
		<div class="form-section">
			<h3 class="section-title">Account Information</h3>
			<div class="form-grid">
				<div class="form-group">
					<label for="email" class="form-label">Email Address</label>
					<input
						type="email"
						id="email"
						value={$profileWithUser?.email || ''}
						disabled
						class="form-input form-input-disabled"
					/>
					<p class="form-help">Your email address cannot be changed</p>
				</div>

				<div class="form-group">
					<label for="username" class="form-label">Username</label>
					<input
						type="text"
						id="username"
						value={$profile?.username || ''}
						disabled
						class="form-input form-input-disabled"
					/>
					<p class="form-help">Your username cannot be changed</p>
				</div>
			</div>
		</div>

		<!-- Personal Information Section -->
		<div class="form-section">
			<h3 class="section-title">Personal Information</h3>
			<div class="form-grid">
				<div class="form-group">
					<label for="full_name" class="form-label">Full Name</label>
					<input
						type="text"
						id="full_name"
						bind:value={formData.full_name}
						class="form-input"
						placeholder="Enter your full name"
					/>
					{#if errors.full_name}
						<p class="form-error">{errors.full_name}</p>
					{/if}
				</div>

				<div class="form-group">
					<label for="location" class="form-label">Address/Location</label>
					<input
						type="text"
						id="location"
						bind:value={formData.location}
						class="form-input"
						placeholder="Enter your address or location"
					/>
					{#if errors.location}
						<p class="form-error">{errors.location}</p>
					{/if}
				</div>
			</div>

			<div class="form-group">
				<label for="bio" class="form-label">Bio</label>
				<textarea
					id="bio"
					rows="4"
					bind:value={formData.bio}
					class="form-textarea"
					placeholder="Tell us about yourself, your reading preferences, or anything you'd like other members to know..."
				></textarea>
				<div class="bio-footer">
					{#if errors.bio}
						<p class="form-error">{errors.bio}</p>
					{/if}
					<p class="character-count">
						{formData.bio?.length || 0}/500 characters
					</p>
				</div>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="form-actions">
			<button
				type="button"
				on:click={handleCancel}
				class="btn-secondary"
				disabled={saving || uploading}
			>
				Cancel
			</button>
			<button
				type="submit"
				class="btn-primary"
				disabled={saving || uploading}
			>
				{#if saving}
					<div class="btn-loading">
						<div class="loading-spinner"></div>
						<span>Saving Changes...</span>
					</div>
				{:else}
					Save Changes
				{/if}
			</button>
		</div>
	</form>
</div>

<style>
	.edit-profile-container {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.edit-profile-header {
		background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
		border-bottom: 1px solid #e2e8f0;
		padding: 1.5rem 2rem;
	}

	.edit-profile-title {
		color: #2d3748;
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		line-height: 1.2;
	}

	.edit-profile-subtitle {
		color: #718096;
		font-size: 0.95rem;
		margin: 0;
		line-height: 1.4;
	}

	.edit-profile-form {
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section-title {
		color: #2d3748;
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid #f1f3f4;
	}

	.avatar-section {
		display: flex;
		justify-content: center;
		padding: 1rem 0;
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	@media (min-width: 640px) {
		.form-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-label {
		color: #374151;
		font-size: 0.95rem;
		font-weight: 600;
		margin: 0;
	}

	.form-input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #f8f9fa;
		font-size: 0.95rem;
		color: #374151;
		transition: all 0.2s ease;
		box-sizing: border-box;
	}

	.form-input:focus {
		outline: none;
		border-color: #8B2635;
		background: white;
		box-shadow: 0 0 0 3px rgba(139, 38, 53, 0.1);
	}

	.form-input-disabled {
		background: #f3f4f6;
		color: #9ca3af;
		cursor: not-allowed;
	}

	.form-textarea {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: #f8f9fa;
		font-size: 0.95rem;
		color: #374151;
		transition: all 0.2s ease;
		box-sizing: border-box;
		resize: vertical;
		min-height: 120px;
		font-family: inherit;
		line-height: 1.5;
	}

	.form-textarea:focus {
		outline: none;
		border-color: #8B2635;
		background: white;
		box-shadow: 0 0 0 3px rgba(139, 38, 53, 0.1);
	}

	.form-help {
		color: #718096;
		font-size: 0.875rem;
		margin: 0;
		line-height: 1.4;
	}

	.form-error {
		color: #dc2626;
		font-size: 0.875rem;
		margin: 0;
		font-weight: 500;
	}

	.bio-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.character-count {
		color: #718096;
		font-size: 0.875rem;
		margin: 0;
		white-space: nowrap;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding-top: 1.5rem;
		border-top: 1px solid #f1f3f4;
	}

	@media (max-width: 640px) {
		.form-actions {
			flex-direction: column-reverse;
		}
	}

	.btn-secondary {
		background: #f8f9fa;
		color: #6b7280;
		border: 1px solid #e2e8f0;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 120px;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #f1f3f4;
		border-color: #d1d5db;
		color: #374151;
		transform: translateY(-1px);
	}

	.btn-secondary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.btn-primary {
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 12px rgba(139, 38, 53, 0.25);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		min-width: 140px;
	}

	.btn-primary:hover:not(:disabled) {
		background: linear-gradient(135deg, #722F37 0%, #8B2635 100%);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(139, 38, 53, 0.35);
	}

	.btn-primary:disabled {
		opacity: 0.7;
		cursor: not-allowed;
		transform: none;
	}

	.btn-loading {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Mobile responsiveness */
	@media (max-width: 640px) {
		.edit-profile-header {
			padding: 1.25rem 1.5rem;
		}

		.edit-profile-title {
			font-size: 1.25rem;
		}

		.edit-profile-form {
			padding: 1.5rem;
			gap: 1.5rem;
		}

		.form-section {
			gap: 1.25rem;
		}

		.section-title {
			font-size: 1rem;
		}
	}
</style>
