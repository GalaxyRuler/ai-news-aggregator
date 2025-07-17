export interface NewsFilter {
  category: "all" | "startups" | "research" | "use-cases" | "releases" | "tools";
  confidence: number;
  dateRange: "24h" | "48h" | "week";
  regions: string[];
  search?: string;
}

export interface NewsSummary {
  totalArticles: number;
  highConfidence: number;
  breakingNews: number;
  categoryBreakdown: Record<string, number>;
}
