#!/bin/bash

# SSL Setup Script for cryptopagregistro.com.br
# Use this script to replace self-signed certificates with valid Let's Encrypt certificates

set -e

DOMAIN="cryptopagregistro.com.br"
EMAIL="admin@cryptopagregistro.com.br" # Default email

echo "🔒 Starting SSL Setup for $DOMAIN..."

# 1. Check/Install Certbot
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot
fi

# 2. Stop Nginx to free up port 80
echo "qh Stopping Nginx container..."
docker-compose stop nginx || true

# 3. Obtain Certificate
echo "📜 Obtaining Let's Encrypt certificate..."
# Using --non-interactive and --agree-tos
sudo certbot certonly --standalone \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --agree-tos \
    --email $EMAIL \
    --non-interactive

# 4. Copy certificates to project folder
echo "📂 Copying certificates to nginx/ssl..."
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/

# Set permissions so Docker can read them
sudo chmod 644 nginx/ssl/*.pem
# Try to set ownership to the current user (assuming ubuntu)
sudo chown $USER:$USER nginx/ssl/*.pem || true

# 5. Restart Nginx
echo "🚀 Restarting Nginx..."
docker-compose up -d nginx

echo "✅ SSL Setup Complete!"
echo "Your site should now be secure: https://$DOMAIN"
