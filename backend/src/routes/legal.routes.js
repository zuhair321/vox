// VOX — Legal routes (privacy policy, terms).
// Serves human-readable HTML so the Play Console privacy-policy URL and the
// in-app "Privacy Policy" link resolve to a real hosted page.
import express from 'express';

const router = express.Router();

const PRIVACY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VOX — Privacy Policy</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
           background:#0a0a0f; color:#e6e6ea; max-width:760px; margin:0 auto; padding:32px 20px; line-height:1.6; }
    h1 { color:#fff; } h2 { color:#fff; margin-top:28px; } a { color:#5865f2; }
    .muted { color:#9aa0aa; font-size:14px; }
  </style>
</head>
<body>
  <h1>VOX — Privacy Policy</h1>
  <p class="muted">Effective date: 2026-07-11 · App: VOX (Android) · package com.vox.mobile</p>

  <h2>1. Overview</h2>
  <p>VOX is a voice, text, and community chat application. This policy explains what data we collect, why, and how you can control it.</p>

  <h2>2. Data we collect</h2>
  <ul>
    <li><b>Account data:</b> email, username, password (hashed), optional profile picture and bio.</li>
    <li><b>Social data:</b> servers you join, messages, direct messages, friends, and reactions.</li>
    <li><b>Voice data:</b> real-time audio transmitted only while you are in a voice channel. Audio is relayed for the call and is not permanently stored on our servers.</li>
    <li><b>Device data:</b> device model, OS version, and push notification tokens, used for notification delivery and crash diagnostics.</li>
    <li><b>Usage data:</b> anonymous analytics about feature usage to improve the app.</li>
  </ul>

  <h2>3. How we use data</h2>
  <p>To create and secure your account; deliver messages, voice, and notifications in real time; moderate content; and diagnose crashes.</p>

  <h2>4. Data sharing</h2>
  <p>We do <b>not</b> sell your personal data. Data is shared only with other users in the servers/channels you choose to join, and with service providers that power hosting, push notifications, and analytics under contractual confidentiality.</p>

  <h2>5. Data retention</h2>
  <p>Messages and account data are retained while your account is active. Delete your account anytime from Settings → Account.</p>

  <h2>6. Security</h2>
  <p>Passwords are hashed; API traffic uses HTTPS/TLS. Voice channels are authenticated.</p>

  <h2>7. Children</h2>
  <p>VOX is not directed to children under 13 (or the minimum age in your jurisdiction).</p>

  <h2>8. Your rights</h2>
  <p>Request access, correction, or deletion of your data at <a href="mailto:privacy@vox.app">privacy@vox.app</a>.</p>

  <h2>9. Contact</h2>
  <p><a href="mailto:privacy@vox.app">privacy@vox.app</a></p>
</body>
</html>`;

router.get(['/privacy', '/privacy-policy', '/legal/privacy'], (req, res) => {
  res.type('html').send(PRIVACY_HTML);
});

export const legalRouter = router;
