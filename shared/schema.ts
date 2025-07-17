import { pgTable, text, serial, integer, boolean, timestamp, json, decimal, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const newsArticles = pgTable("news_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  content: text("content"),
  url: text("url").notNull(),
  imageUrl: text("image_url"),
  source: text("source").notNull(),
  sourceUrl: text("source_url").notNull(),
  category: text("category").notNull(), // startups, research, use-cases, releases, tools
  confidence: text("confidence").notNull(),
  pros: json("pros").$type<string[]>().notNull().default([]),
  cons: json("cons").$type<string[]>().notNull().default([]),
  publishedAt: timestamp("published_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isBreaking: boolean("is_breaking").default(false).notNull(),
  region: text("region").notNull().default("Global"),
  // Impact Factor Analysis
  impactScore: text("impact_score").notNull().default("0"), // 0-10 scale
  developmentImpact: text("development_impact").notNull().default(""), // How this affects AI/ML development
  toolsImpact: json("tools_impact").$type<string[]>().notNull().default([]), // Specific tools/services affected
  marketImpact: text("market_impact").notNull().default(""), // Broader market implications
  timeToImpact: text("time_to_impact").notNull().default(""), // immediate, short-term, long-term
  disruptionLevel: text("disruption_level").notNull().default(""), // low, moderate, high, revolutionary
});

export const insertNewsArticleSchema = createInsertSchema(newsArticles).omit({
  id: true,
  createdAt: true,
});

export type InsertNewsArticle = z.infer<typeof insertNewsArticleSchema>;
export type NewsArticle = typeof newsArticles.$inferSelect;

// Filter schemas
export const filterSchema = z.object({
  category: z.enum(["all", "startups", "research", "use-cases", "releases", "tools"]).default("all"),
  confidence: z.number().min(0).max(100).default(70),
  dateRange: z.enum(["24h", "48h", "week"]).default("24h"),
  regions: z.array(z.string()).default(["global", "mena", "far-asia", "north-america"]),
  search: z.string().optional(),
});

export type NewsFilter = z.infer<typeof filterSchema>;

// News sources schema
export const newsSources = pgTable("news_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "api", "rss", "serpapi"
  url: text("url"),
  apiKey: text("api_key"),
  isActive: boolean("is_active").default(true).notNull(),
  purpose: text("purpose").notNull().default("both"), // "dashboard", "market-intelligence", "both"
  regions: json("regions").$type<string[]>().notNull().default(["global"]),
  categories: json("categories").$type<string[]>().notNull().default(["all"]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastFetch: timestamp("last_fetch"),
});

export const insertNewsSourceSchema = createInsertSchema(newsSources).omit({
  id: true,
  createdAt: true,
});

export type InsertNewsSource = z.infer<typeof insertNewsSourceSchema>;
export type NewsSource = typeof newsSources.$inferSelect;

// Weekly AI Reports
export const weeklyReports = pgTable("weekly_reports", {
  id: serial("id").primaryKey(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  analysis: text("analysis").notNull(),
  recommendations: text("recommendations").array().notNull(),
  predictions: text("predictions").array().notNull(),
  keyTrends: text("key_trends").array().notNull(),
  articlesAnalyzed: integer("articles_analyzed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWeeklyReportSchema = createInsertSchema(weeklyReports).omit({
  id: true,
  createdAt: true,
});

export type InsertWeeklyReport = z.infer<typeof insertWeeklyReportSchema>;
export type WeeklyReport = typeof weeklyReports.$inferSelect;

// User Preferences for Personalization Engine
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  interests: text("interests").array().notNull().default(["general"]), // AI domains: NLP, computer-vision, robotics, etc.
  followedCompanies: text("followed_companies").array().notNull().default([]),
  notificationSettings: json("notification_settings").$type<{
    breakingNews: boolean;
    fundingAlerts: boolean;
    companyMentions: boolean;
    researchPapers: boolean;
  }>().notNull().default({ breakingNews: true, fundingAlerts: true, companyMentions: true, researchPapers: true }),
  readingHistory: integer("reading_history").array().notNull().default([]), // Article IDs
  preferredSources: text("preferred_sources").array().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Company Mentions for Market Intelligence
export const companyMentions = pgTable("company_mentions", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").references(() => newsArticles.id), // Optional reference to news article
  companyName: text("company_name").notNull(),
  mentionType: text("mention_type").notNull(), // funding, partnership, product, acquisition, hiring
  sentiment: decimal("sentiment", { precision: 3, scale: 2 }).notNull().default("0.0"), // -1 to 1
  context: text("context"), // Surrounding text snippet
  source: text("source").notNull().default("SerpAPI"), // Data source: SerpAPI, RSS, Manual
  sourceUrl: text("source_url"), // Original source URL
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
});

// Funding Events Tracking - Independent tracking system
export const fundingEvents = pgTable("funding_events", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").references(() => newsArticles.id), // Optional reference to news article
  companyName: text("company_name").notNull(),
  fundingAmount: text("funding_amount"), // "$10M", "undisclosed"
  fundingRound: text("funding_round"), // Seed, Series A, B, C, etc.
  investors: text("investors").array().notNull().default([]),
  valuation: text("valuation"),
  sector: text("sector").notNull().default("AI/ML"),
  location: text("location"),
  source: text("source").notNull().default("SerpAPI"), // Data source: SerpAPI, RSS, Manual
  sourceUrl: text("source_url"), // Original source URL
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
});

// Technology Trends for Market Intelligence - Independent tracking system
export const technologyTrends = pgTable("technology_trends", {
  id: serial("id").primaryKey(),
  technologyName: text("technology_name").notNull(),
  category: text("category").notNull(), // LLM, computer-vision, robotics, etc.
  adoptionStage: text("adoption_stage").notNull(), // experimental, emerging, mainstream, mature
  mentionCount: integer("mention_count").notNull().default(0),
  sentimentAvg: decimal("sentiment_avg", { precision: 3, scale: 2 }).notNull().default("0.0"),
  lastMentioned: timestamp("last_mentioned"),
  trendDirection: text("trend_direction").notNull().default("stable"), // rising, falling, stable
  weeklyMentions: integer("weekly_mentions").array().notNull().default([]),
  source: text("source").notNull().default("SerpAPI"), // Data source: SerpAPI, RSS, Manual
  sourceUrl: text("source_url"), // Original source URL
  firstMentioned: timestamp("first_mentioned").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Article Clusters for Content Discovery
export const articleClusters = pgTable("article_clusters", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  articleIds: integer("article_ids").array().notNull(),
  similarity: decimal("similarity", { precision: 3, scale: 2 }).notNull().default("0.8"),
  clusterType: text("cluster_type").notNull(), // story, topic, event, technology
  keywords: text("keywords").array().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Recommendation Engine Data
export const articleRecommendations = pgTable("article_recommendations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  articleId: integer("article_id").references(() => newsArticles.id).notNull(),
  score: decimal("score", { precision: 3, scale: 2 }).notNull(), // 0-1 relevance score
  reason: text("reason").notNull(), // Why recommended
  recommendationType: text("recommendation_type").notNull(), // interest, company, similar, trending
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Search Analytics
export const searchQueries = pgTable("search_queries", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  userId: text("user_id").notNull().default("default"),
  resultsCount: integer("results_count").notNull().default(0),
  searchType: text("search_type").notNull().default("keyword"), // keyword, semantic, company, technology
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanyMentionSchema = createInsertSchema(companyMentions).omit({
  id: true,
  extractedAt: true,
});

export const insertFundingEventSchema = createInsertSchema(fundingEvents).omit({
  id: true,
  extractedAt: true,
});

export const insertTechnologyTrendSchema = createInsertSchema(technologyTrends).omit({
  id: true,
  updatedAt: true,
});

export const insertArticleClusterSchema = createInsertSchema(articleClusters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertArticleRecommendationSchema = createInsertSchema(articleRecommendations).omit({
  id: true,
  createdAt: true,
});

export const insertSearchQuerySchema = createInsertSchema(searchQueries).omit({
  id: true,
  createdAt: true,
});

// Types
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type CompanyMention = typeof companyMentions.$inferSelect;
export type InsertCompanyMention = z.infer<typeof insertCompanyMentionSchema>;
export type FundingEvent = typeof fundingEvents.$inferSelect;
export type InsertFundingEvent = z.infer<typeof insertFundingEventSchema>;
export type TechnologyTrend = typeof technologyTrends.$inferSelect;
export type InsertTechnologyTrend = z.infer<typeof insertTechnologyTrendSchema>;
export type ArticleCluster = typeof articleClusters.$inferSelect;
export type InsertArticleCluster = z.infer<typeof insertArticleClusterSchema>;
export type ArticleRecommendation = typeof articleRecommendations.$inferSelect;
export type InsertArticleRecommendation = z.infer<typeof insertArticleRecommendationSchema>;
export type SearchQuery = typeof searchQueries.$inferSelect;
export type InsertSearchQuery = z.infer<typeof insertSearchQuerySchema>;

// Authentication sessions for password protection
export const authSessions = pgTable("auth_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
  isAuthenticated: boolean("is_authenticated").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertAuthSessionSchema = createInsertSchema(authSessions).omit({
  id: true,
  createdAt: true,
});

export type AuthSession = typeof authSessions.$inferSelect;
export type InsertAuthSession = z.infer<typeof insertAuthSessionSchema>;

// Market Intelligence Sources
export const marketIntelligenceSources = pgTable("market_intelligence_sources", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'funding', 'analytics', 'news', 'regional'
  url: text("url").notNull(),
  apiEndpoint: text("api_endpoint"),
  requiresAuth: boolean("requires_auth").default(false),
  description: text("description"),
  dataTypes: text("data_types").array(), // Array of data types this source provides
  region: varchar("region", { length: 100}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketIntelligenceSourceSchema = createInsertSchema(marketIntelligenceSources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MarketIntelligenceSource = typeof marketIntelligenceSources.$inferSelect;
export type InsertMarketIntelligenceSource = z.infer<typeof insertMarketIntelligenceSourceSchema>;
