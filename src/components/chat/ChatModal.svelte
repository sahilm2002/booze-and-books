<script lang="ts">
	import { createEventDispatcher, onMount, afterUpdate } from 'svelte';
	import { ChatService } from '$lib/services/chatService';
	import type { ChatMessage, ChatMessageInput } from '$lib/types/notification';
	import type { PublicProfile } from '$lib/types/profile';

	export let isOpen = false;
	export let conversationId: string;
	export let otherUser: PublicProfile;
	export let currentUserId: string;

	const dispatch = createEventDispatcher();

	let messages: ChatMessage[] = [];
	let newMessage = '';
	let loading = false;
	let sending = false;
	let chatContainer: HTMLElement;
	let fileInput: HTMLInputElement;
	let selectedFile: File | null = null;
	let fileError: string = '';

	// File validation constants
	const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
	const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
	const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];

	// Tracking via conversationId guard; no reactive token needed

	onMount(() => {
		// Initial mount - reactive statement will handle loading
	});

	afterUpdate(() => {
		// Scroll to bottom when new messages are added
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	});

	// Reactive watcher: Load chat history when modal opens or conversation changes
	$: if (isOpen && conversationId) {
		(async () => {
			const cid = conversationId;
			try {
				loading = true;
				// Clear messages immediately when switching conversations to prevent showing wrong history
				messages = [];
				// Load history for the specific conversation
				const history = await ChatService.getChatHistory(cid);
				// Only apply results if still on the same conversation and modal is open
				if (isOpen && cid === conversationId) {
					messages = history;
					await ChatService.markMessagesAsRead(cid, currentUserId);
				}
			} catch (error) {
				if (cid === conversationId) {
					console.error('Failed to load chat history:', error);
				}
			} finally {
				if (cid === conversationId) {
					loading = false;
				}
			}
		})();
	} else if (!isOpen) {
		// Clear messages when modal is closed to ensure clean state
		messages = [];
		loading = false;
	}

	// loadChatHistory no longer needed; reactive statement handles loading

	async function sendMessage() {
		if (!newMessage.trim() && !selectedFile) return;

		try {
			sending = true;
			
			let attachmentData = {};
			if (selectedFile) {
				const attachment = await ChatService.uploadAttachment(conversationId, selectedFile);
				attachmentData = {
					attachment_url: attachment.url,
					attachment_type: attachment.type,
					attachment_size: attachment.size
				};
			}

			const messageInput: ChatMessageInput = {
				recipient_id: otherUser.id,
				message: newMessage.trim() || `Sent ${selectedFile?.name}`,
				...attachmentData
			};

			const sentMessage = await ChatService.sendMessage(messageInput);
			messages = [...messages, sentMessage];
			
			newMessage = '';
			selectedFile = null;
			if (fileInput) fileInput.value = '';

			dispatch('messageSent', sentMessage);
		} catch (error) {
			console.error('Failed to send message:', error);
			alert('Failed to send message. Please try again.');
		} finally {
			sending = false;
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		fileError = ''; // Clear previous errors
		
		if (!target.files || !target.files[0]) {
			selectedFile = null;
			return;
		}

		const file = target.files[0];
		
		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			fileError = `File size exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`;
			selectedFile = null;
			target.value = '';
			return;
		}

		// Get file extension from name
		const fileName = file.name.toLowerCase();
		const fileExtension = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';
		
		// Validate file type using MIME type and extension
		const isValidMimeType = ALLOWED_MIME_TYPES.includes(file.type);
		const isValidExtension = fileExtension && ALLOWED_EXTENSIONS.includes(fileExtension);
		
		// Reject immediately if MIME type is present and explicitly not allowed
		if (file.type && !isValidMimeType) {
			fileError = 'Unsupported file type. Please select an image (JPEG, PNG, GIF) or PDF file.';
			selectedFile = null;
			target.value = '';
			return;
		}
		
		// Accept if either MIME type OR extension is valid
		if (!isValidMimeType && !isValidExtension) {
			fileError = 'Unsupported file type. Please select an image (JPEG, PNG, GIF) or PDF file.';
			selectedFile = null;
			target.value = '';
			return;
		}

		// File passed all validation
		selectedFile = file;
	}

	function removeSelectedFile() {
		selectedFile = null;
		fileError = '';
		if (fileInput) fileInput.value = '';
	}

	function closeModal() {
		isOpen = false;
		dispatch('close');
	}

	function formatTime(dateString: string) {
		return new Date(dateString).toLocaleTimeString([], { 
			hour: '2-digit', 
			minute: '2-digit' 
		});
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (date.toDateString() === today.toDateString()) {
			return 'Today';
		} else if (date.toDateString() === yesterday.toDateString()) {
			return 'Yesterday';
		} else {
			return date.toLocaleDateString();
		}
	}

	function isImageAttachment(url: string, type: string) {
		return type.startsWith('image/');
	}

	// Group messages by date
	$: groupedMessages = messages.reduce((groups, message) => {
		const date = formatDate(message.created_at);
		if (!groups[date]) {
			groups[date] = [];
		}
		groups[date].push(message);
		return groups;
	}, {} as Record<string, ChatMessage[]>);
</script>

