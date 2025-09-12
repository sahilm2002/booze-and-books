<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let confirmPassword = '';
	let loading = false;
	let error = '';
	let success = '';

	function validateForm(): string | null {
		if (!email || !password || !confirmPassword) {
			return 'Please fill in all fields';
		}

		if (password.length < 6) {
			return 'Password must be at least 6 characters long';
		}

		if (password !== confirmPassword) {
			return 'Passwords do not match';
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return 'Please enter a valid email address';
		}

		return null;
	}

	async function handleSignup() {
		const validationError = validateForm();
		if (validationError) {
			error = validationError;
			return;
		}

		loading = true;
		error = '';
		success = '';

		try {
			const { data, error: signUpError } = await supabase.auth.signUp({
				email: email.trim(),
				password,
				options: {
					emailRedirectTo: `${window.location.origin}/app`
				}
			});

			if (signUpError) {
				error = signUpError.message;
			} else if (data.session) {
				// Immediate session (auto-confirm enabled)
				await goto('/app', { replaceState: true });
			} else {
				// Email confirmation required
				success = 'Account created successfully! Please check your email for verification.';
				// Clear form
				email = '';
				password = '';
				confirmPassword = '';
				
				// Redirect to login after a short delay
				setTimeout(() => {
					goto('/auth/login');
				}, 3000);
			}
		} catch (err) {
			error = 'An unexpected error occurred';
			console.error('Signup error:', err);
		} finally {
			loading = false;
		}
	}

	function handleKeypress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSignup();
		}
	}
</script>

<form on:submit|preventDefault={handleSignup} class="auth-form">
	<h2>Join Our Community</h2>
	<p class="subtitle">Create your account to start swapping books</p>

	{#if error}
		<div class="error" role="alert">
			{error}
		</div>
	{/if}

	{#if success}
		<div class="success" role="alert">
			{success}
		</div>
	{/if}

	<div class="form-group">
		<label for="signup-email">Email</label>
		<input
			id="signup-email"
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
		<label for="signup-password">Password</label>
		<input
			id="signup-password"
			type="password"
			bind:value={password}
			on:keypress={handleKeypress}
			placeholder="••••••••"
			required
			disabled={loading}
			autocomplete="new-password"
		/>
		<small class="helper-text">Must be at least 6 characters long</small>
	</div>

	<div class="form-group">
		<label for="confirm-password">Confirm Password</label>
		<input
			id="confirm-password"
			type="password"
			bind:value={confirmPassword}
			on:keypress={handleKeypress}
			placeholder="••••••••"
			required
			disabled={loading}
			autocomplete="new-password"
		/>
	</div>

	<button type="submit" class="submit-btn" disabled={loading}>
		{loading ? 'Creating Account...' : 'Create Account'}
	</button>

	<p class="auth-link">
		Already have an account? <a href="/auth/login">Sign in</a>
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

	.success {
		background: #c6f6d5;
		color: #2f855a;
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

	.helper-text {
		color: #718096;
		font-size: 0.8rem;
		margin-top: 0.25rem;
		display: block;
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