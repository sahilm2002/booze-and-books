#!/usr/bin/env node
// Simple Resend smoke test.
// Usage:
//   node --env-file=.env scripts/send-test-email.mjs you@example.com
// or
//   TEST_TO_EMAIL=you@example.com node --env-file=.env scripts/send-test-email.mjs

import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM;
const to = process.argv[2] || process.env.TEST_TO_EMAIL;

function fail(msg) {
  console.error(`[send-test-email] ${msg}`);
  process.exit(1);
}

if (!apiKey) fail('RESEND_API_KEY is not set. Add it to .env');
if (!from) fail('EMAIL_FROM is not set. Add it to .env, e.g. "Booze & Books <notifications@boozeandbooks.me>"');
if (!to) fail('Provide a recipient email: node --env-file=.env scripts/send-test-email.mjs you@example.com');

if (!from.includes('@boozeandbooks.me')) {
  console.warn('[send-test-email] WARNING: EMAIL_FROM does not appear to use the verified boozeandbooks.me domain.');
}

const resend = new Resend(apiKey);

const subject = 'Booze & Books: Resend smoke test';
const html = `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111; line-height:1.6;">
    <h2 style="margin:0 0 12px 0;">Resend smoke test ✅</h2>
    <p>If you received this email at <strong>${to}</strong>, your Resend setup is working.</p>
    <ul>
      <li>From: ${from}</li>
      <li>Environment: ${process.env.APP_BASE_URL || 'APP_BASE_URL not set'}</li>
    </ul>
    <p style="font-size:12px;color:#555">Sent at ${new Date().toISOString()}</p>
  </div>
`;
const text = `Resend smoke test. If you received this at ${to}, your setup works.
From: ${from}
APP_BASE_URL: ${process.env.APP_BASE_URL || 'not set'}
Sent at ${new Date().toISOString()}
`;

async function main() {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text
    });

    if (error) {
      console.error('[send-test-email] Resend error:', error);
      process.exit(1);
    }

    console.log('[send-test-email] Success. Resend message id:', data?.id || '(unknown)');
    console.log('[send-test-email] Check your inbox (and spam) for delivery.');
  } catch (err) {
    console.error('[send-test-email] Failed to send:', err);
    process.exit(1);
  }
}

main();
