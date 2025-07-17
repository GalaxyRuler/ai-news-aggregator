# AI News Aggregator

An advanced AI-powered market intelligence platform that delivers hyper-current global technology insights through intelligent data processing and personalized news experiences.

![AI News Aggregator](https://img.shields.io/badge/AI-News%20Aggregator-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-React-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### 🚀 Core Capabilities
- **Real-time News Aggregation**: Collects from 54+ comprehensive AI/ML news sources
- **AI-Powered Analysis**: Uses OpenAI GPT-4o for categorization, confidence scoring, and impact analysis
- **Market Intelligence**: Comprehensive funding events, company mentions, and technology trend tracking
- **Advanced Filtering**: Multi-dimensional filtering by category, confidence, date, region
- **Automated Collection**: Daily automated news collection system
- **Duplicate Prevention**: Sophisticated deduplication with URL-based and title similarity detection

### 📊 Analytics & Intelligence
- **Data Accumulation System**: Builds market intelligence over time with historical tracking
- **Interactive Visualizations**: Charts for trends, analytics, and market insights
- **Performance Optimization**: Comprehensive caching system for optimal response times
- **Source Management**: Flexible addition/editing of RSS feeds and API sources

### 🔧 Technical Architecture
- **Frontend**: React 18 + TypeScript with Vite build system
- **Backend**: Express.js with Node.js runtime
- **Database**: PostgreSQL with Neon Database (serverless)
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with dark/light theme support
- **State Management**: TanStack Query for server state management

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or Neon Database account)
- OpenAI API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/GalaxyRuler/ai-news-aggregator.git
cd ai-news-aggregator
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file in the root directory:
```env
DATABASE_URL=your_postgresql_connection_string
OPENAI_API_KEY=your_openai_api_key
APP_PASSWORD=ai-news-2025
```

4. **Initialize the database**
```bash
npm run db:push
```

5. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Usage

### Authentication
- Access the platform using the password: `ai-news-2025` (configurable via APP_PASSWORD environment variable)

### News Collection
- **Manual Refresh**: Click "Refresh All" button to collect latest articles
- **Automated Collection**: System automatically runs daily at 3:00 AM
- **Source Management**: Add/edit news sources through the admin interface

### Market Intelligence
- **Funding Dashboard**: View latest funding events and investment trends
- **Company Mentions**: Track company activity across news sources
- **Technology Trends**: Monitor emerging AI/ML technologies with adoption tracking
- **Data Insights**: Access accumulated intelligence with interactive visualizations

## News Sources

The platform aggregates from 54+ comprehensive sources including:

**Academic & Research**: MIT Technology Review, Nature Machine Intelligence, Stanford HAI, IEEE Spectrum, Google AI, OpenAI, DeepMind, Microsoft Research, Facebook AI, Anthropic Research

**Business & Industry**: VentureBeat AI, AI Business News, McKinsey AI, Wired AI, TechCrunch AI, The Rundown AI, Ben's Bites, TLDR AI

**Development & Tools**: Towards Data Science, Hugging Face, Papers With Code, NVIDIA AI, KDnuggets, Analytics Vidhya

**International Coverage**: TechNode (Asia), Nikkei Asia Tech, Gigazine (Japan), Wamda (Middle East), MAGNiTT, Tahawul Tech, Daily News Egypt (Africa)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Authenticate with password
- `GET /api/auth/status` - Check authentication status
- `POST /api/auth/logout` - Logout

### News Management
- `GET /api/news` - Fetch news articles with filtering
- `GET /api/news-summary` - Get news statistics summary
- `POST /api/collect/manual` - Trigger manual news collection
- `GET /api/sources` - Get configured news sources
- `POST /api/sources` - Add new news source

### Market Intelligence
- `GET /api/market/funding-dashboard` - Funding events and metrics
- `GET /api/market/company-mentions` - Company activity tracking
- `GET /api/market/technology-trends` - Technology adoption analysis
- `GET /api/market/accumulated-insights` - Historical intelligence data

## Development

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   └── lib/           # Utilities and configurations
├── server/                # Express backend
│   ├── services/          # Business logic services
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database operations
│   └── auth.ts           # Authentication logic
├── shared/                # Shared types and schemas
│   └── schema.ts         # Database schema definitions
└── drizzle.config.ts     # Database configuration
```

### Database Schema
The application uses a comprehensive PostgreSQL schema with tables for:
- `news_articles` - Article storage with metadata
- `news_sources` - Configured news sources
- `weekly_reports` - Generated weekly summaries
- `company_mentions` - Company tracking data
- `funding_events` - Investment and funding information
- `technology_trends` - Technology adoption metrics
- `auth_sessions` - Authentication sessions

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Push schema changes to database
npm run db:studio    # Open database studio
```

## Deployment

### Environment Setup
1. Set up PostgreSQL database (Neon Database recommended)
2. Configure environment variables
3. Run database migrations
4. Deploy to your preferred hosting platform

### Production Configuration
- Set `NODE_ENV=production`
- Configure proper database connection strings
- Set up SSL certificates if needed
- Configure reverse proxy (nginx recommended)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Open an issue on GitHub
- Check the documentation in `/docs`
- Review the troubleshooting guide

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and updates.

---

Built with ❤️ using React, TypeScript, and OpenAI

## Repository
- **GitHub**: https://github.com/GalaxyRuler/ai-news-aggregator
- **Author**: GalaxyRuler
