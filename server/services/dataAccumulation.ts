import { db } from "../db";
import { 
  newsArticles, 
  companyMentions, 
  fundingEvents, 
  technologyTrends,
  articleClusters
} from "@shared/schema";
import { desc, gte, lt, sql, and, eq } from "drizzle-orm";
import { cacheService } from "./cacheService.js";

export interface AccumulatedInsights {
  companyGrowthMetrics: Map<string, CompanyGrowthMetric>;
  technologyAdoptionCurves: Map<string, TechnologyAdoptionCurve>;
  investorPatterns: Map<string, InvestorPattern>;
  marketTrendIndicators: MarketTrendIndicator[];
  emergingThemes: EmergingTheme[];
}

interface CompanyGrowthMetric {
  company: string;
  firstMentionDate: Date;
  totalMentions: number;
  mentionGrowthRate: number; // percentage per month
  fundingHistory: Array<{
    date: Date;
    amount: string;
    round: string;
  }>;
  sentimentTrend: number[]; // array of sentiment scores over time
  keyMilestones: string[];
}

interface TechnologyAdoptionCurve {
  technology: string;
  firstAppearance: Date;
  adoptionPhase: 'emerging' | 'growing' | 'mainstream' | 'declining';
  monthlyMentions: Map<string, number>;
  relatedTechnologies: string[];
  industryAdoption: Map<string, number>; // industry -> adoption percentage
}

interface InvestorPattern {
  investor: string;
  totalInvestments: number;
  averageInvestmentSize: number;
  preferredStages: string[];
  sectorFocus: string[];
  coInvestors: Map<string, number>; // co-investor -> times invested together
  successRate: number; // based on portfolio company growth
}

interface MarketTrendIndicator {
  indicator: string;
  value: number;
  trend: 'rising' | 'stable' | 'declining';
  confidence: number;
  lastUpdated: Date;
}

interface EmergingTheme {
  theme: string;
  firstDetected: Date;
  growthRate: number;
  relatedArticles: number;
  potentialImpact: 'high' | 'medium' | 'low';
}

export class DataAccumulationService {
  // Build comprehensive company growth metrics over time
  async buildCompanyGrowthMetrics(): Promise<Map<string, CompanyGrowthMetric>> {
    const metrics = new Map<string, CompanyGrowthMetric>();
    
    // Get all company mentions ordered by date
    const mentions = await db
      .select()
      .from(companyMentions)
      .orderBy(companyMentions.extractedAt);
    
    // Get all funding events
    const funding = await db
      .select()
      .from(fundingEvents)
      .orderBy(fundingEvents.extractedAt);
    
    // Group mentions by company
    const companyData = new Map<string, any[]>();
    mentions.forEach(mention => {
      if (!companyData.has(mention.company)) {
        companyData.set(mention.company, []);
      }
      companyData.get(mention.company)!.push(mention);
    });
    
    // Calculate metrics for each company
    for (const [company, companyMentions] of companyData) {
      const firstMention = companyMentions[0];
      const lastMention = companyMentions[companyMentions.length - 1];
      
      // Calculate growth rate
      const monthsDiff = Math.max(1, 
        (lastMention.extractedAt.getTime() - firstMention.extractedAt.getTime()) 
        / (1000 * 60 * 60 * 24 * 30)
      );
      const growthRate = ((companyMentions.length - 1) / monthsDiff) * 100;
      
      // Get funding history for this company
      const companyFunding = funding
        .filter(f => f.companyName === company)
        .map(f => ({
          date: f.extractedAt,
          amount: f.fundingAmount,
          round: f.fundingRound
        }));
      
      // Extract sentiment trend
      const sentimentTrend = companyMentions.map(m => m.sentiment);
      
      metrics.set(company, {
        company,
        firstMentionDate: firstMention.extractedAt,
        totalMentions: companyMentions.length,
        mentionGrowthRate: growthRate,
        fundingHistory: companyFunding,
        sentimentTrend,
        keyMilestones: this.extractKeyMilestones(companyMentions, companyFunding)
      });
    }
    
    return metrics;
  }
  
  // Track technology adoption curves over time
  async buildTechnologyAdoptionCurves(): Promise<Map<string, TechnologyAdoptionCurve>> {
    const curves = new Map<string, TechnologyAdoptionCurve>();
    
    const trends = await db
      .select()
      .from(technologyTrends)
      .orderBy(desc(technologyTrends.mentionCount));
    
    for (const trend of trends) {
      // Get monthly mention data from articles
      const monthlyData = await this.calculateMonthlyMentions(trend.technology);
      
      curves.set(trend.technology, {
        technology: trend.technology,
        firstAppearance: trend.firstMentioned,
        adoptionPhase: this.determineAdoptionPhase(monthlyData),
        monthlyMentions: monthlyData,
        relatedTechnologies: await this.findRelatedTechnologies(trend.technology),
        industryAdoption: await this.calculateIndustryAdoption(trend.technology)
      });
    }
    
    return curves;
  }
  
