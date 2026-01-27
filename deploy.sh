#!/bin/bash

# CryptoPag Wallet - AWS EC2 Deployment Script
# This script automates the deployment process on AWS EC2

set -e  # Exit on error

echo "🚀 Starting CryptoPag Wallet Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Please do not run this script as root${NC}"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/engine/install/"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}⚠️  .env.production not found${NC}"
    echo "Creating from template..."
    cp .env.production.example .env.production
    echo -e "${YELLOW}⚠️  Please edit .env.production with your production values${NC}"
    echo "Press Enter to continue after editing, or Ctrl+C to cancel..."
    read
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p nginx/ssl
mkdir -p nginx/logs

# Check for SSL certificates
if [ ! -f nginx/ssl/fullchain.pem ] || [ ! -f nginx/ssl/privkey.pem ]; then
    echo -e "${YELLOW}⚠️  SSL certificates not found in nginx/ssl/${NC}"
    echo "You need to set up Let's Encrypt certificates."
    echo ""
    echo "PLEASE RUN: ./setup-ssl.sh"
    echo ""
    echo "Press Enter to continue (if you plan to run setup-ssl.sh later)..."
    read
fi

# Update nginx config with domain
read -p "Enter your domain name (e.g., wallet.example.com): " domain_name
if [ ! -z "$domain_name" ]; then
    sed -i.bak "s/cryptopagregistro.com.br/$domain_name/g" nginx/conf.d/default.conf
    echo -e "${GREEN}✅ Domain updated in nginx config${NC}"
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build and start containers
echo "🏗️  Building Docker images..."
docker-compose build --no-cache

echo "🚀 Starting containers..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check container status
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "📊 Container Status:"
    docker-compose ps
    echo ""
    echo "🌐 Your application should be accessible at:"
    echo "   HTTP:  http://$domain_name"
    echo "   HTTPS: https://$domain_name"
    echo ""
    echo "📝 Useful commands:"
    echo "   View logs:        docker-compose logs -f"
    echo "   Stop services:    docker-compose down"
    echo "   Restart services: docker-compose restart"
    echo "   View status:      docker-compose ps"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo "Check logs with: docker-compose logs"
    exit 1
fi
