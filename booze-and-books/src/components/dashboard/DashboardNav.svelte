<script lang="ts">
	import { page } from '$app/stores';
	import { pendingIncomingCount } from '$lib/stores/swaps';
	
	const navItems = [
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
			name: 'Swap Requests',
			href: '/app/swaps',
			icon: 'exchange',
			badgeCount: pendingIncomingCount
		},
		{
			name: 'Settings',
			href: '/app/settings',
			icon: 'settings',
			disabled: true
		}
	];

	const icons = {
		home: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>`,
		user: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>`,
		book: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>`,
		search: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>`,
		exchange: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>`,
		settings: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>`
	};

	$: currentPath = $page.url.pathname;
</script>

<nav class="bg-white shadow-sm border-r border-gray-200 h-full">
	<div class="p-4">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Dashboard</h2>
		<ul class="space-y-1">
			{#each navItems as item}
				<li>
					{#if item.disabled}
						<div class="flex items-center px-3 py-2 text-sm text-gray-400 rounded-md cursor-not-allowed">
							<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								{@html icons[item.icon]}
							</svg>
							{item.name}
							<span class="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Soon</span>
						</div>
					{:else}
						<a
							href={item.href}
							class="flex items-center px-3 py-2 text-sm rounded-md transition-colors {
								currentPath === item.href || 
								(item.href === '/app/books' && currentPath.startsWith('/app/books')) ||
								(item.href === '/app/discover' && currentPath.startsWith('/app/discover')) ||
								(item.href === '/app/swaps' && currentPath.startsWith('/app/swaps'))
									? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
									: 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
							}"
						>
							<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								{@html icons[item.icon]}
							</svg>
							{item.name}
							{#if item.badgeCount && $item.badgeCount > 0}
								<span class="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
									{$item.badgeCount}
								</span>
							{/if}
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</nav>