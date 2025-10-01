<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { StoreLocatorService } from '$lib/services/storeLocatorService';

  export let isOpen: boolean = false;
  export let initialZipCode: string | null = null;
  export let onSubmit: (zip: string) => void;
  export let onCancel: () => void;

  const dispatch = createEventDispatcher();

  let zipCode: string = initialZipCode || '';
  let submitting = false;
  let error: string | null = null;

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }

  function validateZip(input: string): boolean {
    return StoreLocatorService.validateZipCode(input);
  }

  async function handleSubmit() {
    if (submitting) return;
    const trimmed = (zipCode || '').trim();

    if (!validateZip(trimmed)) {
      error = 'Please enter a valid US zip code (e.g., 12345 or 12345-6789)';
      return;
    }

    error = null;
    submitting = true;
    try {
      await onSubmit(trimmed);
      dispatch('submitted', { zipCode: trimmed });
    } finally {
      submitting = false;
    }
  }

  function handleCancel() {
    error = null;
    zipCode = initialZipCode || '';
    onCancel();
    dispatch('cancelled');
  }
</script>

<svelte:window on:keydown={(e) => { if (isOpen && e.key === 'Escape') handleCancel(); }} />

{#if isOpen}
  <div class="modal-overlay" on:click={handleOverlayClick}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2>Enter ZIP Code</h2>
        <p class="subtitle">We’ll use your ZIP to find nearby stores</p>
      </div>

      <div class="modal-body">
        {#if error}
          <div class="error-banner" role="alert">
            <span>⚠️ {error}</span>
          </div>
        {/if}

        <label for="zipcode" class="label">ZIP Code</label>
        <input
          id="zipcode"
          type="text"
          bind:value={zipCode}
          class="input"
          placeholder="12345 or 12345-6789"
          on:keydown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        />
        <p class="help">US ZIP code format only</p>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" on:click={handleCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="button" class="btn btn-primary" on:click={handleSubmit} disabled={submitting}>
          {#if submitting}
            <svg class="btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.25"/>
              <path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Saving...
          {:else}
            Save
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    backdrop-filter: blur(4px);
  }
  .modal-content {
    background: #fff;
    border-radius: 16px;
    width: 100%;
    max-width: 420px;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,.25);
    animation: modalSlideIn .25s ease-out;
  }
  @keyframes modalSlideIn {
    from { opacity: 0; transform: translateY(-12px) scale(.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .modal-header {
    padding: 1.25rem 1.25rem .5rem 1.25rem;
    border-bottom: 1px solid #e5e7eb;
  }
  .modal-header h2 {
    margin: 0 0 .25rem 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #111827;
  }
  .subtitle {
    margin: 0;
    color: #6b7280;
    font-size: .95rem;
  }
  .modal-body {
    padding: 1rem 1.25rem;
  }
  .label {
    display: block;
    font-size: .9rem;
    color: #374151;
    margin-bottom: .25rem;
  }
  .input {
    width: 100%;
    padding: .6rem .75rem;
    border: 1px solid #d1d5db;
    border-radius: .5rem;
    font-size: 1rem;
    outline: none;
  }
  .input:focus {
    border-color: #8B2635;
    box-shadow: 0 0 0 3px rgba(139, 38, 53, 0.15);
  }
  .help {
    margin: .4rem 0 0 0;
    font-size: .8rem;
    color: #6b7280;
  }
  .error-banner {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
    padding: .5rem .75rem;
    border-radius: .5rem;
    margin-bottom: .75rem;
    font-size: .9rem;
  }
  .modal-footer {
    padding: 1rem 1.25rem 1.25rem 1.25rem;
    display: flex;
    gap: .75rem;
    border-top: 1px solid #e5e7eb;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    padding: .6rem 1rem;
    border: none;
    border-radius: .5rem;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-primary {
    background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
    color: #F5F5DC;
  }
  .btn-primary:hover { filter: brightness(1.02); }
  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #e5e7eb;
  }
  .btn-secondary:hover { background: #e5e7eb; }
  .btn-spinner { animation: spin 1s linear infinite; }
  @keyframes spin { from {transform: rotate(0deg);} to {transform: rotate(360deg);} }
</style>
