<script lang="ts">
	import { page } from '$app/stores';
	import { pendingSwapCounts } from '$lib/stores/swaps';
	
	$: navItems = [
		{
			name: 'Dashboard',
			href: '/app',
			icon: 'home'
		},
		{
			name: 'Profile',
			href: '/app/profile',
			icon: 'user'
		},
		{
			name: 'My Books',
			href: '/app/books',
			icon: 'book'
		},
		{
			name: 'Discover Books',
			href: '/app/discover',
			icon: 'search'
		},
		{
			name: 'Cocktails',
			href: '/app/cocktails',
			icon: 'cocktail'
		},
		{
			name: 'Swap Requests',
			href: '/app/swaps',
			icon: 'exchange',
			badgeCount: $pendingSwapCounts.incoming
		}
	];

	const icons: Record<string, string> = {
		home: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>`,
		user: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>`,
		book: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>`,
		search: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>`,
		cocktail: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12V7a1 1 0 011-1h4l3 3h7a1 1 0 011 1v5M5 12l6 6m0-6l-6 6m6-6v6a1 1 0 001 1h4a1 1 0 001-1v-6"></path>`,
		exchange: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>`,
		settings: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>`
	};

	$: currentPath = $page.url.pathname;
</script>

<nav class="horizontal-nav">
	<div class="nav-container">
		<div class="nav-brand">
			<a href="/" class="brand-link">
				<h1 class="brand-title">📚 Booze & Books</h1>
			</a>
		</div>
		
		<ul class="nav-items">
			{#each navItems as item}
				<li class="nav-item">
					<a
						href={item.href}
						class="nav-link {
							currentPath === item.href || 
							(item.href === '/app/books' && currentPath.startsWith('/app/books')) ||
							(item.href === '/app/discover' && currentPath.startsWith('/app/discover')) ||
							(item.href === '/app/swaps' && currentPath.startsWith('/app/swaps')) ||
							(item.href === '/app/cocktails' && currentPath.startsWith('/app/cocktails'))
								? 'active'
								: ''
						}"
					>
						<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							{@html icons[item.icon]}
						</svg>
						<span class="nav-text">{item.name}</span>
						{#if item.badgeCount && item.badgeCount > 0}
							<span class="nav-badge">
								{item.badgeCount}
							</span>
						{/if}
					</a>
				</li>
			{/each}
			
			<!-- User Profile, Notifications, and Sign Out -->
			{#if user}
				<li class="nav-item">
					<NotificationBell />
				</li>
				<li class="nav-item">
					<a href="/app/profile" class="nav-link profile-link" title="Profile">
						<div class="user-avatar">
							{#if avatarUrl}
								<img src={avatarUrl} alt="Profile" class="avatar-img" />
							{:else}
								<div class="avatar-placeholder">{initials}</div>
							{/if}
						</div>
						<span class="nav-text">Profile</span>
					</a>
				</li>
				<li class="nav-item">
					<form method="POST" action="/auth/logout" style="display: inline;">
						<button type="submit" class="nav-link logout-btn">
							<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
							</svg>
							<span class="nav-text">Sign Out</span>
						</button>
					</form>
				</li>
			{/if}
		</ul>
	</div>
</nav>

<style>
	/* Books & Booze Theme Colors */
	:global(:root) {
		--primary-burgundy: #8B2635;
		--secondary-gold: #D4AF37;
		--accent-cream: #F5F5DC;
		--warm-brown: #8B4513;
		--deep-red: #722F37;
		--light-cream: #FFF8DC;
	}

	.horizontal-nav {
		background: linear-gradient(135deg, var(--primary-burgundy) 0%, var(--deep-red) 100%);
		box-shadow: 0 2px 8px rgba(139, 38, 53, 0.3);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.nav-container {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 2rem;
		height: 4rem;
	}

	.nav-brand {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		min-width: fit-content;
		margin-right: 2rem;
	}

	.brand-link {
		text-decoration: none;
		color: inherit;
		transition: all 0.3s ease;
		padding: 0.5rem;
		border-radius: 0.5rem;
	}

	.brand-link:hover {
		background: rgba(212, 175, 55, 0.2);
		transform: translateY(-1px);
	}

	.brand-title {
		color: var(--accent-cream);
		font-size: 0.9rem;
		font-weight: 600;
		font-family: inherit;
		margin: 0;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
		white-space: nowrap;
	}

	.brand-link:hover .brand-title {
		color: var(--secondary-gold);
	}

	.nav-items {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.nav-item {
		position: relative;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		color: var(--light-cream);
		text-decoration: none;
		border-radius: 0.5rem;
		transition: all 0.3s ease;
		font-weight: 500;
		position: relative;
		overflow: hidden;
	}

	.nav-link:hover {
		background: rgba(212, 175, 55, 0.2);
		color: var(--secondary-gold);
		transform: translateY(-1px);
	}

	.nav-link.active {
		background: var(--secondary-gold);
		color: var(--primary-burgundy);
		font-weight: 600;
		box-shadow: 0 2px 8px rgba(212, 175, 55, 0.4);
	}

	.nav-link.active:hover {
		background: var(--secondary-gold);
		color: var(--primary-burgundy);
		transform: translateY(-1px);
	}

	.nav-icon {
		width: 1.25rem !important;
		height: 1.25rem !important;
		min-width: 1.25rem !important;
		min-height: 1.25rem !important;
		max-width: 1.25rem !important;
		max-height: 1.25rem !important;
		flex-shrink: 0;
	}

	.nav-text {
		font-size: 0.9rem;
		white-space: nowrap;
	}

	.nav-badge {
		background: #dc2626;
		color: white;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.125rem 0.375rem;
		border-radius: 9999px;
		min-width: 1.25rem;
		height: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	/* Profile Avatar Styles */
	.profile-link {
		position: relative;
	}

	.profile-link.active,
	.profile-link:hover {
		background: rgba(212, 175, 55, 0.2);
		color: var(--secondary-gold);
	}

	.user-avatar {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--accent-cream);
		border: 2px solid var(--secondary-gold);
		flex-shrink: 0;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-placeholder {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--primary-burgundy);
	}

	/* Logout Button Styles */
	.logout-btn {
		background: none;
		border: 1px solid rgba(245, 245, 220, 0.3);
		color: var(--light-cream);
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		transition: all 0.3s ease;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.logout-btn:hover {
		background: rgba(220, 38, 38, 0.2);
		border-color: rgba(220, 38, 38, 0.5);
		color: #fca5a5;
		transform: translateY(-1px);
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.nav-container {
			padding: 0 1rem;
		}
		
		.nav-items {
			gap: 0.25rem;
		}
		
		.nav-link {
			padding: 0.5rem 0.75rem;
		}
		
		.nav-text {
			display: none;
		}
		
		.brand-title {
			font-size: 0.8rem;
		}
	}

	@media (max-width: 480px) {
		.nav-container {
			flex-direction: column;
			height: auto;
			padding: 1rem;
			gap: 1rem;
		}
		
		.nav-text {
			display: inline;
		}
		
		.nav-items {
			width: 100%;
			justify-content: center;
			flex-wrap: wrap;
		}
	}
</style>
