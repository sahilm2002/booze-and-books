<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { AgeVerificationModalProps } from '$lib/types/cocktail';

	export let isOpen: boolean = false;
	export let onVerify: () => void;
	export let onCancel: () => void;

	const dispatch = createEventDispatcher();

	let isVerifying = false;

	async function handleVerify() {
		if (isVerifying) return;
		
		isVerifying = true;
		try {
			await onVerify();
			dispatch('verified');
		} catch (error) {
			console.error('Age verification failed:', error);
			alert('Age verification failed. Please try again.');
		} finally {
			isVerifying = false;
		}
	}

	function handleCancel() {
		onCancel();
		dispatch('cancelled');
	}

	function handleOverlayClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}
</script>

{#if isOpen}
	<div class="modal-overlay" on:click={handleOverlayClick}>
		<div class="modal-content" on:click|stopPropagation>
			<div class="modal-header">
				<div class="icon-container">
					<div class="age-icon">🍸</div>
				</div>
				<h2>Age Verification Required</h2>
				<p class="subtitle">To view cocktail recipes, you must be 21 or older</p>
			</div>

			<div class="modal-body">
				<div class="verification-content">
					<div class="legal-notice">
						<h3>🇺🇸 United States Legal Drinking Age</h3>
						<p>
							The legal drinking age in all 50 US states is <strong>21 years old</strong>. 
							By proceeding, you confirm that you are at least 21 years of age and legally 
							permitted to view alcoholic beverage content in your location.
						</p>
					</div>

					<div class="responsibility-message">
						<h4>🛡️ Drink Responsibly</h4>
						<ul>
							<li>Never drink and drive</li>
							<li>Know your limits and drink in moderation</li>
							<li>Don't drink if you're pregnant or have health conditions</li>
							<li>Be aware of medication interactions</li>
						</ul>
					</div>

					<div class="privacy-notice">
						<p class="small-text">
							<strong>Privacy:</strong> We only store your age verification status, 
							not your actual age or birth date. This verification is required by law 
							for alcohol-related content.
						</p>
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<button 
					type="button" 
					class="btn btn-secondary" 
					on:click={handleCancel}
					disabled={isVerifying}
				>
					I'm Under 21
				</button>
				<button 
					type="button" 
					class="btn btn-primary" 
					on:click={handleVerify}
					disabled={isVerifying}
				>
					{#if isVerifying}
						<svg class="btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none">
							<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.25"/>
							<path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
						</svg>
						Verifying...
					{:else}
						✅ I'm 21 or Older
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
		backdrop-filter: blur(4px);
	}

	.modal-content {
		background: white;
		border-radius: 16px;
		width: 100%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		animation: modalSlideIn 0.3s ease-out;
	}

	@keyframes modalSlideIn {
		from {
			opacity: 0;
			transform: translateY(-20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.modal-header {
		text-align: center;
		padding: 2rem 2rem 1rem 2rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.icon-container {
		margin-bottom: 1rem;
	}

	.age-icon {
		font-size: 3rem;
		display: inline-block;
		padding: 1rem;
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		border-radius: 50%;
		box-shadow: 0 8px 25px rgba(139, 38, 53, 0.3);
	}

	.modal-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.75rem;
		font-weight: 700;
		color: #1f2937;
	}

	.subtitle {
		margin: 0;
		color: #6b7280;
		font-size: 1rem;
		line-height: 1.5;
	}

	.modal-body {
		padding: 2rem;
	}

	.verification-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.legal-notice {
		background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
		border: 2px solid #bfdbfe;
		border-radius: 12px;
		padding: 1.5rem;
	}

	.legal-notice h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #1e40af;
	}

	.legal-notice p {
		margin: 0;
		color: #1e3a8a;
		line-height: 1.6;
	}

	.responsibility-message {
		background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
		border: 2px solid #bbf7d0;
		border-radius: 12px;
		padding: 1.5rem;
	}

	.responsibility-message h4 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #166534;
	}

	.responsibility-message ul {
		margin: 0;
		padding-left: 1.5rem;
		color: #15803d;
		line-height: 1.6;
	}

	.responsibility-message li {
		margin-bottom: 0.5rem;
	}

	.privacy-notice {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 1rem;
	}

	.small-text {
		margin: 0;
		font-size: 0.875rem;
		color: #64748b;
		line-height: 1.5;
	}

	.modal-footer {
		display: flex;
		gap: 1rem;
		justify-content: space-between;
		padding: 1.5rem 2rem 2rem 2rem;
		border-top: 1px solid #e2e8f0;
		background: #f8fafc;
		border-radius: 0 0 16px 16px;
	}

	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		white-space: nowrap;
		flex: 1;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none !important;
	}

	.btn-primary {
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		box-shadow: 0 4px 12px rgba(139, 38, 53, 0.3);
	}

	.btn-primary:hover:not(:disabled) {
		background: linear-gradient(135deg, #722F37 0%, #8B2635 100%);
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(139, 38, 53, 0.4);
	}

	.btn-secondary {
		background: #6b7280;
		color: white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.btn-secondary:hover:not(:disabled) {
		background: #4b5563;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.btn-spinner {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Mobile responsive */
	@media (max-width: 640px) {
		.modal-content {
			margin: 0;
			border-radius: 0;
			height: 100vh;
			max-height: none;
		}

		.modal-header,
		.modal-body,
		.modal-footer {
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}

		.modal-header h2 {
			font-size: 1.5rem;
		}

		.age-icon {
			font-size: 2.5rem;
			padding: 0.75rem;
		}

		.modal-footer {
			flex-direction: column;
		}

		.btn {
			width: 100%;
		}
	}
</style>
