# CryptoPag Wallet - Quick Start

## Local Development

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Production Deployment (AWS EC2)

### Quick Deploy

```bash
# 1. Clone repository
git clone <your-repo-url> CryptoPag-wallet
cd CryptoPag-wallet

# 2. Configure environment
cp .env.production.example .env.production
nano .env.production  # Update with your values

# 3. Run deployment script
chmod +x deploy.sh
./deploy.sh
```

### Prerequisites

- Docker & Docker Compose installed
- Domain name configured
- SSL certificates (Let's Encrypt or self-signed)

### Full Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide.

## Project Structure

```
CryptoPag-crypto-wallet/
├── src/                    # Application source code
├── public/                 # Static assets
├── nginx/                  # Nginx configuration
│   ├── conf.d/            # Site configurations
│   ├── ssl/               # SSL certificates
│   └── logs/              # Nginx logs
├── Dockerfile             # Docker image definition
├── docker-compose.yml     # Multi-container setup
├── deploy.sh              # Automated deployment script
└── .env.production        # Production environment variables
```

## Environment Variables

Create `.env.production` with:

```env
NEXT_PUBLIC_API_BASE_URL=https://platform.vcard-usa.com/merchant-server
NEXT_PUBLIC_CLIENT_BASE_URL=https://cryptopagregistro.com.br
NODE_ENV=production
```

## Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild
docker-compose build --no-cache
```

## Support

For deployment issues, see [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section.
