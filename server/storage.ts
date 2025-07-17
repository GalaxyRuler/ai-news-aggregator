import { 
  newsArticles, 
  newsSources, 
  weeklyReports,
  marketIntelligenceSources,
  type NewsArticle, 
  type InsertNewsArticle, 
  type NewsFilter, 
  type NewsSource, 
  type InsertNewsSource, 
  type WeeklyReport, 
  type InsertWeeklyReport,
  type MarketIntelligenceSource,
  type InsertMarketIntelligenceSource
} from "@shared/schema";
import { db } from "./db.js";
import { eq, and, gte, lte, desc, asc, or, ilike } from "drizzle-orm";

export interface IStorage {
  // News articles
  getNewsArticles(filter?: Partial<NewsFilter>): Promise<NewsArticle[]>;
  getNewsArticle(id: number): Promise<NewsArticle | undefined>;
  createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle>;
  createNewsArticles(articles: InsertNewsArticle[]): Promise<NewsArticle[]>;
  updateNewsArticle(id: number, updates: Partial<InsertNewsArticle>): Promise<NewsArticle>;
  getNewsSummary(): Promise<{
    totalArticles: number;
    highConfidence: number;
    breakingNews: number;
    categoryBreakdown: Record<string, number>;
  }>;
  
  // News sources
  getNewsSources(): Promise<NewsSource[]>;
  getNewsSourcesByPurpose(purpose: 'dashboard' | 'market-intelligence' | 'both'): Promise<NewsSource[]>;
  getNewsSource(id: number): Promise<NewsSource | undefined>;
  createNewsSource(source: InsertNewsSource): Promise<NewsSource>;
  updateNewsSource(id: number, updates: Partial<InsertNewsSource>): Promise<NewsSource>;
  deleteNewsSource(id: number): Promise<boolean>;

  // Weekly reports
  getWeeklyReports(): Promise<WeeklyReport[]>;
  getWeeklyReport(id: number): Promise<WeeklyReport | undefined>;
  createWeeklyReport(report: InsertWeeklyReport): Promise<WeeklyReport>;
  getLatestWeeklyReport(): Promise<WeeklyReport | undefined>;
  getWeeklyReportByDateRange(weekStart: Date, weekEnd: Date): Promise<WeeklyReport | undefined>;

  // Market Intelligence Sources
  getMarketIntelligenceSources(): Promise<MarketIntelligenceSource[]>;
  getMarketIntelligenceSource(id: number): Promise<MarketIntelligenceSource | undefined>;
  createMarketIntelligenceSource(source: InsertMarketIntelligenceSource): Promise<MarketIntelligenceSource>;
  updateMarketIntelligenceSource(id: number, updates: Partial<InsertMarketIntelligenceSource>): Promise<MarketIntelligenceSource>;
  deleteMarketIntelligenceSource(id: number): Promise<boolean>;

