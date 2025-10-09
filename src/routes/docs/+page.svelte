<svelte:head>
  <title>Documentation - Booze & Books</title>
  <meta name="description" content="How to use Booze & Books: create an account, manage your profile, add books, request and complete swaps, chat, generate cocktail ideas, find nearby stores, and understand notifications." />
</svelte:head>

<script>
  // no script needed; static content page
</script>

<div class="docs">
  <header class="docs-header">
    <h1>📚 Booze & Books — User Documentation</h1>
    <p class="subtitle">
      Learn how to get started, add books, swap with others, chat, generate cocktail ideas, and manage notifications.
    </p>
    <p class="meta">
      For help or troubleshooting, reach out to <a href="mailto:sahil.mb@gmail.com">sahil.mb@gmail.com</a>.
    </p>
  </header>

  <nav class="toc" aria-label="Table of contents">
    <h2>Table of Contents</h2>
    <ol>
      <li><a href="#introduction">Introduction</a></li>
      <li><a href="#getting-started">Getting Started</a></li>
      <li><a href="#profile">Profile</a></li>
      <li><a href="#books">Books</a></li>
      <li><a href="#swaps">Swaps</a></li>
      <li><a href="#communication">Communication</a></li>
      <li><a href="#cocktails-stores">Cocktails & Nearby Stores</a></li>
      <li><a href="#notifications">Notifications</a></li>
      <li><a href="#tips-troubleshooting">Tips & Troubleshooting</a></li>
      <li><a href="#support">Support</a></li>
    </ol>
  </nav>

  <section id="introduction">
    <h2>Introduction</h2>
    <p>
      Booze & Books helps you discover books, swap with other readers, and enjoy cocktail ideas inspired by your literary journey.
      Manage your collection, coordinate swaps, chat with partners, and find nearby stores—all in one place.
    </p>
    <ul>
      <li>Discover and add books to your library.</li>
      <li>Request, accept, decline, or counter swap offers.</li>
      <li>Chat with your swap partner to coordinate logistics.</li>
      <li>Generate cocktail ideas and find nearby stores for ingredients.</li>
      <li>Stay informed with in-product and email notifications.</li>
    </ul>
  </section>

  <section id="getting-started">
    <h2>Getting Started</h2>
    <h3>Create an account</h3>
    <ol>
      <li>Go to <a href="/auth/signup">Sign Up</a>.</li>
      <li>Create an account with email and password, or use Google sign-in if enabled.</li>
      <li>After signing up, you’ll be directed to your dashboard.</li>
    </ol>

    <h3>Sign in and out</h3>
    <ul>
      <li>Sign in at <a href="/auth/login">Sign In</a>.</li>
      <li>Sign out from the top nav (Profile → Sign Out) when logged in.</li>
    </ul>
  </section>

  <section id="profile">
    <h2>Profile</h2>
    <p>Keep your profile current so others can recognize and contact you appropriately.</p>
    <ol>
      <li>Navigate to <strong>Profile</strong> from the top nav or go to <a href="/app/profile">/app/profile</a>.</li>
      <li>Update your full name, username, and avatar image.</li>
      <li>Optionally set location details (e.g., city/state or zip code) to help with nearby features.</li>
      <li>Save your changes. Your updates will reflect across the app.</li>
    </ol>
  </section>

  <section id="books">
    <h2>Books</h2>

    <h3>Add a book</h3>
    <ol>
      <li>Open the <strong>My Books</strong> section or go to <a href="/app/books">/app/books</a>.</li>
      <li>Click <strong>Add</strong> to search via Google Books by title/author/ISBN. You can also manually edit fields.</li>
      <li>Set the book’s condition and availability (mark as available to receive swap requests).</li>
      <li>Save to add the book to your library.</li>
    </ol>

    <h3>Edit or manage a book</h3>
    <ul>
      <li>From your books list or a book’s detail page, click <strong>Edit</strong> to update details or condition.</li>
      <li>Toggle availability to control whether others can request a swap for that book.</li>
    </ul>

    <h3>Discover books</h3>
    <ol>
      <li>Explore <strong>Discover Books</strong> at <a href="/app/discover">/app/discover</a>.</li>
      <li>Browse and filter to find something you like.</li>
      <li>Open a book to view details and, if available, request a swap.</li>
    </ol>
  </section>

  <section id="swaps">
    <h2>Swaps</h2>

    <h3>Request a swap</h3>
    <ol>
      <li>From a book’s card or detail view, click <strong>Request Swap</strong>.</li>
      <li>Select the book you’re offering (if required) and confirm the request.</li>
      <li>The other user will be notified and can respond.</li>
    </ol>

    <h3>Respond to a swap</h3>
    <ol>
      <li>Open <strong>Swap Requests</strong> at <a href="/app/swaps">/app/swaps</a>.</li>
      <li>For incoming requests, choose to <strong>Accept</strong> or <strong>Decline</strong>.</li>
      <li>If needed, you can <strong>Counter</strong> with a different offered book.</li>
    </ol>

    <h3>Counter offers</h3>
    <ul>
      <li>When countering, you’ll select an alternative book you’re willing to trade.</li>
      <li>The counter offer goes back to the requester for acceptance or further negotiation.</li>
    </ul>

    <h3>Complete or cancel a swap</h3>
    <ul>
      <li><strong>Complete:</strong> Once both parties are satisfied and the exchange is done, mark the swap as completed. This may transfer book ownership in the system.</li>
      <li><strong>Cancel:</strong> If a swap cannot proceed, you or the appropriate party can cancel. The books’ availability will be updated accordingly.</li>
    </ul>

    <p class="note">
      Tip: Use in-app chat (see below) to coordinate timing, shipping, or meeting details with your swap partner.
    </p>
  </section>

  <section id="communication">
    <h2>Communication</h2>
    <p>
      Each active swap supports direct messaging between participants.
    </p>
    <ol>
      <li>Open a swap to view the conversation.</li>
      <li>Send messages to coordinate logistics or clarify details.</li>
      <li>Unread counts and notifications help you keep track of new messages.</li>
    </ol>
  </section>

  <section id="cocktails-stores">
    <h2>Cocktails & Nearby Stores</h2>

    <h3>Generate cocktail ideas</h3>
    <ol>
      <li>Go to <a href="/app/cocktails">/app/cocktails</a>.</li>
      <li>Provide optional preferences or prompts if available, then generate ideas.</li>
      <li>Browse the cocktail results and pick a recipe to try.</li>
    </ol>

    <h3>Find nearby stores</h3>
    <ol>
      <li>Provide your location (zip code or allow location if supported).</li>
      <li>Use the store search to find nearby options for ingredients.</li>
      <li>Select a store to view more details.</li>
    </ol>
  </section>

  <section id="notifications">
    <h2>Notifications</h2>
    <h3>In-product notifications</h3>
    <ul>
      <li>Click the bell icon in the top nav to view notifications.</li>
      <li>New items may show a badge count (e.g., incoming swap requests).</li>
      <li>Open an item to view details and mark it as read.</li>
    </ul>

    <h3>Email notifications</h3>
    <ul>
      <li>Important events (e.g., swap requests) can also trigger emails to the address on your profile.</li>
      <li>Keep your email up to date in your profile settings.</li>
    </ul>
  </section>

  <section id="tips-troubleshooting">
    <h2>Tips & Troubleshooting</h2>
    <ul>
      <li><strong>Authentication issues:</strong> If you cannot log in, double-check your email and password, or try the Google sign-in if enabled.</li>
      <li><strong>Permissions:</strong> Some actions (like completing/canceling swaps) are limited based on your role in the swap.</li>
      <li><strong>Images:</strong> If an avatar or book image is missing, try re-uploading the image or refreshing the page.</li>
      <li><strong>Location features:</strong> Ensure your zip code or location settings are set for accurate store search results.</li>
    </ul>
    <p>
      Still stuck? See <a href="#support">Support</a>.
    </p>
  </section>

  <section id="support">
    <h2>Support</h2>
    <p>
      For help, feedback, or troubleshooting, reach out to
      <a href="mailto:sahil.mb@gmail.com">sahil.mb@gmail.com</a>. Include relevant details (what you tried, screenshots, error messages) so we can assist quickly.
    </p>
  </section>

  <footer class="docs-footer">
    <p>© Booze & Books — Happy reading and cheers!</p>
  </footer>
</div>

<style>
  .docs {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1rem 4rem;
    line-height: 1.7;
    color: #212529;
  }

  .docs-header {
    margin-bottom: 1.5rem;
  }

  .docs-header h1 {
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    margin: 0 0 0.25rem 0;
    color: #444;
  }

  .meta {
    margin: 0;
    color: #555;
  }

  .toc {
    background: #fff;
    border: 1px solid #eee;
    border-left: 4px solid #D4AF37;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin: 1rem 0 2rem;
  }

  .toc h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
  }

  section {
    margin: 2rem 0;
  }

  h2 {
    border-bottom: 1px solid #eee;
    padding-bottom: 0.25rem;
  }

  .note {
    background: #fff8e1;
    border: 1px solid #ffe58f;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    color: #7a5d00;
  }

  .docs-footer {
    margin-top: 3rem;
    color: #555;
    text-align: center;
  }

  a {
    color: #8B2635;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
</style>