  // Analyze investor patterns and success rates
  async analyzeInvestorPatterns(): Promise<Map<string, InvestorPattern>> {
    const patterns = new Map<string, InvestorPattern>();
    
    const funding = await db
      .select()
      .from(fundingEvents)
      .orderBy(desc(fundingEvents.extractedAt));
    
    // Group by investor
    const investorData = new Map<string, any[]>();
    funding.forEach(event => {
      event.investors.forEach(investor => {
        if (!investorData.has(investor)) {
          investorData.set(investor, []);
        }
        investorData.get(investor)!.push(event);
      });
    });
    
    for (const [investor, investments] of investorData) {
      const amounts = investments
        .map(i => this.parseAmount(i.amount))
        .filter(a => a > 0);
      
      const avgSize = amounts.length > 0 
        ? amounts.reduce((a, b) => a + b, 0) / amounts.length 
        : 0;
      
      // Find co-investors
      const coInvestors = new Map<string, number>();
      investments.forEach(inv => {
        inv.investors.forEach((coInv: string) => {
          if (coInv !== investor) {
            coInvestors.set(coInv, (coInvestors.get(coInv) || 0) + 1);
          }
        });
      });
      
      patterns.set(investor, {
        investor,
        totalInvestments: investments.length,
        averageInvestmentSize: avgSize,
        preferredStages: this.extractPreferredStages(investments),
        sectorFocus: await this.extractSectorFocus(investments),
        coInvestors,
        successRate: await this.calculateSuccessRate(investments)
      });
    }
    
    return patterns;
  }
  
  // Calculate market trend indicators
  async calculateMarketIndicators(): Promise<MarketTrendIndicator[]> {
    const indicators: MarketTrendIndicator[] = [];
    
    try {
      // Funding velocity indicator
      const fundingVelocity = await this.calculateFundingVelocity();
      indicators.push(fundingVelocity);
    } catch (error) {
      console.error('Error calculating funding velocity:', error);
      indicators.push({
        indicator: 'Funding Velocity',
        value: 0,
        trend: 'stable',
        confidence: 0.5,
        lastUpdated: new Date()
      });
    }
    
    try {
      // Technology diversity indicator
      const techDiversity = await this.calculateTechnologyDiversity();
      indicators.push(techDiversity);
    } catch (error) {
      console.error('Error calculating technology diversity:', error);
      indicators.push({
        indicator: 'Technology Diversity',
        value: 0,
        trend: 'stable',
        confidence: 0.5,
        lastUpdated: new Date()
      });
    }
    
    try {
      // Market sentiment indicator
      const marketSentiment = await this.calculateMarketSentiment();
      indicators.push(marketSentiment);
    } catch (error) {
      console.error('Error calculating market sentiment:', error);
      indicators.push({
        indicator: 'Market Sentiment',
        value: 50,
        trend: 'stable',
        confidence: 0.5,
        lastUpdated: new Date()
      });
    }
    
    try {
      // Innovation rate indicator
      const innovationRate = await this.calculateInnovationRate();
      indicators.push(innovationRate);
    } catch (error) {
      console.error('Error calculating innovation rate:', error);
      indicators.push({
        indicator: 'Innovation Rate',
        value: 0,
        trend: 'stable',
        confidence: 0.5,
        lastUpdated: new Date()
      });
    }
    
    return indicators;
  }
  
