import { db } from "../db";
import { newsArticles, articleClusters, searchQueries } from "@shared/schema";
import { eq, desc, sql, gte, and, ilike, inArray } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SemanticSearchResult {
  article: any;
  relevanceScore: number;
  explanation: string;
}

export interface ArticleClusterResult {
  id: number;
  title: string;
  description: string;
  articles: any[];
  keywords: string[];
  clusterType: string;
}

export class ContentDiscoveryService {
  // Semantic search using AI to understand meaning
  async semanticSearch(query: string, limit: number = 10): Promise<SemanticSearchResult[]> {
    // Log the search query
    await db.insert(searchQueries).values({
      query,
      searchType: "semantic",
      resultsCount: 0, // Will update after getting results
    });

    // Get all articles from last 30 days for better performance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const articles = await db
      .select()
      .from(newsArticles)
      .where(gte(newsArticles.publishedAt, thirtyDaysAgo))
      .orderBy(desc(newsArticles.publishedAt))
      .limit(100); // Process recent articles for semantic matching

    if (articles.length === 0) {
      return [];
    }

    // Use AI to rank articles by semantic relevance
    const articlesText = articles.map(article => 
      `ID: ${article.id}\nTitle: ${article.title}\nSummary: ${article.summary}\nCategory: ${article.category}`
    ).join('\n\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a semantic search engine for AI/tech news. Analyze the user's query and rank articles by relevance.
          
          For each relevant article, provide:
          - relevanceScore: 0.0 to 1.0 (1.0 = perfectly relevant)
          - explanation: Why this article matches the query
          
          Only include articles with relevance score > 0.3. Return JSON:
          {
            "results": [
              {
                "articleId": number,
                "relevanceScore": number,
                "explanation": string
              }
            ]
          }`,
        },
        {
          role: "user",
          content: `Query: "${query}"\n\nArticles:\n${articlesText}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    try {
      const result = JSON.parse(response.choices[0].message.content || "{}");
      const rankedResults = result.results || [];
      
      // Get the full article data for results
      const resultArticles = [];
      for (const res of rankedResults) {
        const article = articles.find(a => a.id === res.articleId);
        if (article) {
          resultArticles.push({
            article,
            relevanceScore: res.relevanceScore,
            explanation: res.explanation,
          });
        }
      }

      // Sort by relevance score and limit results
      resultArticles.sort((a, b) => b.relevanceScore - a.relevanceScore);
      const finalResults = resultArticles.slice(0, limit);

      // Update search query with results count
      await db
        .update(searchQueries)
        .set({ resultsCount: finalResults.length })
        .where(sql`query = ${query} AND search_type = 'semantic' AND created_at >= NOW() - INTERVAL '1 minute'`);

      return finalResults;
    } catch (error) {
      console.error("Error in semantic search:", error);
      return [];
    }
  }

  // Create article clusters for related content discovery
  async createArticleClusters(timeframe: 'day' | 'week' | 'month' = 'week') {
    const daysBack = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);

    const articles = await db
      .select()
      .from(newsArticles)
      .where(gte(newsArticles.publishedAt, cutoff))
      .orderBy(desc(newsArticles.publishedAt));

    if (articles.length < 3) {
      return []; // Not enough articles to cluster
    }

    // Group articles by content similarity using AI
    const articlesText = articles.map(article => 
      `ID: ${article.id}\nTitle: ${article.title}\nSummary: ${article.summary}\nCategory: ${article.category}`
    ).join('\n\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `Analyze these AI/tech news articles and group them into clusters of related content.
          
          Create clusters for:
          - Related technology developments
          - Company-specific news threads
          - Research topic clusters
          - Event/announcement series
          
          For each cluster, provide:
          - title: descriptive cluster name
          - description: what connects these articles
          - articleIds: array of article IDs
          - keywords: key terms that define this cluster
          - clusterType: "story", "topic", "event", or "technology"
          
          Only create clusters with 2+ articles. Return JSON:
          {
            "clusters": [
              {
                "title": string,
                "description": string,
                "articleIds": number[],
                "keywords": string[],
                "clusterType": string
              }
            ]
          }`,
        },
        {
          role: "user",
          content: articlesText,
        },
      ],
      response_format: { type: "json_object" },
    });

    try {
      const result = JSON.parse(response.choices[0].message.content || "{}");
      const clusters = result.clusters || [];
      
      // Store clusters in database
      const savedClusters = [];
      for (const cluster of clusters) {
        const [savedCluster] = await db
          .insert(articleClusters)
          .values({
            title: cluster.title,
            description: cluster.description,
            articleIds: cluster.articleIds,
            keywords: cluster.keywords,
            clusterType: cluster.clusterType,
            similarity: "0.8", // Default similarity score
          })
          .returning();
        
        if (savedCluster) {
          savedClusters.push(savedCluster);
        }
      }

      return savedClusters;
    } catch (error) {
      console.error("Error creating article clusters:", error);
      return [];
    }
  }

  // Get existing article clusters with full article data
  async getArticleClusters(limit: number = 10): Promise<ArticleClusterResult[]> {
    const clusters = await db
      .select()
      .from(articleClusters)
      .orderBy(desc(articleClusters.createdAt))
      .limit(limit);

    const clustersWithArticles = [];
    
    for (const cluster of clusters) {
      if (cluster.articleIds.length > 0) {
        const articles = await db
          .select()
          .from(newsArticles)
          .where(inArray(newsArticles.id, cluster.articleIds))
          .orderBy(desc(newsArticles.publishedAt));

        clustersWithArticles.push({
          id: cluster.id,
          title: cluster.title,
          description: cluster.description || '',
          articles,
          keywords: cluster.keywords,
          clusterType: cluster.clusterType,
        });
      }
    }

    return clustersWithArticles;
  }

  // Find similar articles to a given article
  async findSimilarArticles(articleId: number, limit: number = 5) {
    const [article] = await db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.id, articleId));

    if (!article) {
      return [];
    }

    // Get recent articles from the same category
    const candidateArticles = await db
      .select()
      .from(newsArticles)
      .where(and(
        eq(newsArticles.category, article.category),
        sql`id != ${articleId}`
      ))
      .orderBy(desc(newsArticles.publishedAt))
      .limit(20);

    if (candidateArticles.length === 0) {
      return [];
    }

    // Use AI to find the most similar articles
    const targetText = `Title: ${article.title}\nSummary: ${article.summary}`;
    const candidatesText = candidateArticles.map(a => 
      `ID: ${a.id}\nTitle: ${a.title}\nSummary: ${a.summary}`
    ).join('\n\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `Find articles most similar to the target article. Consider:
          - Topic overlap
          - Technology/company mentions
          - Content themes
          
          Return similarity scores 0.0-1.0. Only include articles with score > 0.4.
          
          JSON format:
          {
            "similarArticles": [
              {
                "articleId": number,
                "similarityScore": number,
                "reason": string
              }
            ]
          }`,
        },
        {
          role: "user",
          content: `Target article:\n${targetText}\n\nCandidate articles:\n${candidatesText}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    try {
      const result = JSON.parse(response.choices[0].message.content || "{}");
      const similarArticles = result.similarArticles || [];
      
      // Get full article data and sort by similarity
      const articlesWithData = [];
      for (const sim of similarArticles) {
        const fullArticle = candidateArticles.find(a => a.id === sim.articleId);
        if (fullArticle) {
          articlesWithData.push({
            article: fullArticle,
            similarityScore: sim.similarityScore,
            reason: sim.reason,
          });
        }
      }

      articlesWithData.sort((a, b) => b.similarityScore - a.similarityScore);
      return articlesWithData.slice(0, limit);
    } catch (error) {
      console.error("Error finding similar articles:", error);
      return [];
    }
  }

  // Enhanced keyword search with context
  async enhancedKeywordSearch(query: string, filters: any = {}) {
    let whereConditions = [];
    
    // Basic text search in title and summary
    const searchCondition = sql`(
      ${newsArticles.title} ILIKE ${`%${query}%`} OR 
      ${newsArticles.summary} ILIKE ${`%${query}%`} OR
      ${newsArticles.content} ILIKE ${`%${query}%`}
    )`;
    whereConditions.push(searchCondition);

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      whereConditions.push(eq(newsArticles.category, filters.category));
    }

    if (filters.dateRange) {
      const daysBack = filters.dateRange === '24h' ? 1 : 
                      filters.dateRange === '48h' ? 2 : 7;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysBack);
      whereConditions.push(gte(newsArticles.publishedAt, cutoff));
    }

