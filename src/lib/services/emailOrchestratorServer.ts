import type { SupabaseClient } from '@supabase/supabase-js';
import { EmailService, type EmailRecipient, type SwapEmailPayload } from './emailService';

/**
 * Helper to safely read boolean preference from jsonb, defaulting to true (opt-in).
 */
function isPrefEnabled(prefs: any, key: 'chat_messages' | 'swap_requests' | 'swap_updates' | 'completion_reminders'): boolean {
  if (!prefs || typeof prefs !== 'object') return true;
  const v = prefs[key];
  if (v === undefined || v === null) return true;
  return !!v;
}

/**
 * Check email_log for an existing record and insert after sending to prevent duplicates.
 */
async function sendOnceAndLog(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    emailType: string;
    referenceId: string;
    send: () => Promise<void>;
  }
): Promise<void> {
  console.log(`[sendOnceAndLog] Checking for duplicate: user=${opts.userId}, type=${opts.emailType}, ref=${opts.referenceId}`);
  
  const { data: already } = await supabase
    .from('email_log')
    .select('id')
    .eq('user_id', opts.userId)
    .eq('email_type', opts.emailType)
    .eq('reference_id', opts.referenceId)
    .limit(1);

  if (already && already.length > 0) {
    console.log(`[sendOnceAndLog] Email already sent, skipping: user=${opts.userId}, type=${opts.emailType}, ref=${opts.referenceId}`);
    return;
  }

  console.log(`[sendOnceAndLog] No duplicate found, attempting to send email: user=${opts.userId}, type=${opts.emailType}, ref=${opts.referenceId}`);
  
  try {
    await opts.send();
    console.log(`[sendOnceAndLog] Email sent successfully: user=${opts.userId}, type=${opts.emailType}, ref=${opts.referenceId}`);
  } catch (err) {
    console.error(`[sendOnceAndLog] Email send failed [type=${opts.emailType}, ref=${opts.referenceId}, user=${opts.userId}]`, err);
    throw err; // Re-throw to see the error in the calling code
  }

  // Log regardless of downstream opens/clicks
  console.log(`[sendOnceAndLog] Logging email send: user=${opts.userId}, type=${opts.emailType}, ref=${opts.referenceId}`);
  await supabase.from('email_log').insert({
    user_id: opts.userId,
    email_type: opts.emailType,
    reference_id: opts.referenceId
  });
}

async function fetchSwapAndProfiles(
  supabase: SupabaseClient,
  swapId: string
): Promise<{
  swap: any;
  requester: EmailRecipient & { email_notifications?: any };
  owner: EmailRecipient & { email_notifications?: any };
  requested_book: { title: string; authors?: string[] | string | null };
  offered_book?: { title: string; authors?: string[] | string | null } | null;
  counter_offered_book?: { title: string; authors?: string[] | string | null } | null;
} | null> {
  // 1) swap row
  const { data: swap, error: swapErr } = await supabase
    .from('swap_requests')
    .select('*')
    .eq('id', swapId)
    .single();

  if (swapErr || !swap) {
    console.error('Failed to load swap for email orchestration:', swapErr);
    return null;
  }

  // 2) profiles
  const userIds = [swap.requester_id, swap.owner_id];
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, username, full_name, email, email_notifications')
    .in('id', userIds);

  if (profErr || !profiles) {
    console.error('Failed to load profiles for email orchestration:', profErr);
    return null;
  }

  const profMap = new Map<string, any>();
  for (const p of profiles) profMap.set(p.id, p);

  const requester = profMap.get(swap.requester_id) as EmailRecipient & { email_notifications?: any };
  const owner = profMap.get(swap.owner_id) as EmailRecipient & { email_notifications?: any };

  if (!requester?.email || !owner?.email) {
    // Missing email information; skip sending
    console.warn('Missing email addresses for swap participants; skipping email');
    return null;
  }

  // 3) books
  async function getBookSummary(id?: string | null): Promise<{ title: string; authors?: string[] | string | null } | null> {
    if (!id) return null;
    const { data, error } = await supabase
      .from('books')
      .select('title, authors')
      .eq('id', id)
      .single();
    if (error || !data) return { title: 'Unknown', authors: null };
    return { title: data.title || 'Unknown', authors: data.authors ?? null };
  }

  const requested_book = (await getBookSummary(swap.book_id)) || { title: 'Unknown', authors: null };
  const offered_book = await getBookSummary(swap.offered_book_id);
  const counter_offered_book = await getBookSummary(swap.counter_offered_book_id);

  return {
    swap,
    requester,
    owner,
    requested_book,
    offered_book,
    counter_offered_book
  };
}

