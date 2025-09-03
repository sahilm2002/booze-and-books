<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { profile, profileStore } from '$lib/stores/profile';
	import { ProfileService } from '$lib/services/profileService';
	import { realtimeService } from '$lib/services/realtimeService';
	import NotificationBell from '$lib/components/notifications/NotificationBell.svelte';
	import RealtimeStatus from '$lib/components/common/RealtimeStatus.svelte';
	import type { PageData } from './$types';
	export let data: PageData;

	// initialize store on client
	onMount(() => {
		auth.initialize(data.session);
		if (data.profile) {
			profile.set(data.profile);
		}
	});

	onDestroy(() => {
		auth.teardown();
		// Cleanup realtime subscriptions
		if (realtimeUnsubscribers) {
			realtimeUnsubscribers.unsubscribeNotifications();
			realtimeUnsubscribers.unsubscribeSwaps();
			realtimeUnsubscribers.unsubscribeBooks();
			realtimeUnsubscribers.unsubscribeConnection();
		}
	});

	// Realtime service cleanup functions
	let realtimeUnsubscribers: {
		unsubscribeNotifications: () => void;
		unsubscribeSwaps: () => void;
		unsubscribeBooks: () => void;
		unsubscribeConnection: () => void;
	} | null = null;

	// Initialize realtime services when user is available
	$: if (user?.id && !realtimeUnsubscribers) {
		realtimeService.initializeForUser(user.id).then((unsubscribers) => {
			realtimeUnsubscribers = unsubscribers;
		});
	}

	// Cleanup realtime services on logout
	$: if (!user && realtimeUnsubscribers) {
		realtimeUnsubscribers.unsubscribeNotifications();
		realtimeUnsubscribers.unsubscribeSwaps();
		realtimeUnsubscribers.unsubscribeBooks();
		realtimeUnsubscribers.unsubscribeConnection();
		realtimeUnsubscribers = null;
	}

	// SSR-safe user reference
	$: user = data.session?.user ?? $auth.user;
	$: avatarUrl = ProfileService.getAvatarUrl($profile?.avatar_url);
	$: initials = ProfileService.generateInitials(
		$profile?.full_name,
		$profile?.username,
		user?.email
	);
</script>

<div id="app">
	<nav class="main-nav">
		{#if user}
			<div class="nav-user">
				<div class="user-profile">
					<div class="user-avatar">
						{#if avatarUrl}
							<img src={avatarUrl} alt="Profile" class="avatar-img" />
						{:else}
							<div class="avatar-placeholder">{initials}</div>
						{/if}
					</div>
					<div class="user-info">
						<span class="user-name">
							{$profile?.full_name || $profile?.username || user.email}
						</span>
						<span class="user-email">{user.email}</span>
					</div>
				</div>
				<RealtimeStatus />
				<a href="/app" class="nav-link">Dashboard</a>
				<a href="/app/profile" class="nav-link">Profile</a>
				<NotificationBell />
				<form method="POST" action="/auth/logout" style="display: inline;">
					<button type="submit" class="logout-btn">Sign Out</button>
				</form>
			</div>
		{:else}
			<div class="nav-auth">
				<a href="/auth/login" class="nav-link">Sign In</a>
				<a href="/auth/signup" class="nav-link primary">Sign Up</a>
			</div>
		{/if}
	</nav>
	
	<slot />
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background-color: #f8f9fa;
		color: #212529;
	}

	#app {
		min-height: 100vh;
	}

	.main-nav {
		background: white;
		border-bottom: 1px solid #e2e8f0;
		padding: 1rem 2rem;
		display: flex;
		justify-content: flex-end;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.nav-user {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.user-profile {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-right: 1rem;
	}

	.user-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #e2e8f0;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-placeholder {
		font-size: 14px;
		font-weight: 600;
		color: #4a5568;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.user-name {
		color: #2d3748;
		font-weight: 600;
		font-size: 0.9rem;
		line-height: 1.2;
	}

	.user-email {
		color: #718096;
		font-size: 0.8rem;
		line-height: 1.2;
	}

	.nav-auth {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.nav-link {
		color: #4299e1;
		text-decoration: none;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		transition: background-color 0.2s;
	}

	.nav-link:hover {
		background-color: #f7fafc;
	}

	.nav-link.primary {
		background: #4299e1;
		color: white;
	}

	.nav-link.primary:hover {
		background: #3182ce;
	}

	.logout-btn {
		background: none;
		border: 1px solid #e2e8f0;
		color: #718096;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.logout-btn:hover {
		background: #f7fafc;
		border-color: #cbd5e0;
	}

	:global(.container) {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}
</style>