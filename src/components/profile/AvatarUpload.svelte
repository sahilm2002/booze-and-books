<script lang="ts">
	import { ProfileService } from '$lib/services/profileService';
	import { profileWithUser, profileStore } from '$lib/stores/profile';
	import { MAX_AVATAR_UPLOAD_SIZE, getMaxUploadSizeDisplay } from '$lib/config/upload';

	export let onUpload: ((file: File) => Promise<void>) | undefined = undefined;
	export let currentAvatarUrl: string | null = null;
	export let size: 'sm' | 'md' | 'lg' = 'lg'; // 'sm' | 'md' | 'lg'

	let fileInput: HTMLInputElement;
	let dragOver = false;
	let uploading = false;
	let previewUrl: string | null = null;
	let uploadProgress = 0;

	const sizeClasses = {
		sm: 'avatar-sm',
		md: 'avatar-md', 
		lg: 'avatar-lg'
	};

	$: displayUrl = previewUrl || ProfileService.getAvatarUrl(currentAvatarUrl ?? null);
	$: initials = ProfileService.generateInitials(
		$profileWithUser?.full_name ?? null,
		$profileWithUser?.username ?? null,
		$profileWithUser?.email ?? ''
	);

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			processFile(file);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		
		const files = event.dataTransfer?.files;
		const file = files?.[0];
		
		if (file) {
			processFile(file);
		}
	}

	async function processFile(file: File) {
		// Basic client-side validation
		if (!file.type.startsWith('image/')) {
			alert('Please select an image file');
			return;
		}

		if (file.size > MAX_AVATAR_UPLOAD_SIZE) {
			alert(`File size must be less than ${getMaxUploadSizeDisplay()}`);
			return;
		}

		// Show local preview immediately
		const reader = new FileReader();
		reader.onload = (e) => {
			previewUrl = e.target?.result as string;
		};
		reader.readAsDataURL(file);

		// Upload via server endpoint to allow server-side handling & progress
		uploading = true;
		uploadProgress = 0;

		try {
			const formData = new FormData();
			formData.append('file', file);

			// Use modern fetch API for upload
			// Note: Native fetch doesn't support upload progress tracking
			// For progress tracking, consider using a library like axios or implementing ReadableStream processing
			const response = await fetch('/api/profile/avatar', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const errorText = await response.text();
				try {
					const errorRes = JSON.parse(errorText);
					const errorMessage = errorRes?.details 
						? `${errorRes.error}: ${errorRes.details}`
						: errorRes?.error || `Upload failed: ${response.statusText}`;
					throw new Error(errorMessage);
				} catch (parseErr) {
					throw new Error(`Upload failed: ${response.statusText}`);
				}
			}

			const res = await response.json();
			if (res?.publicUrl) {
				previewUrl = res.publicUrl;
			}
			uploadProgress = 100;

			// Call optional callback for additional handling
			if (onUpload) {
				try {
					await onUpload(file);
				} catch (err) {
					console.warn('onUpload callback failed', err);
				}
			}
		} catch (error) {
			alert('Failed to upload avatar. Please try again.');
			console.error(error);
		} finally {
			uploading = false;
			// Reset progress after a short delay so UI can show 100%
			setTimeout(() => {
				uploadProgress = 0;
			}, 500);
		}
	}

	function triggerFileInput() {
		fileInput?.click();
	}

	async function removeAvatar() {
		if (!confirm('Remove profile photo?')) return;
		uploading = true;
		try {
			await profileStore.updateProfile({ avatar_url: null });
			previewUrl = null;
		} catch (error) {
			console.error('Failed to remove avatar', error);
		} finally {
			uploading = false;
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}
</script>

<div class="flex flex-col items-center space-y-4">
	<div
		class={"relative rounded-full bg-gray-100 border-2 border-dashed border-gray-300 transition-colors cursor-pointer hover:bg-gray-50 " + sizeClasses[size] + (dragOver ? ' border-blue-500 bg-blue-50' : '')}
		role="button"
		tabindex="0"
		on:click={triggerFileInput}
		on:keydown={(e) => e.key === 'Enter' && triggerFileInput()}
		on:drop={handleDrop}
		on:dragover={handleDragOver}
		on:dragleave={handleDragLeave}
		aria-label="Upload profile photo"
	>
		{#if displayUrl}
			<img
				src={displayUrl}
				alt="Avatar"
				class="w-full h-full rounded-full object-cover"
			/>
			<!-- Overlay: clicking the avatar itself triggers file selection.
			     Removed redundant camera button so there is a single upload entrypoint. -->
			<div class="absolute inset-0 rounded-full bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
				{#if uploading || uploadProgress > 0}
					<div class="upload-progress text-white text-sm font-semibold">
						{uploading ? (uploadProgress ? `${uploadProgress}%` : 'Uploading...') : ''}
					</div>
				{/if}
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center h-full text-gray-400">
				<svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
				</svg>
				<span class="text-xs font-medium">{initials}</span>
			</div>
		{/if}

		{#if uploading}
			<div class="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
				<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
			</div>
		{/if}
	</div>

	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		class="hidden"
		on:change={handleFileSelect}
	/>

	<div class="text-center">
		<p class="text-xs text-gray-500 mt-1">
			Drag and drop or click the avatar to upload — Max file size: {getMaxUploadSizeDisplay()}
		</p>
	</div>
</div>

<style>
	.avatar-sm {
		width: 4rem;
		height: 4rem;
		font-size: 1.125rem;
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
		z-index: 1;
	}

	.avatar-md {
		width: 5rem;
		height: 5rem;
		font-size: 1.25rem;
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
		z-index: 1;
	}

	.avatar-lg {
		width: 8rem;
		height: 8rem;
		font-size: 1.875rem;
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
		z-index: 1;
	}

	/* Override any conflicting Tailwind classes */
	:global(.avatar-sm),
	:global(.avatar-md),
	:global(.avatar-lg) {
		min-width: unset !important;
		max-width: unset !important;
		min-height: unset !important;
		max-height: unset !important;
		position: relative !important;
		overflow: hidden !important;
		z-index: 1 !important;
	}

	:global(.avatar-sm) {
		width: 4rem !important;
		height: 4rem !important;
	}

	:global(.avatar-md) {
		width: 5rem !important;
		height: 5rem !important;
	}

	:global(.avatar-lg) {
		width: 8rem !important;
		height: 8rem !important;
	}

	/* Ensure the image stays within its container */
	:global(.avatar-sm img),
	:global(.avatar-md img),
	:global(.avatar-lg img) {
		position: absolute !important;
		top: 0 !important;
		left: 0 !important;
		width: 100% !important;
		height: 100% !important;
		object-fit: cover !important;
		border-radius: 50% !important;
	}
</style>
