import OpenAI from "openai";
import { NewsArticle, InsertWeeklyReport } from "../../shared/schema.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface WeeklyAnalysis {
  title: string;
  content: string;
  analysis: string;
  recommendations: string[];
  predictions: string[];
  keyTrends: string[];
}

export async function generateWeeklyReport(articles: NewsArticle[]): Promise<WeeklyAnalysis> {
  if (articles.length === 0) {
    throw new Error("No articles available for weekly report generation");
  }

  // Prepare article summaries for analysis
  const articleSummaries = articles.map(article => ({
    title: article.title,
    category: article.category,
    confidence: article.confidence,
    summary: article.summary,
    publishedAt: article.publishedAt
  }));

  const prompt = `You are an AI industry analyst tasked with creating "The State of AI This Week" report. 

Analyze the following ${articles.length} AI news articles from this week:

${JSON.stringify(articleSummaries, null, 2)}

Generate a comprehensive weekly report with the following structure:

1. ANALYSIS: A 3-4 paragraph executive summary of the week's most significant AI developments, highlighting major themes, breakthrough announcements, and industry shifts.

2. KEY TRENDS: Identify 5-7 major trends or patterns observed this week (e.g., "Enterprise AI adoption accelerating", "New foundation model capabilities", "Regulatory developments").

3. RECOMMENDATIONS: Provide 4-6 actionable recommendations for AI professionals, businesses, or researchers based on this week's developments.

4. PREDICTIONS: Make 4-6 informed predictions about what these developments might lead to in the next 1-3 months, based on the patterns observed.

Focus on:
- Breakthrough technologies and their implications
- Market movements and business impacts  
- Regulatory and ethical developments
- Research breakthroughs and their potential applications
- Industry consolidation or competition dynamics

Respond with JSON in this exact format:
{
  "title": "The State of AI This Week - [Week Date Range]",
  "content": "Executive summary paragraph that captures the week's essence in 2-3 sentences",
  "analysis": "Detailed 3-4 paragraph analysis",
  "recommendations": ["recommendation1", "recommendation2", ...],
  "predictions": ["prediction1", "prediction2", ...],
  "keyTrends": ["trend1", "trend2", ...]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert AI industry analyst. Provide comprehensive, insightful analysis based on real news data. Always respond with valid JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      title: result.title || "The State of AI This Week",
      content: result.content || "Weekly AI industry analysis",
      analysis: result.analysis || "Analysis unavailable",
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
      predictions: Array.isArray(result.predictions) ? result.predictions : [],
      keyTrends: Array.isArray(result.keyTrends) ? result.keyTrends : []
    };

  } catch (error) {
    console.error("Error generating weekly report:", error);
    throw new Error("Failed to generate weekly AI report: " + (error as Error).message);
  }
}

export function getWeekDateRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate the start of the current week (Monday)
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  // Calculate the end of the current week (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
}

export function getPreviousWeekDateRange(): { weekStart: Date; weekEnd: Date } {
  const { weekStart: currentWeekStart } = getWeekDateRange();
  
  const weekStart = new Date(currentWeekStart);
  weekStart.setDate(currentWeekStart.getDate() - 7);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
}