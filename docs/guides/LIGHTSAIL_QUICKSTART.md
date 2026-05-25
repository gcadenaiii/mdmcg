# Lightsail Quick Start

This guide deploys the backend API and PostgreSQL on a single AWS Lightsail VM using Docker Compose.

## Goal

Run in Lightsail:
- backend API
- PostgreSQL database
- nginx reverse proxy (HTTP or HTTPS)

## 1. Create Instance

In AWS Lightsail:
- Platform: Linux/Unix
- Blueprint: Ubuntu 22.04 LTS
- Plan: 2 GB RAM minimum for PoC
- Attach a static IP

Open firewall ports:
- 80
- 443
- 8080 (optional for initial direct testing)

## 2. Connect and Install Docker

SSH into the instance and run:

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
sudo apt install -y docker-compose-plugin
```

Log out and back in, then verify:

```bash
docker --version
docker compose version
```

## 3. Upload or Clone Repo

Option A (recommended):

```bash
git clone <your-repo-url>
cd move_sensor-poc
```

## 4. Configure Environment

```bash
cd infra
cp .env.example .env
nano .env
```

Set at minimum:
- POSTGRES_PASSWORD: strong secret
- RPM_API_KEY: strong random secret (shared with Pi)
- RPM_DEBUG=false
- RPM_ALLOWED_ORIGINS: set for your client origins

## 5. Start Backend Stack

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend
```

Health check:

```bash
curl http://localhost:8080/health
```

Expected:

```json
{"status":"healthy","database":true}
```

## 6. Configure nginx

Install nginx:

```bash
sudo apt install -y nginx
```

Use the repo config as a base:
- infra/nginx.conf

Enable site and reload nginx after validation:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

If using a domain, install certbot and issue cert:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 7. Validate External Access

From your local machine:

```bash
curl http://YOUR_STATIC_IP/health
```

Or with domain/TLS:

```bash
curl https://your-domain.com/health
```

Open dashboard in browser and confirm UI loads.

## 8. Operations

Useful commands:

```bash
cd ~/move_sensor-poc/infra
docker compose logs -f backend
docker compose logs -f db
docker compose restart backend
docker compose up -d
docker compose down
```

## 9. Production Notes

- Keep RPM_API_KEY secret and rotate periodically
- Restrict SSH ingress to trusted IPs
- Use domain + HTTPS for production
- Back up PostgreSQL volume data
