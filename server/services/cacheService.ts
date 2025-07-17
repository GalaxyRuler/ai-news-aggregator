import { NewsArticle } from "@shared/schema";

interface NewsSummary {
  totalArticles: number;
  highConfidence: number;
  breakingNews: number;
  categoryBreakdown: Record<string, number>;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface SourceLastFetch {
  sourceId: number;
  sourceName: string;
  lastFetch: Date;
  articleCount: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly ARTICLE_URLS_TTL = 24 * 60 * 60 * 1000; // 24 hours for article URLs
  private readonly SOURCE_FETCH_TTL = 30 * 60 * 1000; // 30 minutes for source last fetch

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if cache has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // Invalidate keys matching pattern
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (typeof key === 'string' && key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  // Generate cache key for news queries
  generateNewsKey(filters: any): string {
    return `news:${JSON.stringify(filters)}`;
  }

  // Cache news articles with smart invalidation
  cacheNewsArticles(filters: any, articles: NewsArticle[]): void {
    const key = this.generateNewsKey(filters);
    this.set(key, articles, 2 * 60 * 1000); // 2 minute TTL for news
  }

  getCachedNewsArticles(filters: any): NewsArticle[] | null {
    const key = this.generateNewsKey(filters);
    return this.get<NewsArticle[]>(key);
  }

  // Cache summary with longer TTL
  cacheSummary(summary: NewsSummary): void {
    this.set('news:summary', summary, 10 * 60 * 1000); // 10 minute TTL
  }

  getCachedSummary(): NewsSummary | null {
    return this.get<NewsSummary>('news:summary');
  }

  // Cache processed article URLs to prevent re-fetching
  private processedUrls = new Set<string>();
  
  // Cache source last fetch times
  setSourceLastFetch(sourceId: number, sourceName: string, articleCount: number): void {
    const key = `source:lastfetch:${sourceId}`;
    const data: SourceLastFetch = {
      sourceId,
      sourceName,
      lastFetch: new Date(),
      articleCount
    };
    this.set(key, data, this.SOURCE_FETCH_TTL);
  }

  getSourceLastFetch(sourceId: number): SourceLastFetch | null {
    const key = `source:lastfetch:${sourceId}`;
    return this.get<SourceLastFetch>(key);
  }

  // Check if a source should be fetched based on last fetch time
  shouldFetchSource(sourceId: number, minIntervalMinutes: number = 15): boolean {
    const lastFetch = this.getSourceLastFetch(sourceId);
    if (!lastFetch) return true;
    
    const minutesSinceLastFetch = (Date.now() - new Date(lastFetch.lastFetch).getTime()) / (1000 * 60);
    return minutesSinceLastFetch >= minIntervalMinutes;
  }

  // Cache article URLs for duplicate detection
  cacheArticleUrls(urls: string[]): void {
    urls.forEach(url => this.processedUrls.add(url));
    
    // Store in persistent cache as well
    const key = 'articles:processed:urls';
    const existingUrls = this.get<string[]>(key) || [];
    const allUrls = Array.from(new Set([...existingUrls, ...urls]));
    this.set(key, allUrls, this.ARTICLE_URLS_TTL);
  }

  // Check if an article URL has been processed
  isArticleProcessed(url: string): boolean {
    if (this.processedUrls.has(url)) return true;
    
    const key = 'articles:processed:urls';
    const cachedUrls = this.get<string[]>(key) || [];
    return cachedUrls.includes(url);
  }

  // Get all processed URLs
  getProcessedUrls(): string[] {
    const key = 'articles:processed:urls';
    const cachedUrls = this.get<string[]>(key) || [];
    const processedArray = Array.from(this.processedUrls);
    return Array.from(new Set([...processedArray, ...cachedUrls]));
  }

  // Cache article analysis results to avoid re-analyzing
  cacheArticleAnalysis(url: string, analysis: any): void {
    const key = `article:analysis:${url}`;
    this.set(analysis, 24 * 60 * 60 * 1000); // 24 hour TTL
  }

  getCachedArticleAnalysis(url: string): any | null {
    const key = `article:analysis:${url}`;
    return this.get(key);
  }

  // Get cache statistics
  getCacheStats(): { 
    totalEntries: number; 
    processedUrls: number;
    cacheKeys: string[];
  } {
    return {
      totalEntries: this.cache.size,
      processedUrls: this.processedUrls.size,
      cacheKeys: Array.from(this.cache.keys())
    };
  }

  // Clear old cache entries
  cleanupExpiredEntries(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const cacheService = new CacheService();