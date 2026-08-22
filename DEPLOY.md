# VOX — Oracle Cloud Free Tier Deployment Guide

## Overview

VOX runs on Oracle Cloud's **Always Free Tier** with massive headroom:

| Resource | Oracle Free Tier | VOX Usage | Remaining |
|----------|-----------------|-----------|-----------|
| Compute | 4 OCPU / 24 GB RAM | ~810 MB RAM | **23+ GB** |
| Storage | 200 GB boot + 200 GB block | ~2 GB | **398 GB** |
| Bandwidth | 10 TB/month outbound | ~10 GB/month | **9.99 TB** |
| Database | Self-managed PostgreSQL on compute | 300 MB RAM | Plenty |

## Prerequisites

1. **Oracle Cloud account** — [cloud.oracle.com](https://cloud.oracle.com) (free tier)
2. **Domain name** — any registrar (Namecheap, Cloudflare, etc.)
3. **DNS configured** — A record pointing to your Oracle Cloud public IP

## Quick Deploy (Automated)

```bash
# SSH into your Oracle Cloud instance
ssh -i your-key.pem ubuntu@YOUR_PUBLIC_IP

# Clone and run deploy script
git clone https://github.com/zuhair321/vox.git /opt/vox
cd /opt/vox
sudo chmod +x deploy.sh
sudo ./deploy.sh
```

The script will:
1. Install Docker, Docker Compose, Certbot
2. Generate all cryptographic secrets
3. Build and start all services
4. Obtain SSL certificate from Let's Encrypt
5. Set up automatic SSL renewal

## Manual Deploy (Step by Step)

### Step 1: Provision Oracle Cloud Instance

1. Go to **Compute → Instances → Create Instance**
2. Image: **Ubuntu 22.04 or 24.04**
3. Shape: **VM.Standard.A1.Flex** (Always Free eligible)
   - OCPU: 4
   - Memory: 24 GB
4. Storage: 200 GB boot volume
5. Networking: Create VCN with public IP
6. SSH key: Upload your public key
7. **Security List**: Open ports 22, 80, 443

### Step 2: Connect and Install Docker

```bash
ssh -i your-key.pem ubuntu@YOUR_PUBLIC_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo bash
sudo usermod -aG docker ubuntu

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### Step 3: Clone VOX

```bash
cd /opt
sudo git clone https://github.com/zuhair321/vox.git
cd /opt/vox
sudo chown -R ubuntu:ubuntu /opt/vox
```

### Step 4: Configure Environment

```bash
# Copy template
cp .env.production .env

# Generate secrets
JWT_ACCESS=$(openssl rand -hex 48)
JWT_REFRESH=$(openssl rand -hex 48)
TFA_KEY=$(openssl rand -hex 32)

# Edit .env with your values
nano .env
```

**Required values in `.env`:**
- `POSTGRES_PASSWORD` — any strong password
- `JWT_ACCESS_SECRET` — paste the generated `$JWT_ACCESS`
- `JWT_REFRESH_SECRET` — paste the generated `$JWT_REFRESH`
- `TWO_FACTOR_ENCRYPTION_KEY` — paste the generated `$TFA_KEY`
- `CLIENT_ORIGIN` — your domain: `https://vox.yourdomain.com`
- `DOMAIN` — your domain: `vox.yourdomain.com`
- `EMAIL` — your email for Let's Encrypt

### Step 5: Update Nginx Domain

```bash
# Replace placeholder domain with your actual domain
sed -i 's/vox.example.com/YOUR_DOMAIN.com/g' nginx/conf.d/default.conf
```

### Step 6: Build and Start

```bash
# Build all images
docker compose build

# Start all services
docker compose up -d

# Check status
docker compose ps

# Watch logs
docker compose logs -f
```

### Step 7: SSL Certificate

```bash
# Install certbot on host
sudo apt install -y certbot

# Get certificate (nginx must be running on port 80)
sudo certbot certonly --webroot \
    --webroot-path=/var/www/html \
    --email YOUR_EMAIL \
    --agree-tos \
    --no-eff-email \
    -d YOUR_DOMAIN.com

# Copy certs to Docker volume
docker compose exec -T nginx mkdir -p /etc/letsencrypt/live/YOUR_DOMAIN.com
sudo cp /etc/letsencrypt/live/YOUR_DOMAIN.com/fullchain.pem /etc/letsencrypt/live/YOUR_DOMAIN.com/
sudo cp /etc/letsencrypt/live/YOUR_DOMAIN.com/privkey.pem /etc/letsencrypt/live/YOUR_DOMAIN.com/

# Reload nginx
docker compose exec -T nginx nginx -s reload
```

### Step 8: Auto-Renewal

```bash
# Add cron job
echo "0 3,15 * * * root certbot renew --quiet --deploy-hook 'docker compose -f /opt/vox/docker-compose.yml exec -T nginx nginx -s reload' >> /var/log/vox-ssl-renew.log 2>&1" | sudo tee /etc/cron.d/vox-ssl-renew
```

## Verify Deployment

```bash
# Health check
curl -s https://YOUR_DOMAIN.com/health | jq .

# Expected output:
# {
#   "ok": true,
#   "service": "vox-backend",
#   "uptime": 123,
#   "database": "connected"
# }

# Check all services
docker compose ps

# Check logs
docker compose logs backend
docker compose logs postgres
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                Oracle Cloud Free Tier                │
│              Ampere A1 (4 OCPU / 24 GB)             │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────┐   ┌──────────┐   ┌──────────────┐     │
│  │  Nginx  │──▶│  VOX     │──▶│  PostgreSQL  │     │
│  │ :80/:443│   │  Backend │   │  :5432       │     │
│  │  SSL +  │   │  :4000   │   │  (300 MB)    │     │
│  │  proxy  │   │ (450 MB) │   └──────────────┘     │
│  └─────────┘   └────┬─────┘                        │
│                     │                               │
│                ┌────▼─────┐                         │
│                │  Redis   │                         │
│                │  :6379   │                         │
│                │ (50 MB)  │                         │
│                └──────────┘                         │
│                                                      │
│  Total RAM usage: ~810 MB / 24 GB                   │
│  Headroom: ~23 GB for scaling                       │
└─────────────────────────────────────────────────────┘
```

## Management Commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f postgres

# Restart a service
docker compose restart backend

# Update VOX (pull latest code)
cd /opt/vox
git pull
docker compose build backend
docker compose up -d backend

# Database migrations
docker compose exec -T backend npx prisma migrate deploy

# Seed database
docker compose exec -T backend node seed.mjs

# Enter backend container
docker compose exec backend sh

# Check resource usage
docker stats

# Full rebuild
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Troubleshooting

### Backend won't start
```bash
docker compose logs backend
# Common issues:
# - Missing .env values → fill in all required vars
# - Database connection → check POSTGRES_PASSWORD matches
# - Port conflict → stop other services on port 4000
```

### Database connection refused
```bash
docker compose exec postgres pg_isready
# If not ready:
docker compose restart postgres
# Wait 10s, then:
docker compose exec -T backend npx prisma migrate deploy
```

### SSL certificate errors
```bash
# Check certificate
openssl s_client -connect YOUR_DOMAIN:443 -servername YOUR_DOMAIN

# Force renewal
sudo certbot renew --force-renewal
docker compose exec -T nginx nginx -s reload
```

### High memory usage
```bash
# Check what's using memory
docker stats --no-stream

# If PostgreSQL is using too much:
docker compose exec postgres psql -U vox -d vox_prod -c "ALTER SYSTEM SET shared_buffers='128MB'; ALTER SYSTEM SET effective_cache_size='384MB'; SELECT pg_reload_conf();"
```

## Security Checklist

- [ ] Strong passwords for PostgreSQL and JWT secrets
- [ ] `TWO_FACTOR_ENCRYPTION_KEY` is 64 hex chars (not default)
- [ ] Ports 5432 and 6379 are NOT exposed publicly (only localhost)
- [ ] SSL certificate is active and auto-renewing
- [ ] UFW firewall is enabled with only 22, 80, 443 open
- [ ] Oracle Cloud Security List matches UFW rules
- [ ] `.env` file is not committed to git (in `.gitignore`)

## Dependency Upgrade Strategy

After initial deployment is stable, upgrade dependencies in this order:

### Phase 1: Patch Updates (Safe)
```bash
# Backend
cd backend && npm update
# Frontend
cd frontend && npm update
```

### Phase 2: Minor Updates (Low Risk)
```bash
# Backend
cd backend && npx npm-check-updates -u --target minor && npm install
# Frontend
cd frontend && npx npm-check-updates -u --target minor && npm install
```

### Phase 3: Major Updates (Breaking — Test Thoroughly)

| Package | Current | Target | Breaking Changes |
|---------|---------|--------|------------------|
| Prisma | 6.x | 7.x | Config file migration, new client API |
| React | 18.x | 19.x | New compiler, removed legacy APIs |
| Vite | 5.x | 8.x | New plugin format, config changes |
| Zustand | 4.x | 5.x | New store creation API |
| TypeScript | 5.x | 7.x | New type system features |

> **Rule:** Never upgrade major versions before a deployment. Always deploy with known-good versions first, then upgrade in a separate branch.

### Current Dependency Versions (Deploy Target)

| Package | Version | Notes |
|---------|---------|-------|
| Node.js | 20.x LTS | Docker base image |
| Express | 5.x | Latest |
| Prisma | 6.19.x | Last 6.x release |
| React | 18.x | Stable |
| Vite | 5.x | Stable |
| Socket.io | 4.x | Latest |
| PostgreSQL | 16 | Alpine image |
| Redis | 7 | Alpine image |

