import { InsertNewsArticle, InsertTechnologyTrend, InsertCompanyMention, InsertFundingEvent } from "@shared/schema.js";
import { translateTitleToEnglish } from "./translationService.js";

interface SerpApiResponse {
  search_metadata: {
    status: string;
    id: string;
    total_time_taken: number;
  };
  search_parameters: {
    q: string;
    engine: string;
    location?: string;
  };
  news_results?: Array<{
    position: number;
    title: string;
    link: string;
    source: {
      name: string;
      icon?: string;
      authors?: string[];
    };
    date: string;
    snippet?: string;
    thumbnail?: string;
    thumbnail_small?: string;
  }>;
  organic_results?: Array<{
    position: number;
    title: string;
    link: string;
    snippet: string;
    date?: string;
  }>;
  interest_over_time?: {
    timeline_data: Array<{
      date: string;
      timestamp: string;
      values: Array<{
        query: string;
        value: number;
        extracted_value: number;
      }>;
    }>;
  };
  related_topics?: {
    rising?: Array<{
      topic?: {
        title: string;
        type: string;
      };
      value: number;
      formattedValue?: string;
      hasData?: boolean;
    }>;
    top?: Array<{
      topic?: {
        title: string;
        type: string;
      };
      value: number;
      formattedValue?: string;
      hasData?: boolean;
    }>;
  };
}

export class SerpApiService {
  private apiKey: string;
  private baseUrl = 'https://serpapi.com/search';