function buildPayload(
  base: {
    swapId: string;
    requester: EmailRecipient;
    owner: EmailRecipient;
    requested_book: { title: string; authors?: string[] | string | null };
    offered_book?: { title: string; authors?: string[] | string | null } | null;
    counter_offered_book?: { title: string; authors?: string[] | string | null } | null;
  },
  message?: string | null
): SwapEmailPayload {
  return {
    swap_id: base.swapId,
    requester: base.requester,
    owner: base.owner,
    requested_book: base.requested_book,
    offered_book: base.offered_book ?? null,
    counter_offered_book: base.counter_offered_book ?? null,
    message: message ?? null
  };
}

export class EmailOrchestratorServer {
  // Swap created (notify owner)
  static async onSwapCreated(supabase: SupabaseClient, swapId: string, initialMessage?: string | null): Promise<void> {
    console.log(`[EmailOrchestrator] onSwapCreated triggered for swap ${swapId}`);
    const res = await fetchSwapAndProfiles(supabase, swapId);
    if (!res) {
      console.log(`[EmailOrchestrator] Failed to fetch swap/profiles for swap ${swapId}`);
      return;
    }
    const { requester, owner, requested_book, offered_book, counter_offered_book } = res;

    console.log(`[EmailOrchestrator] Swap created: requester=${requester.username} (${requester.email}), owner=${owner.username} (${owner.email})`);

    // Respect preferences: owner must allow swap_requests
    const ownerPrefs = isPrefEnabled((owner as any).email_notifications, 'swap_requests');
    console.log(`[EmailOrchestrator] Owner ${owner.username} swap_requests pref: ${ownerPrefs}`);
    if (!ownerPrefs) {
      console.log(`[EmailOrchestrator] Owner has disabled swap_requests emails, skipping`);
      return;
    }

    const payload = buildPayload(
      {
        swapId,
        requester,
        owner,
        requested_book,
        offered_book,
        counter_offered_book
      },
      initialMessage
    );

    console.log(`[EmailOrchestrator] Sending swap created email to ${owner.email} (no duplicate check)`);
    try {
      await EmailService.sendSwapCreatedEmail(payload, 'owner');
      console.log(`[EmailOrchestrator] Swap created email sent successfully to ${owner.email}`);
    } catch (err) {
      console.error(`[EmailOrchestrator] Failed to send swap created email to ${owner.email}:`, err);
    }
  }

  // Counter-offer (notify requester)
  static async onCounterOffer(supabase: SupabaseClient, swapId: string): Promise<void> {
    const res = await fetchSwapAndProfiles(supabase, swapId);
    if (!res) return;
    const { requester, owner, requested_book, offered_book, counter_offered_book } = res;

    if (!isPrefEnabled((requester as any).email_notifications, 'swap_updates')) return;

    const payload = buildPayload({
      swapId,
      requester,
      owner,
      requested_book,
      offered_book,
      counter_offered_book
    });

    await sendOnceAndLog(supabase, {
      userId: requester.id,
      emailType: 'counter_offer',
      referenceId: swapId,
      send: () => EmailService.sendCounterOfferEmail(payload)
    });
  }

  // Swap cancelled (notify requester only)
  static async onSwapCancelled(supabase: SupabaseClient, swapId: string): Promise<void> {
    const res = await fetchSwapAndProfiles(supabase, swapId);
    if (!res) return;
    const { swap, requester, owner, requested_book, offered_book, counter_offered_book } = res;

    if (!isPrefEnabled((requester as any).email_notifications, 'swap_updates')) return;

    const payload = buildPayload({
      swapId,
      requester,
      owner,
      requested_book,
      offered_book,
      counter_offered_book
    });

    const cancelledBy: 'owner' | 'requester' = swap.cancelled_by === owner.id ? 'owner' : 'requester';

    await sendOnceAndLog(supabase, {
      userId: requester.id,
      emailType: 'swap_cancelled',
      referenceId: swapId,
      send: () => EmailService.sendSwapCancelledEmail(payload, cancelledBy)
    });
  }

