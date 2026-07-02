# Solomon Thiong Garang Leek — Portfolio

Personal portfolio of Solomon Thiong Garang Leek, Software Engineering student at African Leadership University (ALU).

Live: https://solomonleek.tech

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Local Development](#2-local-development)
3. [Server Requirements](#3-server-requirements)
4. [Architecture Overview](#4-architecture-overview)
5. [Step 1 — Point Your Domain DNS](#step-1--point-your-domain-dns)
6. [Step 2 — SSH Into Your Server](#step-2--ssh-into-your-server)
7. [Step 3 — Install Required Software](#step-3--install-required-software)
8. [Step 4 — Upload Project Files](#step-4--upload-project-files)
9. [Step 5 — Set File Permissions](#step-5--set-file-permissions)
10. [Step 6 — Configure Firewall (UFW)](#step-6--configure-firewall-ufw)
11. [Step 7 — Configure Nginx (Web Server + Load Balancer)](#step-7--configure-nginx-web-server--load-balancer)
12. [Step 8 — Enable HTTPS with Certbot](#step-8--enable-https-with-certbot)
13. [Step 9 — Deploy the Backend (Contact Form API)](#step-9--deploy-the-backend-contact-form-api)
14. [Step 10 — Run Backend as a System Service](#step-10--run-backend-as-a-system-service)
15. [Step 11 — Gmail App Password Setup](#step-11--gmail-app-password-setup)
16. [Step 12 — Verify Everything Works](#step-12--verify-everything-works)
17. [Updating the Site](#updating-the-site)
18. [Troubleshooting](#troubleshooting)

---

## 1. Project Structure

```
sleek_personal_portfolio/
├── index.html              ← Root redirect to html/index.html
├── 404.html                ← Custom 404 page
├── robots.txt
├── sitemap.xml
├── README.md
├── html/
│   ├── index.html          ← Main portfolio page
│   ├── blog.html           ← Blog page
│   └── case-study.html     ← Case study page
├── css/
│   ├── base.css            ← Base layout styles
│   ├── styles.css          ← Dark navy theme
│   ├── blog.css            ← Blog page styles
│   ├── case-study.css      ← Case study page styles
│   └── 404.css             ← 404 page styles
├── js/
│   └── main.js             ← All JavaScript
├── images/                 ← All portfolio images
└── backend/
    ├── app.py              ← FastAPI contact form API
    ├── requirements.txt
    ├── .env.example        ← Copy to .env and fill in values
    └── README.md
```

---

## 2. Local Development

Open directly in browser:

```
html/index.html
```

Or use a local server (recommended so asset paths resolve correctly):

```bash
# Python
python -m http.server 8080 --directory sleek_personal_portfolio

# Node.js (install once: npm install -g serve)
serve sleek_personal_portfolio -l 8080
```

Then open: http://localhost:8080

---

## 3. Server Requirements

- Ubuntu 22.04 VPS — cheapest options:
  - [Hetzner](https://hetzner.com) ~$4/mo
  - [DigitalOcean](https://digitalocean.com) ~$6/mo
  - [AWS Lightsail](https://aws.amazon.com/lightsail) ~$5/mo
- At least 512 MB RAM
- Domain `solomonleek.tech` with DNS control
- SSH root access

---

## 4. Architecture Overview

```
Internet
   │
   ▼
Firewall (UFW) — blocks everything except ports 22, 80, 443
   │
   ▼
Nginx — Web Server + Load Balancer + HTTPS termination
   │                        │
   ▼                        ▼
Static Files          /api/ → FastAPI (Uvicorn, port 8000)
(HTML/CSS/JS/images)         ↓
                      Sends email via Gmail SMTP
                      to s.leek@alustudent.com
```

---

## Step 1 — Point Your Domain DNS

At your domain registrar (Namecheap, GoDaddy, etc.), create these DNS records:

| Type | Name | Value          |
|------|------|----------------|
| A    | @    | YOUR_SERVER_IP |
| A    | www  | YOUR_SERVER_IP |

DNS propagation takes 10–30 minutes. Check with:

```bash
nslookup solomonleek.tech
```

---

## Step 2 — SSH Into Your Server

```bash
ssh root@YOUR_SERVER_IP
```

---

## Step 3 — Install Required Software

```bash
apt update && apt upgrade -y

apt install -y nginx python3 python3-pip python3-venv certbot python3-certbot-nginx ufw git
```

Enable Nginx to start on boot:

```bash
systemctl enable nginx
systemctl start nginx
```

---

## Step 4 — Upload Project Files

**Option A — SCP from your Windows PC** (run in PowerShell):

```powershell
scp -r "C:\Users\HP\OneDrive\Desktop\Portfolio\sleek_personal_portfolio" root@YOUR_SERVER_IP:/var/www/solomonleek.tech
```

**Option B — Git** (if your project is on GitHub):

```bash
mkdir -p /var/www/solomonleek.tech
git clone https://github.com/solomon-211/YOUR_REPO.git /var/www/solomonleek.tech
```

---

## Step 5 — Set File Permissions

```bash
chown -R www-data:www-data /var/www/solomonleek.tech
find /var/www/solomonleek.tech -type d -exec chmod 755 {} \;
find /var/www/solomonleek.tech -type f -exec chmod 644 {} \;
```

---

## Step 6 — Configure Firewall (UFW)

UFW (Uncomplicated Firewall) blocks all unwanted traffic and only allows SSH, HTTP, and HTTPS.

```bash
# Block all incoming by default
ufw default deny incoming
ufw default allow outgoing

# Allow SSH — do this first or you will be locked out
ufw allow ssh

# Allow web traffic
ufw allow 80/tcp
ufw allow 443/tcp

# Enable the firewall
ufw enable

# Verify rules
ufw status
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

---

## Step 7 — Configure Nginx (Web Server + Load Balancer)

Add the API rate limit zone to the Nginx `http` block:

```bash
nano /etc/nginx/nginx.conf
```

Inside the `http { }` block, add this line:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/m;
```

Now create the site config:

```bash
nano /etc/nginx/sites-available/solomonleek.tech
```

Paste this complete configuration:

```nginx
# Upstream (load balancer)
# Add more backend workers here if you scale up later:
#   server 127.0.0.1:8001;
#   server 127.0.0.1:8002;
upstream portfolio_api {
    least_conn;
    server 127.0.0.1:8000;
    keepalive 32;
}

# Redirect all HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name solomonleek.tech www.solomonleek.tech;
    return 301 https://$host$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name solomonleek.tech www.solomonleek.tech;

    # SSL certificates — Certbot fills these in automatically in Step 8
    ssl_certificate     /etc/letsencrypt/live/solomonleek.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/solomonleek.tech/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security headers
    add_header X-Frame-Options           "SAMEORIGIN"                    always;
    add_header X-Content-Type-Options    "nosniff"                       always;
    add_header X-XSS-Protection          "1; mode=block"                 always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Document root
    root  /var/www/solomonleek.tech;
    index index.html;

    # Gzip compression
    gzip            on;
    gzip_types      text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1000;

    # Root redirect
    location = / {
        return 301 /html/index.html;
    }

    # Static HTML pages
    location /html/ {
        try_files $uri $uri/ /html/index.html;
    }

    # API → FastAPI backend via load balancer upstream
    location /api/ {
        proxy_pass         http://portfolio_api;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Connection        "";
        proxy_read_timeout    30s;
        proxy_connect_timeout 10s;

        # Nginx-level rate limiting (10 API requests/min per IP)
        limit_req zone=api_limit burst=10 nodelay;
    }

    # Cache static assets for 30 days
    location ~* \.(css|js|jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|pdf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Block access to sensitive files
    location ~* \.(env|json|log|py|sh)$ {
        deny all;
        return 404;
    }

    # Block hidden files and directories
    location ~ /\. {
        deny all;
    }

    # Custom 404 page
    error_page 404 /404.html;
    location = /404.html {
        root     /var/www/solomonleek.tech;
        internal;
    }
}
```

Enable the site and reload Nginx:

```bash
# Enable site
ln -s /etc/nginx/sites-available/solomonleek.tech /etc/nginx/sites-enabled/

# Remove the default placeholder site
rm -f /etc/nginx/sites-enabled/default

# Test config — must say "syntax is ok"
nginx -t

# Reload
systemctl reload nginx
```

> **Note:** The HTTPS `server` block references SSL certificate paths that don't exist yet. Nginx will fail to reload until you complete Step 8. If you want to test HTTP first, temporarily remove the HTTPS server block and only keep the HTTP one.

---

## Step 8 — Enable HTTPS with Certbot

```bash
certbot --nginx -d solomonleek.tech -d www.solomonleek.tech
```

Certbot will:
- Get a free SSL certificate from Let's Encrypt
- Automatically update your Nginx config for HTTPS
- Redirect all HTTP traffic to HTTPS

Test that auto-renewal works:

```bash
certbot renew --dry-run
```

Certificates auto-renew every 90 days. No manual action needed.

Your site is now live at: **https://solomonleek.tech**

---

## Step 9 — Deploy the Backend (Contact Form API)

```bash
cd /var/www/solomonleek.tech/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from example
cp .env.example .env
nano .env
```

Fill in your `.env` file with real values:

```env
PORT=8000
ALLOWED_ORIGINS=https://solomonleek.tech,https://www.solomonleek.tech
CONTACT_TO_EMAIL=s.leek@alustudent.com
CONTACT_FROM_EMAIL=no-reply@solomonleek.tech
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=<your-16-char-app-password>
SMTP_STARTTLS=true
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW=3600
```

---

## Step 10 — Run Backend as a System Service

```bash
nano /etc/systemd/system/portfolio-backend.service
```

Paste:

```ini
[Unit]
Description=Solomon Portfolio FastAPI Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/solomonleek.tech/backend
Environment="PATH=/var/www/solomonleek.tech/backend/venv/bin"
EnvironmentFile=/var/www/solomonleek.tech/backend/.env
ExecStart=/var/www/solomonleek.tech/backend/venv/bin/uvicorn app:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
systemctl daemon-reload
systemctl enable portfolio-backend
systemctl start portfolio-backend

# Verify it is running
systemctl status portfolio-backend
```

---

## Step 11 — Gmail App Password Setup

The contact form sends emails to `s.leek@alustudent.com` using Gmail SMTP. You need an App Password — not your regular Gmail password.

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **Security**
3. Turn on **2-Step Verification** (required)
4. Search for **App Passwords**
5. Select app: **Mail** → device: **Other** → name it `Portfolio`
6. Copy the 16-character password
7. Paste it as `SMTP_PASSWORD` in your `.env` file
8. Restart the backend: `systemctl restart portfolio-backend`

---

## Step 12 — Verify Everything Works

**Check the backend health:**
```bash
curl https://solomonleek.tech/api/health
# Expected: {"status":"ok","version":"3.0.0","smtp_configured":true}
```

**Check the backend logs:**
```bash
journalctl -u portfolio-backend -f
```

**Check Nginx logs:**
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

**Check firewall status:**
```bash
ufw status
```

**Test the contact form:**  
Open https://solomonleek.tech, fill in the contact form and submit. You should receive an email at `s.leek@alustudent.com` within a few seconds.

---

## Updating the Site

**Upload changed files from your Windows PC (PowerShell):**

```powershell
scp -r "C:\Users\HP\OneDrive\Desktop\Portfolio\sleek_personal_portfolio" root@YOUR_SERVER_IP:/var/www/solomonleek.tech
```

Then on the server:

```bash
chown -R www-data:www-data /var/www/solomonleek.tech
systemctl reload nginx
```

**If you updated the backend:**

```bash
cd /var/www/solomonleek.tech/backend
source venv/bin/activate
pip install -r requirements.txt
systemctl restart portfolio-backend
```

**If you use Git:**

```bash
cd /var/www/solomonleek.tech
git pull origin main
chown -R www-data:www-data /var/www/solomonleek.tech
systemctl reload nginx
# If backend changed:
systemctl restart portfolio-backend
```

---

## Troubleshooting

**Site shows Nginx default page**
```bash
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

**CSS / JS / images not loading**
- Linux filenames are case-sensitive — check exact file names
- Run: `chown -R www-data:www-data /var/www/solomonleek.tech`
- Check browser console for 404 errors

**Nginx config error**
```bash
nginx -t
# Fix any errors shown, then:
systemctl reload nginx
```

**Domain not resolving**
- Recheck DNS A records at your registrar
- Wait up to 30 minutes for propagation
- Test: `nslookup solomonleek.tech`

**HTTPS certificate error**
```bash
certbot renew --dry-run
certbot --nginx -d solomonleek.tech -d www.solomonleek.tech
```

**Contact form not sending**
```bash
# Check backend is running
systemctl status portfolio-backend

# View backend logs
journalctl -u portfolio-backend -n 50

# Test API directly
curl https://solomonleek.tech/api/health
```

**403 Forbidden**
```bash
chown -R www-data:www-data /var/www/solomonleek.tech
find /var/www/solomonleek.tech -type d -exec chmod 755 {} \;
find /var/www/solomonleek.tech -type f -exec chmod 644 {} \;
```

**Backend not starting**
```bash
# Check for .env errors
cat /var/www/solomonleek.tech/backend/.env

# Check detailed logs
journalctl -u portfolio-backend -n 100 --no-pager
```

**Port 8000 not reachable from Nginx**
```bash
# Confirm backend is listening on the correct port
ss -tlnp | grep 8000
```

---

## Author

**Solomon Thiong Garang Leek**

- Website: https://solomonleek.tech
- GitHub: https://github.com/solomon-211
- LinkedIn: https://www.linkedin.com/in/solomon-thiong-garang-leek-727b08345
- Email: s.leek@alustudent.com

---

© 2025 Solomon Thiong Garang Leek. All rights reserved.
