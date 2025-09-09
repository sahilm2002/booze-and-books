<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { notificationStore, allNotifications } from '$lib/stores/notifications';
	import type { Notification } from '$lib/types/notification';
	import NotificationDetailsModal from '$lib/components/notifications/NotificationDetailsModal.svelte';

	let isLoading = true;
	let currentPage = 1;
	const itemsPerPage = 10;
	let selectedNotification: Notification | null = null;
	let showDetailsModal = false;

	$: paginatedNotifications = $allNotifications.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	);
	$: totalPages = Math.ceil($allNotifications.length / itemsPerPage);
	$: unreadNotifications = $allNotifications.filter(n => !n.is_read);

	onMount(async () => {
		document.title = 'Notifications - Booze & Books';
		
		if (!$auth.user) {
			goto('/auth/login?redirectTo=/app/notifications');
			return;
		}

		try {
			await notificationStore.loadAllNotifications();
		} catch (error) {
			console.error('Failed to load notifications:', error);
		} finally {
			isLoading = false;
		}
	});

	function getNotificationIcon(type: string): string {
		switch (type) {
			case 'SWAP_REQUEST':
				return 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';
			case 'SWAP_ACCEPTED':
				return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'SWAP_COUNTER_OFFER':
				return 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4';
			case 'SWAP_CANCELLED':
				return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'SWAP_COMPLETED':
				return 'M5 13l4 4L19 7';
			default:
				return 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';
		}
	}

	function getNotificationColor(type: string): string {
		switch (type) {
			case 'SWAP_REQUEST':
				return 'text-blue-600 bg-blue-100';
			case 'SWAP_ACCEPTED':
				return 'text-green-600 bg-green-100';
			case 'SWAP_COUNTER_OFFER':
				return 'text-yellow-600 bg-yellow-100';
			case 'SWAP_CANCELLED':
				return 'text-red-600 bg-red-100';
			case 'SWAP_COMPLETED':
				return 'text-purple-600 bg-purple-100';
			default:
				return 'text-gray-600 bg-gray-100';
		}
	}

	function formatRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
		
		if (diffInMinutes < 1) return 'Just now';
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
		
		const diffInHours = Math.floor(diffInMinutes / 60);
		if (diffInHours < 24) return `${diffInHours}h ago`;
		
		const diffInDays = Math.floor(diffInHours / 24);
		if (diffInDays < 7) return `${diffInDays}d ago`;
		
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: diffInDays > 365 ? 'numeric' : undefined
		}).format(date);
	}

	async function handleNotificationClick(notification: Notification) {
		if (!notification.is_read) {
			await notificationStore.markAsRead(notification.id);
		}
		selectedNotification = notification;
		showDetailsModal = true;
	}

	async function markAsRead(notification: Notification) {
		if (!notification.is_read) {
			await notificationStore.markAsRead(notification.id);
		}
	}

	async function markAllAsRead() {
		await notificationStore.markAllAsRead();
	}

	function nextPage() {
		if (currentPage < totalPages) {
			currentPage++;
		}
	}

	function prevPage() {
		if (currentPage > 1) {
			currentPage--;
		}
	}

	function goToPage(page: number) {
		currentPage = page;
	}
</script>