    const finalCondition = whereConditions.length > 1 ? 
      and(...whereConditions) : whereConditions[0];

    const results = await db
      .select()
      .from(newsArticles)
      .where(finalCondition)
      .orderBy(desc(newsArticles.publishedAt))
      .limit(20);

    // Log the search
    await db.insert(searchQueries).values({
      query,
      searchType: "keyword",
      resultsCount: results.length,
    });

    return results;
  }

  // Get trending topics based on article clustering
  async getTrendingTopics(timeframe: 'day' | 'week' = 'week') {
    const daysBack = timeframe === 'day' ? 1 : 7;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);

    // Get recent articles
    const articles = await db
      .select()
      .from(newsArticles)
      .where(gte(newsArticles.publishedAt, cutoff))
      .orderBy(desc(newsArticles.publishedAt));

    if (articles.length < 5) {
      return [];
    }

    // Use AI to identify trending topics
    const articlesText = articles.map(article => 
      `${article.title}: ${article.summary}`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `Analyze these AI/tech news articles and identify the top trending topics.
          
          Look for:
          - Frequently mentioned technologies
          - Emerging themes
          - Hot companies/products
          - Research breakthroughs
          
          Return the top 10 trending topics with:
          - topic name
          - description
          - frequency score (how often mentioned)
          - trend type (technology, company, research, event)
          
          JSON format:
          {
            "trendingTopics": [
              {
                "name": string,
                "description": string,
                "frequency": number,
                "trendType": string
              }
            ]
          }`,
        },
        {
          role: "user",
          content: articlesText,
        },
      ],
      response_format: { type: "json_object" },
    });

    try {
      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.trendingTopics || [];
    } catch (error) {
      console.error("Error getting trending topics:", error);
      return [];
    }
  }

  // Generate content discovery summary
  async getDiscoverySummary() {
    const [clusters, trendingTopics, recentSearches] = await Promise.all([
      this.getArticleClusters(5),
      this.getTrendingTopics('week'),
      db.select().from(searchQueries)
        .orderBy(desc(searchQueries.createdAt))
        .limit(10)
    ]);

    return {
      articleClusters: clusters,
      trendingTopics: trendingTopics.slice(0, 10),
      recentSearches: recentSearches,
      clusterCount: clusters.length,
      topicsCount: trendingTopics.length,
    };
  }
}

export const contentDiscovery = new ContentDiscoveryService();