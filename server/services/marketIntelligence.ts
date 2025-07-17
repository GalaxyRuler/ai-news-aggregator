import { db } from "../db";
import { newsArticles, companyMentions, fundingEvents, technologyTrends } from "@shared/schema";
import { eq, desc, sql, gte, and, ilike } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface MarketIntelligenceData {
  fundingEvents: Array<{
    company: string;
    amount: string;
    round: string;
    investors: string[];
    date: Date;
    articleId: number;
  }>;
  companyMentions: Array<{
    company: string;
    mentionCount: number;
    sentiment: number;
    recentMentions: Array<{
      articleId: number;
      title: string;
      mentionType: string;
      context: string;
    }>;
  }>;
  technologyTrends: Array<{
    technology: string;
    category: string;
    adoptionStage: string;
    mentionCount: number;
    trendDirection: string;
    sentimentAvg: number;
  }>;
}

export class MarketIntelligenceService {
  // Extract funding information from article using AI
  async extractFundingData(article: any) {
    const content = `${article.title}\n${article.summary}\n${article.content || ''}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `Extract funding information from this AI/tech news article. Look for:
          - Company name receiving funding
          - Funding amount (e.g., $10M, €5M, undisclosed)
          - Funding round (Seed, Series A, B, C, etc.)
          - Investor names
          - Valuation if mentioned
          - Company location
          
          Return JSON with this structure:
          {
            "hasFunding": boolean,
            "companyName": string,
            "fundingAmount": string,
            "fundingRound": string,
            "investors": string[],
            "valuation": string,
            "location": string
          }
          
          Only return data if you're confident this is a funding announcement.`,
        },
        {
          role: "user",
          content: content,
        },
      ],
      response_format: { type: "json_object" },
    });

    try {
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      if (result.hasFunding) {
        await db.insert(fundingEvents).values({
          articleId: article.id,
          companyName: result.companyName,
          fundingAmount: result.fundingAmount,
          fundingRound: result.fundingRound,
          investors: result.investors || [],
          valuation: result.valuation,
          location: result.location,
          sector: "AI/ML",
        }).onConflictDoNothing();
        
        return result;
      }
    } catch (error) {
      console.error("Error extracting funding data:", error);
    }
    
    return null;
  }

  // Extract company mentions and sentiment
  async extractCompanyMentions(article: any) {
    const content = `${article.title}\n${article.summary}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `Extract company mentions from this AI/tech news article. For each mentioned company, identify:
          - Company name
          - Mention type: funding, partnership, product, acquisition, hiring, research, controversy
          - Sentiment: positive (0.5 to 1.0), neutral (-0.2 to 0.2), negative (-1.0 to -0.2)
          - Context: brief surrounding text
          
          Focus on AI/tech companies. Return JSON:
          {
            "mentions": [
              {
                "companyName": string,
                "mentionType": string,
                "sentiment": number,
                "context": string
              }
            ]
          }`,
        },
        {
          role: "user",
          content: content,
        },
      ],
      response_format: { type: "json_object" },
    });

    try {
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      for (const mention of result.mentions || []) {
        await db.insert(companyMentions).values({
          articleId: article.id,
          companyName: mention.companyName,
          mentionType: mention.mentionType,
          sentiment: mention.sentiment.toString(),
          context: mention.context,
        }).onConflictDoNothing();
      }
      
      return result.mentions || [];
    } catch (error) {
      console.error("Error extracting company mentions:", error);
    }
    
    return [];
  }

  // Extract and track technology trends
  async extractTechnologyTrends(article: any) {
    const content = `${article.title}\n${article.summary}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `Extract AI/ML technologies mentioned in this article. For each technology, identify:
          - Technology name (e.g., GPT-4, DALL-E, Claude, LLaMA, etc.)
          - Category: LLM, computer-vision, robotics, autonomous-vehicles, voice-ai, etc.
          - Adoption stage: experimental, emerging, mainstream, mature
          - Sentiment about the technology: -1.0 to 1.0
          
          Return JSON:
          {
            "technologies": [
              {
                "name": string,
                "category": string,
                "adoptionStage": string,
                "sentiment": number
              }
            ]
          }`,
        },
        {
          role: "user",
          content: content,
        },
      ],
      response_format: { type: "json_object" },
    });

    try {
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      for (const tech of result.technologies || []) {
        // Check if technology trend already exists
        const [existingTrend] = await db
          .select()
          .from(technologyTrends)
          .where(eq(technologyTrends.technologyName, tech.name));

        if (existingTrend) {
          // Update existing trend
          await db
            .update(technologyTrends)
            .set({
              mentionCount: existingTrend.mentionCount + 1,
              sentimentAvg: (((parseFloat(existingTrend.sentimentAvg) * existingTrend.mentionCount) + tech.sentiment) / (existingTrend.mentionCount + 1)).toString(),
              lastMentioned: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(technologyTrends.id, existingTrend.id));
        } else {
          // Create new trend
          await db.insert(technologyTrends).values({
            technologyName: tech.name,
            category: tech.category,
            adoptionStage: tech.adoptionStage,
            mentionCount: 1,
            sentimentAvg: tech.sentiment.toString(),
            lastMentioned: new Date(),
            trendDirection: "stable",
            weeklyMentions: [1],
          }).onConflictDoNothing();
        }
      }
      
      return result.technologies || [];
    } catch (error) {
      console.error("Error extracting technology trends:", error);
    }
    
    return [];
  }

  // Process article for all market intelligence data
  async processArticle(article: any) {
    const results = await Promise.allSettled([
      this.extractFundingData(article),
      this.extractCompanyMentions(article),
      this.extractTechnologyTrends(article),
    ]);

    return {
      funding: results[0].status === 'fulfilled' ? results[0].value : null,
      mentions: results[1].status === 'fulfilled' ? results[1].value : [],
      technologies: results[2].status === 'fulfilled' ? results[2].value : [],
    };
  }

  // Get funding dashboard data
  async getFundingDashboard(timeframe: 'week' | 'month' | 'quarter' = 'month') {
    const daysBack = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);

    const recentFunding = await db
      .select()
      .from(fundingEvents)
      .where(gte(fundingEvents.extractedAt, cutoff))
      .orderBy(desc(fundingEvents.extractedAt));

    // Aggregate funding by round type
    const fundingByRound = recentFunding.reduce((acc, event) => {
      const round = event.fundingRound || 'Unknown';
      acc[round] = (acc[round] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top investors
    const investorCounts = recentFunding
      .flatMap(event => event.investors)
      .reduce((acc, investor) => {
        acc[investor] = (acc[investor] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topInvestors = Object.entries(investorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    return {
      totalFundingEvents: recentFunding.length,
      fundingByRound,
      topInvestors,
      recentEvents: recentFunding.slice(0, 10),
    };
  }

  // Get company mention analytics
  async getCompanyMentionAnalytics(timeframe: 'week' | 'month' = 'month') {
    const daysBack = timeframe === 'week' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);

    const mentions = await db
      .select()
      .from(companyMentions)
      .where(gte(companyMentions.extractedAt, cutoff))
      .orderBy(desc(companyMentions.extractedAt));

    // Company mention frequency
    const companyFrequency = mentions.reduce((acc, mention) => {
      const company = mention.companyName;
      if (!acc[company]) {
        acc[company] = { count: 0, sentiment: 0, types: {} };
      }
      acc[company].count += 1;
      acc[company].sentiment += parseFloat(mention.sentiment);
      acc[company].types[mention.mentionType] = (acc[company].types[mention.mentionType] || 0) + 1;
      return acc;
    }, {} as Record<string, any>);

    // Calculate average sentiment
    Object.keys(companyFrequency).forEach(company => {
      companyFrequency[company].sentiment /= companyFrequency[company].count;
    });

    const topCompanies = Object.entries(companyFrequency)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 15);

    return {
      totalMentions: mentions.length,
      uniqueCompanies: Object.keys(companyFrequency).length,
      topCompanies,
      mentionTypes: mentions.reduce((acc, m) => {
        acc[m.mentionType] = (acc[m.mentionType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // Get technology trend analysis
  async getTechnologyTrendAnalysis() {
    const trends = await db
      .select()
      .from(technologyTrends)
      .orderBy(desc(technologyTrends.mentionCount))
      .limit(20);

    // Group by category
    const trendsByCategory = trends.reduce((acc, trend) => {
      const category = trend.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(trend);
      return acc;
    }, {} as Record<string, any[]>);

    // Emerging technologies (high mentions, recent activity)
    const emergingTechs = trends.filter(t => 
      t.adoptionStage === 'emerging' || t.adoptionStage === 'experimental'
    ).slice(0, 10);

    // Map data to match frontend expectations
    const trendingTechnologies = trends.slice(0, 10).map(trend => ({
      name: trend.technologyName,
      category: trend.category,
      mentions: trend.mentionCount,
      sentiment: parseFloat(trend.sentimentAvg) || 0,
      trend: trend.trendDirection,
      adoptionStage: trend.adoptionStage
    }));

    return {
      totalTechnologies: trends.length,
      totalTrends: trends.length, // Frontend expects this field
      emergingTech: emergingTechs.length, // Frontend expects this field
      trendsByCategory,
      emergingTechnologies: emergingTechs,
      topTechnologies: trends.slice(0, 10),
      trendingTechnologies, // Frontend expects this field with mapped data
    };
  }

  // Generate market intelligence summary
  async generateMarketSummary() {
    const [funding, mentions, trends] = await Promise.all([
      this.getFundingDashboard('month'),
      this.getCompanyMentionAnalytics('month'),
      this.getTechnologyTrendAnalysis(),
    ]);

    return {
      summary: {
        fundingEvents: funding.totalFundingEvents,
        companyMentions: mentions.totalMentions,
        technologiesMentioned: trends.totalTechnologies,
        topFundingRound: Object.entries(funding.fundingByRound)[0]?.[0] || 'N/A',
        mostMentionedCompany: mentions.topCompanies[0]?.[0] || 'N/A',
        hottestTechnology: trends.topTechnologies[0]?.technologyName || 'N/A',
      },
      funding,
      mentions,
      trends,
    };
  }

  // Process all existing articles to populate market intelligence data
  async processAllExistingArticles() {
    console.log("Starting market intelligence processing for all articles...");
    
    try {
      // Get all articles from database
      const articles = await db.select().from(newsArticles).orderBy(desc(newsArticles.createdAt));
      
      console.log(`Processing ${articles.length} articles for market intelligence...`);
      
      let processed = 0;
      for (const article of articles) {
        try {
          console.log(`Processing article ${processed + 1}/${articles.length}: ${article.title.substring(0, 50)}...`);
          
          // Process each article for all market intelligence data
          await this.processArticle(article);
          processed++;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error processing article ${article.id}:`, error);
          // Continue with other articles even if one fails
        }
      }
      
      console.log(`Market intelligence processing completed! Processed ${processed}/${articles.length} articles.`);
      return { success: true, articlesProcessed: processed, totalArticles: articles.length };
    } catch (error) {
      console.error("Error processing articles for market intelligence:", error);
      throw error;
    }
  }
}

export const marketIntelligence = new MarketIntelligenceService();