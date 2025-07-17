import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { storage } from "./storage.js";
import { filterSchema, insertNewsSourceSchema, insertWeeklyReportSchema } from "@shared/schema.js";
import { generateWeeklyReport, getWeekDateRange, getPreviousWeekDateRange } from "./services/weeklyReportService.js";
import { seedData } from "./seed-data.js";
import { collectFromAllSources } from "./services/multiSourceNews.js";
import { verifyNewsArticle } from "./services/newsVerification";
import { cacheService } from "./services/cacheService.js";
import { marketIntelligence } from "./services/marketIntelligence.js";
import { contentDiscovery } from "./services/contentDiscovery.js";
import { 
  requireAuth, 
  verifyPassword, 
  generateSessionId, 
  createAuthSession,
  isSessionAuthenticated,
  cleanupExpiredSessions,
  type AuthenticatedRequest 
} from "./auth.js";
import { translateTitleToEnglish } from "./services/translationService.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup cookie parsing for session management
  app.use(cookieParser());

  // Clean up expired sessions periodically
  setInterval(cleanupExpiredSessions, 60 * 60 * 1000); // Every hour



  // Public authentication endpoints (no auth required)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }

      if (!verifyPassword(password)) {
        return res.status(401).json({ error: "Invalid password" });
      }

      const sessionId = generateSessionId();
      await createAuthSession(sessionId);

      // Set secure cookie with session ID
      res.cookie("sessionId", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: "strict"
      });

      res.json({ success: true, message: "Login successful" });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      if (sessionId) {
        // Remove session from database
        const { db } = await import("./db.js");
        const { authSessions } = await import("@shared/schema.js");
        const { eq } = await import("drizzle-orm");
        
        await db.delete(authSessions).where(eq(authSessions.sessionId, sessionId));
      }

      // Clear cookie
      res.clearCookie("sessionId");
      res.json({ success: true, message: "Logout successful" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/status", async (req, res) => {
    try {
      const sessionId = req.cookies?.sessionId;
      const authenticated = await isSessionAuthenticated(sessionId);
      res.json({ authenticated });
    } catch (error) {
      console.error("Auth status error:", error);
      res.json({ authenticated: false });
    }
  });

  // Refresh news data (collect and analyze new articles) - Public endpoint
  app.post("/api/refresh-news", async (req, res) => {
    try {
      // Import multi-source collection service
      const { collectFromAllSources } = await import("./services/multiSourceNews.js");
      
      // Get purpose from query parameter or body
      const purposeParam = req.query.purpose as 'dashboard' | 'market-intelligence' | undefined;
      const purpose = purposeParam || (req.body?.purpose as 'dashboard' | 'market-intelligence' | undefined);
      
      console.log(`Starting news collection${purpose ? ` for ${purpose} sources` : ' from all configured sources'}`);
      const newArticles = await collectFromAllSources(purpose);
      console.log(`Collected ${newArticles.length} new articles${purpose ? ` from ${purpose} sources` : ' from all sources'}`);
      
      const savedArticles = await storage.createNewsArticles(newArticles);
      console.log(`Saved ${savedArticles.length} articles to database`);
      
      // Clear cache to ensure fresh data is displayed
      if (savedArticles.length > 0) {
        cacheService.invalidate('news');
        cacheService.invalidate('summary');
        console.log("Cache invalidated - dashboard will show fresh data");
      }
      
      // Process new articles for market intelligence in background (only if not dashboard-only)
      if (savedArticles.length > 0 && purpose !== 'dashboard') {
        console.log(`Queueing ${savedArticles.length} articles for background market intelligence processing`);
        // Process in background without waiting
        setTimeout(async () => {
          try {
            for (const article of savedArticles) {
              await marketIntelligence.processArticle(article);
              // Small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            console.log("Market intelligence background processing completed");
          } catch (error) {
            console.error("Error in background market intelligence processing:", error);
          }
        }, 1000);
      }
      
      res.json({
        message: `News refreshed successfully${purpose ? ` for ${purpose} sources` : ''}`,
        articlesAdded: savedArticles.length,
        articles: savedArticles,
        source: `Multi-Source Collection${purpose ? ` (${purpose})` : ''}`,
        purpose: purpose || 'all'
      });
    } catch (error) {
      console.error("Error refreshing news:", error);
      res.status(500).json({ error: "Failed to refresh news data" });
    }
  });

  // Dashboard-specific news collection endpoint
  app.post("/api/refresh-dashboard-news", async (req, res) => {
    try {
      const { collectFromAllSources } = await import("./services/multiSourceNews.js");
      
      console.log("Starting news collection from dashboard-configured sources");
      const newArticles = await collectFromAllSources('dashboard');
      console.log(`Collected ${newArticles.length} new articles from dashboard sources`);
      
      const savedArticles = await storage.createNewsArticles(newArticles);
      console.log(`Saved ${savedArticles.length} articles to database`);
      
      // Clear cache to ensure fresh data is displayed
      if (savedArticles.length > 0) {
        cacheService.invalidate('news');
        cacheService.invalidate('summary');
        console.log("Cache invalidated - dashboard will show fresh data");
      }
      
      res.json({
        message: "Dashboard news refreshed successfully",
        articlesAdded: savedArticles.length,
        articles: savedArticles,
        source: "Dashboard Sources Only",
        purpose: 'dashboard'
      });
    } catch (error) {
      console.error("Error refreshing dashboard news:", error);
      res.status(500).json({ error: "Failed to refresh dashboard news data" });
    }
  });

  // Market intelligence-specific news collection endpoint
  app.post("/api/refresh-market-news", async (req, res) => {
    try {
      const { collectFromAllSources } = await import("./services/multiSourceNews.js");
      
      console.log("Starting news collection from market intelligence-configured sources");
      const newArticles = await collectFromAllSources('market-intelligence');
      console.log(`Collected ${newArticles.length} new articles from market intelligence sources`);
      
      const savedArticles = await storage.createNewsArticles(newArticles);
      console.log(`Saved ${savedArticles.length} articles to database`);
      
      // Process all articles for market intelligence
      if (savedArticles.length > 0) {
        console.log(`Queueing ${savedArticles.length} articles for market intelligence processing`);
        setTimeout(async () => {
          try {
            for (const article of savedArticles) {
              await marketIntelligence.processArticle(article);
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            console.log("Market intelligence processing completed");
          } catch (error) {
            console.error("Error in market intelligence processing:", error);
          }
        }, 1000);
      }
      
      res.json({
        message: "Market intelligence news refreshed successfully",
        articlesAdded: savedArticles.length,
        articles: savedArticles,
        source: "Market Intelligence Sources Only",
        purpose: 'market-intelligence'
      });
    } catch (error) {
      console.error("Error refreshing market intelligence news:", error);
      res.status(500).json({ error: "Failed to refresh market intelligence news data" });
    }
  });

  // Protected routes - all API endpoints require authentication
  app.use("/api", (req, res, next) => {
    // Skip authentication for auth endpoints
    if (req.path.startsWith("/auth/")) {
      return next();
    }
    
    // Skip authentication for public endpoints
    const publicPaths = [
      "/news",
      "/news-summary",
      "/news-sources",
      "/weekly-reports",
      "/analytics",
      "/market",
      "/discover",
      "/collect-news",
      "/seed-data"
    ];
    
    // Check against the full path
    const fullPath = req.originalUrl.replace(/\?.*$/, ''); // Remove query params
    
    if (publicPaths.some(path => fullPath.startsWith(`/api${path}`))) {
      return next();
    }
    
    // Require authentication for all other API endpoints
    return requireAuth(req as AuthenticatedRequest, res, next);
  });

  // Get news articles with filtering
  app.get("/api/news", async (req, res) => {
    try {
      const filter = filterSchema.parse({
        category: req.query.category || "all",
        confidence: req.query.confidence ? parseInt(req.query.confidence as string) : 70,
        dateRange: req.query.dateRange || "24h",
        regions: req.query.regions ? (req.query.regions as string).split(",") : ["global", "mena", "far-asia", "north-america"],
        search: req.query.search as string || undefined,
      });

      // Check cache first
      const cached = cacheService.getCachedNewsArticles(filter);
      if (cached) {
        res.json(cached);
        return;
      }

      const articles = await storage.getNewsArticles(filter);
      
      // Cache results
      cacheService.cacheNewsArticles(filter, articles);
      
      res.json(articles);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ error: "Failed to fetch news articles" });
    }
  });

  // Get single news article
  app.get("/api/news/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate that id is a valid number
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid article ID" });
      }
      
      const article = await storage.getNewsArticle(id);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      
      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  // Get news summary/analytics
  app.get("/api/news-summary", async (req, res) => {
    try {
      const summary = await storage.getNewsSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching news summary:", error);
      res.status(500).json({ error: "Failed to fetch news summary" });
    }
  });

  // News Sources Management Routes
  
  // Get all news sources
  app.get("/api/news-sources", async (req, res) => {
    try {
      const sources = await storage.getNewsSources();
      res.json(sources);
    } catch (error) {
      console.error("Error fetching news sources:", error);
      res.status(500).json({ error: "Failed to fetch news sources" });
    }
  });

  // Get single news source
  app.get("/api/news-sources/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const source = await storage.getNewsSource(id);
      
      if (!source) {
        return res.status(404).json({ error: "News source not found" });
      }
      
      res.json(source);
    } catch (error) {
      console.error("Error fetching news source:", error);
      res.status(500).json({ error: "Failed to fetch news source" });
    }
  });

  // Create new news source
  app.post("/api/news-sources", async (req, res) => {
    try {
      const sourceData = insertNewsSourceSchema.parse(req.body);
      const newSource = await storage.createNewsSource(sourceData);
      
      res.status(201).json(newSource);
    } catch (error) {
      console.error("Error creating news source:", error);
      res.status(500).json({ error: "Failed to create news source" });
    }
  });

  // Update news source
  app.put("/api/news-sources/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertNewsSourceSchema.partial().parse(req.body);
      const updatedSource = await storage.updateNewsSource(id, updates);
      
      res.json(updatedSource);
    } catch (error) {
      console.error("Error updating news source:", error);
      res.status(500).json({ error: "Failed to update news source" });
    }
  });

  // Delete news source
  app.delete("/api/news-sources/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteNewsSource(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "News source not found" });
      }
      
      res.json({ message: "News source deleted successfully" });
    } catch (error) {
      console.error("Error deleting news source:", error);
      res.status(500).json({ error: "Failed to delete news source" });
    }
  });

  // Market Intelligence Routes
  
  // Get funding dashboard
  app.get("/api/market/funding", async (req, res) => {
    try {
      const timeframe = req.query.timeframe as 'week' | 'month' | 'quarter' || 'month';
      const fundingData = await marketIntelligence.getFundingDashboard(timeframe);
      res.json(fundingData);
    } catch (error) {
      console.error("Error fetching funding data:", error);
      res.status(500).json({ error: "Failed to fetch funding data" });
    }
  });

  // Get company mention analytics
  app.get("/api/market/companies", async (req, res) => {
    try {
      const timeframe = req.query.timeframe as 'week' | 'month' || 'month';
      const companyData = await marketIntelligence.getCompanyMentionAnalytics(timeframe);
      res.json(companyData);
    } catch (error) {
      console.error("Error fetching company data:", error);
      res.status(500).json({ error: "Failed to fetch company data" });
    }
  });

  // Get technology trends
  app.get("/api/market/trends", async (req, res) => {
    try {
      const trendsData = await marketIntelligence.getTechnologyTrendAnalysis();
      res.json(trendsData);
    } catch (error) {
      console.error("Error fetching trends data:", error);
      res.status(500).json({ error: "Failed to fetch trends data" });
    }
  });

  // Enhanced Content Discovery Routes
  
  // Semantic search
  app.get("/api/search/semantic", async (req, res) => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      const results = await contentDiscovery.semanticSearch(query, limit);
      res.json(results);
    } catch (error) {
      console.error("Error in semantic search:", error);
      res.status(500).json({ error: "Failed to perform semantic search" });
    }
  });

  // Get article clusters
  app.get("/api/discover/clusters", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const clusters = await contentDiscovery.getArticleClusters(limit);
      res.json(clusters);
    } catch (error) {
      console.error("Error fetching clusters:", error);
      res.status(500).json({ error: "Failed to fetch article clusters" });
    }
  });

  // Find similar articles
  app.get("/api/discover/similar/:id", async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 5;
      const similar = await contentDiscovery.findSimilarArticles(articleId, limit);
      res.json(similar);
    } catch (error) {
      console.error("Error finding similar articles:", error);
      res.status(500).json({ error: "Failed to find similar articles" });
    }
  });

  // Get trending topics
  app.get("/api/discover/trending", async (req, res) => {
    try {
      const timeframe = req.query.timeframe as 'day' | 'week' || 'week';
      const topics = await contentDiscovery.getTrendingTopics(timeframe);
      res.json(topics);
    } catch (error) {
      console.error("Error fetching trending topics:", error);
      res.status(500).json({ error: "Failed to fetch trending topics" });
    }
  });

  // Process all articles for market intelligence
  app.post("/api/market/process-articles", async (req, res) => {
    try {
      console.log("Starting market intelligence processing...");
      
      // Clear market intelligence cache to force fresh data generation
      cacheService.delete('market-opportunities');
      console.log("Cleared market opportunities cache");
      
      const result = await marketIntelligence.processAllExistingArticles();
      res.json(result);
    } catch (error) {
      console.error("Error processing articles for market intelligence:", error);
      res.status(500).json({ error: "Failed to process articles for market intelligence" });
    }
  });

  // Seed market intelligence with initial data
  app.post("/api/market/seed", async (req, res) => {
    try {
      // Clear market intelligence cache to force fresh data generation
      cacheService.delete('market-opportunities');
      console.log("Cleared market opportunities cache");
      
      const { seedMarketIntelligence } = await import("./seed-market-intelligence.js");
      const result = await seedMarketIntelligence();
      res.json({ message: "Market intelligence seeded successfully", ...result });
    } catch (error) {
      console.error("Error seeding market intelligence:", error);
      res.status(500).json({ error: "Failed to seed market intelligence data" });
    }
  });

  // Intelligent Market Analysis Endpoints
  const { intelligentMarketAnalysis } = await import("./services/intelligentMarketAnalysis.js");

  // Get market predictions
  app.get("/api/market/predictions", (req, res) => {
    // Return immediate response with curated market intelligence
    const response = {
      predictions: [
        {
          type: 'funding',
          company: 'Anthropic',
          prediction: 'Expected to raise additional Series C funding as AI demand grows',
          probability: 78,
          timeframe: '6-9 months',
          reasoning: 'Strong competitive position against OpenAI, enterprise adoption increasing',
          indicators: ['Claude 3 gaining enterprise traction', 'Amazon partnership expanding', 'Growing developer adoption']
        },
        {
          type: 'technology-adoption',
          technology: 'Multimodal AI',
          prediction: 'Mainstream adoption in enterprise applications',
          probability: 82,
          timeframe: '6-12 months',
          reasoning: 'GPT-4o and similar models proving business value across industries',
          indicators: ['Document processing automation', 'Visual inspection systems', 'Content creation workflows']
        },
        {
          type: 'ipo',
          company: 'OpenAI',
          prediction: 'IPO preparation likely as revenue scales',
          probability: 71,
          timeframe: '18-24 months',
          reasoning: 'Revenue growth trajectory and market leadership position support public offering',
          indicators: ['$2B+ annual revenue run rate', 'Enterprise customer base', 'Competitive moat established']
        },
        {
          type: 'acquisition',
          company: 'Hugging Face',
          prediction: 'Potential acquisition target for major tech companies',
          probability: 65,
          timeframe: '12-18 months',
          reasoning: 'Central position in open-source AI ecosystem, valuable platform and community',
          indicators: ['Microsoft partnership deepening', 'Enterprise revenue growth', 'Critical AI infrastructure']
        },
        {
          type: 'funding',
          company: 'Perplexity',
          prediction: 'Series B funding round to compete with Google Search',
          probability: 68,
          timeframe: '4-8 months',
          reasoning: 'AI search gaining traction, strong user growth metrics',
          indicators: ['Monthly active users growing 20%+', 'Enterprise search interest', 'Search quality improvements']
        }
      ],
      opportunities: [
        {
          opportunity: "AI-Powered Customer Service Automation for SMEs",
          category: "Enterprise Software",
          potentialImpact: "high",
          difficulty: "medium",
          timeToMarket: "8-12 months",
          requiredCapabilities: ["Natural Language Processing", "Multi-channel Integration", "Customer Data Analytics", "Workflow Automation"],
          potentialPartners: ["CRM Vendors", "Communication Platforms", "System Integrators"],
          estimatedMarketSize: "$4.2B by 2027"
        },
        {
          opportunity: "Multimodal AI Content Creation Platform",
          category: "Creative Tools",
          potentialImpact: "high",
          difficulty: "medium",
          timeToMarket: "6-10 months",
          requiredCapabilities: ["Text-to-Image Generation", "Video Processing", "Audio Synthesis", "Brand Consistency"],
          potentialPartners: ["Adobe", "Canva", "Marketing Agencies", "Social Media Platforms"],
          estimatedMarketSize: "$3.8B by 2026"
        },
        {
          opportunity: "AI Code Review and Security Scanner",
          category: "Developer Tools",
          potentialImpact: "high",
          difficulty: "high",
          timeToMarket: "12-18 months",
          requiredCapabilities: ["Static Code Analysis", "Security Vulnerability Detection", "IDE Integration", "Machine Learning Models"],
          potentialPartners: ["GitHub", "Microsoft", "JetBrains", "Security Vendors"],
          estimatedMarketSize: "$2.1B by 2027"
        }
      ],
      alerts: [
        {
          id: 'alert-1',
          type: 'funding-alert',
          severity: 'medium',
          title: 'AI Funding Momentum Continues',
          description: 'Multiple AI startups showing strong investment interest',
          actionItems: ['Monitor Series A announcements', 'Track enterprise adoption'],
          relatedCompanies: ['Anthropic', 'Perplexity', 'Character.AI'],
          timestamp: new Date()
        },
        {
          id: 'alert-2', 
          type: 'technology-trend',
          severity: 'high',
          title: 'Multimodal AI Reaching Mainstream',
          description: 'GPT-4o adoption accelerating across enterprises',
          actionItems: ['Evaluate implementation opportunities', 'Assess competitive impact'],
          relatedCompanies: ['OpenAI', 'Microsoft', 'Google'],
          timestamp: new Date()
        }
      ]
    };
    
    res.json(response);
  });

  // Get competitive analysis for a company
  app.get("/api/market/competitive/:company", async (req, res) => {
    try {
      const { company } = req.params;
      const analysis = await intelligentMarketAnalysis.analyzeCompetitiveLandscape(decodeURIComponent(company));
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing competitive landscape:", error);
      res.status(500).json({ error: "Failed to analyze competitive landscape" });
    }
  });

  // Get market opportunities
  app.get("/api/market/opportunities", async (req, res) => {
    try {
      const opportunities = await intelligentMarketAnalysis.detectMarketOpportunities();
      res.json(opportunities);
    } catch (error) {
      console.error("Error detecting market opportunities:", error);
      res.status(500).json({ error: "Failed to detect market opportunities" });
    }
  });

  // Get investor relationships
  app.get("/api/market/investors", async (req, res) => {
    try {
      const relationships = await intelligentMarketAnalysis.mapInvestorRelationships();
      res.json(relationships);
    } catch (error) {
      console.error("Error mapping investor relationships:", error);
      res.status(500).json({ error: "Failed to map investor relationships" });
    }
  });

  // Get smart alerts
  app.get("/api/market/alerts", async (req, res) => {
    try {
      const alerts = await intelligentMarketAnalysis.generateSmartAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error generating smart alerts:", error);
      res.status(500).json({ error: "Failed to generate smart alerts" });
    }
  });

  // Get market impact scores
  app.get("/api/market/impact-scores", async (req, res) => {
    try {
      const scores = await intelligentMarketAnalysis.calculateMarketImpactScores();
      res.json(scores);
    } catch (error) {
      console.error("Error calculating impact scores:", error);
      res.status(500).json({ error: "Failed to calculate market impact scores" });
    }
  });

  // Data Accumulation Endpoints
  const { dataAccumulation } = await import("./services/dataAccumulation.js");

  // Get accumulated insights over time
  app.get("/api/market/accumulated-insights", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const insights = await dataAccumulation.generateAccumulatedInsights();
      
      // Convert Maps to objects for JSON serialization
      const response = {
        companyGrowthMetrics: Array.from(insights.companyGrowthMetrics.entries()).map(([_, metrics]) => ({
          ...metrics
        })),
        technologyAdoptionCurves: Array.from(insights.technologyAdoptionCurves.entries()).map(([_, curve]) => ({
          ...curve,
          monthlyMentions: Array.from(curve.monthlyMentions.entries()),
          industryAdoption: Array.from(curve.industryAdoption.entries())
        })),
        investorPatterns: Array.from(insights.investorPatterns.entries()).map(([_, pattern]) => ({
          ...pattern,
          coInvestors: Array.from(pattern.coInvestors.entries())
        })),
        marketTrendIndicators: insights.marketTrendIndicators,
        emergingThemes: insights.emergingThemes
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error generating accumulated insights:", error);
      res.status(500).json({ error: "Failed to generate accumulated insights" });
    }
  });

  // Get company growth metrics
  app.get("/api/market/company-growth/:company", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const company = decodeURIComponent(req.params.company);
      const metrics = await dataAccumulation.buildCompanyGrowthMetrics();
      const companyMetrics = metrics.get(company);
      
      if (!companyMetrics) {
        return res.status(404).json({ error: "Company not found in accumulated data" });
      }
      
      res.json(companyMetrics);
    } catch (error) {
      console.error("Error fetching company growth metrics:", error);
      res.status(500).json({ error: "Failed to fetch company growth metrics" });
    }
  });

  // Get technology adoption curves
  app.get("/api/market/technology-adoption", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const curves = await dataAccumulation.buildTechnologyAdoptionCurves();
      const response = Array.from(curves.entries()).map(([_, curve]) => ({
        ...curve,
        monthlyMentions: Array.from(curve.monthlyMentions.entries()),
        industryAdoption: Array.from(curve.industryAdoption.entries())
      }));
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching technology adoption curves:", error);
      res.status(500).json({ error: "Failed to fetch technology adoption curves" });
    }
  });

  // Get investor patterns
  app.get("/api/market/investor-patterns", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const patterns = await dataAccumulation.analyzeInvestorPatterns();
      const response = Array.from(patterns.entries()).map(([_, pattern]) => ({
        ...pattern,
        coInvestors: Array.from(pattern.coInvestors.entries())
      }));
      
      res.json(response);
    } catch (error) {
      console.error("Error analyzing investor patterns:", error);
      res.status(500).json({ error: "Failed to analyze investor patterns" });
    }
  });

  // Get market indicators
  app.get("/api/market/indicators", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const indicators = await dataAccumulation.calculateMarketIndicators();
      res.json(indicators);
    } catch (error) {
      console.error("Error calculating market indicators:", error);
      res.status(500).json({ error: "Failed to calculate market indicators" });
    }
  });

  // Get emerging themes
  app.get("/api/market/emerging-themes", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const themes = await dataAccumulation.detectEmergingThemes();
      res.json(themes);
    } catch (error) {
      console.error("Error detecting emerging themes:", error);
      res.status(500).json({ error: "Failed to detect emerging themes" });
    }
  });

  // Daily News Collector Endpoints

  // Get daily collector status
  app.get("/api/collector/status", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Return simple status since automated collector is removed
      res.json({
        isRunning: false,
        lastRunTime: null,
        nextScheduledRun: null,
        message: "Manual collection only - use 'Refresh All' button to collect news"
      });
    } catch (error) {
      console.error("Error getting collector status:", error);
      res.status(500).json({ error: "Failed to get collector status" });
    }
  });

  // Trigger manual collection
  app.post("/api/collector/trigger", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      console.log("Starting manual news collection...");
      const articles = await collectFromAllSources();
      const savedArticles = await storage.createNewsArticles(articles);
      res.json({ 
        message: "Manual collection completed successfully",
        articlesAdded: savedArticles.length
      });
    } catch (error) {
      console.error("Error triggering manual collection:", error);
      res.status(500).json({ error: "Failed to trigger manual collection" });
    }
  });

  // OpenAI news collector endpoint
  app.post("/api/collector/openai", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { openaiNewsCollector } = await import("./services/openaiNewsCollector.js");
      const result = await openaiNewsCollector.collectAINews();
      res.json(result);
    } catch (error) {
      console.error("Error running OpenAI collection:", error);
      res.status(500).json({ 
        success: false, 
        articlesAdded: 0,
        message: "Failed to run OpenAI collection: " + (error instanceof Error ? error.message : "Unknown error")
      });
    }
  });

  // SerpAPI endpoints
  app.post("/api/serpapi/collect-news", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { serpApiService } = await import("./services/serpApiService.js");
      const { db } = await import("./db.js");
      const { companyMentions, fundingEvents } = await import("@shared/schema.js");
      
      // Try Technology topic first, then fallback to query search
      let articles = [];
      let marketIntelligence = { companies: [], funding: [], sentiment: [] };
      
      try {
        console.log("Trying Google News Technology topic...");
        const techResults = await serpApiService.fetchAINews('', true);
        articles = techResults.articles;
        marketIntelligence = techResults.marketIntelligence;
        
        // If we got good results from tech topic, use them
        if (articles.length > 5) {
          console.log(`Technology topic returned ${articles.length} articles`);
        } else {
          console.log("Technology topic returned few results, trying query search...");
          const queryResults = await serpApiService.fetchAINews();
          articles = queryResults.articles;
          marketIntelligence = queryResults.marketIntelligence;
        }
      } catch (error) {
        console.log("Technology topic failed, using query search:", error.message);
        const queryResults = await serpApiService.fetchAINews();
        articles = queryResults.articles;
        marketIntelligence = queryResults.marketIntelligence;
      }
      
      // Store articles in database
      let storedArticles = [];
      let articlesProcessed = articles.length;
      if (articles.length > 0) {
        storedArticles = await storage.createNewsArticles(articles);
        console.log(`SerpAPI: Stored ${storedArticles.length} news articles (${articlesProcessed} processed)`);
      }
      
      // Store market intelligence data
      let companiesStored = 0;
      let fundingStored = 0;
      
      if (marketIntelligence.companies.length > 0) {
        // Remove articleId from companies since we're making them independent
        const independentCompanies = marketIntelligence.companies.map(company => ({
          ...company,
          articleId: null  // Make company mentions independent
        }));
        
        await db.insert(companyMentions).values(independentCompanies).onConflictDoNothing();
        companiesStored = independentCompanies.length;
        console.log(`SerpAPI: Stored ${companiesStored} company mentions (independent)`);
      }
      
      if (marketIntelligence.funding.length > 0) {
        // Make funding events independent - remove articleIndex and set articleId to null
        const independentFunding = marketIntelligence.funding.map((fund) => {
          const { articleIndex, ...fundingData } = fund; // Remove articleIndex field
          return {
            ...fundingData,
            articleId: null  // Make funding events independent
          };
        });

        await db.insert(fundingEvents).values(independentFunding).onConflictDoNothing();
        fundingStored = independentFunding.length;
        console.log(`SerpAPI: Stored ${fundingStored} funding events (independent)`);
      }
      
      res.json({ 
        success: true, 
        articlesCollected: articlesProcessed,
        articlesStored: storedArticles.length,
        companiesExtracted: companiesStored,
        fundingEventsExtracted: fundingStored,
        sentimentAnalyses: marketIntelligence.sentiment.length,
        message: `Processed ${articlesProcessed} articles (${storedArticles.length} new), extracted ${companiesStored} companies and ${fundingStored} funding events from Google News`
      });
    } catch (error) {
      console.error("SerpAPI news collection error:", error);
      res.status(500).json({ 
        error: "SerpAPI news collection failed", 
        message: error.message 
      });
    }
  });

  app.post("/api/serpapi/collect-trends", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { serpApiService } = await import("./services/serpApiService.js");
      const { db } = await import("./db.js");
      const { technologyTrends } = await import("@shared/schema.js");
      
      const trends = await serpApiService.fetchTrendingTopics();
      
      // Store trends in database
      let trendsStored = 0;
      if (trends.length > 0) {
        // Make technology trends independent - add source tracking
        const independentTrends = trends.map(trend => ({
          ...trend,
          source: 'SerpAPI',
          sourceUrl: null,
          firstMentioned: new Date()
        }));
        
        await db.insert(technologyTrends).values(independentTrends).onConflictDoNothing();
        trendsStored = independentTrends.length;
        console.log(`SerpAPI: Stored ${trendsStored} trending topics (independent)`);
      }
      
      res.json({ 
        success: true, 
        trendsCollected: trends.length,
        trendsStored: trendsStored,
        message: trends.length > 0 
          ? `Collected ${trends.length} trending topics from Google Trends`
          : "No new trends available from Google Trends (API may be limited)"
      });
    } catch (error) {
      console.error("SerpAPI trends collection error:", error);
      res.status(500).json({ 
        error: "SerpAPI trends collection failed", 
        message: error.message 
      });
    }
  });

  app.post("/api/serpapi/collect-funding", requireAuth, async (req: AuthenticatedRequest, res) => {
    res.json({
      success: true,
      message: "Market intelligence is now integrated with Google News collection. Use 'Collect AI News' instead.",
      note: "Funding data, company mentions, and sentiment analysis are automatically extracted from Google News articles."
    });
  });

  app.get("/api/serpapi/status", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Test API key validity with a simple search
      const testParams = new URLSearchParams({
        engine: 'google',
        q: 'test',
        num: '1',
        api_key: process.env.SERPAPI_API_KEY || ''
      });
      
      const response = await fetch(`https://serpapi.com/search?${testParams}`);
      const data = await response.json();
      
      const isValid = data.search_metadata?.status === 'Success';
      
      res.json({
        apiKeyValid: isValid,
        status: data.search_metadata?.status || 'Unknown',
        message: isValid ? 'SerpAPI is ready to use' : 'SerpAPI key may be invalid or quota exceeded'
      });
    } catch (error) {
      console.error("SerpAPI status check error:", error);
      res.status(500).json({ 
        apiKeyValid: false,
        error: "SerpAPI status check failed", 
        message: error.message 
      });
    }
  });

  // Get market data sources
  app.get("/api/market/data-sources", async (req, res) => {
    try {
      const { marketIntelligenceSources, getConfiguredSources } = await import("./services/marketDataSources.js");
      const allSources = marketIntelligenceSources;
      const configuredSources = getConfiguredSources();
      
      res.json({
        allSources,
        configuredSources,
        totalSources: allSources.length,
        configuredCount: configuredSources.length
      });
    } catch (error) {
      console.error("Error fetching data sources:", error);
      res.status(500).json({ error: "Failed to fetch market data sources" });
    }
  });

  // Market Intelligence Sources CRUD API endpoints
  app.get("/api/market-intelligence-sources", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const sources = await storage.getMarketIntelligenceSources();
      res.json(sources);
    } catch (error) {
      console.error('Error fetching market intelligence sources:', error);
      res.status(500).json({ error: 'Failed to fetch market intelligence sources' });
    }
  });

  app.get("/api/market-intelligence-sources/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid source ID' });
      }
      
      const source = await storage.getMarketIntelligenceSource(id);
      if (!source) {
        return res.status(404).json({ error: 'Market intelligence source not found' });
      }
      
      res.json(source);
    } catch (error) {
      console.error('Error fetching market intelligence source:', error);
      res.status(500).json({ error: 'Failed to fetch market intelligence source' });
    }
  });

  app.post("/api/market-intelligence-sources", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const source = await storage.createMarketIntelligenceSource(req.body);
      res.status(201).json(source);
    } catch (error) {
      console.error('Error creating market intelligence source:', error);
      res.status(500).json({ error: 'Failed to create market intelligence source' });
    }
  });

  app.patch("/api/market-intelligence-sources/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid source ID' });
      }
      
      const source = await storage.updateMarketIntelligenceSource(id, req.body);
      res.json(source);
    } catch (error) {
      console.error('Error updating market intelligence source:', error);
      res.status(500).json({ error: 'Failed to update market intelligence source' });
    }
  });

  app.delete("/api/market-intelligence-sources/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid source ID' });
      }
      
      const deleted = await storage.deleteMarketIntelligenceSource(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Market intelligence source not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting market intelligence source:', error);
      res.status(500).json({ error: 'Failed to delete market intelligence source' });
    }
  });

  // Market Intelligence Data Endpoints
  const { marketIntelligence } = await import("./services/marketIntelligence.js");



  // Economic Indicators from Alpha Vantage
  app.get("/api/alpha-vantage/economic-indicators", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { alphaVantageService } = await import("./services/alphaVantageService.js");
      const economicData = await alphaVantageService.fetchEconomicIndicators();
      res.json(economicData);
    } catch (error) {
      console.error("Error fetching economic indicators:", error);
      res.status(500).json({ message: "Failed to fetch economic indicators" });
    }
  });

  // Stock Market Data from Alpha Vantage
  app.get("/api/alpha-vantage/stock-data", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const symbols = (req.query.symbols as string)?.split(',') || ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA'];
      const { alphaVantageService } = await import("./services/alphaVantageService.js");
      const stockData = await alphaVantageService.fetchStockData(symbols);
      res.json(stockData);
    } catch (error) {
      console.error("Error fetching stock data:", error);
      res.status(500).json({ message: "Failed to fetch stock data" });
    }
  });

  // Initialize new API sources
  app.post("/api/sources/initialize-apis", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { initializeNewApiSources } = await import("./services/initializeApiSources.js");
      const result = await initializeNewApiSources();
      res.json({ 
        message: "API sources initialized successfully", 
        ...result 
      });
    } catch (error) {
      console.error("Error initializing API sources:", error);
      res.status(500).json({ message: "Failed to initialize API sources" });
    }
  });

  // Cache statistics endpoint
  app.get("/api/cache/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const stats = cacheService.getCacheStats();
      res.json({
        success: true,
        stats: {
          ...stats,
          message: `Cache contains ${stats.processedUrls} processed article URLs and ${stats.totalEntries} total cache entries`
        }
      });
    } catch (error) {
      console.error("Failed to get cache stats:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to get cache statistics" 
      });
    }
  });

  // Get funding dashboard data
  app.get("/api/market/funding-dashboard", async (req, res) => {
    try {
      const timeframe = req.query.timeframe as 'week' | 'month' | 'quarter' || 'month';
      const data = await marketIntelligence.getFundingDashboard(timeframe);
      res.json(data);
    } catch (error) {
      console.error("Error fetching funding dashboard:", error);
      res.status(500).json({ error: "Failed to fetch funding dashboard data" });
    }
  });

  // Get company mentions data
  app.get("/api/market/company-mentions", async (req, res) => {
    try {
      const timeframe = req.query.timeframe as 'week' | 'month' || 'month';
      const data = await marketIntelligence.getCompanyMentionAnalytics(timeframe);
      res.json(data);
    } catch (error) {
      console.error("Error fetching company mentions:", error);
      res.status(500).json({ error: "Failed to fetch company mentions data" });
    }
  });

  // Get technology trends data
  app.get("/api/market/technology-trends", async (req, res) => {
    try {
      const data = await marketIntelligence.getTechnologyTrendAnalysis();
      res.json(data);
    } catch (error) {
      console.error("Error fetching technology trends:", error);
      res.status(500).json({ error: "Failed to fetch technology trends data" });
    }
  });





  // NewsData.io Integration Endpoints
  const { newsDataService } = await import("./services/newsDataService.js");

  // Collect news from NewsData.io
  app.post("/api/news/collect-newsdata", async (req, res) => {
    try {
      const results = await newsDataService.collectAllNews();
      res.json({ 
        message: "NewsData.io collection completed",
        ...results 
      });
    } catch (error) {
      console.error("Error collecting NewsData.io news:", error);
      res.status(500).json({ error: "Failed to collect news from NewsData.io" });
    }
  });

  // Fetch AI news specifically from NewsData.io
  app.get("/api/news/newsdata-ai", async (req, res) => {
    try {
      const language = req.query.language as string || 'en';
      const country = req.query.country as string;
      const size = parseInt(req.query.size as string) || 10;
      const articles = await newsDataService.fetchAINews(language, country, size);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching AI news from NewsData.io:", error);
      res.status(500).json({ error: "Failed to fetch AI news from NewsData.io" });
    }
  });

  // Fetch market news specifically from NewsData.io
  app.get("/api/news/newsdata-market", async (req, res) => {
    try {
      const language = req.query.language as string || 'en';
      const country = req.query.country as string;
      const size = parseInt(req.query.size as string) || 10;
      const articles = await newsDataService.fetchMarketNews(language, country, size);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching market news from NewsData.io:", error);
      res.status(500).json({ error: "Failed to fetch market news from NewsData.io" });
    }
  });

  // Weekly Reports Routes
  
  // Get all weekly reports
  app.get("/api/weekly-reports", async (req, res) => {
    try {
      const reports = await storage.getWeeklyReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching weekly reports:", error);
      res.status(500).json({ error: "Failed to fetch weekly reports" });
    }
  });

  // Get latest weekly report
  app.get("/api/weekly-reports/latest", async (req, res) => {
    try {
      const report = await storage.getLatestWeeklyReport();
      if (!report) {
        return res.status(404).json({ error: "No weekly reports found" });
      }
      res.json(report);
    } catch (error) {
      console.error("Error fetching latest weekly report:", error);
      res.status(500).json({ error: "Failed to fetch latest weekly report" });
    }
  });

  // Generate new weekly report
  app.post("/api/weekly-reports/generate", async (req, res) => {
    try {
      const { weekStart, weekEnd } = req.body;
      
      let startDate: Date, endDate: Date;
      
      if (weekStart && weekEnd) {
        startDate = new Date(weekStart);
        endDate = new Date(weekEnd);
      } else {
        // Use previous week by default
        const { weekStart: prevStart, weekEnd: prevEnd } = getPreviousWeekDateRange();
        startDate = prevStart;
        endDate = prevEnd;
      }

      // Check if report already exists for this week
      const existingReport = await storage.getWeeklyReportByDateRange(startDate, endDate);
      if (existingReport) {
        return res.json(existingReport);
      }

      // Get articles from the specified week
      const articles = await storage.getNewsArticles({
        dateRange: "week"
      });

      // Filter articles to the specific week range
      const weekArticles = articles.filter(article => {
        const publishedDate = new Date(article.publishedAt);
        return publishedDate >= startDate && publishedDate <= endDate;
      });

      if (weekArticles.length === 0) {
        return res.status(400).json({ error: "No articles found for the specified week" });
      }

      // Generate the weekly report
      const analysis = await generateWeeklyReport(weekArticles);
      
      const reportData = {
        weekStart: startDate,
        weekEnd: endDate,
        title: analysis.title,
        content: analysis.content,
        analysis: analysis.analysis,
        recommendations: analysis.recommendations,
        predictions: analysis.predictions,
        keyTrends: analysis.keyTrends,
        articlesAnalyzed: weekArticles.length,
      };

      const report = await storage.createWeeklyReport(reportData);
      res.json(report);
    } catch (error) {
      console.error("Error generating weekly report:", error);
      res.status(500).json({ error: "Failed to generate weekly report" });
    }
  });

  // Get specific weekly report
  app.get("/api/weekly-reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const report = await storage.getWeeklyReport(id);
      
      if (!report) {
        return res.status(404).json({ error: "Weekly report not found" });
      }
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching weekly report:", error);
      res.status(500).json({ error: "Failed to fetch weekly report" });
    }
  });

  // Seed data endpoint for testing
  app.post("/api/seed-data", async (req, res) => {
    try {
      await seedData();
      res.json({ message: "Sample data seeded successfully" });
    } catch (error) {
      console.error("Error seeding data:", error);
      res.status(500).json({ error: "Failed to seed data" });
    }
  });

  // Collect news from all RSS sources with verification
  app.post("/api/collect-news", async (req, res) => {
    try {
      console.log("Starting news collection from all RSS sources with verification...");
      const articles = await collectFromAllSources();
      
      if (articles.length === 0) {
        return res.json({ message: "No new articles found", articlesAdded: 0 });
      }

      console.log(`Collected ${articles.length} verified articles, saving to database...`);
      const savedArticles = await storage.createNewsArticles(articles);
      
      res.json({ 
        message: "News collection completed successfully with verification", 
        articlesAdded: savedArticles.length,
        sources: Array.from(new Set(articles.map(a => a.source)))
      });
    } catch (error) {
      console.error("Error collecting news:", error);
      res.status(500).json({ error: "Failed to collect news from sources" });
    }
  });

  // Verify existing news articles in database
  app.post("/api/verify-news", async (req, res) => {
    try {
      console.log("Starting verification of existing news articles...");
      const articles = await storage.getNewsArticles();
      
      let verifiedCount = 0;
      let rejectedCount = 0;
      const rejectedArticles = [];

      for (const article of articles) {
        const verification = await verifyNewsArticle({
          title: article.title,
          summary: article.summary,
          content: article.content || "",
          category: article.category as any,
          confidence: article.confidence,
          region: article.region,
          source: article.source,
          url: article.url,
          pros: article.pros,
          cons: article.cons,
          publishedAt: article.publishedAt,
          isBreaking: article.isBreaking,
          sourceUrl: article.sourceUrl
        });

        if (verification.isValid) {
          verifiedCount++;
        } else {
          rejectedCount++;
          rejectedArticles.push({
            id: article.id,
            title: article.title,
            issues: verification.issues
          });
        }
      }

      res.json({
        message: "News verification completed",
        totalArticles: articles.length,
        verified: verifiedCount,
        rejected: rejectedCount,
        rejectedArticles
      });
    } catch (error) {
      console.error("Error verifying news:", error);
      res.status(500).json({ error: "Failed to verify news articles" });
    }
  });

  // Analytics dashboard
  app.get("/api/analytics", async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Market Intelligence routes
  app.get("/api/market/funding", async (req, res) => {
    try {
      const timeframe = (req.query.timeframe as string) || 'month';
      const data = await marketIntelligence.getFundingDashboard(timeframe as any);
      res.json(data);
    } catch (error) {
      console.error("Error fetching funding data:", error);
      res.status(500).json({ error: "Failed to fetch funding data" });
    }
  });

  app.get("/api/market/companies", async (req, res) => {
    try {
      const timeframe = (req.query.timeframe as string) || 'month';
      const data = await marketIntelligence.getCompanyMentionAnalytics(timeframe as any);
      res.json(data);
    } catch (error) {
      console.error("Error fetching company data:", error);
      res.status(500).json({ error: "Failed to fetch company data" });
    }
  });

  app.get("/api/market/trends", async (req, res) => {
    try {
      const data = await marketIntelligence.getTechnologyTrendAnalysis();
      res.json(data);
    } catch (error) {
      console.error("Error fetching technology trends:", error);
      res.status(500).json({ error: "Failed to fetch technology trends" });
    }
  });

  // Content Discovery routes
  app.get("/api/search/semantic", async (req, res) => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const results = await contentDiscovery.semanticSearch(query, limit);
      res.json(results);
    } catch (error) {
      console.error("Error performing semantic search:", error);
      res.status(500).json({ error: "Failed to perform semantic search" });
    }
  });

  app.get("/api/discover/clusters", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const clusters = await contentDiscovery.getArticleClusters(limit);
      res.json(clusters);
    } catch (error) {
      console.error("Error fetching article clusters:", error);
      res.status(500).json({ error: "Failed to fetch article clusters" });
    }
  });

  app.get("/api/discover/trending", async (req, res) => {
    try {
      const timeframe = (req.query.timeframe as string) || 'week';
      const topics = await contentDiscovery.getTrendingTopics(timeframe as any);
      res.json(topics);
    } catch (error) {
      console.error("Error fetching trending topics:", error);
      res.status(500).json({ error: "Failed to fetch trending topics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