  // Analytics
  getAnalytics(): Promise<{
    dailyTrends: Array<{
      date: string;
      totalArticles: number;
      highConfidence: number;
      avgConfidence: number;
      breakingNews: number;
    }>;
    categoryBreakdown: Array<{
      category: string;
      count: number;
      percentage: number;
      avgConfidence: number;
    }>;
    confidenceDistribution: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
    sourceAnalytics: Array<{
      source: string;
      articleCount: number;
      avgConfidence: number;
      regions: string[];
    }>;
    regionalDistribution: Array<{
      region: string;
      count: number;
      percentage: number;
    }>;
    weeklyComparison: {
      thisWeek: number;
      lastWeek: number;
      change: number;
      changePercentage: number;
    };
    totalStats: {
      totalArticles: number;
      averageConfidence: number;
      totalSources: number;
      breakingNewsCount: number;
    };
  }>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize with default news sources
    this.initializeDefaultSources();
  }

  private async initializeDefaultSources() {
    try {
      const existingSources = await db.select().from(newsSources).limit(1);
      if (existingSources.length === 0) {
        const defaultSources: InsertNewsSource[] = [
          // Academic & Research Sources
          { name: "MIT Technology Review", type: "rss", url: "https://www.technologyreview.com/feed/", apiKey: null, isActive: true, regions: ["global"], categories: ["research", "releases"], lastFetch: null },
          { name: "Nature Machine Intelligence", type: "rss", url: "https://www.nature.com/natmachintell.rss", apiKey: null, isActive: true, regions: ["global"], categories: ["research"], lastFetch: null },
          { name: "Stanford HAI", type: "rss", url: "https://hai.stanford.edu/news/rss.xml", apiKey: null, isActive: true, regions: ["global"], categories: ["research"], lastFetch: null },
          { name: "IEEE Spectrum AI", type: "rss", url: "https://spectrum.ieee.org/rss/topic/artificial-intelligence", apiKey: null, isActive: true, regions: ["global"], categories: ["research", "tools"], lastFetch: null },
          { name: "Google AI Blog", type: "rss", url: "https://ai.googleblog.com/feeds/posts/default", apiKey: null, isActive: true, regions: ["global"], categories: ["research", "releases"], lastFetch: null },
          { name: "OpenAI Blog", type: "rss", url: "https://openai.com/blog/rss.xml", apiKey: null, isActive: true, regions: ["global"], categories: ["research", "releases"], lastFetch: null },
          { name: "DeepMind Blog", type: "rss", url: "https://deepmind.com/blog/rss.xml", apiKey: null, isActive: true, regions: ["global"], categories: ["research"], lastFetch: null },
          { name: "Microsoft Research AI", type: "rss", url: "https://www.microsoft.com/en-us/research/feed/?post-type=msr-research-item&msr-content-type=msr-blog-post&msr-research-area=artificial-intelligence", apiKey: null, isActive: true, regions: ["global"], categories: ["research"], lastFetch: null },
          { name: "Meta AI Research", type: "rss", url: "https://ai.facebook.com/blog/rss/", apiKey: null, isActive: true, regions: ["global"], categories: ["research"], lastFetch: null },
          { name: "Anthropic Research", type: "rss", url: "https://www.anthropic.com/news/rss", apiKey: null, isActive: true, regions: ["global"], categories: ["research"], lastFetch: null },
          { name: "The Gradient", type: "rss", url: "https://thegradient.pub/rss/", apiKey: null, isActive: true, regions: ["global"], categories: ["research"], lastFetch: null },
          // Business & Industry Sources
          { name: "VentureBeat AI", type: "rss", url: "https://venturebeat.com/ai/feed/", apiKey: null, isActive: true, regions: ["global", "north-america"], categories: ["startups", "releases"], lastFetch: null },
          { name: "AI Business News", type: "rss", url: "https://aibusiness.com/feed", apiKey: null, isActive: true, regions: ["global"], categories: ["startups", "use-cases"], lastFetch: null },
          { name: "McKinsey AI Insights", type: "rss", url: "https://www.mckinsey.com/capabilities/quantumblack/our-insights/rss", apiKey: null, isActive: true, regions: ["global"], categories: ["use-cases"], lastFetch: null },
          { name: "Wired AI", type: "rss", url: "https://www.wired.com/feed/tag/ai/latest/rss", apiKey: null, isActive: true, regions: ["global"], categories: ["releases", "use-cases"], lastFetch: null },
          { name: "TechCrunch AI", type: "rss", url: "https://techcrunch.com/category/artificial-intelligence/feed/", apiKey: null, isActive: true, regions: ["global"], categories: ["startups", "releases"], lastFetch: null },
          // Development & Tools Sources
          { name: "Towards Data Science", type: "rss", url: "https://towardsdatascience.com/feed", apiKey: null, isActive: true, regions: ["global"], categories: ["tools", "use-cases"], lastFetch: null },
          { name: "Hugging Face Blog", type: "rss", url: "https://huggingface.co/blog/feed.xml", apiKey: null, isActive: true, regions: ["global"], categories: ["tools", "releases"], lastFetch: null },
          { name: "Papers With Code", type: "rss", url: "https://paperswithcode.com/latest/rss", apiKey: null, isActive: true, regions: ["global"], categories: ["research", "tools"], lastFetch: null },
          { name: "NVIDIA AI News", type: "rss", url: "https://blogs.nvidia.com/feed/", apiKey: null, isActive: true, regions: ["global"], categories: ["tools", "releases"], lastFetch: null },
          // Policy & Ethics Sources
          { name: "Brookings AI Policy", type: "rss", url: "https://www.brookings.edu/topic/artificial-intelligence/feed/", apiKey: null, isActive: true, regions: ["global", "north-america"], categories: ["research"], lastFetch: null },
          { name: "AI Ethics Lab", type: "rss", url: "https://www.aiethicslab.com/feed", apiKey: null, isActive: true, regions: ["global"], categories: ["research"], lastFetch: null },
          { name: "Partnership on AI", type: "rss", url: "https://www.partnershiponai.org/feed/", apiKey: null, isActive: true, regions: ["global"], categories: ["research"], lastFetch: null },
          { name: "AI Now Institute", type: "rss", url: "https://ainowinstitute.org/feed.xml", apiKey: null, isActive: true, regions: ["global"], categories: ["research"], lastFetch: null },
          // Additional Sources
          { name: "Ars Technica AI", type: "rss", url: "https://feeds.arstechnica.com/arstechnica/technology-lab", apiKey: null, isActive: true, regions: ["global"], categories: ["releases", "tools"], lastFetch: null },
          { name: "The Information AI", type: "rss", url: "https://www.theinformation.com/articles/artificial-intelligence?rss=1", apiKey: null, isActive: true, regions: ["global"], categories: ["startups", "releases"], lastFetch: null },
          // New AI Newsletter & News Sources (avoiding duplicates)
          { name: "AI Magazine", type: "rss", url: "https://aimagazine.com/rss.xml", apiKey: null, isActive: true, regions: ["global"], categories: ["startups", "releases"], lastFetch: null },
          { name: "The Rundown AI", type: "rss", url: "https://www.therundown.ai/rss", apiKey: null, isActive: true, regions: ["global"], categories: ["releases", "use-cases"], lastFetch: null },
          { name: "Ben's Bites", type: "rss", url: "https://bensbites.co/rss", apiKey: null, isActive: true, regions: ["global"], categories: ["startups", "tools"], lastFetch: null },
          { name: "TLDR AI", type: "rss", url: "https://tldr.tech/ai/rss", apiKey: null, isActive: true, regions: ["global"], categories: ["releases", "tools"], lastFetch: null },
          { name: "KDnuggets", type: "rss", url: "https://www.kdnuggets.com/feed", apiKey: null, isActive: true, regions: ["global"], categories: ["tools", "use-cases"], lastFetch: null },
          { name: "Analytics Vidhya", type: "rss", url: "https://www.analyticsvidhya.com/feed/", apiKey: null, isActive: true, regions: ["global"], categories: ["tools", "use-cases"], lastFetch: null },
          { name: "Poynter Institute", type: "rss", url: "https://www.poynter.org/feed/", apiKey: null, isActive: true, regions: ["global"], categories: ["research"], lastFetch: null },
          { name: "TowardsAI", type: "rss", url: "https://towardsai.net/feed", apiKey: null, isActive: true, regions: ["global"], categories: ["tools", "research"], lastFetch: null },
          { name: "Machine Learning Mastery", type: "rss", url: "https://machinelearningmastery.com/feed/", apiKey: null, isActive: true, regions: ["global"], categories: ["tools", "use-cases"], lastFetch: null },
          // International AI News Sources
          { name: "TechNode", type: "rss", url: "https://technode.com/feed/", apiKey: null, isActive: true, regions: ["asia"], categories: ["startups", "releases"], lastFetch: null },
          { name: "CGTN Sci-Tech", type: "rss", url: "https://www.cgtn.com/rss/sci-tech.xml", apiKey: null, isActive: true, regions: ["asia"], categories: ["releases", "research"], lastFetch: null },
          { name: "Nikkei Asia", type: "rss", url: "https://asia.nikkei.com/rss/feed", apiKey: null, isActive: true, regions: ["asia"], categories: ["startups", "releases"], lastFetch: null },
          { name: "AI Times", type: "rss", url: "https://www.aitimes.com/rss", apiKey: null, isActive: true, regions: ["global"], categories: ["releases", "use-cases"], lastFetch: null },
          { name: "AI Times Korea", type: "rss", url: "https://www.aitimes.kr/rss", apiKey: null, isActive: true, regions: ["asia"], categories: ["releases", "startups"], lastFetch: null },
          { name: "TechinAsia", type: "rss", url: "https://www.techinasia.com/feed", apiKey: null, isActive: true, regions: ["asia"], categories: ["startups", "releases"], lastFetch: null },
          // Middle East & Africa Sources
          { name: "Tahawul Tech", type: "rss", url: "https://www.tahawultech.com/feed/", apiKey: null, isActive: true, regions: ["middle-east"], categories: ["releases", "startups"], lastFetch: null },
          { name: "Wamda", type: "rss", url: "https://www.wamda.com/feed/", apiKey: null, isActive: true, regions: ["middle-east"], categories: ["startups"], lastFetch: null },
          { name: "MAGNiTT", type: "rss", url: "https://magnitt.com/feed/", apiKey: null, isActive: true, regions: ["middle-east"], categories: ["startups"], lastFetch: null },
          { name: "Khaleej Times", type: "rss", url: "https://www.khaleejtimes.com/rss.xml", apiKey: null, isActive: true, regions: ["middle-east"], categories: ["releases"], lastFetch: null },
          { name: "Arab News", type: "rss", url: "https://www.arabnews.com/rss.xml", apiKey: null, isActive: true, regions: ["middle-east"], categories: ["releases"], lastFetch: null },
          { name: "The National News", type: "rss", url: "https://www.thenationalnews.com/rss.xml", apiKey: null, isActive: true, regions: ["middle-east"], categories: ["releases"], lastFetch: null },
          { name: "Zawya", type: "rss", url: "https://www.zawya.com/rss/", apiKey: null, isActive: true, regions: ["middle-east"], categories: ["startups", "releases"], lastFetch: null },
          { name: "Economy Middle East", type: "rss", url: "https://economymiddleeast.com/feed/", apiKey: null, isActive: true, regions: ["middle-east"], categories: ["startups", "use-cases"], lastFetch: null },
          { name: "Daily News Egypt", type: "rss", url: "https://www.dailynewsegypt.com/feed/", apiKey: null, isActive: true, regions: ["africa"], categories: ["releases"], lastFetch: null },
          // Additional Academic Sources
          { name: "Berkeley AI Research", type: "rss", url: "https://bair.berkeley.edu/blog/feed.xml", apiKey: null, isActive: true, regions: ["global"], categories: ["research"], lastFetch: null },
          { name: "Yale News", type: "rss", url: "https://news.yale.edu/rss.xml", apiKey: null, isActive: true, regions: ["global"], categories: ["research"], lastFetch: null },
          { name: "Harvard Gazette", type: "rss", url: "https://news.harvard.edu/gazette/feed/", apiKey: null, isActive: true, regions: ["global"], categories: ["research"], lastFetch: null },
          { name: "Gigazine", type: "rss", url: "https://gigazine.net/news/rss_2.0/", apiKey: null, isActive: true, regions: ["asia"], categories: ["releases", "tools"], lastFetch: null }
        ];

        for (const source of defaultSources) {
          try {
            await db.insert(newsSources).values(source as any).onConflictDoNothing();
          } catch (error) {
            console.error(`Error inserting source ${source.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Error initializing default sources:", error);
    }
  }

  async getNewsArticles(filter?: Partial<NewsFilter>): Promise<NewsArticle[]> {
    let query = db.select().from(newsArticles);
    const conditions = [];

    if (filter) {
      if (filter.category && filter.category !== "all") {
        conditions.push(eq(newsArticles.category, filter.category));
      }

      if (filter.dateRange) {
        const now = new Date();
        let cutoffDate: Date;
        
        switch (filter.dateRange) {
          case "24h":
            cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case "48h":
            cutoffDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
            break;
          case "week":
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          default:
            cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
        
        conditions.push(gte(newsArticles.publishedAt, cutoffDate));
      }

      if (filter.search) {
        const searchTerm = `%${filter.search}%`;
        conditions.push(
          or(
            ilike(newsArticles.title, searchTerm),
            ilike(newsArticles.summary, searchTerm),
            ilike(newsArticles.content, searchTerm)
          )
        );
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const articles = await query.orderBy(desc(newsArticles.publishedAt)) as NewsArticle[];
    
    let filteredArticles = articles;
    
    if (filter?.confidence) {
      filteredArticles = filteredArticles.filter(article => 
        parseFloat(article.confidence) >= filter.confidence!
      );
    }
    
    if (filter?.regions && filter.regions.length > 0) {
      filteredArticles = filteredArticles.filter(article => 
        filter.regions!.some(region => 
          article.region.toLowerCase() === region.toLowerCase()
        )
      );
    }

    return filteredArticles;
  }

  async getNewsArticle(id: number): Promise<NewsArticle | undefined> {
    const [article] = await db.select().from(newsArticles).where(eq(newsArticles.id, id));
    return article || undefined;
  }

  async createNewsArticle(insertArticle: InsertNewsArticle): Promise<NewsArticle> {
    const [article] = await db
      .insert(newsArticles)
      .values(insertArticle as any)
      .returning();
    return article;
  }

  async createNewsArticles(insertArticles: InsertNewsArticle[]): Promise<NewsArticle[]> {
    if (insertArticles.length === 0) return [];
    
    // Pre-filter against existing articles in database
    const filteredArticles = await this.filterExistingArticles(insertArticles);
    
    if (filteredArticles.length === 0) {
      console.log("All articles already exist in database, skipping insertion");
      return [];
    }
    
    console.log(`Inserting ${filteredArticles.length} new articles (${insertArticles.length - filteredArticles.length} duplicates filtered)`);
    
    try {
      const articles = await db
        .insert(newsArticles)
        .values(filteredArticles as any)
        .returning();
      return articles;
    } catch (error) {
      console.error("Database insertion error:", error);
      // Fallback: insert one by one if batch fails
      const insertedArticles = [];
      for (const article of filteredArticles) {
        try {
          const [inserted] = await db
            .insert(newsArticles)
            .values(article as any)
            .returning();
          insertedArticles.push(inserted);
        } catch (err) {
          console.error("Failed to insert article:", article.title, err);
        }
      }
      return insertedArticles;
    }
  }

  async updateNewsArticle(id: number, updates: Partial<InsertNewsArticle>): Promise<NewsArticle> {
    const [article] = await db
      .update(newsArticles)
      .set(updates as any)
      .where(eq(newsArticles.id, id))
      .returning();
    return article;
  }

  private async filterExistingArticles(newArticles: InsertNewsArticle[]): Promise<InsertNewsArticle[]> {
    const existingArticles = await db.select({
      id: newsArticles.id,
      title: newsArticles.title,
      sourceUrl: newsArticles.sourceUrl
    }).from(newsArticles);
    
    const existingUrls = new Set<string>();
    const existingTitles = new Set<string>();
    
    // Build sets of existing URLs and normalized titles
    existingArticles.forEach(article => {
      if (article.sourceUrl) {
        existingUrls.add(article.sourceUrl);
      }
      
      const normalizedTitle = article.title.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const titleWords = normalizedTitle.split(' ').filter(word => word.length > 2);
      const titleKey = titleWords.slice(0, 8).join(' ');
      existingTitles.add(titleKey);
    });
    
    // Filter out duplicates
    return newArticles.filter(article => {
      // Check URL duplicates
      const hasUrlDuplicate = article.sourceUrl && existingUrls.has(article.sourceUrl);
      if (hasUrlDuplicate) return false;
      
      // Check title similarity
      const normalizedTitle = article.title.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const titleWords = normalizedTitle.split(' ').filter(word => word.length > 2);
      const titleKey = titleWords.slice(0, 8).join(' ');
      
      return !existingTitles.has(titleKey);
    });
  }

  async getNewsSummary(): Promise<{
    totalArticles: number;
    highConfidence: number;
    breakingNews: number;
    categoryBreakdown: Record<string, number>;
  }> {
    const articles = await db.select().from(newsArticles);
    
    const categoryBreakdown = articles.reduce((acc, article) => {
      acc[article.category] = (acc[article.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalArticles: articles.length,
      highConfidence: articles.filter(a => parseFloat(a.confidence) >= 0.8).length,
      breakingNews: articles.filter(a => a.isBreaking).length,
      categoryBreakdown,
    };
  }

  async getNewsSources(): Promise<NewsSource[]> {
    return await db.select().from(newsSources).orderBy(asc(newsSources.name));
  }

  async getNewsSourcesByPurpose(purpose: 'dashboard' | 'market-intelligence' | 'both'): Promise<NewsSource[]> {
    if (purpose === 'both') {
      // Return all active sources
      return await db.select()
        .from(newsSources)
        .where(eq(newsSources.isActive, true))
        .orderBy(asc(newsSources.name));
    } else {
      // Return sources configured for the specific purpose or 'both'
      return await db.select()
        .from(newsSources)
        .where(
          and(
            eq(newsSources.isActive, true),
            or(
              eq(newsSources.purpose, purpose),
              eq(newsSources.purpose, 'both')
            )
          )
        )
        .orderBy(asc(newsSources.name));
    }
  }

  async getNewsSource(id: number): Promise<NewsSource | undefined> {
    const [source] = await db.select().from(newsSources).where(eq(newsSources.id, id));
    return source || undefined;
  }

  async createNewsSource(insertSource: InsertNewsSource): Promise<NewsSource> {
    const [source] = await db
      .insert(newsSources)
      .values(insertSource as any)
      .returning();
    return source;
  }

  async updateNewsSource(id: number, updates: Partial<InsertNewsSource>): Promise<NewsSource> {
    const [source] = await db
      .update(newsSources)
      .set(updates as any)
      .where(eq(newsSources.id, id))
      .returning();
    return source;
  }

  async deleteNewsSource(id: number): Promise<boolean> {
    const result = await db.delete(newsSources).where(eq(newsSources.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getWeeklyReports(): Promise<WeeklyReport[]> {
    return await db.select().from(weeklyReports).orderBy(desc(weeklyReports.createdAt));
  }

  async getWeeklyReport(id: number): Promise<WeeklyReport | undefined> {
    const [report] = await db.select().from(weeklyReports).where(eq(weeklyReports.id, id));
    return report || undefined;
  }

  async createWeeklyReport(insertReport: InsertWeeklyReport): Promise<WeeklyReport> {
    const [report] = await db
      .insert(weeklyReports)
      .values(insertReport)
      .returning();
    return report;
  }

  async getLatestWeeklyReport(): Promise<WeeklyReport | undefined> {
    const [report] = await db
      .select()
      .from(weeklyReports)
      .orderBy(desc(weeklyReports.createdAt))
      .limit(1);
    return report || undefined;
  }

  async getWeeklyReportByDateRange(weekStart: Date, weekEnd: Date): Promise<WeeklyReport | undefined> {
    const reports = await db.select().from(weeklyReports);
    const report = reports.find(r => 
      r.weekStart >= weekStart && r.weekEnd <= weekEnd
    );
    return report || undefined;
  }

  async getAnalytics() {
    // Get all articles
    const allArticles = await this.getNewsArticles();
    const totalArticles = allArticles.length;

    if (totalArticles === 0) {
      return {
        dailyTrends: [],
        categoryBreakdown: [],
        confidenceDistribution: [],
        sourceAnalytics: [],
        regionalDistribution: [],
        weeklyComparison: { thisWeek: 0, lastWeek: 0, change: 0, changePercentage: 0 },
        totalStats: { totalArticles: 0, averageConfidence: 0, totalSources: 0, breakingNewsCount: 0 }
      };
    }

    // Calculate daily trends for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyTrends = last7Days.map(date => {
      const dayArticles = allArticles.filter(article => 
        article.publishedAt.toISOString().split('T')[0] === date
      );
      
      const highConfidenceArticles = dayArticles.filter(article => 
        parseFloat(article.confidence) >= 80
      );
      
      const avgConfidence = dayArticles.length > 0 
        ? dayArticles.reduce((sum, article) => sum + parseFloat(article.confidence), 0) / dayArticles.length
        : 0;

      const breakingNews = dayArticles.filter(article => article.isBreaking).length;

      return {
        date,
        totalArticles: dayArticles.length,
        highConfidence: highConfidenceArticles.length,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
        breakingNews
      };
    });

    // Category breakdown
    const categoryStats = new Map();
    allArticles.forEach(article => {
      const category = article.category;
      if (!categoryStats.has(category)) {
        categoryStats.set(category, { count: 0, totalConfidence: 0 });
      }
      const stats = categoryStats.get(category);
      stats.count++;
      stats.totalConfidence += parseFloat(article.confidence);
    });

    const categoryBreakdown = Array.from(categoryStats.entries()).map(([category, stats]) => ({
      category,
      count: stats.count,
      percentage: (stats.count / totalArticles) * 100,
      avgConfidence: stats.totalConfidence / stats.count
    }));

    // Confidence distribution
    const confidenceRanges = [
      { range: "0-20%", min: 0, max: 20 },
      { range: "21-40%", min: 21, max: 40 },
      { range: "41-60%", min: 41, max: 60 },
      { range: "61-80%", min: 61, max: 80 },
      { range: "81-100%", min: 81, max: 100 }
    ];

    const confidenceDistribution = confidenceRanges.map(range => {
      const count = allArticles.filter(article => {
        const confidence = parseFloat(article.confidence);
        return confidence >= range.min && confidence <= range.max;
      }).length;

      return {
        range: range.range,
        count,
        percentage: (count / totalArticles) * 100
      };
    });

    // Source analytics
    const sourceStats = new Map();
    allArticles.forEach(article => {
      const source = article.source;
      if (!sourceStats.has(source)) {
        sourceStats.set(source, { 
          articleCount: 0, 
          totalConfidence: 0, 
          regions: new Set() 
        });
      }
      const stats = sourceStats.get(source);
      stats.articleCount++;
      stats.totalConfidence += parseFloat(article.confidence);
      if (article.region) {
        stats.regions.add(article.region);
      }
    });

    const sourceAnalytics = Array.from(sourceStats.entries()).map(([source, stats]: [string, any]) => ({
      source: source as string,
      articleCount: stats.articleCount as number,
      avgConfidence: stats.totalConfidence / stats.articleCount,
      regions: Array.from(stats.regions) as string[]
    })).sort((a, b) => b.articleCount - a.articleCount);

    // Regional distribution
    const regionStats = new Map();
    allArticles.forEach(article => {
      if (article.region) {
        regionStats.set(article.region, (regionStats.get(article.region) || 0) + 1);
      }
    });

    const totalRegionalArticles = Array.from(regionStats.values()).reduce((sum, count) => sum + count, 0);
    const regionalDistribution = Array.from(regionStats.entries()).map(([region, count]) => ({
      region,
      count,
      percentage: (count / totalRegionalArticles) * 100
    }));

    // Weekly comparison
    const now = new Date();
    const thisWeekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    const thisWeekArticles = allArticles.filter(article => 
      article.publishedAt >= thisWeekStart
    ).length;

    const lastWeekArticles = allArticles.filter(article => 
      article.publishedAt >= lastWeekStart && article.publishedAt <= lastWeekEnd
    ).length;

    const weeklyChange = thisWeekArticles - lastWeekArticles;
    const weeklyChangePercentage = lastWeekArticles > 0 
      ? (weeklyChange / lastWeekArticles) * 100 
      : 0;

    // Total stats
    const averageConfidence = allArticles.reduce((sum, article) => 
      sum + parseFloat(article.confidence), 0) / totalArticles;
    
    const uniqueSources = new Set();
    allArticles.forEach(article => {
      uniqueSources.add(article.source);
    });

    const breakingNewsCount = allArticles.filter(article => article.isBreaking).length;

    return {
      dailyTrends,
      categoryBreakdown,
      confidenceDistribution,
      sourceAnalytics,
      regionalDistribution,
      weeklyComparison: {
        thisWeek: thisWeekArticles,
        lastWeek: lastWeekArticles,
        change: weeklyChange,
        changePercentage: Math.round(weeklyChangePercentage * 10) / 10
      },
      totalStats: {
        totalArticles,
        averageConfidence: Math.round(averageConfidence * 10) / 10,
        totalSources: uniqueSources.size,
        breakingNewsCount
      }
    };
  }

  // Market Intelligence Sources CRUD operations
  async getMarketIntelligenceSources(): Promise<MarketIntelligenceSource[]> {
    return await db.select().from(marketIntelligenceSources).orderBy(desc(marketIntelligenceSources.createdAt));
  }

  async getMarketIntelligenceSource(id: number): Promise<MarketIntelligenceSource | undefined> {
    const [source] = await db.select().from(marketIntelligenceSources).where(eq(marketIntelligenceSources.id, id));
    return source || undefined;
  }

  async createMarketIntelligenceSource(insertSource: InsertMarketIntelligenceSource): Promise<MarketIntelligenceSource> {
    const [source] = await db
      .insert(marketIntelligenceSources)
      .values(insertSource)
      .returning();
    return source;
  }

  async updateMarketIntelligenceSource(id: number, updates: Partial<InsertMarketIntelligenceSource>): Promise<MarketIntelligenceSource> {
    const [source] = await db
      .update(marketIntelligenceSources)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(marketIntelligenceSources.id, id))
      .returning();
    
    if (!source) {
      throw new Error(`Market intelligence source with id ${id} not found`);
    }
    
    return source;
  }

  async deleteMarketIntelligenceSource(id: number): Promise<boolean> {
    const result = await db
      .delete(marketIntelligenceSources)
      .where(eq(marketIntelligenceSources.id, id));
    
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();