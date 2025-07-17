# AI News Aggregator Installation Guide

## Quick Setup Options

### Option 1: Automated Setup Script
Run the complete setup script:
```bash
chmod +x setup.sh
./setup.sh
```

### Option 2: Docker Setup
For containerized deployment:
```bash
chmod +x docker-setup.sh
./docker-setup.sh
./docker-manage.sh start
```

### Option 3: Manual Installation
Follow the detailed steps below.

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **PostgreSQL Database** - Local or cloud (Neon Database recommended)
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)

## Manual Installation Steps

### 1. Clone Repository
```bash
git clone https://github.com/GalaxyRuler/ai-news-aggregator.git
cd ai-news-aggregator
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create `.env` file:
```env
# Required
DATABASE_URL=your_postgresql_connection_string
OPENAI_API_KEY=your_openai_api_key

# Authentication
APP_PASSWORD=ai-news-2025

# Optional API Keys
NEWS_API_KEY=your_news_api_key
SERPAPI_API_KEY=your_serpapi_key
NEWSDATA_API_KEY=your_newsdata_api_key

# Application
NODE_ENV=production
PORT=5000
```

### 4. Database Setup
```bash
npm run db:push
```

### 5. Build Application
```bash
npm run build
```

### 6. Start Application
```bash
npm start
```

## Database Setup Options

### Option A: Neon Database (Recommended)
1. Go to [Neon Database](https://neon.tech/)
2. Create a new project
3. Copy connection string to `DATABASE_URL`

### Option B: Local PostgreSQL
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb ai_news_aggregator
sudo -u postgres createuser ai_news_user
sudo -u postgres psql -c "ALTER USER ai_news_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ai_news_aggregator TO ai_news_user;"

# Set DATABASE_URL
DATABASE_URL=postgresql://ai_news_user:your_password@localhost:5432/ai_news_aggregator
```

## API Keys Setup

### Required: OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new API key
3. Add to `.env` as `OPENAI_API_KEY`

### Optional: News API Keys
- **NewsAPI**: [Get key](https://newsapi.org/register)
- **SerpAPI**: [Get key](https://serpapi.com/users/sign_up)
- **NewsData**: [Get key](https://newsdata.io/register)

## Process Management

### Using Process Manager Script
```bash
# Start application
./manage.sh start

# Stop application
./manage.sh stop

# Restart application
./manage.sh restart

# Check status
./manage.sh status
```

### Using PM2 (Production)
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Setup auto-start
pm2 startup
pm2 save
```

## Docker Deployment

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

### Quick Start
```bash
# Run setup
./docker-setup.sh

# Start services
./docker-manage.sh start

# View logs
./docker-manage.sh logs
```

### Docker Commands
```bash
# Start all services
./docker-manage.sh start

# Stop all services
./docker-manage.sh stop

# Restart services
./docker-manage.sh restart

# View application logs
./docker-manage.sh logs

# Check service status
./docker-manage.sh status

# Clean up resources
./docker-manage.sh clean

# Database shell
./docker-manage.sh db-shell

# Application shell
./docker-manage.sh app-shell
```

## Verification

### Check Installation
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Test database connection
npm run db:push

# Verify build
npm run build
```

### Test Application
1. Start application: `npm start` or `./manage.sh start`
2. Open browser: `http://localhost:5000`
3. Login with password: `ai-news-2025`
4. Check news dashboard loads
5. Test market intelligence features

## Troubleshooting

### Common Issues

**Database Connection Error**
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

**OpenAI API Error**
```bash
# Verify API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
```

**Port Already in Use**
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 PID
```

**Node.js Version Issues**
```bash
# Install Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 18
nvm install 18
nvm use 18
```

### Log Files
- Application logs: `app.log`
- Docker logs: `./docker-manage.sh logs`
- Database logs: Check PostgreSQL logs

## Production Deployment

### Environment Variables
```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
OPENAI_API_KEY=your_production_api_key
```

### Security Considerations
- Use strong passwords
- Enable SSL/TLS
- Configure firewall
- Regular security updates
- Environment variable security

### Performance Optimization
- Enable compression
- Configure caching
- Database connection pooling
- CDN for static assets
- Load balancing

## Support

For issues and questions:
- Check [GitHub Issues](https://github.com/GalaxyRuler/ai-news-aggregator/issues)
- Review [Documentation](README.md)
- Check [Deployment Guide](DEPLOYMENT.md)

## Next Steps

After installation:
1. Configure news sources
2. Set up automated collection
3. Customize market intelligence
4. Configure monitoring
5. Set up backups