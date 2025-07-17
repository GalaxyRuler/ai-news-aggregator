import { db } from "../db.js";
import { translateTitleToEnglish } from "./translationService.js";
import type { InsertNewsArticle } from "../../shared/schema.js";

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

interface NewsApiArticle {
  source: {
    id: string | null;
    name: string;
  };
  author?: string;
  title: string;
  description?: string;
  url: string;
  urlToImage?: string;
  publishedAt: string;
  content?: string;
}

export class NewsApiService {
  private baseUrl = 'https://newsapi.org/v2/everything';

  // Get API key from database source
  async getApiKeyFromDatabase(): Promise<string | null> {
    try {
      const { newsSources } = await import("../../shared/schema.js");
      const { eq } = await import("drizzle-orm");
      
      const [source] = await db.select()
        .from(newsSources)
        .where(eq(newsSources.name, 'NEWS_DATA_API_ORG'))
        .limit(1);
      
      return source?.apiKey || null;
    } catch (error) {
      console.error("Error fetching NewsAPI key from database:", error);
      return null;
    }
  }

  // Fetch AI and technology news from NewsAPI
  async fetchAINews(): Promise<NewsApiArticle[]> {
    // Try environment variable first, then database
    const apiKey = process.env.NEWS_API_KEY || await this.getApiKeyFromDatabase();
    
    if (!apiKey) {
      console.log("NewsAPI key not configured, skipping AI news fetch");
      return [];
    }

    try {
      const params = new URLSearchParams({
        apiKey: apiKey,
        q: 'artificial intelligence OR machine learning OR AI',
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: '20'
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      const data: NewsApiResponse = await response.json();

      if (data.status === 'ok') {
        return data.articles || [];
      } else {
        console.error("NewsAPI error:", data);
        return [];
      }
    } catch (error) {
      console.error("Error fetching AI news from NewsAPI:", error);
      return [];
    }
  }

  // Fetch market intelligence and funding news from NewsAPI
  async fetchMarketNews(): Promise<NewsApiArticle[]> {
    const apiKey = await this.getApiKeyFromDatabase();
    
    if (!apiKey) {
      console.log("NewsAPI key not configured, skipping market news fetch");
      return [];
    }

    try {
      const params = new URLSearchParams({
        apiKey: apiKey,
        q: 'startup funding OR venture capital OR AI investment',
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: '20'
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      const data: NewsApiResponse = await response.json();

      if (data.status === 'ok') {
        return data.articles || [];
      } else {
        console.error("NewsAPI market news error:", data);
        return [];
      }
    } catch (error) {
      console.error("Error fetching market news from NewsAPI:", error);
      return [];
    }
  }

  // Process NewsAPI articles into our format
  async processNewsApiArticles(articles: NewsApiArticle[]): Promise<InsertNewsArticle[]> {
    const processedArticles: InsertNewsArticle[] = [];

    for (const article of articles) {
      try {
        // Translate title if needed
        const translatedTitle = await translateTitleToEnglish(article.title);

        const processedArticle: InsertNewsArticle = {
          title: translatedTitle.translatedTitle,
          summary: article.description || article.title,
          content: article.content || article.description || '',
          url: article.url,
          source: article.source.name,
          sourceUrl: article.url,
          category: this.categorizeArticle(article.title, article.description || ''),
          region: 'global',
          confidence: "75", // Default confidence for NewsAPI articles
          publishedAt: new Date(article.publishedAt),
          pros: ['NewsAPI source', 'Verified news'],
          cons: ['Limited analysis'],
          impactScore: "5.0", // Default impact score
          developmentImpact: 'Moderate impact on AI development',
          toolsImpact: ['General AI tools'],
          marketImpact: 'Standard market relevance',
          timeToImpact: '1-2 years',
          disruptionLevel: 'moderate'
        };

        processedArticles.push(processedArticle);
      } catch (error) {
        console.error("Error processing NewsAPI article:", error);
      }
    }

    return processedArticles;
  }

  // Categorize article based on title and description
  private categorizeArticle(title: string, description: string): string {
    const content = (title + ' ' + description).toLowerCase();
    
    if (content.includes('funding') || content.includes('investment') || content.includes('venture')) {
      return 'startups';
    } else if (content.includes('research') || content.includes('study') || content.includes('paper')) {
      return 'research';
    } else if (content.includes('release') || content.includes('launch') || content.includes('update')) {
      return 'releases';
    } else if (content.includes('tool') || content.includes('platform') || content.includes('software')) {
      return 'tools';
    } else {
      return 'use-cases';
    }
  }

  // Collect all news from NewsAPI
  async collectAllNews(): Promise<{
    aiArticles: InsertNewsArticle[];
    marketArticles: InsertNewsArticle[];
  }> {
    console.log("Collecting from NewsAPI...");

    const [aiArticles, marketArticles] = await Promise.all([
      this.fetchAINews(),
      this.fetchMarketNews()
    ]);

    const processedAiArticles = await this.processNewsApiArticles(aiArticles);
    const processedMarketArticles = await this.processNewsApiArticles(marketArticles);

    console.log(`NewsAPI: ${processedAiArticles.length + processedMarketArticles.length} articles collected (${processedAiArticles.length} AI, ${processedMarketArticles.length} market)`);

    return {
      aiArticles: processedAiArticles,
      marketArticles: processedMarketArticles
    };
  }
}

export const newsApiService = new NewsApiService();