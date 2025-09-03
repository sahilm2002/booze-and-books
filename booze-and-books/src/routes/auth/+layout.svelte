<script lang="ts">
</script>

<div class="auth-layout">
	<div class="auth-container">
		<nav class="auth-nav">
			<a href="/" class="home-link">← Back to Home</a>
		</nav>
		
		<div class="auth-content">
			<slot />
		</div>
	</div>
</div>

<style>
	.auth-layout {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 1rem;
	}

	.auth-container {
		width: 100%;
		max-width: 500px;
		position: relative;
	}

	.auth-nav {
		margin-bottom: 2rem;
		text-align: center;
	}

	.home-link {
		color: rgba(255, 255, 255, 0.9);
		text-decoration: none;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		transition: background-color 0.2s;
		display: inline-block;
	}

	.home-link:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.auth-content {
		display: flex;
		justify-content: center;
	}
</style>