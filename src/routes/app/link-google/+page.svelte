<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';

  let loading = false;
  let error: string | null = null;
  let userEmail: string | null = null;

  onMount(async () => {
    try {
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError || !user) {
        // Must be logged in with your existing account first
        goto('/auth/login?redirectTo=/app/link-google', { replaceState: true });
        return;
      }
      userEmail = user.email ?? null;
    } catch (e) {
      // If we can't validate the session, send to login
      goto('/auth/login?redirectTo=/app/link-google', { replaceState: true });
    }
  });

  async function linkGoogle() {
    loading = true;
    error = null;
    try {
      const { data, error: linkError } = await supabase.auth.linkIdentity({
        provider: 'google'
      });
      if (linkError) {
        error = linkError.message || 'Failed to start Google linking flow';
        return;
      }
      // The browser will be redirected to Google and then back to the app.
      // On return, the Google identity will be linked to this user.
    } catch (e) {
      error = 'Unexpected error starting Google linking';
      if (import.meta.env.DEV) console.error('linkIdentity exception:', e);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Link Google Account</title>
  <meta name="description" content="Link your Google account to your existing Booze & Books account" />
</svelte:head>

<div class="container">
  <h2>Link your Google account</h2>
  <p class="subtitle">
    Link Google to your existing account{#if userEmail}&nbsp;(<strong>{userEmail}</strong>){/if} so you can sign in with one click.
  </p>

  {#if error}
    <div class="error" role="alert">{error}</div>
  {/if}

  <button class="btn" on:click={linkGoogle} disabled={loading}>
    {loading ? 'Starting Google linking…' : 'Link Google'}
  </button>

  <p class="hint">
    Tip: If you aren’t logged in, you’ll be redirected to sign in first, then returned here to link Google.
  </p>
</div>

<style>
  .container {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    width: 100%;
    max-width: 520px;
    margin: 2rem auto;
  }
  h2 {
    color: #2d3748;
    font-size: 1.5rem;
    margin: 0 0 .5rem 0;
  }
  .subtitle {
    color: #718096;
    margin-bottom: 1.25rem;
  }
  .error {
    background: #fed7d7;
    color: #c53030;
    padding: .75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: .95rem;
  }
  .btn {
    background: #4285F4;
    color: white;
    padding: .75rem 1rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    min-width: 220px;
  }
  .btn:disabled {
    opacity: .7;
    cursor: not-allowed;
  }
  .hint {
    color: #718096;
    font-size: .9rem;
    margin-top: 1rem;
  }
</style>
