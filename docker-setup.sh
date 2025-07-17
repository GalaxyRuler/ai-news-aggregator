#!/bin/bash

# AI News Aggregator Docker Setup Script
# Author: GalaxyRuler
# Repository: https://github.com/GalaxyRuler/ai-news-aggregator

set -e

echo "🐳 AI News Aggregator Docker Setup"
echo "=================================="

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    curl \
    bash

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/auth/status || exit 1

# Start application
CMD ["npm", "start"]
EOF

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  ai-news-aggregator:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - APP_PASSWORD=${APP_PASSWORD:-ai-news-2025}
      - NEWS_API_KEY=${NEWS_API_KEY}
      - SERPAPI_API_KEY=${SERPAPI_API_KEY}
      - NEWSDATA_API_KEY=${NEWSDATA_API_KEY}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    depends_on:
      - postgres
    networks:
      - ai-news-network

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=ai_news_aggregator
      - POSTGRES_USER=ai_news_user
      - POSTGRES_PASSWORD=ai_news_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - ai-news-network

volumes:
  postgres_data:

networks:
  ai-news-network:
    driver: bridge
EOF

# Create .dockerignore
cat > .dockerignore << 'EOF'
node_modules
.git
.github
.vscode
*.log
.env
.env.local
.env.development
.env.production
dist
coverage
.nyc_output
README.md
CHANGELOG.md
DEPLOYMENT.md
attached_assets
test-report.md
cookies.txt
.cache
.local
.upm
.config
.replit
EOF

# Create database initialization script
cat > init.sql << 'EOF'
-- Database initialization for AI News Aggregator
-- This script sets up the initial database structure

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS ai_news_aggregator;

-- Create user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'ai_news_user') THEN
        CREATE USER ai_news_user WITH PASSWORD 'ai_news_password';
    END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ai_news_aggregator TO ai_news_user;
GRANT ALL ON SCHEMA public TO ai_news_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO ai_news_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ai_news_user;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ai_news_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ai_news_user;
EOF

# Create docker environment file
cat > .env.docker << 'EOF'
# Docker Environment Configuration for AI News Aggregator

# Database Configuration (for Docker Compose)
DATABASE_URL=postgresql://ai_news_user:ai_news_password@postgres:5432/ai_news_aggregator

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Authentication
APP_PASSWORD=ai-news-2025

# Optional API Keys
NEWS_API_KEY=your_news_api_key_here
SERPAPI_API_KEY=your_serpapi_key_here
NEWSDATA_API_KEY=your_newsdata_api_key_here

# Application Configuration
NODE_ENV=production
PORT=5000
EOF

# Create Docker management script
cat > docker-manage.sh << 'EOF'
#!/bin/bash

# AI News Aggregator Docker Management Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
}

# Setup environment
setup_env() {
    if [ ! -f ".env" ]; then
        print_warning "Creating .env file from Docker template..."
        cp .env.docker .env
        print_warning "Please edit .env file with your actual API keys"
    fi
}

# Build and start services
start() {
    print_status "Starting AI News Aggregator with Docker..."
    check_docker
    setup_env
    
    docker-compose up -d --build
    
    print_status "Services started successfully!"
    print_status "Application: http://localhost:5000"
    print_status "Database: localhost:5432"
}

# Stop services
stop() {
    print_status "Stopping AI News Aggregator services..."
    docker-compose down
    print_status "Services stopped"
}

# Restart services
restart() {
    print_status "Restarting AI News Aggregator services..."
    docker-compose down
    docker-compose up -d --build
    print_status "Services restarted"
}

# Show logs
logs() {
    docker-compose logs -f ai-news-aggregator
}

# Show status
status() {
    docker-compose ps
}

# Clean up
clean() {
    print_status "Cleaning up Docker resources..."
    docker-compose down -v
    docker system prune -f
    print_status "Cleanup completed"
}

# Database shell
db_shell() {
    print_status "Connecting to database..."
    docker-compose exec postgres psql -U ai_news_user -d ai_news_aggregator
}

# Application shell
app_shell() {
    print_status "Connecting to application container..."
    docker-compose exec ai-news-aggregator /bin/bash
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    clean)
        clean
        ;;
    db-shell)
        db_shell
        ;;
    app-shell)
        app_shell
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|status|clean|db-shell|app-shell}"
        echo
        echo "Commands:"
        echo "  start     - Build and start all services"
        echo "  stop      - Stop all services"
        echo "  restart   - Restart all services"
        echo "  logs      - Show application logs"
        echo "  status    - Show service status"
        echo "  clean     - Clean up Docker resources"
        echo "  db-shell  - Connect to database shell"
        echo "  app-shell - Connect to application shell"
        exit 1
        ;;
esac
EOF

chmod +x docker-manage.sh

print_status "Docker setup completed successfully! 🐳"
echo
echo "📋 Next Steps:"
echo "1. Edit .env file with your actual API keys"
echo "2. Start services: ./docker-manage.sh start"
echo "3. Access the app at: http://localhost:5000"
echo
echo "🐳 Docker Commands:"
echo "- Start: ./docker-manage.sh start"
echo "- Stop: ./docker-manage.sh stop"
echo "- Restart: ./docker-manage.sh restart"
echo "- Logs: ./docker-manage.sh logs"
echo "- Status: ./docker-manage.sh status"
echo "- Clean: ./docker-manage.sh clean"
echo
print_status "Docker setup script completed successfully!"