  // Swap approved (notify both, next steps)
  static async onSwapApproved(supabase: SupabaseClient, swapId: string): Promise<void> {
    console.log(`[EmailOrchestrator] onSwapApproved triggered for swap ${swapId}`);
    const res = await fetchSwapAndProfiles(supabase, swapId);
    if (!res) {
      console.log(`[EmailOrchestrator] Failed to fetch swap/profiles for swap ${swapId}`);
      return;
    }
    const { requester, owner, requested_book, offered_book, counter_offered_book } = res;

    console.log(`[EmailOrchestrator] Swap approved: requester=${requester.username} (${requester.email}), owner=${owner.username} (${owner.email})`);

    const payload = buildPayload({
      swapId,
      requester,
      owner,
      requested_book,
      offered_book,
      counter_offered_book
    });

    // Respect preferences individually
    const requesterPrefs = isPrefEnabled((requester as any).email_notifications, 'swap_updates');
    console.log(`[EmailOrchestrator] Requester ${requester.username} swap_updates pref: ${requesterPrefs}`);
    if (requesterPrefs) {
      console.log(`[EmailOrchestrator] Sending swap approved email to requester ${requester.email} (no duplicate check)`);
      try {
        await EmailService.sendSwapApprovedEmail(payload);
        console.log(`[EmailOrchestrator] Swap approved email sent successfully to requester ${requester.email}`);
      } catch (err) {
        console.error(`[EmailOrchestrator] Failed to send swap approved email to requester ${requester.email}:`, err);
      }
    }

    const ownerPrefs = isPrefEnabled((owner as any).email_notifications, 'swap_updates');
    console.log(`[EmailOrchestrator] Owner ${owner.username} swap_updates pref: ${ownerPrefs}`);
    if (ownerPrefs) {
      console.log(`[EmailOrchestrator] Sending swap approved email to owner ${owner.email} (no duplicate check)`);
      try {
        await EmailService.sendSwapApprovedEmail(payload);
        console.log(`[EmailOrchestrator] Swap approved email sent successfully to owner ${owner.email}`);
      } catch (err) {
        console.error(`[EmailOrchestrator] Failed to send swap approved email to owner ${owner.email}:`, err);
      }
    }
  }

  // Swap completed (notify both - celebratory)
  static async onSwapCompleted(supabase: SupabaseClient, swapId: string): Promise<void> {
    console.log(`[EmailOrchestrator] onSwapCompleted triggered for swap ${swapId}`);
    const res = await fetchSwapAndProfiles(supabase, swapId);
    if (!res) {
      console.log(`[EmailOrchestrator] Failed to fetch swap/profiles for swap ${swapId}`);
      return;
    }
    const { requester, owner, requested_book, offered_book, counter_offered_book } = res;

    console.log(`[EmailOrchestrator] Swap completed: requester=${requester.username} (${requester.email}), owner=${owner.username} (${owner.email})`);

    const payload = buildPayload({
      swapId,
      requester,
      owner,
      requested_book,
      offered_book,
      counter_offered_book
    });

    const requesterPrefs = isPrefEnabled((requester as any).email_notifications, 'swap_updates');
    console.log(`[EmailOrchestrator] Requester ${requester.username} swap_updates pref: ${requesterPrefs}`);
    if (requesterPrefs) {
      console.log(`[EmailOrchestrator] Sending swap completed email to requester ${requester.email} (no duplicate check)`);
      try {
        await EmailService.sendFullCompletionEmail(payload);
        console.log(`[EmailOrchestrator] Swap completed email sent successfully to requester ${requester.email}`);
      } catch (err) {
        console.error(`[EmailOrchestrator] Failed to send swap completed email to requester ${requester.email}:`, err);
      }
    }

    const ownerPrefs = isPrefEnabled((owner as any).email_notifications, 'swap_updates');
    console.log(`[EmailOrchestrator] Owner ${owner.username} swap_updates pref: ${ownerPrefs}`);
    if (ownerPrefs) {
      console.log(`[EmailOrchestrator] Sending swap completed email to owner ${owner.email} (no duplicate check)`);
      try {
        await EmailService.sendFullCompletionEmail(payload);
        console.log(`[EmailOrchestrator] Swap completed email sent successfully to owner ${owner.email}`);
      } catch (err) {
        console.error(`[EmailOrchestrator] Failed to send swap completed email to owner ${owner.email}:`, err);
      }
    }
  }
}
