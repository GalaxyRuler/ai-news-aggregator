import { db } from "./db";
import { fundingEvents, companyMentions, technologyTrends, newsArticles } from "@shared/schema";
import { desc } from "drizzle-orm";

export async function seedMarketIntelligence() {
  console.log("Seeding market intelligence data...");

  try {
    // Get a few recent articles to reference
    const articles = await db.select().from(newsArticles).orderBy(desc(newsArticles.createdAt)).limit(10);
    
    if (articles.length === 0) {
      console.log("No articles found, skipping market intelligence seeding");
      return;
    }

    // Seed realistic funding events based on typical AI industry funding
    const fundingData = [
      {
        companyName: "Anthropic",
        fundingAmount: "$450M",
        fundingRound: "Series C",
        investors: ["Google", "Spark Capital", "Sound Ventures"],
        articleId: articles[0]?.id || 1,
        extractedAt: new Date(),
        confidence: 0.92
      },
      {
        companyName: "OpenAI",
        fundingAmount: "$10B",
        fundingRound: "Strategic",
        investors: ["Microsoft"],
        articleId: articles[1]?.id || 2,
        extractedAt: new Date(),
        confidence: 0.95
      },
      {
        companyName: "Cohere",
        fundingAmount: "$270M",
        fundingRound: "Series C",
        investors: ["Inovia Capital", "Index Ventures", "Tiger Global"],
        articleId: articles[2]?.id || 3,
        extractedAt: new Date(),
        confidence: 0.88
      },
      {
        companyName: "Hugging Face",
        fundingAmount: "$235M",
        fundingRound: "Series D",
        investors: ["Salesforce Ventures", "Google", "Amazon"],
        articleId: articles[3]?.id || 4,
        extractedAt: new Date(),
        confidence: 0.91
      },
      {
        companyName: "Stability AI",
        fundingAmount: "$101M",
        fundingRound: "Series A",
        investors: ["Coatue", "Lightspeed Venture Partners"],
        articleId: articles[4]?.id || 5,
        extractedAt: new Date(),
        confidence: 0.85
      }
    ];

    // Seed company mentions
    const companyMentionData = [
      {
        companyName: "OpenAI",
        mentionType: "product-launch",
        sentiment: "0.8",
        context: "GPT-4o model capabilities and performance improvements",
        articleId: articles[0]?.id || 1,
        extractedAt: new Date()
      },
      {
        companyName: "Google",
        mentionType: "research",
        sentiment: "0.7",
        context: "DeepMind's latest breakthrough in AI reasoning",
        articleId: articles[1]?.id || 2,
        extractedAt: new Date()
      },
      {
        companyName: "Microsoft",
        mentionType: "partnership",
        sentiment: "0.75",
        context: "Integration of AI tools into Office suite",
        articleId: articles[2]?.id || 3,
        extractedAt: new Date()
      },
      {
        companyName: "Meta",
        mentionType: "open-source",
        sentiment: "0.72",
        context: "LLaMA model improvements and accessibility",
        articleId: articles[3]?.id || 4,
        extractedAt: new Date()
      },
      {
        companyName: "Anthropic",
        mentionType: "safety",
        sentiment: "0.85",
        context: "Constitutional AI and safety research advancements",
        articleId: articles[4]?.id || 5,
        extractedAt: new Date()
      },
      {
        companyName: "NVIDIA",
        mentionType: "hardware",
        sentiment: "0.78",
        context: "New AI chips and computing infrastructure",
        articleId: articles[5]?.id || 6,
        extractedAt: new Date()
      }
    ];

    // Seed technology trends
    const technologyTrendData = [
      {
        technologyName: "GPT-4o",
        category: "LLM",
        adoptionStage: "mainstream",
        mentionCount: 15,
        trendDirection: "growing",
        avgSentiment: 0.82,
        firstMentioned: new Date(),
        lastMentioned: new Date()
      },
      {
        technologyName: "Claude 3",
        category: "LLM",
        adoptionStage: "emerging",
        mentionCount: 8,
        trendDirection: "growing",
        avgSentiment: 0.79,
        firstMentioned: new Date(),
        lastMentioned: new Date()
      },
      {
        technologyName: "DALL-E 3",
        category: "computer-vision",
        adoptionStage: "mainstream",
        mentionCount: 12,
        trendDirection: "stable",
        avgSentiment: 0.75,
        firstMentioned: new Date(),
        lastMentioned: new Date()
      },
      {
        technologyName: "Llama 3",
        category: "LLM",
        adoptionStage: "emerging",
        mentionCount: 10,
        trendDirection: "growing",
        avgSentiment: 0.71,
        firstMentioned: new Date(),
        lastMentioned: new Date()
      },
      {
        technologyName: "Whisper",
        category: "voice-ai",
        adoptionStage: "mainstream",
        mentionCount: 7,
        trendDirection: "stable",
        avgSentiment: 0.73,
        firstMentioned: new Date(),
        lastMentioned: new Date()
      },
      {
        technologyName: "Sora",
        category: "video-generation",
        adoptionStage: "experimental",
        mentionCount: 6,
        trendDirection: "emerging",
        avgSentiment: 0.88,
        firstMentioned: new Date(),
        lastMentioned: new Date()
      },
      {
        technologyName: "AutoGPT",
        category: "autonomous-agents",
        adoptionStage: "experimental",
        mentionCount: 5,
        trendDirection: "emerging",
        avgSentiment: 0.65,
        firstMentioned: new Date(),
        lastMentioned: new Date()
      }
    ];

    // Insert data into tables
    console.log("Inserting funding events...");
    await db.insert(fundingEvents).values(fundingData);

    console.log("Inserting company mentions...");
    await db.insert(companyMentions).values(companyMentionData);

    console.log("Inserting technology trends...");
    await db.insert(technologyTrends).values(technologyTrendData);

    console.log("Market intelligence seeding completed successfully!");
    return {
      fundingEvents: fundingData.length,
      companyMentions: companyMentionData.length,
      technologyTrends: technologyTrendData.length
    };

  } catch (error) {
    console.error("Error seeding market intelligence:", error);
    throw error;
  }
}