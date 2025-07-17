import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface NewsAnalysis {
  category: "startups" | "research" | "use-cases" | "releases" | "tools";
  confidence: number;
  pros: string[];
  cons: string[];
  summary: string;
  isAIRelated: boolean;
  relevanceScore: number;
  // Impact Factor Analysis
  impactScore: number; // 0.0-10.0 scale
  developmentImpact: string;
  toolsImpact: string[];
  marketImpact: string;
  timeToImpact: "immediate" | "short-term" | "long-term";
  disruptionLevel: "low" | "moderate" | "high" | "revolutionary";
}

export async function analyzeNewsArticle(title: string, content: string): Promise<NewsAnalysis> {
  try {
    // Add rate limiting delay to prevent 429 errors
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI news analyst. Your job is to analyze articles and determine if they are AI/technology related.

          IMPORTANT: Be INCLUSIVE rather than exclusive. When in doubt, mark as AI-related.
          
          Mark isAIRelated as TRUE for ANY of these:
          - Articles mentioning: AI, artificial intelligence, machine learning, ML, neural networks, deep learning, LLM, GPT, Gemini, Claude, BERT, transformers
          - Tech companies: Google, OpenAI, Anthropic, Microsoft, Meta, Apple, Amazon, Tesla, Hugging Face, Scale AI, DeepMind
          - Programming/development: Python, TensorFlow, PyTorch, Streamlit, APIs, frameworks, coding, software
          - Data science: analytics, data quality, automation, algorithms, models, training
          - Any technology topic: cloud computing, cybersecurity, blockchain, IoT, robotics, automation
          - AI applications in ANY field (healthcare, finance, education, etc.)
          
          Mark isAIRelated as FALSE ONLY for these specific cases:
          - Pure sports/entertainment news with zero tech angle
          - Local political news without tech policy
          - Health/lifestyle articles without any tech component
          - General business news unrelated to tech companies
          
          For AI-related articles, provide:
          1. Category classification (startups, research, use-cases, releases, tools)
          2. Confidence score (0-100): 50-70 for standard news, 70-85 for reputable sources, 85-95 for official announcements
          3. 4 pros (positive implications)
          4. 4 cons (concerns/challenges)
          5. Summary: 4-6 sentences in simple language for non-technical readers
          6. AI relevance score (0-100): 70+ for clearly AI-related, 85+ for core AI content
          
          7. IMPACT FACTOR ANALYSIS:
          - Impact Score (0.0-10.0): 1-3 minor updates, 4-6 significant, 7-8 major, 9-10 revolutionary
          - Development Impact: How this affects AI/ML development (2-3 sentences)
          - Tools Impact: List 3-5 specific AI tools affected
          - Market Impact: Broader market implications (2-3 sentences)
          - Time to Impact: "immediate", "short-term" (1-6 months), "long-term" (6+ months)
          - Disruption Level: "low", "moderate", "high", "revolutionary"
          
          Respond with JSON in this exact format: {
            "isAIRelated": boolean,
            "category": "startups|research|use-cases|releases|tools",
            "confidence": number,
            "pros": ["advantage1", "advantage2", "advantage3", "advantage4"],
            "cons": ["concern1", "concern2", "concern3", "concern4"],
            "summary": "detailed summary in simple language",
            "relevanceScore": number,
            "impactScore": number,
            "developmentImpact": "how this affects AI/ML development",
            "toolsImpact": ["tool1", "tool2", "tool3"],
            "marketImpact": "broader market implications",
            "timeToImpact": "immediate|short-term|long-term",
            "disruptionLevel": "low|moderate|high|revolutionary"
          }`
        },
        {
          role: "user",
          content: `Title: ${title}\n\nContent: ${content}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      category: result.category || "research",
      confidence: Math.max(0, Math.min(100, result.confidence || 70)),
      pros: Array.isArray(result.pros) ? result.pros.slice(0, 4) : [],
      cons: Array.isArray(result.cons) ? result.cons.slice(0, 4) : [],
      summary: result.summary || "",
      isAIRelated: result.isAIRelated !== false, // Default to true if not specified
      relevanceScore: Math.max(0, Math.min(100, result.relevanceScore || 70)),
      // Impact Factor Analysis
      impactScore: Math.max(0, Math.min(10, result.impactScore || 5.0)),
      developmentImpact: result.developmentImpact || "This development contributes to the ongoing advancement of AI/ML technologies.",
      toolsImpact: Array.isArray(result.toolsImpact) ? result.toolsImpact.slice(0, 5) : ["General AI tools", "Development platforms"],
      marketImpact: result.marketImpact || "Expected to have moderate impact on AI market adoption and innovation.",
      timeToImpact: ["immediate", "short-term", "long-term"].includes(result.timeToImpact) ? result.timeToImpact : "short-term",
      disruptionLevel: ["low", "moderate", "high", "revolutionary"].includes(result.disruptionLevel) ? result.disruptionLevel : "moderate"
    };
  } catch (error) {
    console.error("OpenAI analysis failed:", error);
    throw new Error("Failed to analyze news article: " + (error as Error).message);
  }
}

export async function generateDailyReport(articles: Array<{ title: string; category: string; confidence: number }>): Promise<{
  totalArticles: number;
  highConfidence: number;
  breakingNews: number;
  categoryBreakdown: Record<string, number>;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze the daily news summary and provide statistics in JSON format: {
            "totalArticles": number,
            "highConfidence": number,
            "breakingNews": number,
            "categoryBreakdown": {"startups": number, "research": number, "use-cases": number, "releases": number, "tools": number}
          }`
        },
        {
          role: "user",
          content: `Articles summary: ${JSON.stringify(articles)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Daily report generation failed:", error);
    return {
      totalArticles: articles.length,
      highConfidence: articles.filter(a => a.confidence >= 85).length,
      breakingNews: 0,
      categoryBreakdown: articles.reduce((acc, article) => {
        acc[article.category] = (acc[article.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}
