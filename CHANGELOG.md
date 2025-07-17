# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-06-30

### Added
- **Automated Daily Collection System**: Implemented automated daily news collection that runs every 24 hours at 3:00 AM
- **SimpleDailyCollectorService**: Automated service that gathers news from all configured sources
- **Automation Settings Page**: Interface for managing collection schedules and triggering manual runs
- **Data Accumulation System**: Comprehensive data accumulation service that builds market intelligence over time
- **Historical Data Tracking**: Company growth metrics, technology adoption curves, and investor patterns
- **Data Insights Page**: Interactive visualizations for accumulated intelligence
- **Market Trend Indicators**: Funding Velocity, Technology Diversity, Market Sentiment, Innovation Rate
- **Comprehensive Caching System**: Sophisticated caching service to prevent duplicate news retrieval
- **URL-based Deduplication**: 24-hour cache retention with intelligent duplicate detection
- **Source-level Caching**: 15-minute fetch intervals with performance optimization
- **AI Analysis Result Caching**: Prevents re-analyzing same articles

### Enhanced
- **Performance Optimization**: Fixed critical bugs preventing proper data loading and display
- **Database Integrity**: Cleaned up duplicate entries and improved data quality
- **Cache Invalidation**: Proper cache clearing ensures immediate dashboard updates
- **News Refresh System**: Fixed collection cycles that prevented new articles from being stored
- **Market Intelligence APIs**: Added APIs for company growth trajectories and technology adoption phases

### Fixed
- **Critical Bug**: Fixed "invalid input syntax for type integer: NaN" errors in news article endpoints
- **ID Validation**: Added proper ID validation for news article routes
- **Cache Service Error**: Fixed "TypeError: key.includes is not a function" in cache invalidation
- **Duplicate Articles**: Removed duplicate database entries causing visual duplication
- **Response Times**: Improved 7-second response times with comprehensive caching

### Removed
- **OpenAI Collector**: Disabled OpenAI news collector as GPT models cannot browse internet or access real-time data
- **Fictional Content**: Removed AI-generated articles to maintain data integrity
- **Code Redundancy**: Eliminated duplicate components and consolidated functionality

## [1.5.0] - 2025-06-29

### Added
- **Enhanced API Integration**: Integrated Alpha Vantage API for financial news with AI sentiment analysis
- **The News API Integration**: Added comprehensive real-time news aggregation (unlimited free)
- **Unified API Source Management**: Created comprehensive source management system
- **Market Intelligence Enhancement**: Enhanced with financial data and economic indicators
- **Comprehensive Analytics Dashboard**: Interactive charts and trend visualization
- **Impact Factor Analysis**: Detailed impact assessment for each news article with 0-10 scoring
- **Technology Trend Analysis**: Real-time technology adoption tracking and sentiment analysis
- **Source Management System**: Flexible addition of RSS feeds and API sources with CRUD operations

### Enhanced
- **News Source Coverage**: Expanded from 26 to 54 sources with international coverage
- **Translation Service**: Automatic translation of non-English news titles to English using OpenAI GPT-4o
- **Verification System**: Comprehensive news verification to prevent fake news with URL validation
- **Duplicate Filtering**: Enhanced duplicate filtering with fuzzy matching and title similarity detection
- **AI Content Filtering**: Intelligent filtering using GPT-4o to analyze article relevance (60% threshold)
- **Summary Generation**: Longer, detailed summaries (4-6 sentences) in simple, everyday language

### Fixed
- **Confidence Levels**: Corrected unrealistic confidence levels (9000%+) to realistic scoring (50-95%)
- **Source Links**: Fixed source links to point to actual articles instead of RSS feeds
- **UI Issues**: Resolved news cards overspilling on edges with proper width constraints
- **Language Issues**: Fixed non-English news titles with comprehensive translation
- **Market Intelligence Crashes**: Implemented comprehensive null safety checks

## [1.0.0] - 2025-06-28

### Added
- **Initial Release**: Full-stack AI news aggregator with React frontend and Express backend
- **SerpAPI Integration**: Real-time AI news data collection and processing
- **Comprehensive AI/ML News Sources**: 27 initial sources including academic, business, and development platforms
- **AI Analysis**: OpenAI GPT-4o integration for categorization, confidence scoring, and analysis
- **Database Migration**: Successfully migrated from in-memory to PostgreSQL with Neon Database
- **Weekly AI Reports**: "The State of AI This Week" with comprehensive analysis and predictions
- **Filtering System**: Multi-dimensional filtering by category, confidence, date, and region
- **Authentication System**: Secure login with session management
- **RSS Collection**: Enhanced RSS service with full article content fetching

### Technical Features
- **React 18 + TypeScript**: Modern frontend with Vite build system
- **Express.js Backend**: RESTful API with comprehensive endpoints
- **PostgreSQL Database**: Persistent storage with Drizzle ORM
- **shadcn/ui Components**: Modern UI with Radix UI primitives
- **TanStack Query**: Efficient server state management
- **Tailwind CSS**: Utility-first styling with dark/light theme support

### Security
- **News Verification**: Real-time verification API with domain validation
- **Content Authenticity**: Filters suspicious content patterns
- **Duplicate Prevention**: Database-level and application-level duplicate handling