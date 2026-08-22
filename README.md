# VOX — Private Messaging Protocol

> End-to-end encrypted messaging for people who keep their own counsel.

VOX is a self-hosted, Discord-like communication platform with voice channels, text chat, forums, direct messages, and a gothic-industrial aesthetic. Built with Node.js, React, PostgreSQL, and WebRTC.

![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D20-blue)
![React](https://img.shields.io/badge/react-18-61dafb)

## Features

### Core
- **Real-time messaging** — Socket.io-powered instant delivery with typing indicators, read receipts, and reactions
- **Voice channels** — WebRTC peer-to-peer voice with mute/deafen, push-to-talk, and quality settings
- **Direct messages** — Private conversations with DM preferences, mute, and privacy controls
- **Forums** — Threaded discussions with pinned posts and replies
- **Threads** — Conversations within conversations, keep context organized

### Server Management
- **Roles & permissions** — Granular permission system with custom roles
- **Categories & channels** — Organize text, voice, and forum channels
- **Server templates** — Clone server structures instantly
- **Invites** — Temporary, limited-use, and permanent invite links
- **Audit logs** — Track all administrative actions

### Moderation
- **AutoMod** — Automated content filtering with custom rules
- **Reports** — User-submitted reports with moderator queue
- **Bans & timeouts** — Temporary and permanent restrictions
- **Strike system** — Progressive discipline with escalation rules
- **Quarantine** — Suspicious content review queue

### User Features
- **Profile customization** — Themes, avatar frames, animated avatars, bio
- **Custom emoji** — Upload and use server-specific emoji
- **Soundboard** — Share sounds in voice channels
- **Badges** — Custom power badges and achievements
- **Notes** — Personal notes on other users
- **Friends list** — Add, block, and DM friends

### Security
- **JWT authentication** — HttpOnly cookies, no token exposure
- **Two-factor auth** — TOTP-based 2FA with QR code setup
- **Rate limiting** — Brute-force protection on all auth endpoints
- **Input validation** — Zod schema validation on all inputs
- **SQL injection protection** — Prisma parameterized queries
- **XSS protection** — Content sanitization on user input

### Infrastructure
- **Docker deployment** — One-command production setup
- **PostgreSQL** — Reliable relational database with Prisma ORM
- **Redis** — Caching, pub/sub, and session storage
- **Nginx** — Reverse proxy with SSL termination
- **PM2** — Process management with auto-restart

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### Local Development

```bash
# Clone the repository
git clone https://github.com/zuhair321/vox.git
cd vox

# Install backend dependencies
cd backend
npm install

# Set up database
cp .env.example .env
# Edit .env with your database credentials
npx prisma migrate dev
npx prisma db seed

# Start backend
npm run dev

# In another terminal, install frontend dependencies
cd ../frontend
npm install

# Start frontend
npm run dev
```

### Docker Deployment

```bash
# Clone and configure
git clone https://github.com/zuhair321/vox.git
cd vox
cp .env.example .env
# Edit .env with your secrets

# Build and start
docker compose up -d

# Check status
docker compose ps
docker compose logs -f backend
```

### Oracle Cloud Free Tier

```bash
# SSH into your instance
ssh -i key.pem ubuntu@YOUR_IP

# Clone and deploy
git clone https://github.com/zuhair321/vox.git /opt/vox
cd /opt/vox
chmod +x deploy.sh
./deploy.sh
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection string |
| `JWT_ACCESS_SECRET` | Yes | — | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | — | Secret for refresh tokens |
| `TWO_FACTOR_ENCRYPTION_KEY` | Yes | — | 64-hex AES-256 key for 2FA secrets |
| `PORT` | No | `4000` | Backend port |
| `NODE_ENV` | No | `development` | `production` or `development` |
| `CLIENT_ORIGIN` | No | `http://localhost:3000` | Frontend URL for CORS |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret |

### Generate Secrets

```bash
# JWT secrets
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 2FA encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/me` | Update profile |
| POST | `/api/auth/2fa/setup` | Enable 2FA |
| POST | `/api/auth/2fa/verify` | Confirm 2FA |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/google` | Google OAuth URL |
| POST | `/api/auth/google` | Google OAuth login |

### Servers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/servers` | Create server |
| GET | `/api/servers` | List user's servers |
| GET | `/api/servers/:id` | Get server details |
| PATCH | `/api/servers/:id` | Update server |
| DELETE | `/api/servers/:id` | Delete server |
| POST | `/api/servers/:id/join` | Join server |
| POST | `/api/servers/:id/leave` | Leave server |

### Channels
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/servers/:id/channels` | Create channel |
| GET | `/api/servers/:id/channels` | List channels |
| PATCH | `/api/channels/:id` | Update channel |
| DELETE | `/api/channels/:id` | Delete channel |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/channels/:id/messages` | Get messages |
| POST | `/api/channels/:id/messages` | Send message |
| PATCH | `/api/channels/:id/messages/:id` | Edit message |
| DELETE | `/api/channels/:id/messages/:id` | Delete message |
| POST | `/api/channels/:id/messages/:id/react` | Add reaction |
| DELETE | `/api/channels/:id/messages/:id/react` | Remove reaction |

### Direct Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dms` | List DM conversations |
| GET | `/api/dm/:dmId/messages` | Get DM messages |
| POST | `/api/dm/:dmId/messages` | Send DM |
| PUT | `/api/dm/:dmId/preferences` | Update DM preferences |

### Friends
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/friends` | List friends |
| POST | `/api/friends/:id` | Add friend |
| DELETE | `/api/friends/:id` | Remove friend |
| POST | `/api/friends/:id/accept` | Accept friend request |
| POST | `/api/friends/:id/decline` | Decline friend request |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `message:new` | Server→Client | New message in channel |
| `message:update` | Server→Client | Message edited |
| `message:delete` | Server→Client | Message deleted |
| `typing:start` | Bidirectional | User started typing |
| `typing:stop` | Bidirectional | User stopped typing |
| `voice:join` | Client→Server | Join voice channel |
| `voice:leave` | Client→Server | Leave voice channel |
| `voice:mute` | Client→Server | Toggle mute |
| `voice:deafen` | Client→Server | Toggle deafen |
| `dm:new` | Server→Client | New DM received |
| `dm:typing` | Bidirectional | DM typing indicator |
| `member:join` | Server→Client | User joined server |
| `member:leave` | Server→Client | User left server |
| `member:update` | Server→Client | Member info changed |

## Project Structure

```
vox/
├── backend/
│   ├── prisma/           # Database schema & migrations
│   ├── src/
│   │   ├── routes/       # Express route handlers
│   │   ├── services/     # Business logic
│   │   ├── sockets/      # Socket.io handlers
│   │   ├── middleware/    # Auth, error, security
│   │   └── lib/          # Utilities, DB, Redis
│   └── tests/            # Test files
├── frontend/
│   ├── src/
│   │   ├── api/          # API client functions
│   │   ├── components/   # React components
│   │   ├── pages/        # Route pages
│   │   ├── stores/       # Zustand state stores
│   │   ├── styles/       # CSS files
│   │   └── utils/        # Utility functions
│   └── dist/             # Built frontend
├── nginx/                # Nginx config
├── Dockerfile            # Docker build
├── docker-compose.yml    # Docker Compose stack
└── deploy.sh             # One-command deployment
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Zustand, Framer Motion, Tailwind |
| Backend | Node.js 20, Express, Prisma, Socket.io |
| Database | PostgreSQL 16, Redis 7 |
| Voice | WebRTC, SimplePeer |
| Auth | JWT, bcrypt, TOTP 2FA |
| Deployment | Docker, Nginx, PM2 |
| Cloud | Oracle Cloud Free Tier |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/zuhair321/vox/issues)
- **Discussions**: [GitHub Discussions](https://github.com/zuhair321/vox/discussions)

---

Built with care by the VOX team.
