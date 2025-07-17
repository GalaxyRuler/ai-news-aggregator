#!/bin/bash

# AI News Aggregator Setup Script
# Author: GalaxyRuler
# Repository: https://github.com/GalaxyRuler/ai-news-aggregator

set -e

echo "🚀 AI News Aggregator Setup Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_error "This script should not be run as root"
    exit 1
fi

# Check Node.js version
print_status "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

print_status "Node.js version: $(node --version) ✓"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

print_status "npm version: $(npm --version) ✓"

# Install dependencies
print_status "Installing dependencies..."
npm install

# Check for environment file
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status "Created .env from .env.example"
    else
        print_status "Creating .env file with required variables..."
        cat > .env << EOF
# Database Configuration
DATABASE_URL=your_postgresql_connection_string

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Authentication
APP_PASSWORD=ai-news-2025

# Optional API Keys
NEWS_API_KEY=your_news_api_key
SERPAPI_API_KEY=your_serpapi_key
NEWSDATA_API_KEY=your_newsdata_api_key

# Application Configuration
NODE_ENV=production
PORT=5000
EOF
    fi
    
    print_warning "Please edit .env file with your actual API keys and database URL"
    print_warning "Required: DATABASE_URL, OPENAI_API_KEY"
fi

# Function to check if PostgreSQL is accessible
check_database() {
    print_status "Checking database connection..."
    
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL not set in .env file"
        return 1
    fi
    
    # Try to connect to database using node
    node -e "
        const { Pool } = require('@neondatabase/serverless');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        pool.query('SELECT 1')
            .then(() => {
                console.log('Database connection successful');
                process.exit(0);
            })
            .catch(err => {
                console.error('Database connection failed:', err.message);
                process.exit(1);
            });
    " 2>/dev/null || {
        print_error "Database connection failed. Please check your DATABASE_URL"
        return 1
    }
    
    print_status "Database connection successful ✓"
}

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | xargs)
fi

# Check database connection
check_database

# Push database schema
print_status "Setting up database schema..."
npm run db:push

# Build the application
print_status "Building application..."
npm run build

# Create systemd service file (optional)
create_systemd_service() {
    print_status "Creating systemd service file..."
    
    SERVICE_FILE="/etc/systemd/system/ai-news-aggregator.service"
    CURRENT_USER=$(whoami)
    CURRENT_DIR=$(pwd)
    
    sudo tee $SERVICE_FILE > /dev/null << EOF
[Unit]
Description=AI News Aggregator
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
Environment=NODE_ENV=production
EnvironmentFile=$CURRENT_DIR/.env
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable ai-news-aggregator
    
    print_status "Systemd service created. Use 'sudo systemctl start ai-news-aggregator' to start"
}

# Create startup script
print_status "Creating startup script..."
cat > start.sh << 'EOF'
#!/bin/bash

# AI News Aggregator Startup Script

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | xargs)
fi

# Check if build exists
if [ ! -d "dist" ]; then
    echo "Building application..."
    npm run build
fi

# Start the application
echo "Starting AI News Aggregator..."
npm start
EOF

chmod +x start.sh

# Create process management script
print_status "Creating process management script..."
cat > manage.sh << 'EOF'
#!/bin/bash

# AI News Aggregator Process Management

PID_FILE="ai-news-aggregator.pid"

start() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat $PID_FILE)
        if ps -p $PID > /dev/null 2>&1; then
            echo "AI News Aggregator is already running (PID: $PID)"
            return 1
        fi
    fi
    
    echo "Starting AI News Aggregator..."
    nohup npm start > app.log 2>&1 &
    echo $! > $PID_FILE
    echo "Started with PID: $(cat $PID_FILE)"
}

stop() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat $PID_FILE)
        if ps -p $PID > /dev/null 2>&1; then
            echo "Stopping AI News Aggregator (PID: $PID)..."
            kill $PID
            rm -f $PID_FILE
            echo "Stopped"
        else
            echo "Process not running"
            rm -f $PID_FILE
        fi
    else
        echo "PID file not found"
    fi
}

status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat $PID_FILE)
        if ps -p $PID > /dev/null 2>&1; then
            echo "AI News Aggregator is running (PID: $PID)"
        else
            echo "AI News Aggregator is not running"
        fi
    else
        echo "AI News Aggregator is not running"
    fi
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        start
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
EOF

chmod +x manage.sh

print_status "Setup completed successfully! 🎉"
echo
echo "📋 Next Steps:"
echo "1. Edit .env file with your actual API keys"
echo "2. Start the application: ./start.sh"
echo "3. Or use process manager: ./manage.sh start"
echo "4. Access the app at: http://localhost:5000"
echo
echo "🔧 Management Commands:"
echo "- Start: ./manage.sh start"
echo "- Stop: ./manage.sh stop"
echo "- Restart: ./manage.sh restart"
echo "- Status: ./manage.sh status"
echo
echo "📚 Documentation:"
echo "- README.md - Complete setup guide"
echo "- DEPLOYMENT.md - Deployment instructions"
echo "- .env.example - Environment variables template"
echo
print_status "Setup script completed successfully!"