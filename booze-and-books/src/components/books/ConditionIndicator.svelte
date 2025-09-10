<script lang="ts">
	export let condition: string;
	export let size: 'small' | 'large' = 'small';
	export let showTooltip = true;

	// Map condition to visual representation
	const conditionInfo: Record<string, {
		label: string;
		description: string;
		color: string;
		icon: string;
		stars: number;
	}> = {
		// Human-readable labels
		'Like New': {
			label: 'Like New',
			description: 'Pristine condition, appears unread with no visible wear or markings',
			color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
			icon: '✨',
			stars: 5
		},
		'Very Good': {
			label: 'Very Good',
			description: 'Minor shelf wear, slight creasing to spine, book appears well-maintained',
			color: 'text-green-600 bg-green-50 border-green-200',
			icon: '🌟',
			stars: 4
		},
		'Good': {
			label: 'Good',
			description: 'Moderate wear, some creasing and minor marks, but structurally sound',
			color: 'text-blue-600 bg-blue-50 border-blue-200',
			icon: '📘',
			stars: 3
		},
		'Fair': {
			label: 'Fair',
			description: 'Noticeable wear, creasing, and marking but pages intact and readable',
			color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
			icon: '📙',
			stars: 2
		},
		'Poor': {
			label: 'Poor',
			description: 'Significant wear, possible loose binding, heavy marking but still readable',
			color: 'text-orange-600 bg-orange-50 border-orange-200',
			icon: '📒',
			stars: 1
		},
		// Enum codes
		'LIKE_NEW': {
			label: 'Like New',
			description: 'Pristine condition, appears unread with no visible wear or markings',
			color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
			icon: '✨',
			stars: 5
		},
		'VERY_GOOD': {
			label: 'Very Good',
			description: 'Minor shelf wear, slight creasing to spine, book appears well-maintained',
			color: 'text-green-600 bg-green-50 border-green-200',
			icon: '🌟',
			stars: 4
		},
		'GOOD': {
			label: 'Good',
			description: 'Moderate wear, some creasing and minor marks, but structurally sound',
			color: 'text-blue-600 bg-blue-50 border-blue-200',
			icon: '📘',
			stars: 3
		},
		'FAIR': {
			label: 'Fair',
			description: 'Noticeable wear, creasing, and marking but pages intact and readable',
			color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
			icon: '📙',
			stars: 2
		},
		'POOR': {
			label: 'Poor',
			description: 'Significant wear, possible loose binding, heavy marking but still readable',
			color: 'text-orange-600 bg-orange-50 border-orange-200',
			icon: '📒',
			stars: 1
		}
	};

	$: info = conditionInfo[condition] || conditionInfo['Good'];
	$: sizeClasses = size === 'large' ? 'px-4 py-2 text-base' : 'px-2 py-1 text-sm';
	$: iconSize = size === 'large' ? 'text-lg' : 'text-sm';
</script>

<div class="condition-indicator">
	{#if size === 'large'}
		<div class="large-indicator {info.color} border rounded-lg {sizeClasses}">
			<div class="flex items-center gap-3">
				<span class="condition-icon {iconSize}">{info.icon}</span>
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<span class="font-semibold">{info.label}</span>
						<div class="stars flex">
							{#each Array(5) as _, i}
								<span class="star {i < info.stars ? 'filled' : 'empty'}">★</span>
							{/each}
						</div>
					</div>
					<p class="text-xs opacity-80 mt-1">{info.description}</p>
				</div>
			</div>
		</div>
	{:else}
		<div 
			class="small-indicator {info.color} border rounded-md {sizeClasses} flex items-center gap-1.5"
			class:tooltip-container={showTooltip}
		>
			<span class="condition-icon {iconSize}">{info.icon}</span>
			<span class="font-medium">{info.label}</span>
			<div class="stars flex">
				{#each Array(5) as _, i}
					<span class="star-small {i < info.stars ? 'filled' : 'empty'}">★</span>
				{/each}
			</div>

			{#if showTooltip}
				<div class="tooltip">
					<div class="tooltip-content">
						<div class="font-semibold text-gray-900">{info.label}</div>
						<div class="text-xs text-gray-600 mt-1">{info.description}</div>
						<div class="stars-tooltip flex mt-2">
							{#each Array(5) as _, i}
								<span class="star {i < info.stars ? 'filled' : 'empty'}">★</span>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.condition-indicator {
		display: inline-block;
	}

	.small-indicator,
	.large-indicator {
		transition: all 0.2s ease;
	}

	.small-indicator:hover,
	.large-indicator:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	.stars {
		font-size: 0.75rem;
		line-height: 1;
	}

	.star {
		color: #fbbf24;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	.star.empty {
		color: #d1d5db;
	}

	.star-small {
		font-size: 0.65rem;
		color: #fbbf24;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	.star-small.empty {
		color: #d1d5db;
	}

	.tooltip-container {
		position: relative;
	}

	.tooltip {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-bottom: 8px;
		opacity: 0;
		visibility: hidden;
		transition: all 0.2s ease;
		z-index: 50;
	}

	.tooltip-content {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 12px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
		white-space: nowrap;
		max-width: 250px;
		white-space: normal;
	}

	.tooltip-content::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 6px solid transparent;
		border-top-color: white;
	}

	.tooltip-content::before {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 7px solid transparent;
		border-top-color: #e5e7eb;
		margin-top: 1px;
	}

	.tooltip-container:hover .tooltip {
		opacity: 1;
		visibility: visible;
	}

	.stars-tooltip {
		font-size: 0.75rem;
	}

	.stars-tooltip .star {
		color: #fbbf24;
	}

	.stars-tooltip .star.empty {
		color: #d1d5db;
	}
</style>