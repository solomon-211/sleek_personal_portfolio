# Solomon Thiong Garang Leek - Portfolio

Professional portfolio website for Solomon Thiong Garang Leek, Software Engineering student at African Leadership University (ALU), showcasing design work, leadership experience, community impact, and software projects.

Live site:
- https://solomonleek.tech

## Table of Contents

1. Project Overview
2. Features
3. Tech Stack
4. Project Structure
5. Local Development
6. Hosting Option A: Serve (Node.js)
7. Hosting Option B: Nginx (Linux VPS)
8. Optional Contact API (Backend)
9. Deployment Updates
10. Troubleshooting
11. Author

## Project Overview

This is a static-first portfolio project built with semantic HTML, modern CSS, and vanilla JavaScript.

The project includes:
- Main portfolio page
- Dedicated case study page
- Custom 404 page
- SEO files (robots.txt, sitemap.xml)
- Optional Flask backend contact endpoint

## Features

- Responsive design for desktop, tablet, and mobile
- Scroll and reveal interactions with reduced-motion support
- Project filtering by category
- Featured case study section with detailed process narrative
- Contact form with:
  - Client-side validation
  - Honeypot anti-spam field
  - API-first submission
  - Mail fallback when API is unavailable
- Performance-minded image loading and UI behavior

## Tech Stack

- HTML5
- CSS3 (custom, no framework)
- Vanilla JavaScript
- Font Awesome 6
- Google Fonts: Sora + Plus Jakarta Sans
- Optional backend: Flask (Python)

## Project Structure

```text
solomon_leek_portfolio/
|- 404.html
|- index.html
|- robots.txt
|- sitemap.xml
|- README.md
|- backend/
|  |- app.py
|  |- requirements.txt
|  |- README.md
|- css/
|  |- styles.css
|  |- case-study.css
|  |- 404.css
|- html/
|  |- index.html
|  |- case-study.html
|- images/
|- js/
   |- main.js
```

## Local Development

You can run this project locally with any static server.

### Option 1: Quick open

- Open html/index.html in your browser.

Note:
- Some features behave better through an HTTP server (recommended), especially routing and asset loading checks.

### Option 2: Use a local static server

Use the serve workflow below or any equivalent static server.

## Hosting Option A: Serve (Node.js)

This option is best for local demos, preview environments, and simple single-server hosting without Nginx.

### Prerequisites

- Node.js 18+ installed
- npm available

### Install serve globally

```bash
npm install -g serve
```

### Start the site

From the project folder:

```bash
cd solomon_leek_portfolio
serve -s . -l 4173
```

Then open:

- http://localhost:4173

### Why this command

- -s enables SPA-style fallback so direct routes still resolve
- . serves from the current folder
- -l 4173 binds to port 4173

### Run serve as a background service (Linux, optional)

Install pm2:

```bash
npm install -g pm2
```

Start service:

```bash
cd /var/www/solomon_leek_portfolio
pm2 start "serve -s . -l 4173" --name portfolio-serve
pm2 save
pm2 startup
```

Useful commands:

```bash
pm2 status
pm2 logs portfolio-serve
pm2 restart portfolio-serve
pm2 stop portfolio-serve
```

## Hosting Option B: Nginx (Linux VPS)

This option is recommended for production.

### Prerequisites

- Ubuntu/Debian VPS
- Domain name with DNS control
- SSH access to server

### 1) Install Nginx

```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2) Upload project files

```bash
sudo mkdir -p /var/www/solomonleek.tech
sudo rsync -av --delete /local/path/solomon_leek_portfolio/ /var/www/solomonleek.tech/
```

Set permissions:

```bash
sudo chown -R www-data:www-data /var/www/solomonleek.tech
sudo find /var/www/solomonleek.tech -type d -exec chmod 755 {} \;
sudo find /var/www/solomonleek.tech -type f -exec chmod 644 {} \;
```

### 3) Configure Nginx server block

Create config file:

```bash
sudo nano /etc/nginx/sites-available/solomonleek.tech
```

Paste:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name solomonleek.tech www.solomonleek.tech;

    root /var/www/solomonleek.tech;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /html/ {
        try_files $uri $uri/ /html/index.html;
    }

    location ~* \.(css|js|jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|pdf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location ~ /\. {
        deny all;
    }

    error_page 404 /404.html;
}
```

Enable and validate:

```bash
sudo ln -s /etc/nginx/sites-available/solomonleek.tech /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 4) Point DNS records

At your domain provider, create:

- A record: @ -> your_server_ip
- A record: www -> your_server_ip

### 5) Add HTTPS with Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d solomonleek.tech -d www.solomonleek.tech
sudo certbot renew --dry-run
```

## Optional Contact API (Backend)

The frontend contact form is API-first and falls back to mail when unavailable.

If you want API delivery:

1. Go to backend folder
2. Create virtual environment
3. Install requirements
4. Run Flask app
5. Reverse proxy /api/contact through Nginx

Example (Linux):

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

If backend runs on port 5000, add this location to your Nginx server block:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Then reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Deployment Updates

For manual uploads:

```bash
sudo rsync -av --delete /local/path/solomon_leek_portfolio/ /var/www/solomonleek.tech/
sudo systemctl reload nginx
```

If using Git on server:

```bash
cd /var/www/solomonleek.tech
git pull origin main
sudo systemctl reload nginx
```

## Troubleshooting

### CSS/JS/images not loading

- Confirm file paths are correct relative to html/index.html and html/case-study.html
- Check case-sensitive filenames on Linux

### Nginx config fails

```bash
sudo nginx -t
```

Fix syntax errors, then reload.

### Domain does not resolve

- Recheck DNS A records
- Wait for DNS propagation

### HTTPS issues

```bash
sudo certbot renew --dry-run
```

### Permission denied / 403

```bash
sudo chown -R www-data:www-data /var/www/solomonleek.tech
sudo find /var/www/solomonleek.tech -type d -exec chmod 755 {} \;
sudo find /var/www/solomonleek.tech -type f -exec chmod 644 {} \;
```

## Author

Solomon Thiong Garang Leek

- Website: https://solomonleek.tech
- LinkedIn: https://www.linkedin.com/in/solomon-thiong-garang-leek-727b08345
- GitHub: https://github.com/solomon-211
- Email: s.leek@alustudent.com

---

Copyright (c) 2026 Solomon Thiong Garang Leek. All rights reserved.
