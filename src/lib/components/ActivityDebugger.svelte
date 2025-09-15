<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { auth } from '$lib/stores/auth';
	
	let remainingTime = 0;
	let timeSinceActivity = 0;
	let debugInterval: NodeJS.Timeout | null = null;
	
	onMount(() => {
		debugInterval = setInterval(() => {
			const activityService = auth.getActivityService();
			remainingTime = activityService.getRemainingTime();
			timeSinceActivity = activityService.getTimeSinceLastActivity();
		}, 1000);
		
		return () => {
			if (debugInterval) {
				clearInterval(debugInterval);
			}
		};
	});
	
	onDestroy(() => {
		if (debugInterval) {
			clearInterval(debugInterval);
		}
	});
	
	function formatTime(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		
		if (hours > 0) {
			return `${hours}h ${minutes}m ${seconds}s`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds}s`;
		} else {
			return `${seconds}s`;
		}
	}
	
	function triggerActivity() {
		const activityService = auth.getActivityService();
		activityService.recordActivity();
	}
	
	function forceLogout() {
		auth.signOut();
	}
</script>

<!-- Only show in development mode -->
{#if import.meta.env.DEV}
	<div class="activity-debugger">
		<h4>🐛 Activity Debug (Dev Only)</h4>
		<div class="debug-info">
			<div class="debug-item">
				<strong>Time since last activity:</strong>
				<span class="debug-value">{formatTime(timeSinceActivity)}</span>
			</div>
			<div class="debug-item">
				<strong>Time until auto-logout:</strong>
				<span class="debug-value">
					{formatTime(remainingTime)}
				</span>
			</div>
		</div>
		<div class="debug-actions">
			<button type="button" class="debug-btn" on:click={triggerActivity}>
				Record Activity
			</button>
			<button type="button" class="debug-btn danger" on:click={forceLogout}>
				Force Logout
			</button>
		</div>
	</div>
{/if}

<style>
	.activity-debugger {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		background: rgba(0, 0, 0, 0.8);
		color: white;
		padding: 1rem;
		border-radius: 8px;
		font-size: 0.75rem;
		font-family: monospace;
		z-index: 9999;
		min-width: 280px;
		backdrop-filter: blur(4px);
	}
	
	.activity-debugger h4 {
		margin: 0 0 0.5rem 0;
		font-size: 0.8rem;
		color: #fbbf24;
	}
	
	.debug-info {
		margin-bottom: 0.75rem;
	}
	
	.debug-item {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.25rem;
	}
	
	.debug-value {
		color: #10b981;
	}
	
	
	.debug-actions {
		display: flex;
		gap: 0.5rem;
	}
	
	.debug-btn {
		background: #374151;
		color: white;
		border: 1px solid #4b5563;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.debug-btn:hover {
		background: #4b5563;
	}
	
	.debug-btn.danger {
		background: #dc2626;
		border-color: #ef4444;
	}
	
	.debug-btn.danger:hover {
		background: #b91c1c;
	}
</style>