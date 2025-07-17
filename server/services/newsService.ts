import { analyzeNewsArticle } from "./openai.js";
import { InsertNewsArticle } from "@shared/schema.js";

interface RawNewsItem {
  title: string;
  content: string;
  sources: string[];
  regions: string[];
  publishedAt: Date;
  isBreaking?: boolean;
  sourceUrls: string[];
}

// Mock news data for demonstration - in production this would connect to news APIs
const mockNewsData: RawNewsItem[] = [
  {
    title: "Google DeepMind Announces Breakthrough in Quantum AI Computing with 99.9% Error Correction",
    content: "Google DeepMind researchers have achieved a significant milestone in quantum computing by developing an AI system that can correct quantum errors with 99.9% accuracy, potentially accelerating the timeline for practical quantum computers by several years. The breakthrough addresses one of the most significant challenges in quantum computing - maintaining quantum states long enough to perform meaningful calculations.",
    sources: ["Nature Journal", "TechCrunch", "MIT Review"],
    regions: ["global", "north-america"],
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isBreaking: true,
    sourceUrls: ["https://nature.com/quantum-ai", "https://techcrunch.com/quantum-breakthrough"]
  },
  {
    title: "Middle Eastern AI Startup Raises $120M Series B to Expand Arabic Language Models",
    content: "Dubai-based Arabot AI has secured $120 million in Series B funding led by Gulf Innovation Fund to develop advanced Arabic language models, addressing the significant gap in Arabic AI capabilities across MENA region. The funding will be used to expand their team and develop culturally-aware AI systems.",
    sources: ["Gulf Business", "TechCrunch ME"],
    regions: ["mena"],
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    sourceUrls: ["https://gulfbusiness.com/arabot-funding", "https://techcrunch.com/arabot-series-b"]
  },
  {
    title: "Japanese Hospital Network Deploys AI for Real-Time Surgery Decision Support",
    content: "Tokyo Medical Center Network has successfully implemented an AI system that provides real-time surgical guidance and risk assessment, reducing surgery complications by 23% across 15 hospitals in the first six months of deployment. The system uses computer vision and machine learning to analyze surgical procedures in real-time.",
    sources: ["Medical Journal", "Nikkei Asia"],
    regions: ["far-asia"],
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    sourceUrls: ["https://medical-journal.com/ai-surgery", "https://asia.nikkei.com/surgery-ai"]
  },
  {
    title: "Microsoft Releases Open-Source AutoGen 2.0 for Multi-Agent AI Development",
    content: "Microsoft has launched AutoGen 2.0, an enhanced open-source framework for building multi-agent conversational AI systems, featuring improved performance, better integration capabilities, and support for complex agent orchestration patterns. The release includes comprehensive documentation and example implementations.",
    sources: ["GitHub", "Microsoft Blog", "Dev Community"],
    regions: ["global"],
    publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
    sourceUrls: ["https://github.com/microsoft/autogen", "https://microsoft.com/autogen-2"]
  },
  {
    title: "European Union Finalizes AI Act Implementation Guidelines for Healthcare Sector",
    content: "The European Commission has published comprehensive implementation guidelines for AI systems in healthcare under the AI Act, establishing clear compliance requirements for medical AI applications. The guidelines provide specific requirements for risk assessment, documentation, and ongoing monitoring of AI systems in clinical settings.",
    sources: ["EU Commission", "Healthcare IT News"],
    regions: ["global"],
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    sourceUrls: ["https://ec.europa.eu/ai-act-healthcare", "https://healthcareitnews.com/eu-ai-act"]
  }
];

export async function collectAndAnalyzeNews(): Promise<InsertNewsArticle[]> {
  const analyzedArticles: InsertNewsArticle[] = [];

  for (const rawNews of mockNewsData) {
    try {
      const analysis = await analyzeNewsArticle(rawNews.title, rawNews.content);
      
      const article: InsertNewsArticle = {
        title: rawNews.title,
        summary: analysis.summary,
        content: rawNews.content,
        category: analysis.category,
        sources: rawNews.sources,
        regions: rawNews.regions,
        confidence: analysis.confidence.toString(),
        pros: analysis.pros,
        cons: analysis.cons,
        publishedAt: rawNews.publishedAt,
        isBreaking: rawNews.isBreaking || false,
        sourceUrls: rawNews.sourceUrls,
        // Impact Factor Analysis
        impactScore: analysis.impactScore.toString(),
        developmentImpact: analysis.developmentImpact,
        toolsImpact: analysis.toolsImpact,
        marketImpact: analysis.marketImpact,
        timeToImpact: analysis.timeToImpact,
        disruptionLevel: analysis.disruptionLevel,
      };

      analyzedArticles.push(article);
    } catch (error) {
      console.error(`Failed to analyze article: ${rawNews.title}`, error);
      // Continue with next article
    }
  }

  return analyzedArticles;
}
