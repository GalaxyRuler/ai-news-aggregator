# Deployment Guide

This guide covers deploying the AI News Aggregator to various platforms.

## Prerequisites

- Node.js 18+ runtime environment
- PostgreSQL database (Neon Database recommended for serverless)
- OpenAI API key
- (Optional) Additional API keys for enhanced features

## Environment Variables

Create a `.env` file with the following variables:

```env
# Required
DATABASE_URL=postgresql://username:password@host:port/database
OPENAI_API_KEY=your_openai_api_key
APP_PASSWORD=your_admin_password

# Optional
NEWSDATA_API_KEY=your_newsdata_api_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key
```

## Database Setup

### Option 1: Neon Database (Recommended)
1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string to `DATABASE_URL`

### Option 2: Local PostgreSQL
1. Install PostgreSQL locally
2. Create database: `createdb ai_news_db`
3. Update `DATABASE_URL` with local credentials

### Initialize Database Schema
```bash
npm install
npm run db:push
```

## Platform-Specific Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Configure `vercel.json`**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/client/dist/$1"
    }
  ]
}
```

3. **Deploy**
```bash
vercel --prod
```

4. **Set Environment Variables**
```bash
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY
vercel env add APP_PASSWORD
```

### Railway

1. **Connect Repository**
- Visit [railway.app](https://railway.app)
- Connect your GitHub repository

2. **Configure Build Command**
```bash
npm install && npm run build
```

3. **Configure Start Command**
```bash
npm start
```

4. **Add Environment Variables**
- Go to Variables tab in Railway dashboard
- Add all required environment variables

### Render

1. **Create Web Service**
- Visit [render.com](https://render.com)
- Connect GitHub repository

2. **Configure Build Settings**
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

3. **Environment Variables**
- Add all required environment variables in Render dashboard

### Docker Deployment

1. **Create `Dockerfile`**
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]
```

2. **Create `docker-compose.yml`**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - APP_PASSWORD=${APP_PASSWORD}
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: ai_news_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

3. **Deploy**
```bash
docker-compose up -d
```

### Self-Hosted VPS

1. **Server Setup**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Install nginx (optional, for reverse proxy)
sudo apt install nginx
```

2. **Application Setup**
```bash
git clone https://github.com/your-username/ai-news-aggregator.git
cd ai-news-aggregator
npm install
npm run build
```

3. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Process Manager (PM2)**
```bash
npm install pm2 -g
pm2 start npm --name "ai-news-aggregator" -- start
pm2 startup
pm2 save
```

5. **Nginx Configuration** (Optional)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Database connection established
- [ ] OpenAI API key valid and working
- [ ] SSL certificate configured (for production)
- [ ] Backup strategy implemented
- [ ] Monitoring and logging set up
- [ ] Domain name configured
- [ ] Performance testing completed

## Monitoring

### Health Check Endpoint
The application provides a health check endpoint at `/api/health` that returns:
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "2.0.0"
}
```

### Log Monitoring
Monitor application logs for:
- Database connection issues
- API rate limit warnings
- News collection failures
- Authentication attempts

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify `DATABASE_URL` format
   - Check database server accessibility
   - Ensure database exists and migrations ran

2. **OpenAI API Errors**
   - Verify API key validity
   - Check API usage limits
   - Monitor rate limiting

3. **News Collection Failures**
   - Check RSS feed accessibility
   - Verify API keys for external services
   - Monitor network connectivity

4. **High Memory Usage**
   - Implement cache cleanup
   - Monitor article processing queue
   - Consider scaling database resources

### Performance Optimization

1. **Database Indexing**
```sql
CREATE INDEX idx_news_articles_published_at ON news_articles(published_at);
CREATE INDEX idx_news_articles_category ON news_articles(category);
CREATE INDEX idx_news_articles_confidence ON news_articles(confidence);
```

2. **Caching Strategy**
- Redis for session storage (optional)
- CDN for static assets
- Application-level caching for API responses

3. **Resource Monitoring**
- Monitor CPU and memory usage
- Track database query performance
- Monitor API response times

## Security Considerations

1. **Environment Variables**
   - Never commit `.env` files
   - Use platform-specific secret management
   - Rotate API keys regularly

2. **Database Security**
   - Use connection pooling
   - Implement proper backup encryption
   - Regular security updates

3. **Application Security**
   - Keep dependencies updated
   - Implement rate limiting
   - Use HTTPS in production
   - Regular security audits

## Backup Strategy

1. **Database Backups**
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

2. **Application Backups**
- Source code in version control
- Environment configuration documentation
- Regular deployment testing

## Support

For deployment assistance:
- Check GitHub Issues
- Review troubleshooting guides
- Consult platform-specific documentation