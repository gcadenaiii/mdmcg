# Deploying RPM Backend to AWS Lightsail

Step-by-step instructions for deploying the RPM cloud backend on a single
AWS Lightsail instance. This gives you a VM with a public IP, running
Docker Compose with the FastAPI backend + PostgreSQL.

---

## 1. Create the Lightsail Instance

### Via AWS Console

1. Go to https://lightsail.aws.amazon.com
2. Click **Create instance**
3. Choose:
   - **Region**: closest to your users (e.g., us-east-1)
   - **Platform**: Linux/Unix
   - **Blueprint**: OS Only → **Ubuntu 22.04 LTS**
   - **Plan**: **$10/month** (2 GB RAM, 1 vCPU, 60 GB SSD) — sufficient for PoC
     - If you expect higher load, use $20/month (4 GB RAM, 2 vCPU)
   - **Name**: `rpm-backend`
4. Click **Create instance**

### Networking — Open Ports

1. Go to your instance → **Networking** tab
2. Under **IPv4 Firewall**, add rules:
   - **HTTPS** (443) — for the web dashboard and API
   - **HTTP** (80) — for Let's Encrypt cert validation (auto-redirects to HTTPS)
   - **Custom TCP 8080** — (optional, for initial testing before nginx is set up)
   - Remove SSH from "anywhere" and restrict to your IP if desired
3. Under **IPv6 Firewall**, add the same rules

### Static IP

1. Go to **Networking** tab → **Create static IP**
2. Attach it to your `rpm-backend` instance
3. Note the IP address — you'll need it for DNS and Pi gateway config

### (Optional) DNS

If you have a domain name:
1. Go to **Networking** (top-level) → **DNS** → **Create DNS zone**
2. Add an A record pointing to your static IP
3. This enables Let's Encrypt HTTPS certificates

---

## 2. SSH into the Instance

From the Lightsail console, click **Connect using SSH** (browser-based),
or use your own terminal:

```bash
# Download your Lightsail SSH key from Account → SSH Keys
ssh -i ~/LightsailDefaultKey.pem ubuntu@YOUR_STATIC_IP
```

---

## 3. Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add your user to docker group (no sudo needed for docker commands)
sudo usermod -aG docker ubuntu

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Log out and back in for group changes to take effect
exit
# SSH back in
```

Verify:
```bash
docker --version
docker compose version
```

---

## 4. Upload the Code

### Option A: Git clone (recommended)

```bash
# If your repo is on GitHub:
git clone https://github.com/YOUR_USER/sensors_lab-clean.git
cd sensors_lab-clean
```

### Option B: SCP from your dev machine

```bash
# From your local machine:
scp -i ~/LightsailDefaultKey.pem -r \
    infra/ backend/ \
    ubuntu@YOUR_STATIC_IP:~/rpm/
```

### Option C: Rsync (best for iterating)

```bash
rsync -avz --exclude='.venv' --exclude='__pycache__' --exclude='.git' \
    -e "ssh -i ~/LightsailDefaultKey.pem" \
    . ubuntu@YOUR_STATIC_IP:~/sensors_lab-clean/
```

---

## 5. Configure Environment

```bash
cd ~/sensors_lab-clean/infra

# Create .env from example
cp .env.example .env

# Generate a secure API key
API_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
echo "Generated API key: $API_KEY"

# Edit .env — set at minimum:
nano .env
```

**Critical values to set in `.env`:**

```bash
# Strong password for PostgreSQL
POSTGRES_PASSWORD=<generate a random password>

# API key — share this with the Pi gateway
RPM_API_KEY=<the API key you generated above>

# Set to false for production
RPM_DEBUG=false
```

Save and exit (`Ctrl+X`, `Y`, `Enter`).

---

## 6. Start the Backend

```bash
cd ~/sensors_lab-clean/infra

# Build and start (first time takes 2-3 minutes)
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f backend
```

You should see:
```
backend-1  | INFO:     Uvicorn running on http://0.0.0.0:8080
backend-1  | INFO:     Database tables ensured
```

### Test it:

```bash
# Health check
curl http://localhost:8080/health
# Should return: {"status": "healthy", "database": true}

# From your local machine (if port 8080 is opened in firewall):
curl http://YOUR_STATIC_IP:8080/health
```

---

## 7. Set Up Nginx + HTTPS

### Install nginx and certbot:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Configure nginx:

```bash
# Copy our config
sudo cp ~/sensors_lab-clean/infra/nginx.conf /etc/nginx/sites-available/rpm

