<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';
	import { profile, profileStore } from '$lib/stores/profile';
	import { ProfileService } from '$lib/services/profileService';
	import { realtimeService } from '$lib/services/realtimeService';
	import NotificationBell from '../components/notifications/NotificationBell.svelte';
	import DashboardNav from '../components/dashboard/DashboardNav.svelte';
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
	$: if (user && user.id && !realtimeUnsubscribers) {
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
	$: user = data.user ?? $auth.user;
	$: avatarUrl = ProfileService.getAvatarUrl($profile?.avatar_url || null);
	$: initials = ProfileService.generateInitials(
		$profile?.full_name || null,
		$profile?.username || null,
		user?.email
	);
	
	// Check if we're on an /app route (which has its own layout with navigation)
	$: isAppRoute = $page.url.pathname.startsWith('/app');
</script>

<div id="app">
	{#if user && !isAppRoute}
		<!-- Show DashboardNav for authenticated users only on non-app routes (like homepage) -->
		<DashboardNav />
	{:else if !user}
		<!-- Show simple nav for non-authenticated users -->
		<nav class="main-nav">
			<div class="nav-brand">
				<a href="/" class="brand-link">
					📚 Booze & Books
				</a>
			</div>
			
			<div class="nav-auth">
				<a href="/auth/login" class="nav-link">Sign In</a>
				<a href="/auth/signup" class="nav-link primary">Sign Up</a>
			</div>
		</nav>
	{/if}
	
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
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		border-bottom: 1px solid rgba(212, 175, 55, 0.2);
		padding: 1rem 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		box-shadow: 0 2px 8px rgba(139, 38, 53, 0.3);
	}

	.nav-brand {
		flex-shrink: 0;
	}

	.brand-link {
		color: #F5F5DC;
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 700;
		font-family: 'Georgia', serif;
		transition: all 0.2s ease;
		padding: 0.5rem;
		border-radius: 8px;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
	}

	.brand-link:hover {
		color: #D4AF37;
		background-color: rgba(255, 255, 255, 0.1);
		transform: translateY(-1px);
	}

	.nav-user {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.user-profile-link {
		text-decoration: none;
		color: inherit;
		border-radius: 8px;
		transition: all 0.2s ease;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
	}

	.user-profile-link:hover {
		background-color: rgba(255, 255, 255, 0.1);
		transform: translateY(-1px);
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
		color: #FFF8DC;
		font-weight: 600;
		font-size: 0.9rem;
		line-height: 1.2;
	}

	.user-email {
		color: #F5F5DC;
		font-size: 0.8rem;
		line-height: 1.2;
		opacity: 0.9;
	}

	.nav-auth {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.nav-link {
		color: #F5F5DC;
		text-decoration: none;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.nav-link:hover {
		background-color: rgba(212, 175, 55, 0.2);
		color: #D4AF37;
	}

	.nav-link.primary {
		background: linear-gradient(135deg, #D4AF37 0%, #B8941F 100%);
		color: #8B2635;
		font-weight: 600;
	}

	.nav-link.primary:hover {
		background: linear-gradient(135deg, #B8941F 0%, #D4AF37 100%);
		transform: translateY(-1px);
	}

	.logout-btn {
		background: none;
		border: 1px solid rgba(245, 245, 220, 0.3);
		color: #F5F5DC;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.logout-btn:hover {
		background: rgba(212, 175, 55, 0.1);
		border-color: rgba(212, 175, 55, 0.5);
		color: #D4AF37;
	}

	:global(.container) {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}
</style>
