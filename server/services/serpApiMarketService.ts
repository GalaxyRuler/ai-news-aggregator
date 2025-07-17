// Import SerpAPI client
import SerpApi from "google-search-results-nodejs";
const { getJson } = SerpApi;
import { db } from "../db.js";
import { fundingEvents, companyMentions, technologyTrends } from "../../shared/schema.js";

interface SerpApiConfig {
  api_key: string;
  engine: string;
  q: string;
  location?: string;
  hl?: string;
  gl?: string;
  num?: number;
}

export class SerpApiMarketService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SERPAPI_API_KEY || '';
  }

  // Search for funding news and events
  async searchFundingNews(query: string = "AI startup funding Series A B C seed", location: string = "United States"): Promise<any[]> {
    if (!this.apiKey) {
      console.log("SerpAPI key not configured, skipping funding news search");
      return [];
    }

    try {
      const config: SerpApiConfig = {
        api_key: this.apiKey,
        engine: "google_news",
        q: query,
        location: location,
        hl: "en",
        gl: "us",
        num: 20
      };

      const response = await getJson(config);
      return response.news_results || [];
    } catch (error) {
      console.error("Error searching funding news:", error);
      return [];
    }
  }

  // Search for company mentions and market activity
  async searchCompanyMentions(companies: string[] = ["OpenAI", "Anthropic", "Meta AI", "Google DeepMind", "Microsoft AI"]): Promise<any[]> {
    if (!this.apiKey) {
      console.log("SerpAPI key not configured, skipping company mentions search");
      return [];
    }

    const results: any[] = [];

    for (const company of companies) {
      try {
        const config: SerpApiConfig = {
          api_key: this.apiKey,
          engine: "google_news",
          q: `"${company}" AI artificial intelligence`,
          hl: "en",
          gl: "us",
          num: 10
        };

        const response = await getJson(config);
        const companyResults = (response.news_results || []).map((item: any) => ({
          ...item,
          company: company
        }));
        results.push(...companyResults);
        
        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error searching mentions for ${company}:`, error);
      }
    }

    return results;
  }

  // Search for technology trends and innovations
  async searchTechnologyTrends(techs: string[] = ["GPT-4", "Claude", "Gemini", "LLaMA", "DALL-E", "Midjourney"]): Promise<any[]> {
    if (!this.apiKey) {
      console.log("SerpAPI key not configured, skipping technology trends search");
      return [];
    }

    const results: any[] = [];

    for (const tech of techs) {
      try {
        const config: SerpApiConfig = {
          api_key: this.apiKey,
          engine: "google_news",
          q: `"${tech}" artificial intelligence technology trend`,
          hl: "en",
          gl: "us",
          num: 8
        };

        const response = await getJson(config);
        const techResults = (response.news_results || []).map((item: any) => ({
          ...item,
          technology: tech
        }));
        results.push(...techResults);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error searching trends for ${tech}:`, error);
      }
    }

    return results;
  }

  // Process and store funding data from SerpAPI results
  async processFundingData(results: any[]): Promise<void> {
    for (const result of results) {
      try {
        // Extract funding information from news titles and snippets
        const text = `${result.title} ${result.snippet || ''}`;
        const fundingKeywords = /(?:raised|funding|investment|series [abc]|seed|round)\s*\$?(\d+(?:\.\d+)?)\s*(million|billion|m|b)/gi;
        const matches = text.match(fundingKeywords);

        if (matches && matches.length > 0) {
          // Extract company name from title
          const companyMatch = result.title.match(/^([^:]+):/);
          const companyName = companyMatch ? companyMatch[1].trim() : 'Unknown Company';

          // Extract funding amount
          const amountMatch = text.match(/\$?(\d+(?:\.\d+)?)\s*(million|billion|m|b)/i);
          const amount = amountMatch ? `$${amountMatch[1]}${amountMatch[2] === 'billion' || amountMatch[2] === 'b' ? 'B' : 'M'}` : 'Undisclosed';

          // Extract round type
          const roundMatch = text.match(/series\s+([abc])|seed|pre-seed/i);
          const round = roundMatch ? (roundMatch[1] ? `Series ${roundMatch[1].toUpperCase()}` : 'Seed') : 'Strategic';

          await db.insert(fundingEvents).values({
            articleId: 0, // SerpAPI source
            companyName,
            fundingAmount: amount,
            fundingRound: round,
            investors: [],
            location: result.source || 'Unknown',
            extractedAt: new Date(),
          }).onConflictDoNothing();
        }
      } catch (error) {
        console.error("Error processing funding data:", error);
      }
    }
  }

  // Process and store company mention data
  async processCompanyMentions(results: any[]): Promise<void> {
    for (const result of results) {
      try {
        if (result.company) {
          const mentionType = this.determineMentionType(result.title, result.snippet || '');
          const sentiment = this.calculateSentiment(result.title, result.snippet || '');

          await db.insert(companyMentions).values({
            articleId: 0, // SerpAPI source
            companyName: result.company,
            mentionType,
            sentiment: sentiment.toString(),
            context: result.snippet || result.title,
            extractedAt: new Date(),
          }).onConflictDoNothing();
        }
      } catch (error) {
        console.error("Error processing company mentions:", error);
      }
    }
  }

  // Process and store technology trend data
  async processTechnologyTrends(results: any[]): Promise<void> {
    for (const result of results) {
      try {
        if (result.technology) {
          const category = this.categorizeTechnology(result.technology);
          const adoptionStage = this.determineAdoptionStage(result.title, result.snippet || '');
          const sentiment = this.calculateSentiment(result.title, result.snippet || '');

          await db.insert(technologyTrends).values({
            technologyName: result.technology,
            category,
            adoptionStage,
            mentionCount: 1,
            sentimentAvg: sentiment.toString(),
            lastMentioned: new Date(),
            trendDirection: 'stable',
            weeklyMentions: [1],
          }).onConflictDoNothing();
        }
      } catch (error) {
        console.error("Error processing technology trends:", error);
      }
    }
  }

  // Comprehensive market intelligence collection
  async collectMarketIntelligence(): Promise<{
    fundingResults: number;
    companyResults: number;
    technologyResults: number;
  }> {
    console.log("Starting SerpAPI market intelligence collection...");

    const [fundingResults, companyResults, technologyResults] = await Promise.all([
      this.searchFundingNews(),
      this.searchCompanyMentions(),
      this.searchTechnologyTrends(),
    ]);

    // Process and store the results
    await Promise.all([
      this.processFundingData(fundingResults),
      this.processCompanyMentions(companyResults),
      this.processTechnologyTrends(technologyResults),
    ]);

    console.log(`SerpAPI collection completed: ${fundingResults.length} funding, ${companyResults.length} company mentions, ${technologyResults.length} technology trends`);

    return {
      fundingResults: fundingResults.length,
      companyResults: companyResults.length,
      technologyResults: technologyResults.length,
    };
  }

  // Helper methods
  private determineMentionType(title: string, snippet: string): string {
    const text = `${title} ${snippet}`.toLowerCase();
    if (text.includes('partnership') || text.includes('collaboration')) return 'partnership';
    if (text.includes('funding') || text.includes('investment')) return 'funding';
    if (text.includes('product') || text.includes('launch') || text.includes('release')) return 'product-launch';
    if (text.includes('acquisition') || text.includes('acquired')) return 'acquisition';
    if (text.includes('hiring') || text.includes('employee')) return 'hiring';
    return 'general-mention';
  }

  private calculateSentiment(title: string, snippet: string): number {
    const text = `${title} ${snippet}`.toLowerCase();
    const positiveWords = ['breakthrough', 'innovative', 'successful', 'growth', 'leading', 'advanced', 'revolutionary'];
    const negativeWords = ['controversy', 'concern', 'criticism', 'problem', 'issue', 'challenge', 'decline'];
    
    let score = 0;
    positiveWords.forEach(word => {
      if (text.includes(word)) score += 0.2;
    });
    negativeWords.forEach(word => {
      if (text.includes(word)) score -= 0.2;
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

  private determineAdoptionStage(title: string, snippet: string): string {
    const text = `${title} ${snippet}`.toLowerCase();
    if (text.includes('mainstream') || text.includes('widespread') || text.includes('adopted')) return 'mainstream';
    if (text.includes('emerging') || text.includes('growing') || text.includes('expanding')) return 'emerging';
    if (text.includes('experimental') || text.includes('prototype') || text.includes('research')) return 'experimental';
    return 'emerging';
  }
}

export const serpApiMarketService = new SerpApiMarketService();