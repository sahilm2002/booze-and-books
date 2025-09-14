<script lang="ts">
	import { BookCondition } from '$lib/types/book';

	export let condition: BookCondition;

	function getConditionDisplay(condition: BookCondition): string {
		switch (condition) {
			case BookCondition.LIKE_NEW:
				return 'Like New';
			case BookCondition.VERY_GOOD:
				return 'Very Good';
			case BookCondition.GOOD:
				return 'Good';
			case BookCondition.FAIR:
				return 'Fair';
			case BookCondition.POOR:
				return 'Poor';
			default:
				return 'Unknown';
		}
	}

	function getConditionColor(condition: BookCondition): string {
		switch (condition) {
			case BookCondition.LIKE_NEW:
				return '#10b981'; // green
			case BookCondition.VERY_GOOD:
				return '#3b82f6'; // blue
			case BookCondition.GOOD:
				return '#f59e0b'; // yellow
			case BookCondition.FAIR:
				return '#f97316'; // orange
			case BookCondition.POOR:
				return '#ef4444'; // red
			default:
				return '#6b7280'; // gray
		}
	}

	$: displayText = getConditionDisplay(condition);
	$: color = getConditionColor(condition);
</script>

<span class="condition-indicator" style="background-color: {color}">
	{displayText}
</span>

<style>
	.condition-indicator {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		color: white;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}
</style>
