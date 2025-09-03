<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { realtimeService } from '$lib/services/realtimeService.js';
	
	let connected = false;
	let unsubscribe: (() => void) | undefined;

	onMount(() => {
		// Subscribe to connection status changes
		unsubscribe = realtimeService.subscribeToConnection((event) => {
			connected = event.new?.connected ?? false;
		});

		// Get initial connection status
		const connectionStatus = realtimeService.getConnectionStatus();
		connected = connectionStatus.connected;
	});

	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});

	$: statusText = connected ? 'Live updates active' : 'Connecting...';
	$: statusColor = connected ? 'text-green-600' : 'text-yellow-600';
	$: dotColor = connected ? 'bg-green-500' : 'bg-yellow-500';
</script>

<div class="realtime-status">
	<div class="status-indicator {statusColor}">
		<div class="status-dot {dotColor} {connected ? 'animate-pulse' : 'animate-bounce'}"></div>
		<span class="status-text">{statusText}</span>
	</div>
</div>

<style>
	.realtime-status {
		display: flex;
		align-items: center;
		font-size: 0.75rem;
		user-select: none;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.75rem;
		background: rgba(255, 255, 255, 0.9);
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 20px;
		backdrop-filter: blur(4px);
		transition: all 0.2s ease;
	}

	.status-indicator:hover {
		background: rgba(255, 255, 255, 0.95);
		transform: scale(1.02);
	}

	.status-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.status-text {
		font-weight: 500;
		white-space: nowrap;
	}

	/* Animation classes */
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	@keyframes bounce {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-2px);
		}
	}

	.animate-pulse {
		animation: pulse 2s ease-in-out infinite;
	}

	.animate-bounce {
		animation: bounce 1s ease-in-out infinite;
	}

	/* Mobile responsiveness */
	@media (max-width: 640px) {
		.realtime-status {
			font-size: 0.6875rem;
		}

		.status-indicator {
			padding: 0.25rem 0.5rem;
			gap: 0.25rem;
		}

		.status-dot {
			width: 0.375rem;
			height: 0.375rem;
		}
	}
</style>