{#if isOpen}
	<div class="modal-overlay" on:click={closeModal}>
		<div class="modal-content" on:click|stopPropagation>
			<!-- Header -->
			<div class="modal-header">
				<div class="user-info">
					{#if otherUser.avatar_url}
						<img src={otherUser.avatar_url} alt={otherUser.username} class="avatar" />
					{:else}
						<div class="avatar-placeholder">
							{otherUser.username.charAt(0).toUpperCase()}
						</div>
					{/if}
					<div>
						<h3>{otherUser.full_name || otherUser.username}</h3>
						<p class="username">@{otherUser.username}</p>
					</div>
				</div>
				<button class="close-btn" on:click={closeModal}>×</button>
			</div>

			<!-- Messages -->
			<div class="messages-container" bind:this={chatContainer}>
				{#if loading}
					<div class="loading">Loading messages...</div>
				{:else if Object.keys(groupedMessages).length === 0}
					<div class="empty-state">
						<p>Start a conversation with {otherUser.full_name || otherUser.username}</p>
					</div>
				{:else}
					{#each Object.entries(groupedMessages) as [date, dayMessages]}
						<div class="date-separator">
							<span>{date}</span>
						</div>
						{#each dayMessages as message}
							<div class="message {message.sender_id === currentUserId ? 'sent' : 'received'}">
								<div class="message-content">
									{#if message.message}
										<p>{message.message}</p>
									{/if}
									{#if message.attachment_url}
										<div class="attachment">
											{#if isImageAttachment(message.attachment_url, message.attachment_type || '')}
												<img src={message.attachment_url} alt="Attachment" class="attachment-image" />
											{:else}
											<a href={message.attachment_url} target="_blank" rel="noopener noreferrer" class="attachment-link">
												📎 View Attachment
											</a>
											{/if}
										</div>
									{/if}
								</div>
								<div class="message-time">
									{formatTime(message.created_at)}
								</div>
							</div>
						{/each}
					{/each}
				{/if}
			</div>

			<!-- Message Input -->
			<div class="message-input-container">
				{#if fileError}
					<div class="file-error">
						<span>❌ {fileError}</span>
					</div>
				{/if}
				{#if selectedFile}
					<div class="selected-file">
						<span>📎 {selectedFile.name}</span>
						<button type="button" on:click={removeSelectedFile}>×</button>
					</div>
				{/if}
				<div class="input-row">
					<input
						type="file"
						bind:this={fileInput}
						on:change={handleFileSelect}
						accept="image/*,.pdf,.doc,.docx"
						style="display: none;"
					/>
					<button 
						type="button" 
						class="attach-btn"
						on:click={() => fileInput?.click()}
						disabled={sending}
					>
						📎
					</button>
					<textarea
						bind:value={newMessage}
						on:keypress={handleKeyPress}
						placeholder="Type a message..."
						disabled={sending}
						rows="1"
					></textarea>
					<button 
						type="button" 
						class="send-btn" 
						on:click={sendMessage}
						disabled={sending || (!newMessage.trim() && !selectedFile) || !!fileError}
					>
						{sending ? '...' : 'Send'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		background: white;
		border-radius: 12px;
		width: 90%;
		max-width: 500px;
		height: 80vh;
		max-height: 600px;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
	}

	.avatar-placeholder {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: #6366f1;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
	}

	.user-info h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.username {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #6b7280;
		padding: 0.25rem;
	}

	.close-btn:hover {
		color: #374151;
	}

	.messages-container {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.loading, .empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #6b7280;
	}

	.date-separator {
		text-align: center;
		margin: 1rem 0;
	}

	.date-separator span {
		background: #f3f4f6;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.message {
		display: flex;
		flex-direction: column;
		margin-bottom: 0.5rem;
	}

	.message.sent {
		align-items: flex-end;
	}

	.message.received {
		align-items: flex-start;
	}

	.message-content {
		max-width: 70%;
		padding: 0.75rem;
		border-radius: 12px;
		word-wrap: break-word;
	}

	.message.sent .message-content {
		background: #6366f1;
		color: white;
	}

	.message.received .message-content {
		background: #f3f4f6;
		color: #374151;
	}

	.message-content p {
		margin: 0;
	}

	.attachment {
		margin-top: 0.5rem;
	}

	.attachment-image {
		max-width: 200px;
		max-height: 200px;
		border-radius: 8px;
		object-fit: cover;
	}

	.attachment-link {
		color: inherit;
		text-decoration: underline;
	}

	.message-time {
		font-size: 0.75rem;
		color: #9ca3af;
		margin-top: 0.25rem;
		padding: 0 0.75rem;
	}

	.message-input-container {
		border-top: 1px solid #e5e7eb;
		padding: 1rem;
	}

	.selected-file {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: #f3f4f6;
		padding: 0.5rem;
		border-radius: 8px;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.selected-file button {
		background: none;
		border: none;
		cursor: pointer;
		color: #6b7280;
		font-size: 1.2rem;
	}

	.file-error {
		display: flex;
		align-items: center;
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 0.5rem;
		border-radius: 8px;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.file-error span {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.input-row {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.attach-btn {
		background: #f3f4f6;
		border: none;
		border-radius: 8px;
		padding: 0.5rem;
		cursor: pointer;
		font-size: 1.2rem;
	}

	.attach-btn:hover {
		background: #e5e7eb;
	}

	textarea {
		flex: 1;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		padding: 0.75rem;
		resize: none;
		font-family: inherit;
		min-height: 40px;
		max-height: 120px;
	}

	textarea:focus {
		outline: none;
		border-color: #6366f1;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.send-btn {
		background: #6366f1;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		cursor: pointer;
		font-weight: 500;
	}

	.send-btn:hover:not(:disabled) {
		background: #5856eb;
	}

	.send-btn:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}
</style>