# Edit to set your domain (or use IP-based config below)
sudo nano /etc/nginx/sites-available/rpm
```

**If you have a domain name**, replace `your-domain.com` with your actual domain.

**If you only have an IP address** (no domain), use this simplified config:

```bash
sudo tee /etc/nginx/sites-available/rpm << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        client_max_body_size 10M;
    }

    location /health {
        proxy_pass http://127.0.0.1:8080/health;
    }
}
EOF
```

### Enable the site:

```bash
# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Enable RPM site
sudo ln -sf /etc/nginx/sites-available/rpm /etc/nginx/sites-enabled/rpm

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### (With domain) Get Let's Encrypt certificate:

```bash
sudo certbot --nginx -d your-domain.com
# Follow the prompts — certbot auto-configures HTTPS
```

### Verify:

```bash
# Via IP:
curl http://YOUR_STATIC_IP/health

# Via domain (if configured):
curl https://your-domain.com/health
```

Visit `http://YOUR_STATIC_IP` in a browser — you should see the RPM dashboard.

---

## 8. Configure the Raspberry Pi Gateway

On the Raspberry Pi:

```bash
cd ~/dev/sensors_lab-clean

# Install gateway dependencies
pip install -r gateway/requirements.txt

# Set environment variables (add to ~/.bashrc or use systemd EnvironmentFile)
export RPM_BACKEND_URL="http://YOUR_STATIC_IP:8080"   # or https://your-domain.com
export RPM_API_KEY="same-key-you-set-on-the-server"
export RPM_BLE_DEVICE_NAME="ESP32_BNO055"

# Test with mock data first
python -m gateway --mock
```

You should see logs like:
```
2026-04-04 12:00:00 INFO     [gateway] Gateway ID: abc123-...
2026-04-04 12:00:00 INFO     [gateway] Gateway running
2026-04-04 12:00:10 INFO     [gateway.sync_worker] Synced batch #1: 200 samples
```

Check the dashboard at `http://YOUR_STATIC_IP` — you should see your gateway appear.

### Install as systemd service:

```bash
# Edit the service file with your actual values
nano infra/gateway.service
# Set RPM_BACKEND_URL, RPM_API_KEY, etc.

# Install
sudo cp infra/gateway.service /etc/systemd/system/rpm-gateway.service
sudo systemctl daemon-reload
sudo systemctl enable rpm-gateway
sudo systemctl start rpm-gateway

# Check status
sudo systemctl status rpm-gateway
sudo journalctl -u rpm-gateway -f
```

---

## 9. Verify End-to-End

1. **Pi gateway** should show "Synced batch #N" in logs
2. **Dashboard** at `http://YOUR_STATIC_IP` should show:
   - Gateway listed as "Online" with green dot
   - Sessions appearing with sample counts
   - Step counts incrementing (in mock mode, ~1/sec)
3. **Gateway status** at `http://PI_IP:8090` should show local stats
4. **Health check**: `curl http://YOUR_STATIC_IP/health` → `{"status": "healthy", "database": true}`

---

## 10. Maintenance

### View logs

```bash
# Backend logs
cd ~/sensors_lab-clean/infra
docker compose logs -f backend

# Database logs
docker compose logs -f db
```

### Update the backend

```bash
cd ~/sensors_lab-clean
git pull   # or rsync new code

cd infra
docker compose up -d --build
```

### Run database migrations

```bash
cd ~/sensors_lab-clean/infra
docker compose exec backend alembic upgrade head
```

### Backup the database

```bash
docker compose exec db pg_dump -U rpm rpm > backup_$(date +%Y%m%d).sql
```

### Monitor disk usage

```bash
df -h
docker system df
```

### Restart everything

```bash
cd ~/sensors_lab-clean/infra
docker compose restart
```

---

## Estimated Costs

| Resource | Cost |
|----------|------|
| Lightsail 2GB instance | $10/month |
| Static IP (attached) | Free |
| Data transfer (first 3TB) | Free |
| Domain name (optional) | ~$12/year |
| **Total** | **~$10/month** |

---

## Troubleshooting

### Backend won't start
```bash
docker compose logs backend
# Common issues:
# - Database not ready yet (restart backend: docker compose restart backend)
# - Bad DATABASE_URL in .env
```

### Gateway can't reach backend
```bash
# From Pi:
curl http://YOUR_STATIC_IP:8080/health
# If this fails:
# - Check Lightsail firewall rules (port 8080 or 80/443)
# - Check nginx is running: sudo systemctl status nginx
# - Check backend is running: docker compose ps
```

### BLE not connecting
```bash
# On Pi:
bluetoothctl
# > scan on
# Look for "ESP32_BNO055" in the scan results
# If not showing, check ESP32 firmware and power
```

### Database full
```bash
docker compose exec db psql -U rpm -c "SELECT pg_size_pretty(pg_database_size('rpm'));"
# If too large, prune old data:
docker compose exec db psql -U rpm -c "
  DELETE FROM sensor_samples
  WHERE created_at < NOW() - INTERVAL '30 days';
"
```
