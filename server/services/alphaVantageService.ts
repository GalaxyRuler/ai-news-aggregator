import { InsertNewsArticle } from "@shared/schema";

interface AlphaVantageNewsResponse {
  feed: Array<{
    title: string;
    url: string;
    time_published: string;
    authors: string[];
    summary: string;
    banner_image?: string;
    source: string;
    category_within_source: string;
    source_domain: string;
    topics: Array<{
      topic: string;
      relevance_score: string;
    }>;
    overall_sentiment_score: number;
    overall_sentiment_label: string;
    ticker_sentiment: Array<{
      ticker: string;
      relevance_score: string;
      ticker_sentiment_score: string;
      ticker_sentiment_label: string;
    }>;
  }>;
}

interface AlphaVantageEconomicData {
  name: string;
  interval: string;
  unit: string;
  data: Array<{
    date: string;
    value: string;
  }>;
}

interface AlphaVantageStockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  volume: number;
  marketCap?: number;
}

export class AlphaVantageService {
  private baseUrl = 'https://www.alphavantage.co/query';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Alpha Vantage API key not configured');
    }
  }

  async fetchMarketNews(): Promise<InsertNewsArticle[]> {
    if (!this.apiKey) {
      console.log('Alpha Vantage API key not available, skipping news fetch');
      return [];
    }

    try {
      const url = `${this.baseUrl}?function=NEWS_SENTIMENT&topics=technology,ipo,mergers_and_acquisitions,financial_markets&sort=LATEST&limit=50&apikey=${this.apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const data: AlphaVantageNewsResponse = await response.json();
      
      if (!data.feed || data.feed.length === 0) {
        console.log('No news articles returned from Alpha Vantage');
        return [];
      }

      const articles: InsertNewsArticle[] = [];

      for (const item of data.feed) {
        try {
          const processedArticle: InsertNewsArticle = {
            title: item.title,
            summary: item.summary || `${item.title.substring(0, 200)}...`,
            url: item.url,
            imageUrl: item.banner_image || null,
            publishedAt: new Date(item.time_published),
            source: item.source,
            sourceUrl: item.source_domain,
            category: this.categorizeByTopics(item.topics),
            confidence: this.convertSentimentToConfidence(item.overall_sentiment_score).toString(),
            isBreaking: false,
            region: this.getRegionFromSource(item.source),
            pros: item.overall_sentiment_label === 'Positive' ? [item.summary.substring(0, 100)] : [],
            cons: item.overall_sentiment_label === 'Negative' ? [item.summary.substring(0, 100)] : [],
            impactScore: this.calculateImpactScore(item.topics, item.ticker_sentiment).toString(),
            developmentImpact: this.getDevelopmentImpact(item.topics),
            toolsImpact: this.getToolsImpact(item.topics),
            marketImpact: this.getMarketImpact(item.ticker_sentiment),
            timeToImpact: this.getTimeToImpact(item.topics),
            disruptionLevel: this.getDisruptionLevel(item.overall_sentiment_score, item.topics)
          };

          articles.push(processedArticle);
        } catch (error) {
          console.error('Error processing Alpha Vantage article:', error);
          continue;
        }
      }

      console.log(`Alpha Vantage: Processed ${articles.length} news articles`);
      return articles;
    } catch (error) {
      console.error('Error fetching Alpha Vantage news:', error);
      return [];
    }
  }

  async fetchEconomicIndicators(): Promise<{
    gdp: AlphaVantageEconomicData | null;
    unemployment: AlphaVantageEconomicData | null;
    inflation: AlphaVantageEconomicData | null;
    federalFundsRate: AlphaVantageEconomicData | null;
  }> {
    if (!this.apiKey) {
      return { gdp: null, unemployment: null, inflation: null, federalFundsRate: null };
    }

    try {
      const [gdp, unemployment, inflation, federalFundsRate] = await Promise.allSettled([
        this.fetchEconomicIndicator('REAL_GDP', 'quarterly'),
        this.fetchEconomicIndicator('UNEMPLOYMENT', 'monthly'),
        this.fetchEconomicIndicator('CPI', 'monthly'),
        this.fetchEconomicIndicator('FEDERAL_FUNDS_RATE', 'monthly')
      ]);

      return {
        gdp: gdp.status === 'fulfilled' ? gdp.value : null,
        unemployment: unemployment.status === 'fulfilled' ? unemployment.value : null,
        inflation: inflation.status === 'fulfilled' ? inflation.value : null,
        federalFundsRate: federalFundsRate.status === 'fulfilled' ? federalFundsRate.value : null
      };
    } catch (error) {
      console.error('Error fetching economic indicators:', error);
      return { gdp: null, unemployment: null, inflation: null, federalFundsRate: null };
    }
  }

  async fetchStockData(symbols: string[]): Promise<AlphaVantageStockData[]> {
    if (!this.apiKey || symbols.length === 0) {
      return [];
    }

    const stockData: AlphaVantageStockData[] = [];

    for (const symbol of symbols.slice(0, 5)) { // Limit to 5 to avoid rate limits
      try {
        const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) continue;
        
        const data = await response.json();
        const quote = data['Global Quote'];
        
        if (quote && quote['01. symbol']) {
          stockData.push({
            symbol: quote['01. symbol'],
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: quote['10. change percent'],
            volume: parseInt(quote['06. volume'])
          });
        }

        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error fetching stock data for ${symbol}:`, error);
        continue;
      }
    }

    return stockData;
  }

  private async fetchEconomicIndicator(indicator: string, interval: string): Promise<AlphaVantageEconomicData | null> {
    try {
      const url = `${this.baseUrl}?function=${indicator}&interval=${interval}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      // Parse the response structure (varies by indicator)
      const keys = Object.keys(data);
      const dataKey = keys.find(key => key.includes('data') || key.includes(indicator.toLowerCase()));
      
      if (!dataKey || !data[dataKey]) return null;
      
      return {
        name: indicator,
        interval,
        unit: data.unit || '%',
        data: Array.isArray(data[dataKey]) ? data[dataKey].slice(0, 12) : [] // Last 12 data points
      };
    } catch (error) {
      console.error(`Error fetching ${indicator}:`, error);
      return null;
    }
  }

  private categorizeByTopics(topics: Array<{ topic: string; relevance_score: string }>): string {
    const topicMap: { [key: string]: string } = {
      'technology': 'Technology',
      'ipo': 'Startups',
      'mergers_and_acquisitions': 'Use Cases',
      'financial_markets': 'Research',
      'earnings': 'Tools'
    };

    const mainTopic = topics.find(t => parseFloat(t.relevance_score) > 0.5);
    return mainTopic ? topicMap[mainTopic.topic] || 'Technology' : 'Technology';
  }

  private convertSentimentToConfidence(sentimentScore: number): number {
    // Alpha Vantage sentiment ranges from -1 to 1
    // Convert to confidence score (50-95)
    const normalized = (sentimentScore + 1) / 2; // 0 to 1
    return Math.round(50 + (normalized * 45));
  }

  private getRegionFromSource(source: string): string {
    const regionMap: { [key: string]: string } = {
      'Reuters': 'Global',
      'Bloomberg': 'Global',
      'Yahoo Finance': 'US',
      'MarketWatch': 'US',
      'CNBC': 'US',
      'Financial Times': 'Europe',
      'Wall Street Journal': 'US'
    };
    
    return regionMap[source] || 'Global';
  }

  private calculateImpactScore(topics: Array<{ topic: string; relevance_score: string }>, tickerSentiment: Array<any>): number {
    const topicWeight = topics.reduce((sum, topic) => sum + parseFloat(topic.relevance_score), 0);
    const sentimentWeight = tickerSentiment.length * 0.5;
    return Math.min(Math.round((topicWeight + sentimentWeight) * 5), 10);
  }

  private getDevelopmentImpact(topics: Array<{ topic: string; relevance_score: string }>): string {
    const techTopics = topics.filter(t => ['technology', 'ipo'].includes(t.topic));
    return techTopics.length > 0 ? 'Significant impact on AI/ML development ecosystem' : 'Moderate market development impact';
  }

  private getToolsImpact(topics: Array<{ topic: string; relevance_score: string }>): string[] {
    const impactMap: { [key: string]: string[] } = {
      'technology': ['AI platforms', 'Development tools'],
      'ipo': ['Investment platforms', 'Trading tools'],
      'mergers_and_acquisitions': ['Business intelligence', 'Analytics platforms'],
      'financial_markets': ['Financial APIs', 'Market data tools']
    };

    const impacts: string[] = [];
    topics.forEach(topic => {
      if (impactMap[topic.topic]) {
        impacts.push(...impactMap[topic.topic]);
      }
    });

    return [...new Set(impacts)];
  }

  private getMarketImpact(tickerSentiment: Array<any>): string {
    if (tickerSentiment.length === 0) return 'Limited direct market impact';
    
    const avgSentiment = tickerSentiment.reduce((sum, ticker) => 
      sum + parseFloat(ticker.ticker_sentiment_score), 0) / tickerSentiment.length;
    
    if (avgSentiment > 0.3) return 'Positive market sentiment expected';
    if (avgSentiment < -0.3) return 'Negative market reaction possible';
    return 'Neutral market impact anticipated';
  }

  private getTimeToImpact(topics: Array<{ topic: string; relevance_score: string }>): string {
    const urgentTopics = ['ipo', 'mergers_and_acquisitions', 'earnings'];
    const hasUrgent = topics.some(t => urgentTopics.includes(t.topic) && parseFloat(t.relevance_score) > 0.5);
    
    return hasUrgent ? 'Immediate (1-7 days)' : 'Short-term (1-4 weeks)';
  }

  private getDisruptionLevel(sentimentScore: number, topics: Array<{ topic: string; relevance_score: string }>): string {
    const disruptiveTopics = ['technology', 'ipo'];
    const hasDisruptive = topics.some(t => disruptiveTopics.includes(t.topic) && parseFloat(t.relevance_score) > 0.7);
    
    if (hasDisruptive && Math.abs(sentimentScore) > 0.5) return 'High';
    if (hasDisruptive || Math.abs(sentimentScore) > 0.3) return 'Medium';
    return 'Low';
  }
}

export const alphaVantageService = new AlphaVantageService();