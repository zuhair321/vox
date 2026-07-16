// Email service using Resend with resilience patterns: circuit breaker, retry with exponential backoff
import { Resend } from 'resend';
import { env } from '../lib/env.js';
import { resendCircuitBreaker, resendRetryPolicy } from '../lib/resilience.js';

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

// Wrap the actual send operation with resilience patterns
async function sendEmailResilient({ to, subject, html }) {
  const client = getClient();

  if (!client) {
    console.log(`[email:dev] TO: ${to}`);
    console.log(`[email:dev] SUBJECT: ${subject}`);
    console.log(`[email:dev] HTML: ${html.slice(0, 200)}...`);
    console.log(`[email:dev] (Set RESEND_API_KEY to send real emails)`);
    return { id: 'dev-console' };
  }

  // Use retry policy with exponential backoff
  return await resendRetryPolicy.execute(async () => {
    // Use circuit breaker to prevent cascading failures
    return await resendCircuitBreaker.call(async () => {
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
    });
  });
}

/**
 * Send an email via Resend. Falls back to console.log in dev mode.
 * Includes circuit breaker and retry with exponential backoff for resilience.
 */
export async function sendEmail({ to, subject, html }) {
  try {
    return await sendEmailResilient({ to, subject, html });
  } catch (err) {
    console.error('[email] Send error after all retries:', err.message);
    // Re-throw to let caller handle it appropriately
    throw err;
  }
}

/**
 * Send a password reset email with a token link.
 */
export async function sendPasswordResetEmail(toEmail, resetToken) {
  const resetUrl = `${env.clientOrigin}/reset-password?token=${resetToken}`;

  return await sendEmail({
    to: toEmail,
    subject: 'VOX — Password Reset',
    html: `\n      <div style=\"max-width:480px;margin:0 auto;font-family:sans-serif;color:#e0e0e0;background:#1a1a2e;padding:32px;border-radius:8px;\">\n        <h1 style=\"color:#5865f2;\">VOX Password Reset</h1>\n        <p>You requested a password reset. Click the link below to set a new password:</p>\n        <p><a href=\"${resetUrl}\" style=\"display:inline-block;padding:12px 24px;background:#5865f2;color:#fff;text-decoration:none;border-radius:4px;\">Reset Password</a></p>\n        <p style=\"color:#888;font-size:12px;\">This link expires in 15 minutes. If you didn't request this, ignore this email.</p>\n      </div>\n    `,
  });
}

/**
 * Send an email verification email with a token link.
 */
export async function sendVerificationEmail(toEmail, verifyToken) {
  const verifyUrl = `${env.clientOrigin}/verify-email?token=${verifyToken}`;

  return await sendEmail({
    to: toEmail,
    subject: 'VOX — Verify Your Email',
    html: `\n      <div style=\"max-width:480px;margin:0 auto;font-family:sans-serif;color:#e0e0e0;background:#1a1a2e;padding:32px;border-radius:8px;\">\n        <h1 style=\"color:#5865f2;\">Verify Your VOX Account</h1>\n        <p>Click the link below to verify your email address:</p>\n        <p><a href=\"${verifyUrl}\" style=\"display:inline-block;padding:12px 24px;background:#5865f2;color:#fff;text-decoration:none;border-radius:4px;\">Verify Email</a></p>\n        <p style=\"color:#888;font-size:12px;\">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>\n      </div>\n    `,
  });
}