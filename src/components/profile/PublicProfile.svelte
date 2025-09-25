<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ProfilePageData } from '$lib/types/profile';
	import type { SwapHistoryItem } from '$lib/types/profile';
	import { OnlineStatusService } from '$lib/services/onlineStatusService';

	export let profileData: ProfilePageData;
	export let currentUserId: string;

	const dispatch = createEventDispatcher();

	function openChat() {
		dispatch('openChat', {
			userId: profileData.profile.id,
			username: profileData.profile.username,
			conversationId: profileData.conversation_id
		});
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString();
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'COMPLETED':
				return 'text-green-600 bg-green-100';
			case 'ACCEPTED':
				return 'text-blue-600 bg-blue-100';
			case 'PENDING':
				return 'text-yellow-600 bg-yellow-100';
			case 'DECLINED':
				return 'text-red-600 bg-red-100';
			case 'CANCELLED':
				return 'text-gray-600 bg-gray-100';
			default:
				return 'text-gray-600 bg-gray-100';
		}
	}

	function getStatusText(status: string) {
		return status.charAt(0) + status.slice(1).toLowerCase();
	}

	$: completedSwaps = profileData.swap_history_with_current_user.filter(swap => swap.status === 'COMPLETED');
	$: totalSwaps = profileData.swap_history_with_current_user.length;
</script>

