<script lang="ts">
	import { ProfileService } from '$lib/services/profileService';
	import { profileWithUser } from '$lib/stores/profile';

	export let onUpload: ((file: File) => Promise<void>) | undefined = undefined;
	export let currentAvatarUrl: string | null = null;
	export let size = 'lg'; // 'sm' | 'md' | 'lg'

	let fileInput: HTMLInputElement;
	let dragOver = false;
	let uploading = false;
	let previewUrl: string | null = null;

	const sizeClasses = {
		sm: 'w-16 h-16 text-lg',
		md: 'w-20 h-20 text-xl',
		lg: 'w-32 h-32 text-3xl'
	};

	$: displayUrl = previewUrl || ProfileService.getAvatarUrl(currentAvatarUrl);
	$: initials = ProfileService.generateInitials(
		$profileWithUser?.full_name,
		$profileWithUser?.username,
		$profileWithUser?.email || ''
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
		if (!file.type.startsWith('image/')) {
			alert('Please select an image file');
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			alert('File size must be less than 5MB');
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			previewUrl = e.target?.result as string;
		};
		reader.readAsDataURL(file);

		if (onUpload) {
			uploading = true;
			try {
				await onUpload(file);
			} finally {
				uploading = false;
			}
		}
	}

	function triggerFileInput() {
		fileInput?.click();
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
		class="relative rounded-full bg-gray-100 border-2 border-dashed border-gray-300 transition-colors cursor-pointer hover:bg-gray-50 {sizeClasses[size]} {dragOver ? 'border-blue-500 bg-blue-50' : ''}"
		role="button"
		tabindex="0"
		on:click={triggerFileInput}
		on:keydown={(e) => e.key === 'Enter' && triggerFileInput()}
		on:drop={handleDrop}
		on:dragover={handleDragOver}
		on:dragleave={handleDragLeave}
	>
		{#if displayUrl}
			<img
				src={displayUrl}
				alt="Avatar"
				class="w-full h-full rounded-full object-cover"
			/>
			<div class="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
				<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
				</svg>
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
		<button
			type="button"
			class="text-sm text-blue-600 hover:text-blue-800 font-medium"
			on:click={triggerFileInput}
		>
			{displayUrl ? 'Change photo' : 'Upload photo'}
		</button>
		<p class="text-xs text-gray-500 mt-1">
			Drag and drop or click to upload<br />
			Max file size: 5MB
		</p>
	</div>
</div>