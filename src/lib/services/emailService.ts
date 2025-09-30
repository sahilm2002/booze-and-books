import { Resend } from 'resend';

// Server-only email service using Resend
// Do NOT import this from client-side code.
export type EmailRecipient = {
  id: string;
  email: string;
  username?: string | null;
  full_name?: string | null;
};

export type SwapEmailPayload = {
  swap_id: string;
  requester: EmailRecipient;
  owner: EmailRecipient;
  requested_book: { title: string; authors?: string[] | string | null };
  offered_book?: { title: string; authors?: string[] | string | null } | null;
  counter_offered_book?: { title: string; authors?: string[] | string | null } | null;
  message?: string | null;
};

function getEnv(name: string, fallback?: string): string {
  const val = process.env[name];
  if (!val || !val.trim()) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

function getEnvSafe(name: string, fallback?: string): string | null {
  const val = process.env[name];
  if (!val || !val.trim()) {
    return fallback || null;
  }
  return val;
}

function toAuthorString(authors?: string[] | string | null): string {
  if (!authors) return '';
  if (Array.isArray(authors)) return authors.join(', ');
  return authors;
}

function appUrl(path: string): string {
  const base = getEnv('APP_BASE_URL', 'http://localhost:5173');
  if (!path.startsWith('/')) path = '/' + path;
  return `${base}${path}`;
}

function loginRedirectUrl(path: string): string {
  // Send user to login with redirect back to app path after authentication
  // Adjust if you have a dedicated login route/param handling
  const base = getEnv('APP_BASE_URL', 'http://localhost:5173');
  const encoded = encodeURIComponent(path);
  return `${base}/auth/login?redirect=${encoded}`;
}

export class EmailService {
	private static _resend: Resend | null = null;
	private static lastRequestTime = 0;
	private static readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests (Resend allows 2/sec)

	// Reset the cached Resend instance (useful after environment changes)
	static resetCache(): void {
		console.log('[EmailService] Resetting cached Resend instance');
		this._resend = null;
	}

	// Rate limiting helper to prevent 429 errors from Resend
	private static async enforceRateLimit(): Promise<void> {
		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequestTime;
		
		if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
			const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
			console.log(`[EmailService] Rate limiting: waiting ${waitTime}ms before next request`);
			await new Promise(resolve => setTimeout(resolve, waitTime));
		}
		
		this.lastRequestTime = Date.now();
	}

  private static getResend(): Resend | null {
    if (!this._resend) {
      // Bypass getEnvSafe function due to scoping issue - use direct access
      const apiKey = process.env.RESEND_API_KEY;

      console.log(`[EmailService] Direct process.env.RESEND_API_KEY: ${apiKey ? `***${apiKey.slice(-4)}` : 'null'}`);

      if (!apiKey || !apiKey.trim()) {
        console.warn('[EmailService] RESEND_API_KEY not configured - emails will be skipped');
        return null;
      }
      console.log(`[EmailService] Loading Resend with API key: ***${apiKey.slice(-4)}`);
      this._resend = new Resend(apiKey);
    }
    return this._resend;
  }

  private static from(): string {
    const configuredRaw = getEnvSafe('EMAIL_FROM') || null;
    const configured = configuredRaw ? configuredRaw.trim() : null;

    // Default to verified domain if not configured
    let chosen = configured || 'Booze & Books <notifications@boozeandbooks.me>';

    // If configured but not on verified domain, force override to avoid Resend 403
    if (!/boozeandbooks\.me/i.test(chosen)) {
      console.warn(`[EmailService] EMAIL_FROM not on verified domain, overriding. Was: "${chosen}"`);
      chosen = 'Booze & Books <notifications@boozeandbooks.me>';
    }

    return chosen;
  }

  // Footer appended to all outgoing emails with a link to manage preferences
  private static buildFooter(to: string): string {
    const manageUrl = appUrl('/app/profile#email-preferences');
    return `
      <hr style="border:none;border-top:1px solid #e5e7eb; margin:20px 0;" />
      <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#6b7280; font-size:12px; line-height:1.5;">
        <p style="margin:0 0 6px 0;">
          Manage your email preferences here:
          <a href="${manageUrl}" style="color:#374151; text-decoration:underline;">Email Preferences</a>
        </p>
        <p style="margin:0;">Sent by Booze & Books</p>
      </div>
    `;
  }

  static async send(to: string, subject: string, html: string, text?: string): Promise<void> {
    console.log(`[EmailService] Attempting to send email to: ${to}, subject: ${subject}`);

    if (!to || !to.includes('@')) {
      console.warn('EmailService.send skipped: invalid recipient', to);
      return;
    }

    const resend = this.getResend();
    if (!resend) {
      console.warn(`[EmailService] Email to ${to} skipped: RESEND_API_KEY not configured`);
      return;
    }

    try {
      // Apply rate limiting before making the API call
      await this.enforceRateLimit();

      const finalHtml = `${html}
${this.buildFooter(to)}`;

      const from = this.from();
      console.log(`[EmailService] Using From: ${from}`);
      console.log(`[EmailService] Calling Resend API for email to: ${to}`);

      const result = await resend.emails.send({
        from,
        to,
        subject,
        html: finalHtml,
        text
      });

      // Treat Resend validation errors as failures
      if (result && (result as any).error) {
        const errObj: any = (result as any).error;
        console.error(`[EmailService] Resend returned error for ${to}:`, errObj);
        throw new Error(`Resend error (${errObj.statusCode || 'unknown'}): ${errObj.message || 'unknown error'}`);
      }

      console.log(`[EmailService] Email accepted by Resend for ${to}. Result:`, result);
    } catch (err) {
      console.error(`[EmailService] Failed to send email to ${to}:`, err);
      throw err; // Re-throw so calling code knows it failed
    }
  }

  // 1) Chat digest (at most once per day)
  static async sendChatDigestEmail(opts: {
    recipient: EmailRecipient;
    unreadCount: number;
  }): Promise<void> {
    const { recipient, unreadCount } = opts;
    const name = recipient.full_name || recipient.username || 'there';
    const subject = `You have ${unreadCount} unread chat message${unreadCount === 1 ? '' : 's'}`;
    const linkPath = '/app'; // could be enhanced to deep-open chat if your app supports it
    const url = loginRedirectUrl(linkPath);

    const html = `
      <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111; line-height:1.6;">
        <h2 style="margin:0 0 12px 0;">Hi ${name},</h2>
        <p>You have ${unreadCount} unread chat message${unreadCount === 1 ? '' : 's'} on Booze &amp; Books.</p>
        <p>
          <a href="${url}" style="display:inline-block; padding:10px 14px; border-radius:8px; background:#1f2937; color:#fff; text-decoration:none;">
            Login to view chats
          </a>
        </p>
        <p style="font-size:12px; color:#555;">This is a notification because you are currently offline. You'll receive at most one chat email per day.</p>
      </div>
    `;

    await this.send(recipient.email, subject, html);
  }

  // 2) Swap created (offer)
  static async sendSwapCreatedEmail(payload: SwapEmailPayload, to: 'owner' | 'requester' = 'owner'): Promise<void> {
    const target = to === 'owner' ? payload.owner : payload.requester;
    const name = target.full_name || target.username || 'there';
    const requesterName = payload.requester.full_name || payload.requester.username || 'A user';
    const requestedAuthors = toAuthorString(payload.requested_book.authors);
    const offeredTitle = payload.offered_book?.title || 'a book';
    const offeredAuthors = payload.offered_book ? toAuthorString(payload.offered_book.authors) : '';
    const subject =
      to === 'owner'
        ? `You received a book swap offer from ${payload.requester.username || 'a user'}`
        : `Your swap offer was sent`;

    const link = loginRedirectUrl(`/app/swaps#swap-${payload.swap_id}`);

    const ownerHtml = `
      <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111; line-height:1.6;">
        <h2 style="margin:0 0 12px 0;">Hi ${name},</h2>
        <p>You have received a book swap offer from <strong>${requesterName}</strong>.</p>
        <p>They are offering <strong>"${offeredTitle}"${offeredAuthors ? ` by ${offeredAuthors}` : ''}</strong> in return for <strong>"${payload.requested_book.title}"${requestedAuthors ? ` by ${requestedAuthors}` : ''}</strong>.</p>
        ${payload.message ? `<p><em>Message:</em> ${payload.message}</p>` : ''}
        <p>
          <a href="${link}" style="display:inline-block; padding:10px 14px; border-radius:8px; background:#1f2937; color:#fff; text-decoration:none;">
            View swap request and reply
          </a>
        </p>
        <p style="font-size:12px; color:#555;">You can chat to coordinate logistics and decide how to exchange books.</p>
      </div>
    `;

    const requesterHtml = `
      <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111; line-height:1.6;">
        <h2 style="margin:0 0 12px 0;">Hi ${name},</h2>
        <p>Your book swap offer has been sent.</p>
        <p>You offered <strong>"${offeredTitle}"${offeredAuthors ? ` by ${offeredAuthors}` : ''}</strong> in return for <strong>"${payload.requested_book.title}"${requestedAuthors ? ` by ${requestedAuthors}` : ''}</strong>.</p>
        ${payload.message ? `<p><em>Your message:</em> ${payload.message}</p>` : ''}
        <p>
          <a href="${link}" style="display:inline-block; padding:10px 14px; border-radius:8px; background:#1f2937; color:#fff; text-decoration:none;">
            View swap request
          </a>
        </p>
        <p style="font-size:12px; color:#555;">We’ll notify you when the owner responds.</p>
      </div>
    `;

    const html = to === 'owner' ? ownerHtml : requesterHtml;
    await this.send(target.email, subject, html);
  }

  // 3) Swap cancelled (notify requester only)
  static async sendSwapCancelledEmail(payload: SwapEmailPayload, cancelledBy: 'owner' | 'requester'): Promise<void> {
    // Notify the non-cancelling party
    const target = cancelledBy === 'requester' ? payload.owner : payload.requester;
    const name = target.full_name || target.username || 'there';
    const requestedAuthors = toAuthorString(payload.requested_book.authors);
    const link = loginRedirectUrl(`/app/swaps#swap-${payload.swap_id}`);
    const subject = `A book swap offer was cancelled`;

    const html = `
      <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111; line-height:1.6;">
        <h2 style="margin:0 0 12px 0;">Hi ${name},</h2>
        <p>Your book swap offer for <strong>"${payload.requested_book.title}"${requestedAuthors ? ` by ${requestedAuthors}` : ''}</strong> was cancelled by the ${cancelledBy === 'owner' ? 'book owner' : 'requester'}.</p>
        <p>
          <a href="${link}" style="display:inline-block; padding:10px 14px; border-radius:8px; background:#1f2937; color:#fff; text-decoration:none;">
            View swap details
          </a>
        </p>
      </div>
    `;
    await this.send(target.email, subject, html);
  }

  // 4) Counter-offer made (notify original requester)
  static async sendCounterOfferEmail(payload: SwapEmailPayload): Promise<void> {
    const target = payload.requester;
    const name = target.full_name || target.username || 'there';
    const requestedAuthors = toAuthorString(payload.requested_book.authors);
    const counterTitle = payload.counter_offered_book?.title || 'a different book';
    const counterAuthors = payload.counter_offered_book ? toAuthorString(payload.counter_offered_book.authors) : '';
    const link = loginRedirectUrl(`/app/swaps#swap-${payload.swap_id}`);
    const subject = `You received a counter-offer`;

    const html = `
      <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111; line-height:1.6;">
        <h2 style="margin:0 0 12px 0;">Hi ${name},</h2>
        <p>The owner counter-offered your request for <strong>"${payload.requested_book.title}"${requestedAuthors ? ` by ${requestedAuthors}` : ''}</strong>.</p>
        <p>They are proposing <strong>"${counterTitle}"${counterAuthors ? ` by ${counterAuthors}` : ''}</strong> instead.</p>
        <p>
          <a href="${link}" style="display:inline-block; padding:10px 14px; border-radius:8px; background:#1f2937; color:#fff; text-decoration:none;">
            Review and respond to counter-offer
          </a>
        </p>
      </div>
    `;
    await this.send(target.email, subject, html);
  }

  // 5) Swap approved (notify both users with next steps)
  static async sendSwapApprovedEmail(payload: SwapEmailPayload): Promise<void> {
    const link = loginRedirectUrl(`/app/swaps#swap-${payload.swap_id}`);
    const sendTo = [payload.requester, payload.owner];

    for (const target of sendTo) {
      const name = target.full_name || target.username || 'there';
      const subject = `Swap approved – coordinate next steps`;
      const html = `
        <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111; line-height:1.6;">
          <h2 style="margin:0 0 12px 0;">Hi ${name},</h2>
          <p>Your book swap has been <strong>approved</strong>. Please coordinate mailing addresses and shipping details with the other user.</p>
          <ul>
            <li>Exchange addresses safely via in-app chat</li>
            <li>Share tracking details if mailing the book</li>
            <li>Meet in a public place if exchanging locally</li>
          </ul>
          <p>Once you receive your book, mark the swap as completed.</p>
          <p>
            <a href="${link}" style="display:inline-block; padding:10px 14px; border-radius:8px; background:#1f2937; color:#fff; text-decoration:none;">
              View swap and chat
            </a>
          </p>
        </div>
      `;
      await this.send(target.email, subject, html);
    }
  }

  // 6) Partial completion – one party marked as completed (notify the other)
  static async sendPartialCompletionEmail(payload: SwapEmailPayload, otherUser: EmailRecipient): Promise<void> {
    const name = otherUser.full_name || otherUser.username || 'there';
    const link = loginRedirectUrl(`/app/swaps#swap-${payload.swap_id}`);
    const subject = `The other user marked the swap as completed – did you receive your book?`;

    const html = `
      <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111; line-height:1.6;">
        <h2 style="margin:0 0 12px 0;">Hi ${name},</h2>
        <p>The other user marked the swap as completed after receiving their book.</p>
        <p>If you've received your book too, please mark the swap as completed.</p>
        <p>
          <a href="${link}" style="display:inline-block; padding:10px 14px; border-radius:8px; background:#1f2937; color:#fff; text-decoration:none;">
            Mark as completed
          </a>
        </p>
      </div>
    `;
    await this.send(otherUser.email, subject, html);
  }

  // 7) Full completion – both users completed (notify both)
  static async sendFullCompletionEmail(payload: SwapEmailPayload): Promise<void> {
    const sendTo = [payload.requester, payload.owner];
    const link = loginRedirectUrl(`/app/swaps#swap-${payload.swap_id}`);

    for (const target of sendTo) {
      const name = target.full_name || target.username || 'there';
      const subject = `Swap completed – enjoy your book!`;
      const html = `
        <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111; line-height:1.6;">
          <h2 style="margin:0 0 12px 0;">Hi ${name},</h2>
          <p>Both users have marked the swap as completed. Enjoy your new book!</p>
          <p>
            <a href="${link}" style="display:inline-block; padding:10px 14px; border-radius:8px; background:#1f2937; color:#fff; text-decoration:none;">
              View swap
            </a>
          </p>
        </div>
      `;
      await this.send(target.email, subject, html);
    }
  }

  // 8) Completion reminder – every 4 days
  static async sendCompletionReminderEmail(payload: SwapEmailPayload, to: EmailRecipient): Promise<void> {
    const name = to.full_name || to.username || 'there';
    const link = loginRedirectUrl(`/app/swaps#swap-${payload.swap_id}`);
    const subject = `Reminder: Please complete your book swap`;

    const html = `
      <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111; line-height:1.6;">
        <h2 style="margin:0 0 12px 0;">Hi ${name},</h2>
        <p>This is a friendly reminder to complete your book swap if you've received your book.</p>
        <p>
          <a href="${link}" style="display:inline-block; padding:10px 14px; border-radius:8px; background:#1f2937; color:#fff; text-decoration:none;">
            Go to swap
          </a>
        </p>
      </div>
    `;
    await this.send(to.email, subject, html);
  }
}