<div class="profile-container">
	<!-- Profile Header -->
	<div class="profile-header">
		<div class="profile-info">
			<div class="avatar-section">
				{#if profileData.profile.avatar_url}
					<img 
						src={profileData.profile.avatar_url} 
						alt={profileData.profile.username}
						class="profile-avatar"
					/>
				{:else}
					<div class="avatar-placeholder">
						{profileData.profile.username.charAt(0).toUpperCase()}
					</div>
				{/if}
			</div>
			
			<div class="user-details">
				<h1 class="profile-name">
					{profileData.profile.full_name || profileData.profile.username}
				</h1>
				<p class="profile-username">@{profileData.profile.username}</p>
				
				{#if profileData.profile.bio}
					<p class="profile-bio">{profileData.profile.bio}</p>
				{/if}
				
				<div class="profile-meta">
					<!-- Online Status -->
					<div class="meta-item online-status">
						<span class="status-indicator {profileData.profile.is_online ? 'online' : 'offline'}"></span>
						<span class="status-text">
							{OnlineStatusService.formatLastSeen(profileData.profile.last_seen_at || null, profileData.profile.is_online || false)}
						</span>
					</div>
					
					{#if profileData.profile.location}
						<div class="meta-item">
							<span class="meta-icon">📍</span>
							<span>{profileData.profile.location}</span>
						</div>
					{/if}
					
					<!-- Email removed for privacy - should only be shown with explicit user consent -->
					
					<div class="meta-item">
						<span class="meta-icon">📅</span>
						<span>Joined {formatDate(profileData.profile.created_at)}</span>
					</div>
					
					{#if !OnlineStatusService.hasEverLoggedIn(profileData.profile.first_login_at || null)}
						<div class="meta-item never-logged-in">
							<span class="meta-icon">⚠️</span>
							<span>Has never logged in</span>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="profile-actions">
			{#if profileData.can_chat}
				<button class="chat-btn" on:click={openChat}>
					💬 Chat with {profileData.profile.full_name || profileData.profile.username}
				</button>
			{/if}
		</div>
	</div>

	<!-- Swap History Section -->
	<div class="swap-history-section">
		<div class="section-header">
			<h2>Swap History</h2>
			<div class="swap-stats">
				<div class="stat">
					<span class="stat-number">{totalSwaps}</span>
					<span class="stat-label">Total Swaps</span>
				</div>
				<div class="stat">
					<span class="stat-number">{completedSwaps.length}</span>
					<span class="stat-label">Completed</span>
				</div>
			</div>
		</div>

		{#if profileData.swap_history_with_current_user.length === 0}
			<div class="empty-history">
				<div class="empty-icon">📚</div>
				<p>No swap history with this user yet.</p>
				<p class="empty-subtitle">Start a conversation to begin swapping books!</p>
			</div>
		{:else}
			<div class="swap-list">
				{#each profileData.swap_history_with_current_user as swap}
					<div class="swap-item">
						<div class="swap-info">
							<h3 class="book-title">{swap.book_title}</h3>
							<div class="swap-details">
								<span class="swap-role">
									{swap.user_role === 'requester' ? 'You requested' : 'They requested'}
								</span>
								<span class="swap-date">{formatDate(swap.created_at)}</span>
							</div>
							{#if swap.completed_at}
								<div class="completion-date">
									Completed on {formatDate(swap.completed_at)}
								</div>
							{/if}
						</div>
						<div class="swap-status">
							<span class="status-badge {getStatusColor(swap.status)}">
								{getStatusText(swap.status)}
							</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.profile-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	.profile-header {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
	}

	.profile-info {
		display: flex;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.avatar-section {
		flex-shrink: 0;
	}

	.profile-avatar {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		object-fit: cover;
		border: 4px solid #f3f4f6;
	}

	.avatar-placeholder {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		background: #6366f1;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3rem;
		font-weight: 600;
		border: 4px solid #f3f4f6;
	}

	.user-details {
		flex: 1;
	}

	.profile-name {
		font-size: 2rem;
		font-weight: 700;
		color: #111827;
		margin: 0 0 0.5rem 0;
	}

	.profile-username {
		font-size: 1.125rem;
		color: #6b7280;
		margin: 0 0 1rem 0;
	}

	.profile-bio {
		font-size: 1rem;
		color: #374151;
		line-height: 1.6;
		margin: 0 0 1.5rem 0;
	}

	.profile-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.meta-icon {
		font-size: 1rem;
	}

	/* Online Status Styles */
	.online-status {
		font-weight: 500;
	}

	.status-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		display: inline-block;
		margin-right: 0.25rem;
	}

	.status-indicator.online {
		background-color: #10b981;
		box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
	}

	.status-indicator.offline {
		background-color: #6b7280;
	}

	.status-text {
		color: #374151;
	}

	.never-logged-in {
		color: #f59e0b;
		font-weight: 500;
	}

	.profile-actions {
		display: flex;
		justify-content: flex-end;
	}

	.chat-btn {
		background: #6366f1;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.75rem 1.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.chat-btn:hover {
		background: #5856eb;
	}

	.swap-history-section {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.section-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.swap-stats {
		display: flex;
		gap: 2rem;
	}

	.stat {
		text-align: center;
	}

	.stat-number {
		display: block;
		font-size: 1.5rem;
		font-weight: 700;
		color: #6366f1;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.empty-history {
		text-align: center;
		padding: 3rem 1rem;
		color: #6b7280;
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-history p {
		margin: 0.5rem 0;
	}

	.empty-subtitle {
		font-size: 0.875rem;
		opacity: 0.8;
	}

	.swap-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.swap-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		transition: border-color 0.15s ease;
	}

	.swap-item:hover {
		border-color: #d1d5db;
	}

	.swap-info {
		flex: 1;
	}

	.book-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		margin: 0 0 0.5rem 0;
	}

	.swap-details {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.875rem;
		color: #6b7280;
		margin-bottom: 0.25rem;
	}

	.completion-date {
		font-size: 0.75rem;
		color: #10b981;
		font-weight: 500;
	}

	.swap-status {
		flex-shrink: 0;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	@media (max-width: 640px) {
		.profile-container {
			padding: 1rem;
		}

		.profile-info {
			flex-direction: column;
			text-align: center;
		}

		.profile-meta {
			justify-content: center;
		}

		.section-header {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.swap-stats {
			align-self: stretch;
			justify-content: space-around;
		}

		.swap-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}
	}
</style>
