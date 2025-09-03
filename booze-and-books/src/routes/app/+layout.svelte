<script lang="ts">
	import DashboardNav from '$components/dashboard/DashboardNav.svelte';
	import { user } from '$lib/stores/auth';
</script>

{#if $user}
	<div class="min-h-screen bg-gray-50 flex">
		<div class="w-64 bg-white shadow-sm">
			<DashboardNav />
		</div>
		
		<div class="flex-1 flex flex-col">
			<main class="flex-1 p-8">
				<slot />
			</main>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
	</div>
{/if}