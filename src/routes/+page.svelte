<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	let currentStoryIndex = 0;
	let isGeneratingStory = false;

	const literarySocieties = [
		{
			name: "Kit-Cat Club (1696-1720)",
			description: "London's influential Whig literary society where publishers, authors, and patrons gathered to share ideas over mutton pies and kit-cat portraits.",
			wikipediaUrl: "https://en.wikipedia.org/wiki/Kit-Cat_Club",
			theme: "Political discourse and literary patronage"
		},
		{
			name: "Bloomsbury Group (1905-1940s)",
			description: "Virginia Woolf, E.M. Forster, and their circle revolutionized literature through intimate gatherings in London's Bloomsbury district.",
			wikipediaUrl: "https://en.wikipedia.org/wiki/Bloomsbury_Group",
			theme: "Modernist literature and artistic innovation"
		},
		{
			name: "Algonquin Round Table (1919-1929)",
			description: "Dorothy Parker and fellow wits transformed New York's literary scene with their daily lunch meetings filled with wordplay and book discussions.",
			wikipediaUrl: "https://en.wikipedia.org/wiki/Algonquin_Round_Table",
			theme: "Wit, wordplay, and literary criticism"
		},
		{
			name: "The Inklings (1930s-1960s)",
			description: "J.R.R. Tolkien, C.S. Lewis, and friends met weekly at Oxford's Eagle and Child pub to share their fantasy writings over pints of ale.",
			wikipediaUrl: "https://en.wikipedia.org/wiki/Inklings",
			theme: "Fantasy literature and Christian allegory"
		},
		{
			name: "Salon de Madame Geoffrin (1750s-1770s)",
			description: "Marie Thérèse Rodet Geoffrin hosted Enlightenment philosophers and writers in her Parisian salon, serving fine wine alongside intellectual discourse.",
			wikipediaUrl: "https://en.wikipedia.org/wiki/Marie_Th%C3%A9r%C3%A8se_Rodet_Geoffrin",
			theme: "Enlightenment philosophy and social reform"
		},
		{
			name: "The Transcendental Club (1836-1840)",
			description: "Ralph Waldo Emerson and Henry David Thoreau gathered with fellow thinkers in Concord, Massachusetts, often sharing homemade cider while discussing nature and individualism.",
			wikipediaUrl: "https://en.wikipedia.org/wiki/Transcendental_Club",
			theme: "Transcendentalism and American philosophy"
		},
		{
			name: "The Rhymers' Club (1890s)",
			description: "W.B. Yeats and fellow poets met in London taverns to read their verses aloud, fueled by whiskey and passionate debates about the future of poetry.",
			wikipediaUrl: "https://en.wikipedia.org/wiki/Rhymers%27_Club",
			theme: "Symbolist poetry and Irish literary revival"
		}
	];

	let displayedSocieties = literarySocieties.slice(0, 3);

	function generateNewStory() {
		if (isGeneratingStory) return;
		
		isGeneratingStory = true;
		
		// Simulate story generation with a brief loading period
		setTimeout(() => {
			const availableSocieties = literarySocieties.filter(
				society => !displayedSocieties.some(displayed => displayed.name === society.name)
			);
			
			if (availableSocieties.length > 0) {
				const randomSociety = availableSocieties[Math.floor(Math.random() * availableSocieties.length)];
				displayedSocieties = [...displayedSocieties.slice(1), randomSociety];
			} else {
				// If we've shown all societies, shuffle and start over
				const shuffled = [...literarySocieties].sort(() => Math.random() - 0.5);
				displayedSocieties = shuffled.slice(0, 3);
			}
			
			isGeneratingStory = false;
		}, 800);
	}
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

	<section class="how-it-works">
		<div class="how-it-works-content">
			<h2>📖 How Booze and Books Works</h2>
			<p class="section-intro">Join our literary community in three simple steps:</p>
			
			<div class="steps-grid">
				<div class="step">
					<div class="step-number">1</div>
					<div class="step-content">
						<h3>📚 Share Your Library</h3>
						<p>Add books from your personal collection that you're willing to lend or trade. Include details about condition, genre, and why you loved (or didn't love) each book.</p>
					</div>
				</div>
				<div class="step">
					<div class="step-number">2</div>
					<div class="step-content">
						<h3>🔍 Discover & Request</h3>
						<p>Browse other members' collections, discover new authors, and request books that catch your interest. Chat with owners to discuss literature and arrange exchanges.</p>
					</div>
				</div>
				<div class="step">
					<div class="step-number">3</div>
					<div class="step-content">
						<h3>🤝 Exchange & Connect</h3>
						<p>Meet fellow book lovers, exchange literary treasures, and build lasting friendships through shared reading experiences. Rate and review to help others discover great reads.</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="historical-context">
		<div class="historical-card">
			<div class="section-header">
				<h2>🍷 In the Spirit of Great Literary Societies</h2>
				<button 
					class="generate-story-btn" 
					on:click={generateNewStory}
					disabled={isGeneratingStory}
				>
					{isGeneratingStory ? '🔄 Discovering...' : '✨ Discover More Stories'}
				</button>
			</div>
			
			<div class="societies-grid">
				{#each displayedSocieties as society, index}
					<div class="society" style="animation-delay: {index * 0.1}s">
						<div class="society-header">
							<h3>{society.name}</h3>
						</div>
						<div class="society-theme">
							<strong>Theme:</strong> {society.theme}
						</div>
						<p>{society.description}</p>
						<div class="society-links">
							<a href={society.wikipediaUrl} target="_blank" rel="noopener noreferrer" class="wiki-link">
								📖 Learn More on Wikipedia
							</a>
						</div>
					</div>
				{/each}
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
		min-height: calc(100vh - 80px); /* Account for navigation bar */
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

	.how-it-works {
		padding: 4rem 2rem;
		background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
	}

	.how-it-works-content {
		max-width: 1200px;
		margin: 0 auto;
		text-align: center;
	}

	.how-it-works h2 {
		color: #2d3748;
		font-size: 2.5rem;
		margin-bottom: 1rem;
		font-family: 'Georgia', serif;
	}

	.section-intro {
		color: #4a5568;
		font-size: 1.2rem;
		margin-bottom: 3rem;
		font-style: italic;
	}

	.steps-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 3rem;
		margin-top: 3rem;
	}

	.step {
		display: flex;
		align-items: flex-start;
		gap: 1.5rem;
		text-align: left;
	}

	.step-number {
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		width: 60px;
		height: 60px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: bold;
		flex-shrink: 0;
		box-shadow: 0 4px 15px rgba(139, 38, 53, 0.3);
	}

	.step-content h3 {
		color: #2d3748;
		font-size: 1.4rem;
		margin-bottom: 0.75rem;
		font-family: 'Georgia', serif;
	}

	.step-content p {
		color: #4a5568;
		line-height: 1.6;
		font-size: 1rem;
	}

	.historical-context {
		padding: 4rem 2rem;
		background: white;
	}

	.historical-card {
		max-width: 1200px;
		margin: 0 auto;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 3rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.section-header h2 {
		color: #2d3748;
		font-size: 2.2rem;
		margin: 0;
		font-family: 'Georgia', serif;
	}

	.generate-story-btn {
		background: linear-gradient(135deg, #D4AF37 0%, #B8941F 100%);
		color: #8B2635;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s;
		font-family: 'Georgia', serif;
		font-size: 1rem;
	}

	.generate-story-btn:hover:not(:disabled) {
		background: linear-gradient(135deg, #B8941F 0%, #D4AF37 100%);
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(212, 175, 55, 0.4);
	}

	.generate-story-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
		transform: none;
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
		animation: fadeInUp 0.6s ease-out forwards;
		opacity: 0;
		transform: translateY(20px);
		display: flex;
		flex-direction: column;
	}

	@keyframes fadeInUp {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.society-header {
		margin-bottom: 1rem;
	}

	.society h3 {
		color: #2d3748;
		font-size: 1.3rem;
		margin: 0;
		font-family: 'Georgia', serif;
	}

	.society-theme {
		color: #8B2635;
		font-size: 0.9rem;
		margin-bottom: 1rem;
		padding: 0.5rem;
		background: rgba(139, 38, 53, 0.1);
		border-radius: 6px;
	}

	.society p {
		color: #4a5568;
		line-height: 1.6;
		margin: 0 0 1.5rem 0;
		flex-grow: 1;
	}

	.society-links {
		display: flex;
		gap: 0.5rem;
		margin-top: auto;
		padding-top: 1rem;
		border-top: 1px solid #e2e8f0;
	}

	.wiki-link {
		background: #4299e1;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.wiki-link:hover {
		background: #3182ce;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(65, 153, 225, 0.3);
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
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		border: 2px solid #8B2635;
	}

	.cta-button.primary:hover {
		background: linear-gradient(135deg, #722F37 0%, #8B2635 100%);
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(139, 38, 53, 0.4);
	}

	.cta-button.secondary {
		background: linear-gradient(135deg, #D4AF37 0%, #B8941F 100%);
		color: #8B2635;
		border: 2px solid #D4AF37;
	}

	.cta-button.secondary:hover {
		background: linear-gradient(135deg, #B8941F 0%, #D4AF37 100%);
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(212, 175, 55, 0.4);
	}

	.cta-button:not(.primary):not(.secondary) {
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		color: #F5F5DC;
		border: 2px solid #8B2635;
	}

	.cta-button:not(.primary):not(.secondary):hover {
		background: linear-gradient(135deg, #722F37 0%, #8B2635 100%);
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(139, 38, 53, 0.4);
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
