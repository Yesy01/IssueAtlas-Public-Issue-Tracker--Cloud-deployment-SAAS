#!/bin/bash
# Setup Let's Encrypt SSL certificate for production
# Run this on your Azure VM

set -e

DOMAIN="${1:-your-domain.com}"
EMAIL="${2:-admin@example.com}"

if [ "$DOMAIN" = "your-domain.com" ]; then
  echo "❌ Error: Please provide your domain name"
  echo "Usage: $0 <domain> <email>"
  echo "Example: $0 dpcs.example.com admin@example.com"
  exit 1
fi

echo "Installing Certbot for Let's Encrypt..."

# Install Certbot (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

echo "Obtaining SSL certificate for $DOMAIN..."

# Stop nginx temporarily (certbot needs port 80)
sudo systemctl stop nginx

# Obtain certificate
sudo certbot certonly --standalone \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --preferred-challenges http

# Update nginx config to use new certificates
sudo sed -i "s|/etc/nginx/ssl/fullchain.pem|/etc/letsencrypt/live/$DOMAIN/fullchain.pem|g" /etc/nginx/sites-available/app.conf
sudo sed -i "s|/etc/nginx/ssl/privkey.pem|/etc/letsencrypt/live/$DOMAIN/privkey.pem|g" /etc/nginx/sites-available/app.conf

# Start nginx
sudo systemctl start nginx

echo "✅ SSL certificate installed successfully!"
echo "   - Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "   - Private key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo ""
echo "📝 Certificate will auto-renew via certbot systemd timer"
echo "   Check renewal status: sudo certbot renew --dry-run"
echo ""
echo "🔒 Your site is now accessible at: https://$DOMAIN"
