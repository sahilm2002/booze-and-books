<script lang="ts">
  import { supabase } from '$lib/supabase';

  // Optional redirect path. If provided, we'll resolve it against the current origin.
  // If omitted, Supabase will return to window.location.origin.
  export let redirectTo: string | null = null;

  let loading = false;
  let error = '';

  async function signInWithGoogle() {
    loading = true;
    error = '';

    try {
      // Build a server-side callback URL so SSR can exchange the auth code for a session cookie
      // and keep SvelteKit hooks/server validation in sync.
      const redirect =
        typeof window !== 'undefined'
          ? (() => {
              const nextTarget = redirectTo ?? '/app';
              const cb = new URL('/auth/callback', window.location.origin);
              cb.searchParams.set('next', nextTarget);
              return cb.toString();
            })()
          : undefined;

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirect
        }
      });

      if (authError) {
        error = authError.message || 'Failed to start Google sign-in';
        if (import.meta.env.DEV) console.error('Google OAuth error:', authError);
      }
    } catch (e) {
      error = 'Unexpected error starting Google sign-in';
      if (import.meta.env.DEV) console.error('Google OAuth exception:', e);
    } finally {
      loading = false;
    }
  }
</script>

<button type="button" class="google-btn" on:click={signInWithGoogle} disabled={loading} aria-label="Continue with Google">
  <svg class="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3" aria-hidden="true">
    <path fill="#EA4335" d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.3h147.3c-6.4 34.5-25.9 63.7-55.2 83.3v68h89.2c52.3-48.1 80.2-119 80.2-196.2z"/>
    <path fill="#34A853" d="M272 544.3c74.7 0 137.4-24.7 183.2-67.7l-89.2-68c-24.7 16.6-56.3 26.5-94 26.5-72.3 0-133.6-48.8-155.6-114.4H25.2v71.8C70.7 487.4 165.5 544.3 272 544.3z"/>
    <path fill="#4A90E2" d="M116.4 320.7c-5.6-16.6-8.8-34.4-8.8-52.7s3.2-36.1 8.8-52.7V143.5H25.2C9.1 176.3 0 212.3 0 257.9s9.1 81.6 25.2 114.4l91.2-71.6z"/>
    <path fill="#FBBC05" d="M272 107.7c40.7 0 77.1 14 105.8 41.5l79.2-79.2C408.9 25.3 346.7 0 272 0 165.5 0 70.7 56.9 25.2 143.5l91.2 71.8C138.4 156.5 199.7 107.7 272 107.7z"/>
  </svg>
  {loading ? 'Connecting…' : 'Continue with Google'}
</button>

{#if error}
  <div class="oauth-error" role="alert">{error}</div>
{/if}

<style>
  .google-btn {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border: 2px solid #e2e8f0;
    border-radius: 6px;
    background: white;
    color: #1a202c;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
  }

  .google-btn:hover:not(:disabled) {
    background: #f7fafc;
    border-color: #cbd5e0;
  }

  .google-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .google-icon {
    width: 18px;
    height: 18px;
  }

  .oauth-error {
    margin-top: 0.75rem;
    background: #fed7d7;
    color: #c53030;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.9rem;
  }
</style>
