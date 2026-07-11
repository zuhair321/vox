# VOX — Google Play Data Safety (draft)

Use this to complete the **Data safety** form in Play Console
(App content → Data safety).

## Data collected
| Data type | Collected? | Shared? | Required / Optional | Notes |
|---|---|---|---|---|
| Email address | Yes | No | Required (account) | For login & account recovery |
| User ID | Yes | No | Required | Account identifier |
| User name / handle | Yes | Yes (in servers) | Required | Display name |
| Profile photo | Yes | Yes (in servers) | Optional | User-uploaded |
| Text/voice communications | Yes | Yes (participants) | Required (feature) | Messages & voice in channels |
| App activity (in-app search, interactions) | Yes | No | Optional | Product analytics |
| Device/other IDs | Yes | No | Required | For notifications |
| Crash logs / diagnostics | Yes | No | Optional | Crashlytics |
| Push tokens | Yes | No | Required | Notification delivery |

## Data security
- Data is encrypted in transit (HTTPS/TLS).
- Voice audio is relayed only for the active call; not stored permanently.

## User controls
- Delete account: Settings → Account.
- Opt out of analytics: Settings → Notifications/Privacy (if implemented).

> NOTE: This is a draft. Verify each answer in Play Console before submission.