  constructor() {
    this.apiKey = process.env.SERPAPI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('SerpAPI key not found in environment variables');
    }
  }

  // Fetch AI/ML news from Google News with integrated market intelligence extraction
  async fetchAINews(query: string = '"OpenAI" OR "ChatGPT" OR "GPT-4" OR "Claude AI" OR "Google Gemini" OR "artificial intelligence breakthrough" OR "AI startup funding" OR "machine learning research"', useTechTopic: boolean = false): Promise<{
    articles: InsertNewsArticle[];
    marketIntelligence: {
      companies: InsertCompanyMention[];
      funding: InsertFundingEvent[];
      sentiment: { title: string; sentiment: number; confidence: number }[];
    }
  }> {
    try {
      // Use Technology topic token for more targeted results when requested
      const params = new URLSearchParams({
        engine: 'google_news',
        gl: 'us',
        hl: 'en',
        api_key: this.apiKey
      });

      if (useTechTopic) {
        // Technology topic token from Google News API documentation
        params.append('topic_token', 'CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB');
      } else {
        params.append('q', query);
      }



      const response = await fetch(`${this.baseUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`);
      }

      const data: SerpApiResponse = await response.json();

      if (data.search_metadata.status !== 'Success') {
        throw new Error(`SerpAPI search failed: ${data.search_metadata.status}`);
      }

      const newsResults = data.news_results || [];
      const articles: InsertNewsArticle[] = [];
      const companies: InsertCompanyMention[] = [];
      const funding: InsertFundingEvent[] = [];
      const sentimentData: { title: string; sentiment: number; confidence: number }[] = [];

      for (const result of newsResults) {
        try {
          // Filter for AI/ML relevance
          const relevanceScore = this.calculateRelevanceScore(result.title, result.snippet);
          if (relevanceScore < 0.5) continue; // Skip irrelevant articles (lowered threshold)

          // Translate title if needed
          const translationResult = await translateTitleToEnglish(result.title);
          const translatedTitle = translationResult.translatedTitle;

          const sourceName = typeof result.source === 'object' ? result.source.name : result.source;
          const snippet = result.snippet || result.title; // Google News API may not always have snippet
          
          const article: InsertNewsArticle = {
            title: translatedTitle,
            url: result.link,
            summary: snippet,
            source: sourceName || 'Google News',
            publishedAt: this.parseDate(result.date),
            category: this.categorizeContent(result.title, snippet),
            confidence: Math.min(95, Math.max(65, relevanceScore * 100)),
            region: this.getRegionFromSource(sourceName),
            imageUrl: result.thumbnail || null,
            sourceType: 'serpapi',
            impactScore: this.calculateImpactScore(result.title, snippet),
            developmentImpact: this.getDevelopmentImpact(result.title, snippet),
            toolsImpact: this.getToolsImpact(result.title, snippet),
            marketImpact: this.getMarketImpact(result.title, snippet),
            timeToImpact: this.getTimeToImpact(result.title, snippet),
            disruptionLevel: this.getDisruptionLevel(result.title, snippet),
            prosList: this.extractPros(result.title, snippet),
            consList: this.extractCons(result.title, snippet),
            isBreaking: this.isBreakingNews(result.title, result.date),
            aiRelevance: relevanceScore
          };

          articles.push(article);

          // Store basic market intelligence (without article IDs for now)
          try {
            // Extract company mentions
            const articleCompanies = this.extractCompanies(result.title, snippet, result.link);
            companies.push(...articleCompanies);

            // Store funding data with article reference for later linking
            const articleFunding = this.extractFunding(result.title, result.snippet, result.link);
            // Add article reference for later linking
            articleFunding.forEach(f => {
              f.articleIndex = articles.length - 1; // Store index for later ID linking
            });
            funding.push(...articleFunding);

            // Extract sentiment analysis
            const sentiment = this.analyzeSentiment(`${result.title} ${result.snippet}`);
            sentimentData.push({
              title: translatedTitle,
              sentiment: sentiment,
              confidence: relevanceScore
            });
          } catch (error) {
            console.error(`Error extracting market intelligence: ${error.message}`);
          }

        } catch (error) {
          console.error(`Error processing SerpAPI news result: ${error.message}`);
          continue;
        }
      }

      console.log(`SerpAPI: Processed ${articles.length} AI/ML news articles with ${companies.length} companies, ${funding.length} funding events`);
      return {
        articles,
        marketIntelligence: {
          companies,
          funding,
          sentiment: sentimentData
        }
      };

    } catch (error) {
      console.error(`SerpAPI news fetch error: ${error.message}`);
      return {
        articles: [],
        marketIntelligence: {
          companies: [],
          funding: [],
          sentiment: []
        }
      };
    }
  }

  // Fetch trending AI/ML topics from Google Trends  
  async fetchTrendingTopics(query: string = 'artificial intelligence', timeframe: string = 'today 12-m'): Promise<InsertTechnologyTrend[]> {
    try {
      // According to SerpAPI docs, RELATED_TOPICS only accepts single query per search
      const params = new URLSearchParams({
        engine: 'google_trends',
        q: query,
        data_type: 'RELATED_TOPICS',
        date: timeframe,
        hl: 'en',
        geo: 'US',
        api_key: this.apiKey
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`SerpAPI Trends request failed: ${response.status} ${response.statusText}`);
      }

      const data: SerpApiResponse = await response.json();

      if (data.search_metadata?.status !== 'Success') {
        throw new Error(`SerpAPI Trends search failed: ${data.search_metadata?.status || 'Unknown error'}`);
      }

      const trends: InsertTechnologyTrend[] = [];

      // Process related topics - SerpAPI returns this in related_topics structure
      if (data.related_topics) {
        // Process rising topics
        if (data.related_topics.rising) {
          for (const topic of data.related_topics.rising) {
            const numericValue = this.parseNumericValue(topic.value);
            trends.push({
              technologyName: topic.topic?.title || topic.formattedValue || 'Unknown',
              category: this.categorizeTechnology(topic.topic?.title || topic.formattedValue || ''),
              adoptionStage: this.determineAdoptionStage(numericValue),
              mentionCount: numericValue,
              sentimentAvg: this.calculateSentimentFromTrend(numericValue).toString(),
              trendDirection: 'rising'
            });
          }
        }

        // Process top topics  
        if (data.related_topics.top) {
          for (const topic of data.related_topics.top) {
            const numericValue = this.parseNumericValue(topic.value);
            trends.push({
              technologyName: topic.topic?.title || topic.formattedValue || 'Unknown',
              category: this.categorizeTechnology(topic.topic?.title || topic.formattedValue || ''),
              adoptionStage: this.determineAdoptionStage(numericValue),
              mentionCount: numericValue,
              sentimentAvg: this.calculateSentimentFromTrend(numericValue).toString(),
              trendDirection: 'stable'
            });
          }
        }
      }

      console.log(`SerpAPI: Processed ${trends.length} trending AI/ML topics`);
      return trends;

    } catch (error) {
      console.error(`SerpAPI trends fetch error: ${error.message}`);
      
      // Try alternative queries if main query fails
      const alternativeQueries = ['machine learning', 'ChatGPT', 'OpenAI'];
      
      for (const altQuery of alternativeQueries) {
        try {
          console.log(`Trying alternative query: ${altQuery}`);
          const params = new URLSearchParams({
            engine: 'google_trends',
            q: altQuery,
            data_type: 'RELATED_TOPICS',
            date: 'today 3-m', // Shorter timeframe might work better
            hl: 'en',
            geo: 'US',
            api_key: this.apiKey
          });

          const response = await fetch(`${this.baseUrl}?${params}`);
          if (response.ok) {
            const data = await response.json();
            if (data.search_metadata?.status === 'Success' && data.related_topics) {
              console.log(`Alternative query ${altQuery} succeeded`);
              const trends: InsertTechnologyTrend[] = [];
              
              if (data.related_topics.rising) {
                for (const topic of data.related_topics.rising.slice(0, 5)) { // Limit to 5 topics
                  trends.push({
                    technologyName: topic.topic?.title || topic.formattedValue || altQuery,
                    category: this.categorizeTechnology(topic.topic?.title || ''),
                    adoptionStage: 'emerging',
                    mentionCount: this.parseNumericValue(topic.value),
                    sentimentAvg: '0.7',
                    trendDirection: 'rising'
                  });
                }
              }
              
              return trends;
            }
          }
        } catch (altError) {
          console.log(`Alternative query ${altQuery} also failed: ${altError.message}`);
          continue;
        }
      }
      
      // Return empty array if all queries fail
      return [];
    }
  }

  // Fetch funding and company data
  async fetchFundingNews(): Promise<{ companies: InsertCompanyMention[], funding: InsertFundingEvent[] }> {
    try {
      const queries = [
        'AI startup funding Series A B C',
        'artificial intelligence venture capital investment',
        'machine learning company acquisition merger'
      ];

      const allCompanies: InsertCompanyMention[] = [];
      const allFunding: InsertFundingEvent[] = [];

      for (const query of queries) {
        const params = new URLSearchParams({
          engine: 'google',
          tbm: 'nws',
          q: query,
          hl: 'en',
          gl: 'us',
          num: '10',
          api_key: this.apiKey
        });

        const response = await fetch(`${this.baseUrl}?${params}`);
        
        if (!response.ok) {
          console.error(`SerpAPI funding request failed: ${response.status}`);
          continue;
        }

        const data: SerpApiResponse = await response.json();

        if (data.search_metadata.status !== 'Success') {
          console.error(`SerpAPI funding search failed: ${data.search_metadata.status}`);
          continue;
        }

        const newsResults = data.news_results || [];

        for (const result of newsResults) {
          // Extract company mentions
          const companies = this.extractCompanies(result.title, result.snippet);
          allCompanies.push(...companies);

          // Extract funding events
          const funding = this.extractFunding(result.title, result.snippet, result.link);
          allFunding.push(...funding);
        }
      }

      console.log(`SerpAPI: Processed ${allCompanies.length} companies, ${allFunding.length} funding events`);
      return { companies: allCompanies, funding: allFunding };

    } catch (error) {
      console.error(`SerpAPI funding fetch error: ${error.message}`);
      return { companies: [], funding: [] };
    }
  }

  // Helper methods
  private calculateRelevanceScore(title: string, snippet: string): number {
    const text = `${title} ${snippet}`.toLowerCase();
    const aiKeywords = [
      'artificial intelligence', 'machine learning', 'deep learning', 'neural network',
      'chatgpt', 'openai', 'ai', 'ml', 'gpt', 'llm', 'generative ai',
      'computer vision', 'nlp', 'natural language processing', 'automation',
      'robotics', 'algorithm', 'data science', 'big data', 'predictive analytics'
    ];

    let score = 0;
    let matches = 0;

    for (const keyword of aiKeywords) {
      if (text.includes(keyword)) {
        matches++;
        score += keyword.length > 10 ? 0.15 : 0.1; // Longer keywords get higher weight
      }
    }

    // Bonus for multiple matches
    if (matches > 1) score += 0.2;
    if (matches > 2) score += 0.3;

    return Math.min(1.0, score);
  }

  private categorizeContent(title: string, snippet: string): string {
    const text = `${title} ${snippet}`.toLowerCase();
    
    if (text.includes('startup') || text.includes('funding') || text.includes('investment')) {
      return 'startups';
    }
    if (text.includes('research') || text.includes('study') || text.includes('paper')) {
      return 'research';
    }
    if (text.includes('release') || text.includes('launch') || text.includes('announced')) {
      return 'releases';
    }
    if (text.includes('tool') || text.includes('platform') || text.includes('software')) {
      return 'tools';
    }
    return 'use-cases';
  }

  private parseDate(dateString: string): Date {
    if (!dateString) return new Date();
    
    // Handle various date formats from Google News
    const now = new Date();
    const lowerDate = dateString.toLowerCase();
    
    if (lowerDate.includes('ago')) {
      if (lowerDate.includes('hour')) {
        const hours = parseInt(lowerDate.match(/(\d+)/)?.[1] || '1');
        return new Date(now.getTime() - hours * 60 * 60 * 1000);
      }
      if (lowerDate.includes('day')) {
        const days = parseInt(lowerDate.match(/(\d+)/)?.[1] || '1');
        return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      }
      if (lowerDate.includes('week')) {
        const weeks = parseInt(lowerDate.match(/(\d+)/)?.[1] || '1');
        return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
      }
    }
    
    try {
      return new Date(dateString);
    } catch {
      return new Date();
    }
  }

  private getRegionFromSource(source: string): string {
    const sourceMap: { [key: string]: string } = {
      'techcrunch': 'us',
      'wired': 'us',
      'bloomberg': 'us',
      'reuters': 'global',
      'bbc': 'uk',
      'guardian': 'uk',
      'nikkei': 'asia',
      'south china morning post': 'asia',
      'times of india': 'asia',
      'venturebeat': 'us',
      'ars technica': 'us'
    };

    const sourceLower = source.toLowerCase();
    for (const [key, region] of Object.entries(sourceMap)) {
      if (sourceLower.includes(key)) {
        return region;
      }
    }
    return 'global';
  }

  private calculateImpactScore(title: string, snippet: string): number {
    const text = `${title} ${snippet}`.toLowerCase();
    let score = 3; // Base score
    
    // High impact keywords
    if (text.includes('breakthrough') || text.includes('revolutionary')) score += 2;
    if (text.includes('breakthrough') || text.includes('milestone')) score += 1.5;
    if (text.includes('first') || text.includes('new') || text.includes('launch')) score += 1;
    if (text.includes('billion') || text.includes('million')) score += 1;
    
    return Math.min(10, Math.max(1, score));
  }

  private getDevelopmentImpact(title: string, snippet: string): string {
    const text = `${title} ${snippet}`.toLowerCase();
    
    if (text.includes('developer') || text.includes('api') || text.includes('sdk')) {
      return 'Provides new tools and APIs for developers to build AI applications';
    }
    if (text.includes('open source') || text.includes('github')) {
      return 'Open source release enables community development and innovation';
    }
    if (text.includes('research') || text.includes('paper')) {
      return 'Research findings may influence future AI development approaches';
    }
    return 'May impact general AI development practices and methodologies';
  }

  private getToolsImpact(title: string, snippet: string): string[] {
    const text = `${title} ${snippet}`.toLowerCase();
    const tools: string[] = [];
    
    if (text.includes('chatgpt') || text.includes('gpt')) tools.push('ChatGPT');
    if (text.includes('tensorflow')) tools.push('TensorFlow');
    if (text.includes('pytorch')) tools.push('PyTorch');
    if (text.includes('hugging face')) tools.push('Hugging Face');
    if (text.includes('openai')) tools.push('OpenAI API');
    if (text.includes('claude')) tools.push('Claude');
    if (text.includes('gemini')) tools.push('Google Gemini');
    
    return tools.length > 0 ? tools : ['General AI Tools'];
  }

  private getMarketImpact(title: string, snippet: string): string {
    const text = `${title} ${snippet}`.toLowerCase();
    
    if (text.includes('stock') || text.includes('market cap') || text.includes('ipo')) {
      return 'Significant market valuation impact expected';
    }
    if (text.includes('funding') || text.includes('investment') || text.includes('venture')) {
      return 'May attract increased investment in AI sector';
    }
    if (text.includes('regulation') || text.includes('policy') || text.includes('law')) {
      return 'Potential regulatory implications for AI industry';
    }
    return 'General market awareness and adoption impact';
  }

  private getTimeToImpact(title: string, snippet: string): string {
    const text = `${title} ${snippet}`.toLowerCase();
    
    if (text.includes('available now') || text.includes('launched') || text.includes('released')) {
      return 'immediate';
    }
    if (text.includes('coming soon') || text.includes('next month') || text.includes('beta')) {
      return 'short-term';
    }
    if (text.includes('next year') || text.includes('2025') || text.includes('2026')) {
      return 'medium-term';
    }
    return 'long-term';
  }

  private getDisruptionLevel(title: string, snippet: string): string {
    const text = `${title} ${snippet}`.toLowerCase();
    
    if (text.includes('regulation') || text.includes('ban') || text.includes('lawsuit')) {
      return 'high';
    }
    if (text.includes('breakthrough') || text.includes('revolutionary') || text.includes('first')) {
      return 'medium';
    }
    return 'low';
  }

  private extractPros(title: string, snippet: string): string[] {
    const text = `${title} ${snippet}`.toLowerCase();
    const pros: string[] = [];
    
    if (text.includes('efficient') || text.includes('faster')) pros.push('Improved efficiency');
    if (text.includes('cost') && (text.includes('reduce') || text.includes('save'))) pros.push('Cost reduction');
    if (text.includes('automation') || text.includes('automate')) pros.push('Automation capabilities');
    if (text.includes('accuracy') || text.includes('precise')) pros.push('Enhanced accuracy');
    if (text.includes('user') && text.includes('experience')) pros.push('Better user experience');
    
    return pros.length > 0 ? pros : ['Potential AI advancement'];
  }

  private extractCons(title: string, snippet: string): string[] {
    const text = `${title} ${snippet}`.toLowerCase();
    const cons: string[] = [];
    
    if (text.includes('privacy') || text.includes('data protection')) cons.push('Privacy concerns');
    if (text.includes('job') && (text.includes('loss') || text.includes('replace'))) cons.push('Job displacement');
    if (text.includes('bias') || text.includes('unfair')) cons.push('Potential bias');
    if (text.includes('cost') && text.includes('expensive')) cons.push('High implementation cost');
    if (text.includes('complex') || text.includes('difficult')) cons.push('Technical complexity');
    
    return cons.length > 0 ? cons : ['Implementation challenges'];
  }

  private isBreakingNews(title: string, date: string): boolean {
    const now = new Date();
    const publishedDate = this.parseDate(date);
    const hoursDiff = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60);
    
    const breakingKeywords = ['breaking', 'urgent', 'just in', 'developing', 'live'];
    const titleLower = title.toLowerCase();
    
    return hoursDiff < 6 || breakingKeywords.some(keyword => titleLower.includes(keyword));
  }

  private getDisruptionLevel(title: string, snippet: string): string {
    const text = `${title} ${snippet}`.toLowerCase();
    
    if (text.includes('revolutionary') || text.includes('breakthrough') || text.includes('game-changing')) {
      return 'revolutionary';
    }
    if (text.includes('significant') || text.includes('major') || text.includes('important')) {
      return 'high';
    }
    if (text.includes('incremental') || text.includes('improvement') || text.includes('update')) {
      return 'low';
    }
    return 'medium';
  }

  private extractPros(title: string, snippet: string): string[] {
    const text = `${title} ${snippet}`.toLowerCase();
    const pros: string[] = [];
    
    if (text.includes('efficient') || text.includes('faster')) {
      pros.push('Improved efficiency and speed');
    }
    if (text.includes('accuracy') || text.includes('precise') || text.includes('better')) {
      pros.push('Enhanced accuracy and performance');
    }
    if (text.includes('cost') || text.includes('cheaper') || text.includes('affordable')) {
      pros.push('Cost reduction and accessibility');
    }
    if (text.includes('innovation') || text.includes('novel') || text.includes('creative')) {
      pros.push('Drives innovation and creativity');
    }
    
    return pros.length > 0 ? pros : ['Advances AI capabilities'];
  }

  private extractCons(title: string, snippet: string): string[] {
    const text = `${title} ${snippet}`.toLowerCase();
    const cons: string[] = [];
    
    if (text.includes('privacy') || text.includes('data') || text.includes('security')) {
      cons.push('Potential privacy and security concerns');
    }
    if (text.includes('job') || text.includes('employment') || text.includes('replace')) {
      cons.push('May impact employment in certain sectors');
    }
    if (text.includes('bias') || text.includes('ethical') || text.includes('fair')) {
      cons.push('Ethical considerations and bias concerns');
    }
    if (text.includes('regulation') || text.includes('control') || text.includes('oversight')) {
      cons.push('Regulatory challenges and oversight needs');
    }
    
    return cons.length > 0 ? cons : ['Requires careful implementation'];
  }

  private isBreakingNews(title: string, date: string): boolean {
    const text = title.toLowerCase();
    const breakingKeywords = ['breaking', 'urgent', 'just in', 'developing', 'live'];
    
    if (breakingKeywords.some(keyword => text.includes(keyword))) {
      return true;
    }
    
    // Check if news is very recent (within last hour)
    const articleDate = this.parseDate(date);
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    return articleDate > hourAgo;
  }

  private calculateSentimentFromTrend(trendValue: number): number {
    // Convert trend value to sentiment score (0-1)
    return Math.min(1.0, Math.max(0.0, trendValue / 100));
  }

  private categorizeTechnology(technology: string): string {
    const tech = technology.toLowerCase();
    
    if (tech.includes('chatgpt') || tech.includes('gpt') || tech.includes('claude')) {
      return 'Language Models';
    }
    if (tech.includes('vision') || tech.includes('image') || tech.includes('visual')) {
      return 'Computer Vision';
    }
    if (tech.includes('robot') || tech.includes('automation')) {
      return 'Robotics';
    }
    if (tech.includes('data') || tech.includes('analytics')) {
      return 'Data Science';
    }
    return 'General AI';
  }

  private extractCompanies(title: string, snippet: string, sourceUrl?: string): InsertCompanyMention[] {
    const text = `${title} ${snippet}`;
    const companies: InsertCompanyMention[] = [];
    
    // Common AI companies to look for (expanded list)
    const aiCompanies = [
      'OpenAI', 'Google', 'Microsoft', 'Meta', 'Facebook', 'Amazon', 'Apple',
      'Tesla', 'NVIDIA', 'Anthropic', 'Stability AI', 'Midjourney', 'Cohere',
      'Hugging Face', 'DeepMind', 'Waymo', 'Uber', 'Spotify', 'Netflix',
      'Salesforce', 'Adobe', 'IBM', 'Oracle', 'SAP', 'Palantir', 'Databricks',
      'Scale AI', 'Replicate', 'Runway', 'Character.AI', 'Perplexity', 'Jasper',
      'Copy.ai', 'Grammarly', 'Notion', 'Figma', 'Canva'
    ];

    for (const company of aiCompanies) {
      const regex = new RegExp(`\\b${company}\\b`, 'i');
      if (regex.test(text)) {
        companies.push({
          companyName: company,
          mentionType: this.extractMentionType(text),
          sentiment: this.analyzeSentiment(text).toString(),
          context: this.extractContext(text, company),
          source: "SerpAPI",
          sourceUrl: sourceUrl || null
        });
      }
    }

    return companies;
  }

  private extractFunding(title: string, snippet: string, url: string): any[] {
    const text = `${title} ${snippet}`.toLowerCase();
    const funding: any[] = [];
    
    // Look for funding keywords (expanded)
    const fundingKeywords = [
      'series a', 'series b', 'series c', 'series d', 'seed', 'pre-seed',
      'funding', 'investment', 'raised', 'valuation', 'venture', 'round',
      'acquisition', 'merger', 'ipo', 'public offering', 'capital', 'financing'
    ];
    const hasFunding = fundingKeywords.some(keyword => text.includes(keyword));
    
    if (hasFunding) {
      // Enhanced amount extraction with more patterns
      const amountMatch = text.match(/\$(\d+(?:\.\d+)?)\s*(million|billion|m|b|thousand|k)/i) ||
                         text.match(/(\d+(?:\.\d+)?)\s*(million|billion|m|b)\s*dollars?/i) ||
                         text.match(/valued?\s+at\s+\$?(\d+(?:\.\d+)?)\s*(million|billion|m|b)/i);
      
      let amount = 0;
      if (amountMatch) {
        const value = parseFloat(amountMatch[1]);
        const unit = amountMatch[2].toLowerCase();
        if (unit.startsWith('b')) amount = value * 1000000000;
        else if (unit.startsWith('m')) amount = value * 1000000;
        else if (unit.startsWith('k') || unit.includes('thousand')) amount = value * 1000;
      }

      // Enhanced round type detection
      let roundType = 'General Investment';
      if (text.includes('series a')) roundType = 'Series A';
      else if (text.includes('series b')) roundType = 'Series B';
      else if (text.includes('series c')) roundType = 'Series C';
      else if (text.includes('series d')) roundType = 'Series D';
      else if (text.includes('seed') && text.includes('pre')) roundType = 'Pre-Seed';
      else if (text.includes('seed')) roundType = 'Seed';
      else if (text.includes('ipo') || text.includes('public')) roundType = 'IPO';
      else if (text.includes('acquisition')) roundType = 'Acquisition';
      else if (text.includes('merger')) roundType = 'Merger';

      funding.push({
        companyName: this.extractCompanyFromFunding(title),
        fundingAmount: amount > 0 ? `$${(amount / 1000000).toFixed(1)}M` : 'Undisclosed',
        fundingRound: roundType,
        investors: this.extractInvestors(text),
        sector: 'AI/ML',
        location: 'Global',
        source: 'SerpAPI',
        sourceUrl: url,
        articleIndex: null // Will be set by caller
      });
    }

    return funding;
  }

  private analyzeSentiment(text: string): number {
    const positiveWords = ['breakthrough', 'success', 'growth', 'innovation', 'leading', 'best'];
    const negativeWords = ['concern', 'problem', 'decline', 'issue', 'controversy', 'criticism'];
    
    const textLower = text.toLowerCase();
    let score = 0.5; // Neutral baseline
    
    positiveWords.forEach(word => {
      if (textLower.includes(word)) score += 0.1;
    });
    
    negativeWords.forEach(word => {
      if (textLower.includes(word)) score -= 0.1;
    });
    
    return Math.min(1.0, Math.max(0.0, score));
  }

  private extractContext(text: string, company: string): string {
    const sentences = text.split(/[.!?]+/);
    const companyMention = sentences.find(sentence => 
      sentence.toLowerCase().includes(company.toLowerCase())
    );
    
    return companyMention ? companyMention.trim() : `Mentioned in AI/ML news context`;
  }

  private extractMentionType(text: string): string {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('funding') || textLower.includes('investment') || textLower.includes('raised')) {
      return 'funding';
    }
    if (textLower.includes('partnership') || textLower.includes('collaboration')) {
      return 'partnership';
    }
    if (textLower.includes('product') || textLower.includes('launch') || textLower.includes('release')) {
      return 'product';
    }
    if (textLower.includes('acquisition') || textLower.includes('acquired') || textLower.includes('merger')) {
      return 'acquisition';
    }
    if (textLower.includes('research') || textLower.includes('breakthrough') || textLower.includes('study')) {
      return 'research';
    }
    return 'general';
  }

  private determineAdoptionStage(value: number): string {
    if (value > 80) return 'mainstream';
    if (value > 50) return 'emerging';
    if (value > 20) return 'experimental';
    return 'early';
  }

  // Parse numeric value from Google Trends API response (handles "+90%", "1000", etc.)
  private parseNumericValue(value: any): number {
    if (typeof value === 'number') {
      return Math.max(0, Math.min(100, Math.round(value)));
    }
    
    if (typeof value === 'string') {
      // Remove percentage signs, plus signs, and other non-numeric characters
      const cleanValue = value.replace(/[%+,]/g, '');
      const parsed = parseInt(cleanValue, 10);
      
      if (!isNaN(parsed)) {
        return Math.max(0, Math.min(100, parsed));
      }
    }
    
    // Default fallback value
    return 50;
  }

  private extractCompanyFromFunding(title: string): string {
    // Simple extraction - look for company names before funding keywords
    const words = title.split(' ');
    const fundingIndex = words.findIndex(word => 
      ['raises', 'funding', 'investment', 'series'].some(keyword => 
        word.toLowerCase().includes(keyword)
      )
    );
    
    if (fundingIndex > 0) {
      return words.slice(0, fundingIndex).join(' ');
    }
    
    return 'Unknown Company';
  }

  private extractInvestors(text: string): string[] {
    const commonInvestors = [
      'Sequoia Capital', 'Andreessen Horowitz', 'Google Ventures', 'Microsoft Ventures',
      'Khosla Ventures', 'Accel', 'Benchmark', 'Greylock Partners', 'Index Ventures',
      'a16z', 'GV', 'Kleiner Perkins', 'NEA', 'Bessemer Venture Partners'
    ];
    
    const foundInvestors = commonInvestors.filter(investor => 
      text.toLowerCase().includes(investor.toLowerCase())
    );
    
    // Extract other potential investor names using patterns
    const investorPatterns = [
      /\b([A-Z][a-z]+\s+(?:Capital|Ventures|Partners|Fund))\b/g,
      /\b([A-Z][a-z]+\s+Venture\s+Partners?)\b/g
    ];
    
    for (const pattern of investorPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        foundInvestors.push(...matches.slice(0, 2)); // Add up to 2 more
      }
    }
    
    // Remove duplicates and return array
    const uniqueInvestors = [...new Set(foundInvestors)];
    return uniqueInvestors.length > 0 ? uniqueInvestors : ['Undisclosed'];
  }

  private mapRoundToStage(roundType: string): string {
    const stageMap: { [key: string]: string } = {
      'Seed': 'early',
      'Series A': 'early',
      'Series B': 'growth',
      'Series C': 'growth',
      'IPO': 'late'
    };
    
    return stageMap[roundType] || 'unknown';
  }
}

export const serpApiService = new SerpApiService();