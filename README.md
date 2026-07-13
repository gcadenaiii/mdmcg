# mdmcg monorepo

Single repository for all hosted properties on the Lightsail server.

---

## Server

| Field | Value |
|-------|-------|
| Provider | AWS Lightsail |
| Static IP | `3.148.78.99` |
| OS | Ubuntu 24.04 |
| User | `ubuntu` |
| SSH key | `C:\Users\George Cadena\.ssh\LightsailDefaultKey-us-east-2.pem` |
| SSH alias | `lightsail-rpm` |

---

## Hosted Domains

| Domain | Webroot | DNS Managed At | Description |
|--------|---------|----------------|-------------|
| `mdmcg.com` | `/var/www/mdmcg` | GoDaddy | React marketing site + platform |
| `parthianenergy.com` | `/var/www/parthianenergy` | Squarespace | Parthian Energy due-diligence site |
| `ifiin.com` | `/var/www/ifiin` | GoDaddy → Porkbun | Empty — reserved for temporary/beta sites |

---

## Repo Structure

```
mdmcg/
├── backend/              # FastAPI backend (Python 3.11)
├── website/              # React/Vite marketing site + platform UI (mdmcg.com)
├── parthianenergy/       # Static HTML site (parthianenergy.com)
│   ├── index.html
│   ├── site.html         # Password-protected due-diligence page
│   └── assets/
├── infra/
│   ├── docker-compose.yml
│   ├── nginx.conf                  # nginx config for mdmcg.com
│   └── nginx-parthianenergy.conf   # nginx config for parthianenergy.com
├── gateway/              # Raspberry Pi gateway code
├── firmware/             # ESP32 / Teensy firmware
└── scripts/              # Utility scripts
```

---

## Deploy: mdmcg.com (React)

```bash
# 1. Edit files locally, then:
git add -A && git commit -m "your message" && git push origin master

# 2. Deploy to server:
ssh lightsail-rpm 'cd ~/mdmcg && git pull origin master && cd website && pnpm build && sudo cp -r dist/. /var/www/mdmcg/'
```

> Backend-only changes also require rebuilding the Docker container:
> ```bash
> ssh lightsail-rpm 'cd ~/mdmcg && git pull origin master && cd infra && docker compose up -d --build backend'
> ```

---

## Deploy: parthianenergy.com (Static HTML)

```bash
# 1. Edit files locally in parthianenergy/, then:
git add -A && git commit -m "your message" && git push origin master

# 2. Deploy to server:
ssh lightsail-rpm 'cd ~/mdmcg && git pull origin master && sudo cp -r parthianenergy/. /var/www/parthianenergy/'
```

---

## nginx

- Config for `mdmcg.com` lives in `infra/nginx.conf` → deployed to `/etc/nginx/sites-available/rpm`
- Config for `parthianenergy.com` lives in `infra/nginx-parthianenergy.conf` → deployed to `/etc/nginx/sites-available/parthianenergy`
- SSL certs managed by Let's Encrypt / certbot (auto-renew enabled)

### Routing on mdmcg.com

| Path | Handled by |
|------|------------|
| `/platform/ws/` | FastAPI WebSocket |
| `/platform/api/*`, `/platform/upload`, `/platform/health`, etc. | FastAPI (Docker, port 8080) |
| `/platform/*` | React SPA |
| `/` | React SPA |

---

## Backend (Docker)

```bash
# Start / rebuild
ssh lightsail-rpm 'cd ~/mdmcg/infra && docker compose up -d --build backend'

# Logs
ssh lightsail-rpm 'cd ~/mdmcg/infra && docker compose logs backend --tail=50'

# Stop all
ssh lightsail-rpm 'cd ~/mdmcg/infra && docker compose down'
```

---

## Local Dev (React)

```bash
cd website
pnpm install        # first time only (run pnpm approve-builds if prompted)
pnpm dev --host     # http://localhost:5173
```

> Note: `pnpm build` should be run on the Lightsail server (Linux), not locally in Cygwin, to avoid native module issues.

---

## parthianenergy.com — site.html Access

`site.html` is protected by a JavaScript password gate.
Password: stored in the site — share only with intended reviewers.
The gate uses `sessionStorage` so it resets when the browser session ends.
