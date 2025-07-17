import { NewsArticle } from "@shared/schema";

// Optimize news article payload by removing unnecessary fields for list views
export function optimizeNewsForList(articles: NewsArticle[]): any[] {
  return articles.map(article => ({
    id: article.id,
    title: article.title,
    summary: article.summary,
    category: article.category,
    confidence: article.confidence,
    publishedAt: article.publishedAt,
    isBreaking: article.isBreaking,
    impactScore: article.impactScore,
    disruptionLevel: article.disruptionLevel,
    // Exclude heavy fields like content, pros, cons for list view
  }));
}

// Batch process articles to reduce database queries
export async function batchProcessArticles<T>(
  articles: any[],
  batchSize: number,
  processor: (batch: any[]) => Promise<T[]>
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }
  
  return results;
}

// Debounce function for search and filtering
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Lazy load images and heavy content
export function prepareLazyLoadData(article: NewsArticle) {
  return {
    ...article,
    content: undefined, // Load on demand
    _contentUrl: `/api/news/${article.id}/content` // Endpoint for lazy loading
  };
}

// Connection pooling configuration
export const dbPoolConfig = {
  max: 20, // Maximum pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Rate limiting configuration
export const rateLimits = {
  newsRefresh: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // Max 5 refresh requests per window
  },
  apiRequests: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100 // Max 100 API requests per minute
  }
};