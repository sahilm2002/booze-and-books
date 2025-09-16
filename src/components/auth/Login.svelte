<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';

	export let redirectTo: string = '/app';

	let email = '';
	let password = '';
	let loading = false;
	let error = '';

	async function handleLogin() {
		if (!email || !password) {
			error = 'Please fill in all fields';
			return;
		}

		loading = true;
		error = '';

		try {
			console.log('Attempting client-side login...');
			
			// Use direct client-side Supabase authentication instead of API endpoint
			const { data, error: authError } = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password
			});

			if (authError) {
				console.error('Login error:', authError);
				error = authError.message || 'Login failed';
			} else if (data.user) {
				console.log('Login successful:', data.user.email);
				// Use SvelteKit navigation with small delay to ensure auth state updates
				setTimeout(async () => {
					try {
						await goto('/app', { replaceState: true });
					} catch (navError) {
						console.error('Navigation error:', navError);
						// Fallback to hard redirect if SvelteKit navigation fails
						window.location.href = '/app';
					}
				}, 200);
				return; // Exit early to prevent loading state change
			} else {
				error = 'Login failed - no user returned';
			}
		} catch (err) {
			console.error('Login exception:', err);
			error = 'An unexpected error occurred';
		} finally {
			loading = false;
		}
	}

	function handleKeypress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleLogin();
		}
	}
</script>

<form on:submit|preventDefault={handleLogin} class="auth-form">
	<h2>Welcome Back</h2>
	<p class="subtitle">Sign in to your account</p>

	{#if error}
		<div class="error" role="alert">
			{error}
		</div>
	{/if}

	<div class="form-group">
		<label for="email">Email</label>
		<input
			id="email"
			type="email"
			bind:value={email}
			on:keypress={handleKeypress}
			placeholder="your@email.com"
			required
			disabled={loading}
			autocomplete="email"
		/>
	</div>

	<div class="form-group">
		<label for="password">Password</label>
		<input
			id="password"
			type="password"
			bind:value={password}
			on:keypress={handleKeypress}
			placeholder="••••••••"
			required
			disabled={loading}
			autocomplete="current-password"
		/>
	</div>

	<button type="submit" class="submit-btn" disabled={loading}>
		{loading ? 'Signing in...' : 'Sign In'}
	</button>

	<p class="auth-link">
		Don't have an account? <a href="/auth/signup">Sign up</a>
	</p>
</form>

<style>
	.auth-form {
		background: white;
		padding: 2rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		width: 100%;
		max-width: 400px;
	}

	h2 {
		color: #2d3748;
		font-size: 1.8rem;
		text-align: center;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: #718096;
		text-align: center;
		margin-bottom: 2rem;
	}

	.error {
		background: #fed7d7;
		color: #c53030;
		padding: 0.75rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		color: #4a5568;
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	input {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #e2e8f0;
		border-radius: 6px;
		font-size: 1rem;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	input:focus {
		outline: none;
		border-color: #4299e1;
		box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
	}

	input:disabled {
		background-color: #f7fafc;
		cursor: not-allowed;
	}

	.submit-btn {
		width: 100%;
		background: #4299e1;
		color: white;
		padding: 0.75rem;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
		margin-top: 0.5rem;
	}

	.submit-btn:hover:not(:disabled) {
		background: #3182ce;
	}

	.submit-btn:disabled {
		background: #a0aec0;
		cursor: not-allowed;
	}

	.auth-link {
		text-align: center;
		margin-top: 1.5rem;
		color: #718096;
	}

	.auth-link a {
		color: #4299e1;
		text-decoration: none;
		font-weight: 500;
	}

	.auth-link a:hover {
		text-decoration: underline;
	}
</style>
