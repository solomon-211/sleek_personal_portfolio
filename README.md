# Solomon Thiong Garang Leek — Portfolio

Personal portfolio of Solomon Thiong Garang Leek, Software Engineering student at African Leadership University (ALU).

Live: https://solomonleek.tech

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Local Development](#2-local-development)
3. [Server Requirements](#3-server-requirements)
4. [Step 1 — Point Your Domain DNS](#step-1--point-your-domain-dns)
5. [Step 2 — SSH Into Your Server](#step-2--ssh-into-your-server)
6. [Step 3 — Install Required Software](#step-3--install-required-software)
7. [Step 4 — Upload Project Files](#step-4--upload-project-files)
8. [Step 5 — Set File Permissions](#step-5--set-file-permissions)
9. [Step 6 — Configure Nginx](#step-6--configure-nginx)
10. [Step 7 — Enable HTTPS with Certbot](#step-7--enable-https-with-certbot)
11. [Step 8 — Deploy the Backend (Contact Form API)](#step-8--deploy-the-backend-contact-form-api)
12. [Step 9 — Run Backend as a System Service](#step-9--run-backend-as-a-system-service)
13. [Step 10 — Add Backend Proxy to Nginx](#step-10--add-backend-proxy-to-nginx)
14. [Updating the Site](#updating-the-site)
15. [Troubleshooting](#troubleshooting)

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
│   └── case-study.html     ← Case study page
├── css/
│   ├── styles.css          ← Main styles (base layout + dark navy theme)
│   ├── case-study.css      ← Case study page styles
│   └── 404.css             ← 404 page styles
├── js/
│   └── main.js             ← All JavaScript
├── images/                 ← All portfolio images
└── backend/
    ├── app.py              ← FastAPI contact form API
    ├── requirements.txt
    ├── .env.example        ← Copy this to .env and fill in values
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

- Ubuntu 22.04 VPS (DigitalOcean, Linode, Vultr, AWS EC2, etc.)
- At least 512MB RAM
- Domain `solomonleek.tech` with DNS control
- SSH root access

---

## Step 1 — Point Your Domain DNS

At your domain registrar (Namecheap, GoDaddy, etc.), create these DNS records:

| Type | Name | Value          |
|------|------|----------------|
| A    | @    | YOUR_SERVER_IP |
| A    | www  | YOUR_SERVER_IP |

DNS propagation takes 10–30 minutes. You can check with:

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

# Nginx
apt install nginx -y
systemctl enable nginx
systemctl start nginx

# Python (for backend)
apt install python3 python3-pip python3-venv -y

# Certbot (free SSL)
apt install certbot python3-certbot-nginx -y

# Git (optional, for git-based deploys)
apt install git -y
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

## Step 6 — Configure Nginx

Create the Nginx config file:

```bash
nano /etc/nginx/sites-available/solomonleek.tech
```

Paste this complete configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name solomonleek.tech www.solomonleek.tech;

    root /var/www/solomonleek.tech;
    index index.html;

    # Root redirect goes to html/index.html
    location = / {
        return 301 /html/index.html;
    }

    # Main portfolio page
    location /html/ {
        try_files $uri $uri/ /html/index.html;
    }

    # Static assets — long cache
    location ~* \.(css|js|jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|pdf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Block hidden files
    location ~ /\. {
        deny all;
    }

    # Custom 404
    error_page 404 /404.html;
    location = /404.html {
        root /var/www/solomonleek.tech;
        internal;
    }
}
```

Enable the site and reload Nginx:

```bash
# Enable site
ln -s /etc/nginx/sites-available/solomonleek.tech /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test config — must say "syntax is ok"
nginx -t

# Reload
systemctl reload nginx
```

Your site is now live at: http://solomonleek.tech

---

## Step 7 — Enable HTTPS with Certbot

```bash
certbot --nginx -d solomonleek.tech -d www.solomonleek.tech
```

Follow the prompts. Certbot will:
- Get a free SSL certificate from Let's Encrypt
- Automatically update your Nginx config for HTTPS
- Redirect all HTTP traffic to HTTPS

Test that auto-renewal works:

```bash
certbot renew --dry-run
```

Your site is now live at: https://solomonleek.tech

---

## Step 8 — Deploy the Backend (Contact Form API)

The contact form sends messages via the FastAPI backend in the `backend/` folder.

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

Fill in your `.env` file:

```env
PORT=8000
ALLOWED_ORIGINS=https://solomonleek.tech,https://www.solomonleek.tech
CONTACT_TO_EMAIL=s.leek@alustudent.com
CONTACT_FROM_EMAIL=your-gmail@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_STARTTLS=true
```

> **Gmail App Password:** Go to myaccount.google.com → Security → 2-Step Verification → App passwords → Create one named "Portfolio". Use the 16-character password as `SMTP_PASSWORD`.

---

## Step 9 — Run Backend as a System Service

```bash
nano /etc/systemd/system/portfolio-backend.service
```

Paste:

```ini
[Unit]
Description=Portfolio FastAPI Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/solomonleek.tech/backend
ExecStart=/var/www/solomonleek.tech/backend/venv/bin/uvicorn app:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3
EnvironmentFile=/var/www/solomonleek.tech/backend/.env

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

## Step 10 — Add Backend Proxy to Nginx

Open your Nginx config:

```bash
nano /etc/nginx/sites-available/solomonleek.tech
```

Add this `location` block inside the `server {}` block, before the closing `}`:

```nginx
# Proxy contact form API to FastAPI backend
location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;
}
```

Test and reload:

```bash
nginx -t
systemctl reload nginx
```

Test the API is working:

```bash
curl https://solomonleek.tech/api/health
# Expected: {"status":"ok"}
```

---

## Updating the Site

**If you uploaded via SCP** (run from your Windows PC in PowerShell):

```powershell
scp -r "C:\Users\HP\OneDrive\Desktop\Portfolio\sleek_personal_portfolio" root@YOUR_SERVER_IP:/var/www/solomonleek.tech
```

Then on the server:

```bash
chown -R www-data:www-data /var/www/solomonleek.tech
systemctl reload nginx
```

**If you deployed via Git:**

```bash
cd /var/www/solomonleek.tech
git pull origin main
systemctl reload nginx
```

**If you updated the backend:**

```bash
cd /var/www/solomonleek.tech/backend
source venv/bin/activate
pip install -r requirements.txt
systemctl restart portfolio-backend
```

---

## Troubleshooting

### Site shows Nginx default page
```bash
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### CSS / JS / images not loading
- Check file paths are correct — Linux filenames are case-sensitive
- Confirm `chown` and `chmod` permissions are set (Step 5)
- Check browser console for 404 errors

### Nginx config error
```bash
nginx -t
# Fix any errors shown, then:
systemctl reload nginx
```

### Domain not resolving
- Recheck DNS A records at your registrar
- Wait up to 30 minutes for propagation
- Test with: `nslookup solomonleek.tech`

### HTTPS certificate error
```bash
certbot renew --dry-run
certbot --nginx -d solomonleek.tech -d www.solomonleek.tech
```

### Contact form not sending
```bash
# Check backend is running
systemctl status portfolio-backend

# Check backend logs
journalctl -u portfolio-backend -n 50

# Test API directly
curl https://solomonleek.tech/api/health
```

### 403 Forbidden
```bash
chown -R www-data:www-data /var/www/solomonleek.tech
find /var/www/solomonleek.tech -type d -exec chmod 755 {} \;
find /var/www/solomonleek.tech -type f -exec chmod 644 {} \;
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
