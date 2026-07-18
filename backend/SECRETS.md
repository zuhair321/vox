# Rotating VOX Secrets

VOX's JWTs and 2FA secrets are only as safe as the keys that sign/encrypt them.
If the values in `backend/.env` were ever committed, logged, or shared, rotate
them immediately — old tokens become forgeable and 2FA secrets decryptable.

## 1. Generate fresh values

```bash
node ../scripts/generate-secrets.js
```

This prints a new `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and
`TWO_FACTOR_ENCRYPTION_KEY` (plus a sample `DATABASE_URL`). Copy them into
`backend/.env` (and your host's secret manager: Railway / Neon / etc.).

## 2. What rotation breaks

Rotating `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` invalidates **all existing
sessions** — every user is logged out and must sign in again. That is expected
and the safe behavior after a suspected leak.

Rotating `TWO_FACTOR_ENCRYPTION_KEY` makes existing encrypted TOTP secrets
undecryptable. Affected users must re-enable 2FA. Do this only if the old key
was compromised.

## 3. Rules (non-negotiable for launch)

- `backend/.env` is gitignored — never force-add it (`git add -f backend/.env`).
- Never paste real secrets into `.env.example` (it is committed).
- In production, source secrets from your platform's secret store, not a file
  checked into the repo.
- `TWO_FACTOR_ENCRYPTION_KEY` must be 64 hex chars; the app refuses to boot in
  production with the dev default (see `src/lib/env.js`).