<div class="notifications-page">
	<!-- Header -->
	<div class="page-header card">
		<div class="header-content">
			<div class="flex items-center space-x-4">
				<button
					type="button"
					on:click={() => history.back()}
					class="back-btn"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<h1 class="page-title">Notifications</h1>
			</div>
			
			{#if unreadNotifications.length > 0}
				<button
					type="button"
					on:click={markAllAsRead}
					class="btn-secondary"
				>
					Mark all as read ({unreadNotifications.length})
				</button>
			{/if}
		</div>
	</div>

	<!-- Main Content -->
	<div class="content-container">
		{#if isLoading}
			<!-- Loading State -->
			<div class="card loading-card">
				<div class="flex items-center justify-center">
					<div class="loading-spinner"></div>
					<span class="ml-3 loading-text">Loading notifications...</span>
				</div>
			</div>
		{:else if $allNotifications.length === 0}
			<!-- Empty State -->
			<div class="card empty-card">
				<div class="empty-icon">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
					</svg>
				</div>
				<h3 class="empty-title">No notifications yet</h3>
				<p class="empty-description">You'll receive notifications when someone requests to swap books with you.</p>
				<a href="/app/discover" class="btn-primary">
					Discover Books
				</a>
			</div>
		{:else}
			<!-- Notifications List -->
			<div class="card notifications-list">
				{#each paginatedNotifications as notification (notification.id)}
					<div
						class="notification-item"
						class:unread={!notification.is_read}
						on:click={() => handleNotificationClick(notification)}
					>
						<div class="notification-content">
							<div class="flex items-start space-x-4">
								<!-- Notification Icon or Book Cover -->
								{#if notification.data?.book_cover}
									<div class="book-cover">
										<img 
											src={notification.data.book_cover} 
											alt={notification.data?.book_title || 'Book cover'}
											loading="lazy"
											on:error={(e) => {
												e.target.style.display = 'none';
												e.target.parentElement.innerHTML = `
													<div class="notification-icon ${getNotificationColor(notification.type)}">
														<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${getNotificationIcon(notification.type)}" />
														</svg>
													</div>
												`;
											}}
										/>
									</div>
								{:else}
									<div class="notification-icon {getNotificationColor(notification.type)}">
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getNotificationIcon(notification.type)} />
										</svg>
									</div>
								{/if}

								<!-- Content -->
								<div class="flex-1 min-w-0">
									<div class="flex items-start justify-between">
										<div class="flex-1">
											<p class="notification-title">
												{notification.title}
											</p>
											<p class="notification-message">
												{notification.message}
											</p>
											
											<!-- Book details if available -->
											{#if notification.data?.book_title}
												<div class="book-details">
													<span class="book-title">{notification.data.book_title}</span>
													{#if notification.data?.book_authors && notification.data.book_authors.length > 0}
														<span class="book-authors">by {notification.data.book_authors.join(', ')}</span>
													{/if}
													{#if notification.data?.book_condition}
														<span class="book-condition">• {notification.data.book_condition}</span>
													{/if}
												</div>
											{/if}
											
											<div class="notification-meta">
												<span class="timestamp">{formatRelativeTime(notification.created_at)}</span>
												{#if !notification.is_read}
													<span class="unread-badge">New</span>
												{/if}
											</div>
										</div>
										
										<!-- Action Button -->
										<div class="notification-actions">
											{#if !notification.is_read}
												<button
													type="button"
													on:click|stopPropagation={() => markAsRead(notification)}
													class="mark-read-btn"
												>
													Mark as read
												</button>
											{/if}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="pagination-container">
					<div class="pagination-info">
						Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, $allNotifications.length)} of {$allNotifications.length} notifications
					</div>
					
					<div class="pagination-controls">
						<button
							type="button"
							on:click={prevPage}
							disabled={currentPage === 1}
							class="pagination-btn"
							class:disabled={currentPage === 1}
						>
							Previous
						</button>
						
						{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
							{#if page === currentPage}
								<button
									type="button"
									class="pagination-btn current"
								>
									{page}
								</button>
							{:else if page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2}
								<button
									type="button"
									on:click={() => goToPage(page)}
									class="pagination-btn"
								>
									{page}
								</button>
							{:else if Math.abs(page - currentPage) === 3}
								<span class="pagination-ellipsis">...</span>
							{/if}
						{/each}
						
						<button
							type="button"
							on:click={nextPage}
							disabled={currentPage === totalPages}
							class="pagination-btn"
							class:disabled={currentPage === totalPages}
						>
							Next
						</button>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<!-- Notification Details Modal -->
{#if showDetailsModal && selectedNotification}
	<NotificationDetailsModal
		notification={selectedNotification}
		on:close={() => { showDetailsModal = false; selectedNotification = null; }}
	/>
{/if}

<style>
	/* Books & Booze Theme Variables */
	:root {
		--primary-burgundy: #8B2635;
		--secondary-gold: #D4AF37;
		--accent-cream: #F5F5DC;
		--warm-brown: #8B4513;
		--deep-red: #722F37;
		--light-cream: #FFF8DC;
		--parchment: #F4F1E8;
	}

	/* Main Layout */
	.notifications-page {
		min-height: 100vh;
		padding-bottom: 2rem;
	}

	/* Page Header */
	.page-header {
		margin-bottom: 2rem;
		padding: 1.5rem 2rem;
		background: linear-gradient(135deg, var(--light-cream) 0%, white 100%);
		border-bottom: 2px solid var(--accent-cream);
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: 1200px;
		margin: 0 auto;
		gap: 1rem;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 700;
		color: var(--primary-burgundy);
		margin: 0;
		text-shadow: 1px 1px 2px rgba(139, 38, 53, 0.1);
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: var(--accent-cream);
		border: 1px solid var(--secondary-gold);
		border-radius: 50%;
		color: var(--warm-brown);
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.back-btn:hover {
		background: var(--secondary-gold);
		color: var(--light-cream);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(212, 175, 55, 0.3);
	}

	.btn-secondary {
		background: linear-gradient(135deg, var(--secondary-gold) 0%, #B8941A 100%);
		color: var(--deep-red);
		border: none;
		border-radius: 0.5rem;
		padding: 0.6rem 1.2rem;
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn-secondary:hover {
		background: linear-gradient(135deg, #B8941A 0%, var(--secondary-gold) 100%);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(212, 175, 55, 0.3);
	}

	/* Content Container */
	.content-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
	}

	/* Loading State */
	.loading-card {
		padding: 3rem 2rem;
		text-align: center;
		background: linear-gradient(135deg, var(--light-cream) 0%, white 100%);
	}

	.loading-spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid var(--accent-cream);
		border-top: 3px solid var(--primary-burgundy);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.loading-text {
		color: var(--warm-brown);
		font-weight: 500;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Empty State */
	.empty-card {
		padding: 4rem 2rem;
		text-align: center;
		background: linear-gradient(135deg, var(--light-cream) 0%, white 100%);
	}

	.empty-icon {
		width: 4rem;
		height: 4rem;
		color: var(--secondary-gold);
		margin: 0 auto 1.5rem;
	}

	.empty-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--primary-burgundy);
		margin-bottom: 1rem;
	}

	.empty-description {
		color: var(--warm-brown);
		font-size: 1.1rem;
		margin-bottom: 2rem;
		line-height: 1.6;
	}

	/* Notifications List */
	.notifications-list {
		background: linear-gradient(135deg, var(--light-cream) 0%, white 100%);
		padding: 0;
	}

	.notification-item {
		border-bottom: 1px solid var(--accent-cream);
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.notification-item:last-child {
		border-bottom: none;
	}

	.notification-item:hover {
		background: linear-gradient(135deg, var(--parchment) 0%, var(--light-cream) 100%);
		transform: translateX(4px);
	}

	.notification-item.unread {
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(139, 38, 53, 0.05) 100%);
		border-left: 4px solid var(--secondary-gold);
	}

	.notification-item.unread:hover {
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(139, 38, 53, 0.08) 100%);
	}

	.notification-content {
		padding: 1.5rem;
	}

	/* Book Cover */
	.book-cover {
		width: 3rem;
		height: 4rem;
		border-radius: 0.375rem;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(139, 38, 53, 0.2);
		border: 1px solid var(--accent-cream);
	}

	.book-cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Notification Icon */
	.notification-icon {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 4px rgba(139, 38, 53, 0.1);
	}

	.notification-icon svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	/* Icon Colors */
	.text-blue-600.bg-blue-100 {
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.1) 100%);
		color: var(--warm-brown);
	}

	.text-green-600.bg-green-100 {
		background: linear-gradient(135deg, rgba(139, 38, 53, 0.2) 0%, rgba(139, 38, 53, 0.1) 100%);
		color: var(--deep-red);
	}

	.text-yellow-600.bg-yellow-100 {
		background: linear-gradient(135deg, var(--secondary-gold) 0%, rgba(212, 175, 55, 0.3) 100%);
		color: var(--warm-brown);
	}

	.text-red-600.bg-red-100 {
		background: linear-gradient(135deg, var(--deep-red) 0%, rgba(114, 47, 55, 0.3) 100%);
		color: var(--light-cream);
	}

	.text-purple-600.bg-purple-100 {
		background: linear-gradient(135deg, var(--primary-burgundy) 0%, rgba(139, 38, 53, 0.3) 100%);
		color: var(--light-cream);
	}

	/* Content Styles */
	.notification-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--primary-burgundy);
		margin-bottom: 0.5rem;
		line-height: 1.4;
	}

	.notification-message {
		font-size: 0.95rem;
		color: var(--warm-brown);
		margin-bottom: 1rem;
		line-height: 1.5;
	}

	.book-details {
		background: var(--parchment);
		border: 1px solid var(--accent-cream);
		border-radius: 0.5rem;
		padding: 0.75rem;
		margin-bottom: 1rem;
	}

	.book-title {
		font-weight: 600;
		color: var(--primary-burgundy);
		display: block;
		margin-bottom: 0.25rem;
	}

	.book-authors {
		color: var(--warm-brown);
		font-size: 0.875rem;
		display: block;
	}

	.book-condition {
		color: var(--deep-red);
		font-size: 0.875rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.notification-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.timestamp {
		font-size: 0.8rem;
		color: var(--warm-brown);
		opacity: 0.8;
	}

	.unread-badge {
		background: linear-gradient(135deg, var(--secondary-gold) 0%, #B8941A 100%);
		color: var(--deep-red);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.6rem;
		border-radius: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Actions */
	.notification-actions {
		margin-left: 1rem;
	}

	.mark-read-btn {
		background: transparent;
		border: 1px solid var(--secondary-gold);
		color: var(--warm-brown);
		font-size: 0.8rem;
		font-weight: 500;
		padding: 0.4rem 0.8rem;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.mark-read-btn:hover {
		background: var(--secondary-gold);
		color: var(--deep-red);
		transform: translateY(-1px);
	}

	/* Pagination */
	.pagination-container {
		margin-top: 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.pagination-info {
		color: var(--warm-brown);
		font-size: 0.9rem;
		font-weight: 500;
	}

	.pagination-controls {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.pagination-btn {
		background: white;
		border: 1px solid var(--accent-cream);
		color: var(--warm-brown);
		font-size: 0.875rem;
		font-weight: 500;
		padding: 0.6rem 1rem;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.3s ease;
		min-width: 2.5rem;
		text-align: center;
	}

	.pagination-btn:hover:not(.disabled) {
		background: var(--accent-cream);
		border-color: var(--secondary-gold);
		transform: translateY(-1px);
	}

	.pagination-btn.current {
		background: linear-gradient(135deg, var(--primary-burgundy) 0%, var(--deep-red) 100%);
		color: var(--light-cream);
		border-color: var(--primary-burgundy);
		font-weight: 600;
	}

	.pagination-btn.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pagination-ellipsis {
		color: var(--warm-brown);
		padding: 0.6rem;
		font-size: 0.875rem;
	}

	/* Responsive Design */
	@media (max-width: 640px) {
		.header-content {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.page-title {
			text-align: center;
			font-size: 1.5rem;
		}

		.content-container {
			padding: 0 1rem;
		}

		.notification-content {
			padding: 1rem;
		}

		.notification-item.unread {
			border-left: 2px solid var(--secondary-gold);
		}

		.book-cover {
			width: 2.5rem;
			height: 3.5rem;
		}

		.pagination-container {
			flex-direction: column;
			align-items: center;
		}

		.pagination-info {
			text-align: center;
		}
	}

	/* Utility Classes */
	.flex {
		display: flex;
	}

	.items-center {
		align-items: center;
	}

	.items-start {
		align-items: flex-start;
	}

	.justify-center {
		justify-content: center;
	}

	.justify-between {
		justify-content: space-between;
	}

	.space-x-4 > * + * {
		margin-left: 1rem;
	}

	.flex-1 {
		flex: 1 1 0%;
	}

	.flex-shrink-0 {
		flex-shrink: 0;
	}

	.min-w-0 {
		min-width: 0;
	}

	.ml-3 {
		margin-left: 0.75rem;
	}

	.text-center {
		text-align: center;
	}
</style>