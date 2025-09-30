import type { SupabaseClient } from '@supabase/supabase-js';
import { EmailService, type EmailRecipient } from './emailService';
import { MessageType } from '$lib/types/notification';

/**
 * Server-only helper to send at most one chat digest email per day to a user
 * when they are offline and have unread chat messages.
 *
 * Rules:
 * - Respect profiles.email_notifications.chat_messages (default opt-in)
 * - Only send if profiles.last_chat_email_sent is &gt;= 24h ago (rate limit)
 * - Only send if user is offline (via get_user_online_status RPC)
 * - Unread count excludes auto-generated messages (data.auto_generated === true)
 * - After send, set profiles.last_chat_email_sent = now()
 */
export class ChatEmailDigestServer {
  static async maybeSendDigest(supabase: SupabaseClient, recipientId: string): Promise<void> {
    // 1) Load recipient profile with preferences and email
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, email, username, full_name, email_notifications, last_chat_email_sent')
      .eq('id', recipientId)
      .single();

    if (profErr || !profile) {
      return;
    }

    // Must have an email on file
    if (!profile.email || typeof profile.email !== 'string' || !profile.email.includes('@')) {
      return;
    }

    // Preferences: default opt-in if not set
    const prefs = (profile as any).email_notifications || {};
    const chatEnabled = prefs.chat_messages !== false; // treat undefined as true
    if (!chatEnabled) return;

    // Rate-limit: 24 hours since last digest
    const last = profile.last_chat_email_sent ? new Date(profile.last_chat_email_sent) : null;
    if (last && Date.now() - last.getTime() < 24 * 60 * 60 * 1000) {
      return;
    }

    // 2) Check online status via RPC
    let isOnline = false;
    try {
      const { data: status } = await supabase.rpc('get_user_online_status', {
        user_id: recipientId
      });
      const row = Array.isArray(status) ? status[0] : null;
      isOnline = !!row?.is_online;
    } catch {
      // If unavailable, fail open (assume offline) to avoid missing digests
      isOnline = false;
    }
    if (isOnline) return;

    // 3) Count unread chat messages, excluding auto-generated
    const { data: unreadRows, error: unreadErr } = await supabase
      .from('notifications')
      .select('id, data')
      .eq('recipient_id', recipientId)
      .eq('is_read', false)
      .eq('message_type', MessageType.CHAT_MESSAGE);

    if (unreadErr) return;

    const unreadCount = (unreadRows || []).filter((r: any) => r?.data?.auto_generated !== true).length;
    if (unreadCount <= 0) return;

    // 4) Send digest
    const recipient: EmailRecipient = {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      full_name: profile.full_name
    };

    await EmailService.sendChatDigestEmail({
      recipient,
      unreadCount
    });

    // 5) Update last_chat_email_sent
    await supabase
      .from('profiles')
      .update({ last_chat_email_sent: new Date().toISOString() })
      .eq('id', recipientId);
  }
}
