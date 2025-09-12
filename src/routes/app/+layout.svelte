<script lang="ts">
	import DashboardNav from '../../components/dashboard/DashboardNav.svelte';
	import { auth } from '$lib/stores/auth';
</script>

{#if $auth.user}
	<div class="app-layout">
		<DashboardNav />
		<main class="main-content">
			<slot />
		</main>
	</div>
{:else}
	<div class="loading-screen">
		<div class="loading-spinner"></div>
	</div>
{/if}

<style>
	/* Books & Booze Theme */
	:global(:root) {
		--primary-burgundy: #8B2635;
		--secondary-gold: #D4AF37;
		--accent-cream: #F5F5DC;
		--warm-brown: #8B4513;
		--deep-red: #722F37;
		--light-cream: #FFF8DC;
		--parchment: #F4F1E8;
	}

	.app-layout {
		min-height: 100vh;
		background: linear-gradient(135deg, var(--parchment) 0%, var(--light-cream) 50%, var(--accent-cream) 100%);
	}

	.main-content {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	.loading-screen {
		min-height: 100vh;
		background: linear-gradient(135deg, var(--parchment) 0%, var(--light-cream) 50%, var(--accent-cream) 100%);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.loading-spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid var(--accent-cream);
		border-top: 3px solid var(--primary-burgundy);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Global styles for consistent theming */
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: var(--parchment);
		color: var(--warm-brown);
	}

	:global(.card) {
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px -1px rgba(139, 38, 53, 0.1), 0 2px 4px -1px rgba(139, 38, 53, 0.06);
		border: 1px solid var(--accent-cream);
	}

	:global(.btn-primary) {
		background: linear-gradient(135deg, var(--primary-burgundy) 0%, var(--deep-red) 100%);
		color: var(--light-cream);
		border: none;
		border-radius: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-weight: 600;
		transition: all 0.3s ease;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	:global(.btn-primary:hover) {
		background: linear-gradient(135deg, var(--deep-red) 0%, var(--primary-burgundy) 100%);
		transform: translateY(-1px);
		box-shadow: 0 6px 12px rgba(139, 38, 53, 0.3);
	}

	:global(.btn-secondary) {
		background: linear-gradient(135deg, var(--secondary-gold) 0%, #B8941F 100%);
		color: var(--primary-burgundy);
		border: none;
		border-radius: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-weight: 600;
		transition: all 0.3s ease;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	:global(.btn-secondary:hover) {
		background: linear-gradient(135deg, #B8941F 0%, var(--secondary-gold) 100%);
		transform: translateY(-1px);
		box-shadow: 0 6px 12px rgba(212, 175, 55, 0.3);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.main-content {
			padding: 1rem;
		}
	}
</style>