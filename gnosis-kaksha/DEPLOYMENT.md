> **Database & auth:** the app now uses a self-hosted Supabase stack on the VPS. Follow
> [`deploy/README.md`](deploy/README.md) first; this file covers only the app container.
> Supabase keys are server-side runtime env (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
> `SUPABASE_SERVICE_ROLE_KEY`), not `NEXT_PUBLIC_*` build args.

# 🚀 Gnosis Kaksha — VPS Deployment Guide (Docker)

This guide walks you through deploying the Gnosis Kaksha Next.js application to your VPS (Virtual Private Server) using Docker and Docker Compose.

---

## 📋 Table of Contents
1. [Prerequisites on Your VPS](#1-prerequisites-on-your-vps)
2. [Step 1: Push Local Changes to GitHub](#step-1-push-local-changes-to-github)
3. [Step 2: Clone Repository on Your VPS](#step-2-clone-repository-on-your-vps)
4. [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
5. [Step 4: Build and Start Container](#step-4-build-and-start-container)
6. [Step 5: Configure Reverse Proxy (Nginx + SSL)](#step-5-configure-reverse-proxy-nginx--ssl)
7. [Step 6: Maintenance & Continuous Updates](#step-6-maintenance--continuous-updates)
8. [Helpful Docker Commands](#helpful-docker-commands)

---

## 1. Prerequisites on Your VPS

Connect to your VPS via SSH:
```bash
ssh root@<YOUR_VPS_IP>
```

Update your system and install Docker & Docker Compose plugin:
```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install prerequisites
sudo apt install -y curl git ufw

# Install Docker via official script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify Docker installation
docker --version
docker compose version
```

Configure firewall:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Step 1: Push Local Changes to GitHub

On your local development machine:

```bash
cd /home/ayush/Desktop/Project/Gnosis-Kaksha/gnosis-kaksha

# Check changed files
git status

# Stage all files
git add .

# Commit
git commit -m "feat: complete dockerization, study materials, and whatsapp fee reminders"

# Push to your remote repository
git push origin main
```

---

## Step 2: Clone Repository on Your VPS

On your VPS:

```bash
# Navigate to your desired directory
cd /var/www  # or cd ~

# Clone repository
git clone https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git gnosis-kaksha

# Enter directory
cd gnosis-kaksha
```

---

## Step 3: Configure Environment Variables

Create your production `.env` file from the provided template:

```bash
cp .env.example .env
nano .env
```

Fill in your actual production values:
```ini
# Self-hosted Supabase (see deploy/README.md step 5)
SUPABASE_URL=http://api-gw:8000
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Site URL (set to your domain or VPS IP)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
PORT=3000

# WhatsApp Cloud API (Optional, for automated message sending)
WHATSAPP_API_TOKEN=your-meta-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id

# UPI payee shown in payment QR codes
NEXT_PUBLIC_UPI_ID=gnosiskaksha@upi
```

Save and exit (`Ctrl + O`, `Enter`, `Ctrl + X`).

---

## Step 4: Build and Start Container

Run Docker Compose to build the production image and start the container in detached mode:

```bash
docker compose up -d --build
```

Verify that the container is running and healthy:
```bash
# Check status
docker compose ps

# Check live logs
docker compose logs -f
```

The application is now live at:
`http://127.0.0.1:3000` on the VPS (bound to localhost; public traffic goes through Nginx)

---

## Step 5: Configure Reverse Proxy (Nginx + SSL)

To serve your site on port 80/443 with a custom domain and free SSL:

### 1. Install Nginx & Certbot
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/gnosiskaksha
```

Paste the following:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and test configuration:
```bash
sudo ln -s /etc/nginx/sites-available/gnosiskaksha /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Issue Free SSL Certificate (HTTPS)
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will automatically configure HTTPS and auto-renewal.

---

## Step 6: Maintenance & Continuous Updates

Whenever you make updates on local and push to GitHub, update your VPS with these 2 commands:

```bash
cd /var/www/gnosis-kaksha  # or your clone directory

# 1. Pull latest changes
git pull origin main

# 2. Rebuild and restart container with zero downtime
docker compose up -d --build
```

---

## Helpful Docker Commands

| Command | Description |
| :--- | :--- |
| `docker compose ps` | View container status and health |
| `docker compose logs -f` | Follow live container logs |
| `docker compose restart` | Restart application container |
| `docker compose down` | Stop and remove container |
| `docker system prune -f` | Clean up unused images and build cache |
