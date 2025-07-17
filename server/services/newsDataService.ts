import { db } from "../db.js";
import { newsArticles, fundingEvents, companyMentions, technologyTrends } from "../../shared/schema.js";
import { analyzeNewsArticle } from "./openai.js";
import { translateTitleToEnglish } from "./translationService.js";
import type { InsertNewsArticle } from "../../shared/schema.js";

interface NewsDataApiResponse {
  status: string;
  totalResults: number;
  results: NewsDataArticle[];
  nextPage?: string;
}

interface NewsDataArticle {
  article_id: string;
  title: string;
  link: string;
  keywords?: string[];
  creator?: string[];
  video_url?: string;
  description: string;
  content?: string;
  pubDate: string;
  image_url?: string;
  source_id: string;
  source_priority: number;
  country?: string[];
  category?: string[];
  language: string;
  ai_tag?: string;
  sentiment?: string;
  sentiment_stats?: string;
  ai_region?: string;
  ai_org?: string;
}

export class NewsDataService {
  private apiKey: string;
  private baseUrl = 'https://newsdata.io/api/1/news';

  constructor() {
    this.apiKey = process.env.NEWSDATA_API_KEY || 'pub_a6460ba2ec95444db8bfb7e235a568e5';
  }

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
      console.error("Error fetching API key from database:", error);
      return null;
    }
  }

  // Fetch AI and technology news
  async fetchAINews(
    language: string = 'en',
    country?: string,
    size: number = 10
  ): Promise<NewsDataArticle[]> {
    // Try to get API key from database first, then fallback to environment
    const dbApiKey = await this.getApiKeyFromDatabase();
    const apiKey = dbApiKey || this.apiKey;
    
    if (!apiKey) {
      console.log("NewsData.io API key not configured, skipping AI news fetch");
      return [];
    }

    try {
      const params = new URLSearchParams({
        apikey: apiKey,
        q: 'artificial intelligence'
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      const data: NewsDataApiResponse = await response.json();

      if (data.status === 'success') {
        return data.results || [];
      } else {
        console.error("NewsData.io API error:", data);
        return [];
      }
    } catch (error) {
      console.error("Error fetching AI news from NewsData.io:", error);
      return [];
    }
  }

  // Fetch market intelligence and funding news
  async fetchMarketNews(
    language: string = 'en',
    country?: string,
    size: number = 10
  ): Promise<NewsDataArticle[]> {
    // Try to get API key from database first, then fallback to environment
    const dbApiKey = await this.getApiKeyFromDatabase();
    const apiKey = dbApiKey || this.apiKey;
    
    if (!apiKey) {
      console.log("NewsData.io API key not configured, skipping market news fetch");
      return [];
    }

    try {
      const params = new URLSearchParams({
        apikey: apiKey,
        q: 'startup funding'
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      const data: NewsDataApiResponse = await response.json();

      if (data.status === 'success') {
        return data.results || [];
      } else {
        console.error("NewsData.io API error:", data);
        return [];
      }
    } catch (error) {
      console.error("Error fetching market news from NewsData.io:", error);
      return [];
    }
  }

  // Process and store AI news articles
  async processAINews(articles: NewsDataArticle[]): Promise<InsertNewsArticle[]> {
    const processedArticles: InsertNewsArticle[] = [];

    for (const article of articles) {
      try {
        // Translate non-English titles to English
        const translationResult = await translateTitleToEnglish(article.title);
        const finalTitle = translationResult.translatedTitle;
        
        if (translationResult.wasTranslated) {
          console.log(`Translated NewsData.io title from ${translationResult.detectedLanguage}: "${article.title}" → "${finalTitle}"`);
        }

        // Analyze article with OpenAI
        const analysis = await analyzeNewsArticle(finalTitle, article.description || article.content || '');
        
        // Only process if it's AI-related with sufficient confidence
        if (analysis.isAIRelated && analysis.confidence >= 0.6) {
          const processedArticle: InsertNewsArticle = {
            title: finalTitle,
            content: article.content || article.description,
            summary: analysis.summary,
            url: article.link,
            source: article.source_id,
            sourceUrl: article.link,
            category: analysis.category,
            region: article.country?.[0] || 'global',
            confidence: Math.min(95, Math.round(analysis.confidence * 100)).toFixed(2),
            pros: analysis.pros,
            cons: analysis.cons,
            publishedAt: new Date(article.pubDate),
            isBreaking: false,

            impactScore: Math.min(10, analysis.impactScore).toString(),
            developmentImpact: analysis.developmentImpact,
            toolsImpact: analysis.toolsImpact,
            marketImpact: analysis.marketImpact,
            timeToImpact: analysis.timeToImpact,
            disruptionLevel: analysis.disruptionLevel
          };

          processedArticles.push(processedArticle);
        }
      } catch (error) {
        console.error(`Error processing NewsData.io article: ${article.title}`, error);
      }
    }

    return processedArticles;
  }

  // Extract market intelligence data
  async extractMarketIntelligence(articles: NewsDataArticle[]): Promise<void> {
    for (const article of articles) {
      try {
        const text = `${article.title} ${article.description || ''}`;
        
        // Extract funding information
        await this.extractFundingData(article, text);
        
        // Extract company mentions
        await this.extractCompanyMentions(article, text);
        
        // Extract technology trends
        await this.extractTechnologyTrends(article, text);
        
      } catch (error) {
        console.error(`Error extracting market intelligence from: ${article.title}`, error);
      }
    }
  }

  // Extract funding events from articles
  private async extractFundingData(article: NewsDataArticle, text: string): Promise<void> {
    const fundingKeywords = /(?:raised|funding|investment|series [abc]|seed|round)\s*\$?(\d+(?:\.\d+)?)\s*(million|billion|m|b)/gi;
    const matches = text.match(fundingKeywords);

    if (matches && matches.length > 0) {
      // Extract company name from title
      const companyMatch = article.title.match(/^([^:]+):/);
      const companyName = companyMatch ? companyMatch[1].trim() : 'Unknown Company';

      // Extract funding amount
      const amountMatch = text.match(/\$?(\d+(?:\.\d+)?)\s*(million|billion|m|b)/i);
      const amount = amountMatch ? `$${amountMatch[1]}${amountMatch[2] === 'billion' || amountMatch[2] === 'b' ? 'B' : 'M'}` : 'Undisclosed';

      // Extract round type
      const roundMatch = text.match(/series\s+([abc])|seed|pre-seed/i);
      const round = roundMatch ? (roundMatch[1] ? `Series ${roundMatch[1].toUpperCase()}` : 'Seed') : 'Strategic';

      await db.insert(fundingEvents).values({
        articleId: 0, // NewsData.io source
        companyName,
        fundingAmount: amount,
        fundingRound: round,
        investors: [],
        location: article.country?.[0] || 'Unknown',
        extractedAt: new Date(),
      }).onConflictDoNothing();
    }
  }

  // Extract company mentions
  private async extractCompanyMentions(article: NewsDataArticle, text: string): Promise<void> {
    const companies = ['OpenAI', 'Anthropic', 'Google', 'Microsoft', 'Meta', 'Apple', 'Amazon', 'Tesla', 'NVIDIA', 'IBM'];
    
    for (const company of companies) {
      if (text.toLowerCase().includes(company.toLowerCase())) {
        const mentionType = this.determineMentionType(text);
        const sentiment = this.calculateSentiment(text);

        await db.insert(companyMentions).values({
          articleId: 0, // NewsData.io source
          companyName: company,
          mentionType,
          sentiment: sentiment.toString(),
          context: article.description || article.title,
          extractedAt: new Date(),
        }).onConflictDoNothing();
      }
    }
  }

  // Extract technology trends
  private async extractTechnologyTrends(article: NewsDataArticle, text: string): Promise<void> {
    const technologies = ['GPT-4', 'Claude', 'Gemini', 'LLaMA', 'DALL-E', 'Midjourney', 'Stable Diffusion', 'ChatGPT'];
    
    for (const tech of technologies) {
      if (text.toLowerCase().includes(tech.toLowerCase())) {
        const category = this.categorizeTechnology(tech);
        const adoptionStage = this.determineAdoptionStage(text);
        const sentiment = this.calculateSentiment(text);

        await db.insert(technologyTrends).values({
          technologyName: tech,
          category,
          adoptionStage,
          mentionCount: 1,
          sentimentAvg: sentiment.toString(),
          lastMentioned: new Date(),
          trendDirection: 'stable',
          weeklyMentions: [1],
        }).onConflictDoNothing();
      }
    }
  }

  // Comprehensive news and market intelligence collection
  async collectAllNews(): Promise<{
    aiArticles: number;
    marketArticles: number;
    totalProcessed: number;
  }> {
    console.log("Starting NewsData.io comprehensive collection...");

    const [aiNews, marketNews] = await Promise.all([
      this.fetchAINews('en'),
      this.fetchMarketNews('en'),
    ]);

    // Process AI news for article creation
    const processedAIArticles = await this.processAINews(aiNews);
    
    // Store AI articles in database
    if (processedAIArticles.length > 0) {
      try {
        await db.insert(newsArticles).values(processedAIArticles as any).onConflictDoNothing();
      } catch (error) {
        console.error("Error storing NewsData.io AI articles:", error);
      }
    }

    // Extract market intelligence from market news
    await this.extractMarketIntelligence(marketNews);

    console.log(`NewsData.io collection completed: ${processedAIArticles.length} AI articles, ${marketNews.length} market articles processed`);

    return {
      aiArticles: processedAIArticles.length,
      marketArticles: marketNews.length,
      totalProcessed: processedAIArticles.length + marketNews.length,
    };
  }

  // Helper methods
  private determineMentionType(text: string): string {
    const textLower = text.toLowerCase();
    if (textLower.includes('partnership') || textLower.includes('collaboration')) return 'partnership';
    if (textLower.includes('funding') || textLower.includes('investment')) return 'funding';
    if (textLower.includes('product') || textLower.includes('launch') || textLower.includes('release')) return 'product-launch';
    if (textLower.includes('acquisition') || textLower.includes('acquired')) return 'acquisition';
    if (textLower.includes('hiring') || textLower.includes('employee')) return 'hiring';
    return 'general-mention';
  }

  private calculateSentiment(text: string): number {
    const textLower = text.toLowerCase();
    const positiveWords = ['breakthrough', 'innovative', 'successful', 'growth', 'leading', 'advanced', 'revolutionary'];
    const negativeWords = ['controversy', 'concern', 'criticism', 'problem', 'issue', 'challenge', 'decline'];
    
    let score = 0;
    positiveWords.forEach(word => {
      if (textLower.includes(word)) score += 0.2;
    });
    negativeWords.forEach(word => {
      if (textLower.includes(word)) score -= 0.2;
    });
    
    return Math.max(-1, Math.min(1, score));
  }

  private categorizeTechnology(tech: string): string {
    const techLower = tech.toLowerCase();
    if (techLower.includes('gpt') || techLower.includes('claude') || techLower.includes('gemini') || techLower.includes('llama')) return 'LLM';
    if (techLower.includes('dall-e') || techLower.includes('midjourney') || techLower.includes('stable diffusion')) return 'computer-vision';
    if (techLower.includes('robot') || techLower.includes('autonomous')) return 'robotics';
    if (techLower.includes('voice') || techLower.includes('speech')) return 'voice-ai';
    return 'AI-tools';
  }

  private determineAdoptionStage(text: string): string {
    const textLower = text.toLowerCase();
    if (textLower.includes('mainstream') || textLower.includes('widespread') || textLower.includes('adopted')) return 'mainstream';
    if (textLower.includes('emerging') || textLower.includes('growing') || textLower.includes('expanding')) return 'emerging';
    if (textLower.includes('experimental') || textLower.includes('prototype') || textLower.includes('research')) return 'experimental';
    return 'emerging';
  }
}

export const newsDataService = new NewsDataService();