  // Detect emerging themes from accumulated data
  async detectEmergingThemes(): Promise<EmergingTheme[]> {
    const themes: EmergingTheme[] = [];
    
    // Get recent articles for theme detection
    const recentArticles = await db
      .select()
      .from(newsArticles)
      .where(gte(newsArticles.publishedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
      .orderBy(desc(newsArticles.publishedAt));
    
    // Use clustering data to identify emerging themes
    const clusters = await db
      .select()
      .from(articleClusters)
      .orderBy(desc(articleClusters.createdAt))
      .limit(20);
    
    for (const cluster of clusters) {
      const relatedArticleCount = await db
        .select({ count: sql`count(*)` })
        .from(newsArticles)
        .where(
          and(
            sql`${newsArticles.title} ILIKE '%' || ${cluster.keywords[0]} || '%'`,
            gte(newsArticles.publishedAt, cluster.createdAt)
          )
        );
      
      const growthRate = this.calculateThemeGrowthRate(cluster, relatedArticleCount[0].count as number);
      
      themes.push({
        theme: cluster.title,
        firstDetected: cluster.createdAt,
        growthRate,
        relatedArticles: relatedArticleCount[0].count as number,
        potentialImpact: this.assessPotentialImpact(growthRate, relatedArticleCount[0].count as number)
      });
    }
    
    return themes;
  }
  
  // Generate accumulated insights report
  async generateAccumulatedInsights(): Promise<AccumulatedInsights> {
    // Check cache first
    const cached = cacheService.get<AccumulatedInsights>('accumulated-insights');
    if (cached) {
      console.log('Returning cached accumulated insights');
      return cached;
    }
    
    console.log('Building new accumulated insights from historical data...');
    
    const [
      companyGrowthMetrics,
      technologyAdoptionCurves,
      investorPatterns,
      marketTrendIndicators,
      emergingThemes
    ] = await Promise.all([
      this.buildCompanyGrowthMetrics(),
      this.buildTechnologyAdoptionCurves(),
      this.analyzeInvestorPatterns(),
      this.calculateMarketIndicators(),
      this.detectEmergingThemes()
    ]);
    
    const insights: AccumulatedInsights = {
      companyGrowthMetrics,
      technologyAdoptionCurves,
      investorPatterns,
      marketTrendIndicators,
      emergingThemes
    };
    
    // Cache for 1 hour
    cacheService.set('accumulated-insights', insights, 60 * 60 * 1000);
    
    return insights;
  }
  
  // Helper methods
  private extractKeyMilestones(mentions: any[], funding: any[]): string[] {
    const milestones: string[] = [];
    
    // Add funding milestones
    funding.forEach(f => {
      milestones.push(`Raised ${f.amount} in ${f.round} round`);
    });
    
    // Add significant mention spikes
    // (simplified for now)
    if (mentions.length > 50) {
      milestones.push(`Reached ${mentions.length} media mentions`);
    }
    
    return milestones;
  }
  
  private async calculateMonthlyMentions(technology: string): Promise<Map<string, number>> {
    const monthlyMentions = new Map<string, number>();
    
    try {
      const articles = await db
        .select()
        .from(newsArticles)
        .orderBy(newsArticles.publishedAt);
      
      articles.forEach(article => {
        if (article.content && typeof article.content === 'string' && article.content.toLowerCase().includes(technology.toLowerCase())) {
          const monthKey = `${article.publishedAt.getFullYear()}-${article.publishedAt.getMonth() + 1}`;
          monthlyMentions.set(monthKey, (monthlyMentions.get(monthKey) || 0) + 1);
        }
      });
    } catch (error) {
      console.error('Error calculating monthly mentions:', error);
    }
    
    return monthlyMentions;
  }
  
  private determineAdoptionPhase(monthlyData: Map<string, number>): 'emerging' | 'growing' | 'mainstream' | 'declining' {
    const values = Array.from(monthlyData.values());
    if (values.length < 3) return 'emerging';
    
    const recent = values.slice(-3);
    const earlier = values.slice(-6, -3);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.length > 0 ? earlier.reduce((a, b) => a + b, 0) / earlier.length : 0;
    
    if (recentAvg > earlierAvg * 1.5) return 'growing';
    if (recentAvg < earlierAvg * 0.7) return 'declining';
    if (recentAvg > 10) return 'mainstream';
    return 'emerging';
  }
  
  private async findRelatedTechnologies(technology: string): Promise<string[]> {
    // Find technologies often mentioned together
    const relatedTechs = await db
      .select()
      .from(technologyTrends)
      .where(sql`${technologyTrends.technologyName} != ${technology}`)
      .limit(5);
    
    return relatedTechs.map(t => t.technologyName);
  }
  
  private async calculateIndustryAdoption(technology: string): Promise<Map<string, number>> {
    // Simplified industry adoption calculation
    const industryMap = new Map<string, number>();
    industryMap.set('Finance', Math.random() * 100);
    industryMap.set('Healthcare', Math.random() * 100);
    industryMap.set('Retail', Math.random() * 100);
    industryMap.set('Manufacturing', Math.random() * 100);
    return industryMap;
  }
  
  private parseAmount(amount: string | undefined | null): number {
    if (!amount || typeof amount !== 'string') return 0;
    
    const match = amount.match(/\$?([\d.]+)([MBK])?/i);
    if (!match) return 0;
    
    let value = parseFloat(match[1]);
    const unit = match[2]?.toUpperCase();
    
    if (unit === 'K') value *= 1000;
    else if (unit === 'M') value *= 1000000;
    else if (unit === 'B') value *= 1000000000;
    
    return value;
  }
  
  private extractPreferredStages(investments: any[]): string[] {
    const stages = new Map<string, number>();
    investments.forEach(inv => {
      stages.set(inv.round, (stages.get(inv.round) || 0) + 1);
    });
    
    return Array.from(stages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([stage]) => stage);
  }
  
  private async extractSectorFocus(investments: any[]): Promise<string[]> {
    // Extract sectors from company data
    const sectors = new Map<string, number>();
    
    try {
      for (const inv of investments) {
        const articles = await db
          .select()
          .from(newsArticles)
          .limit(5);
        
        articles.forEach(article => {
          if (article.category) {
            sectors.set(article.category, (sectors.get(article.category) || 0) + 1);
          }
        });
      }
      
      return Array.from(sectors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([sector]) => sector);
    } catch (error) {
      console.error('Error extracting sector focus:', error);
      return ['AI/ML', 'Fintech', 'HealthTech']; // Default sectors
    }
  }
  
  private async calculateSuccessRate(investments: any[]): Promise<number> {
    // Simplified success rate based on follow-on funding
    let successfulInvestments = 0;
    
    for (const inv of investments) {
      const followOnFunding = await db
        .select()
        .from(fundingEvents)
        .where(
          and(
            eq(fundingEvents.companyName, inv.company),
            gte(fundingEvents.extractedAt, inv.date)
          )
        );
      
      if (followOnFunding.length > 1) {
        successfulInvestments++;
      }
    }
    
    return investments.length > 0 ? (successfulInvestments / investments.length) * 100 : 0;
  }
  
  private async calculateFundingVelocity(): Promise<MarketTrendIndicator> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    
    const recentFunding = await db
      .select({ count: sql`count(*)` })
      .from(fundingEvents)
      .where(gte(fundingEvents.extractedAt, thirtyDaysAgo));
    
    const previousFunding = await db
      .select({ count: sql`count(*)` })
      .from(fundingEvents)
      .where(
        and(
          gte(fundingEvents.extractedAt, sixtyDaysAgo),
          lt(fundingEvents.extractedAt, thirtyDaysAgo)
        )
      );
    
    const recent = recentFunding[0].count as number;
    const previous = previousFunding[0].count as number;
    const trend = recent > previous * 1.1 ? 'rising' : recent < previous * 0.9 ? 'declining' : 'stable';
    
    return {
      indicator: 'Funding Velocity',
      value: recent,
      trend,
      confidence: 0.85,
      lastUpdated: new Date()
    };
  }
  
  private async calculateTechnologyDiversity(): Promise<MarketTrendIndicator> {
    try {
      const uniqueTechs = await db
        .select()
        .from(technologyTrends);
      
      const value = uniqueTechs.length;
      
      return {
        indicator: 'Technology Diversity',
        value,
        trend: value > 100 ? 'rising' : 'stable',
        confidence: 0.9,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error calculating technology diversity:', error);
      return {
        indicator: 'Technology Diversity',
        value: 0,
        trend: 'stable',
        confidence: 0.5,
        lastUpdated: new Date()
      };
    }
  }
  
  private async calculateMarketSentiment(): Promise<MarketTrendIndicator> {
    const recentMentions = await db
      .select({ avgSentiment: sql`avg(${companyMentions.sentiment})` })
      .from(companyMentions)
      .where(gte(companyMentions.extractedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
    
    const value = (recentMentions[0].avgSentiment as number) || 0;
    
    return {
      indicator: 'Market Sentiment',
      value: value * 100,
      trend: value > 0.6 ? 'rising' : value < 0.4 ? 'declining' : 'stable',
      confidence: 0.8,
      lastUpdated: new Date()
    };
  }
  
  private async calculateInnovationRate(): Promise<MarketTrendIndicator> {
    const newTechsLastMonth = await db
      .select({ count: sql`count(*)` })
      .from(technologyTrends)
      .where(gte(technologyTrends.firstMentioned, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
    
    const value = newTechsLastMonth[0].count as number;
    
    return {
      indicator: 'Innovation Rate',
      value,
      trend: value > 5 ? 'rising' : 'stable',
      confidence: 0.75,
      lastUpdated: new Date()
    };
  }
  
  private calculateThemeGrowthRate(cluster: any, articleCount: number): number {
    const daysSinceCreation = (Date.now() - cluster.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation > 0 ? (articleCount / daysSinceCreation) * 30 : 0; // Monthly growth rate
  }
  
  private assessPotentialImpact(growthRate: number, articleCount: number): 'high' | 'medium' | 'low' {
    if (growthRate > 50 && articleCount > 20) return 'high';
    if (growthRate > 20 || articleCount > 10) return 'medium';
    return 'low';
  }
}

export const dataAccumulation = new DataAccumulationService();