// Email service using Resend.
// In development (no RESEND_API_KEY set), emails are logged to console
// instead of being sent — so the app works without a real API key.
import { Resend } from 'resend';
import { env } from '../lib/env.js';

let resendClient = null;

function getClient() {
  if (resendClient) return resendClient;
  if (!env.resend.apiKey || env.resend.apiKey === 'dev') {
    return null; // No API key — console-log mode
  }
  resendClient = new Resend(env.resend.apiKey);
  return resendClient;
}

const FROM_ADDRESS = env.resend.fromAddress || 'VOX <noreply@vox.app>';

/**
 * Send an email via Resend. Falls back to console.log in dev mode.
 */
async function sendEmail({ to, subject, html }) {
  const client = getClient();

  if (!client) {
    console.log(`[email:dev] TO: ${to}`);
    console.log(`[email:dev] SUBJECT: ${subject}`);
    console.log(`[email:dev] HTML: ${html.slice(0, 200)}...`);
    console.log(`[email:dev] (Set RESEND_API_KEY to send real emails)`);
    return { id: 'dev-console' };
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[email] Send failed:', error);
      throw error;
    }
    return data;
  } catch (err) {
    console.error('[email] Send error:', err.message);
    throw err;
  }
}

/**
 * Send a password reset email with a token link.
 */
export async function sendPasswordResetEmail(toEmail, resetToken) {
  const resetUrl = `${env.clientOrigin}/reset-password?token=${resetToken}`;

  return sendEmail({
    to: toEmail,
    subject: 'VOX — Password Reset',
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:sans-serif;color:#e0e0e0;background:#1a1a2e;padding:32px;border-radius:8px;">
        <h1 style="color:#5865f2;">VOX Password Reset</h1>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#5865f2;color:#fff;text-decoration:none;border-radius:4px;">Reset Password</a></p>
        <p style="color:#888;font-size:12px;">This link expires in 15 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Send an email verification email with a token link.
 */
export async function sendVerificationEmail(toEmail, verifyToken) {
  const verifyUrl = `${env.clientOrigin}/verify-email?token=${verifyToken}`;

  return sendEmail({
    to: toEmail,
    subject: 'VOX — Verify Your Email',
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:sans-serif;color:#e0e0e0;background:#1a1a2e;padding:32px;border-radius:8px;">
        <h1 style="color:#5865f2;">Verify Your VOX Account</h1>
        <p>Click the link below to verify your email address:</p>
        <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#5865f2;color:#fff;text-decoration:none;border-radius:4px;">Verify Email</a></p>
        <p style="color:#888;font-size:12px;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `,
  });
}
