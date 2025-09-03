<script lang="ts">
	import { auth } from '$lib/stores/auth';
</script>

<svelte:head>
	<title>Booze and Books - Literary Exchange Society</title>
	<meta name="description" content="A modern book swap application inspired by historical literary societies like the Kit-Cat Club and Bloomsbury Group" />
</svelte:head>

<main class="container">
	<header class="hero">
		<h1>📚 Booze and Books</h1>
		<p class="subtitle">A Literary Exchange Society</p>
		<p class="tagline">Continuing the grand tradition of literary societies that shaped our cultural heritage</p>
	</header>

	<section class="historical-context">
		<div class="historical-card">
			<h2>🍷 In the Spirit of Great Literary Societies</h2>
			<div class="societies-grid">
				<div class="society">
					<h3>Kit-Cat Club (1696-1720)</h3>
					<p>London's influential Whig literary society where publishers, authors, and patrons gathered to share ideas over mutton pies and kit-cat portraits.</p>
				</div>
				<div class="society">
					<h3>Bloomsbury Group (1905-1940s)</h3>
					<p>Virginia Woolf, E.M. Forster, and their circle revolutionized literature through intimate gatherings in London's Bloomsbury district.</p>
				</div>
				<div class="society">
					<h3>Algonquin Round Table (1919-1929)</h3>
					<p>Dorothy Parker and fellow wits transformed New York's literary scene with their daily lunch meetings filled with wordplay and book discussions.</p>
				</div>
			</div>
		</div>
	</section>

	<section class="tradition">
		<div class="tradition-content">
			<h2>The Timeless Art of Book Exchange</h2>
			<div class="quote-block">
				<blockquote>
					"A room without books is like a body without a soul."
				</blockquote>
				<cite>— Marcus Tullius Cicero</cite>
			</div>
			<p>For centuries, book lovers have gathered in coffeehouses, salons, and societies to share their literary treasures. From the lending libraries of ancient Rome to the circulating libraries of 18th century Britain, the exchange of books has been the lifeblood of intellectual discourse.</p>
			<p>Today, we continue this noble tradition through modern technology, connecting readers across the globe while maintaining the intimate, personal touch that makes book sharing so special.</p>
		</div>
	</section>

	<section class="features">
		<h2>Modern Tools, Timeless Tradition</h2>
		<div class="features-grid">
			<div class="feature">
				<div class="feature-icon">📖</div>
				<h3>Curated Collections</h3>
				<p>Share your personal library with fellow bibliophiles who understand the value of a well-loved book.</p>
			</div>
			<div class="feature">
				<div class="feature-icon">🤝</div>
				<h3>Trusted Community</h3>
				<p>Connect with readers who share your passion, building relationships through the books we love.</p>
			</div>
			<div class="feature">
				<div class="feature-icon">🌍</div>
				<h3>Global Reach</h3>
				<p>Discover rare gems and hidden treasures from collections around the world.</p>
			</div>
		</div>
	</section>

	<section class="call-to-action">
		{#if $auth.user}
			<div class="user-actions">
				<h2>Welcome Back, Fellow Reader</h2>
				<p>Your literary salon awaits. Continue discovering your next great read.</p>
				<a href="/app" class="cta-button">Enter Your Library</a>
			</div>
		{:else}
			<div class="guest-actions">
				<h2>Join Our Literary Society</h2>
				<p>Step into a world where every book finds its perfect reader, and every reader discovers their next obsession.</p>
				<div class="action-buttons">
					<a href="/auth/signup" class="cta-button primary">Begin Your Journey</a>
					<a href="/auth/login" class="cta-button secondary">Welcome Back</a>
				</div>
			</div>
		{/if}
	</section>
</main>

<style>
	main {
		padding: 0;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		min-height: 100vh;
	}

	.hero {
		text-align: center;
		padding: 4rem 2rem;
		background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('/images/historical-society.jpg');
		background-size: cover;
		background-position: center;
		color: white;
	}

	.hero h1 {
		font-size: 3.5rem;
		margin-bottom: 0.5rem;
		text-shadow: 2px 2px 4px rgba(0,0,0,0.7);
		font-family: 'Georgia', serif;
	}

	.subtitle {
		font-size: 1.8rem;
		margin-bottom: 1rem;
		font-style: italic;
		text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
	}

	.tagline {
		font-size: 1.2rem;
		opacity: 0.9;
		max-width: 600px;
		margin: 0 auto;
		text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
	}

	.historical-context {
		padding: 4rem 2rem;
		background: white;
	}

	.historical-card {
		max-width: 1200px;
		margin: 0 auto;
	}

	.historical-card h2 {
		text-align: center;
		color: #2d3748;
		font-size: 2.2rem;
		margin-bottom: 3rem;
		font-family: 'Georgia', serif;
	}

	.societies-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: 2rem;
		margin-top: 2rem;
	}

	.society {
		background: #f8f9fa;
		padding: 2rem;
		border-radius: 12px;
		border-left: 4px solid #4299e1;
		text-align: left;
	}

	.society h3 {
		color: #2d3748;
		font-size: 1.3rem;
		margin-bottom: 1rem;
		font-family: 'Georgia', serif;
	}

	.society p {
		color: #4a5568;
		line-height: 1.6;
	}

	.tradition {
		padding: 4rem 2rem;
		background: linear-gradient(45deg, #f7fafc, #edf2f7);
	}

	.tradition-content {
		max-width: 800px;
		margin: 0 auto;
		text-align: center;
	}

	.tradition h2 {
		color: #2d3748;
		font-size: 2.2rem;
		margin-bottom: 2rem;
		font-family: 'Georgia', serif;
	}

	.quote-block {
		background: white;
		padding: 2rem;
		border-radius: 12px;
		margin: 2rem 0;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	blockquote {
		font-size: 1.4rem;
		font-style: italic;
		color: #4a5568;
		margin: 0;
		font-family: 'Georgia', serif;
	}

	cite {
		display: block;
		margin-top: 1rem;
		color: #718096;
		font-size: 1rem;
	}

	.tradition p {
		color: #4a5568;
		font-size: 1.1rem;
		line-height: 1.7;
		margin-bottom: 1.5rem;
		text-align: left;
	}

	.features {
		padding: 4rem 2rem;
		background: white;
	}

	.features h2 {
		text-align: center;
		color: #2d3748;
		font-size: 2.2rem;
		margin-bottom: 3rem;
		font-family: 'Georgia', serif;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
		max-width: 1000px;
		margin: 0 auto;
	}

	.feature {
		text-align: center;
		padding: 2rem;
		border-radius: 12px;
		transition: transform 0.2s;
	}

	.feature:hover {
		transform: translateY(-5px);
	}

	.feature-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.feature h3 {
		color: #2d3748;
		font-size: 1.3rem;
		margin-bottom: 1rem;
		font-family: 'Georgia', serif;
	}

	.feature p {
		color: #4a5568;
		line-height: 1.6;
	}

	.call-to-action {
		padding: 4rem 2rem;
		background: linear-gradient(135deg, #4299e1, #667eea);
		text-align: center;
	}

	.call-to-action h2 {
		color: white;
		font-size: 2.2rem;
		margin-bottom: 1rem;
		font-family: 'Georgia', serif;
	}

	.user-actions, .guest-actions {
		max-width: 600px;
		margin: 0 auto;
	}

	.user-actions p, .guest-actions p {
		color: rgba(255,255,255,0.9);
		margin-bottom: 2rem;
		font-size: 1.1rem;
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.cta-button {
		display: inline-block;
		padding: 1rem 2.5rem;
		border-radius: 8px;
		text-decoration: none;
		font-weight: 600;
		font-size: 1.1rem;
		transition: all 0.3s;
		border: 2px solid white;
		font-family: 'Georgia', serif;
	}

	.cta-button.primary {
		background: white;
		color: #4299e1;
	}

	.cta-button.primary:hover {
		background: #f7fafc;
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0,0,0,0.2);
	}

	.cta-button.secondary {
		background: transparent;
		color: white;
	}

	.cta-button.secondary:hover {
		background: rgba(255,255,255,0.1);
		transform: translateY(-2px);
	}

	.cta-button:not(.primary):not(.secondary) {
		background: white;
		color: #4299e1;
	}

	.cta-button:not(.primary):not(.secondary):hover {
		background: #f7fafc;
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0,0,0,0.2);
	}

	@media (max-width: 768px) {
		.hero h1 {
			font-size: 2.5rem;
		}

		.subtitle {
			font-size: 1.4rem;
		}

		.tagline {
			font-size: 1rem;
		}

		.societies-grid {
			grid-template-columns: 1fr;
		}

		.features-grid {
			grid-template-columns: 1fr;
		}
	}
</style>