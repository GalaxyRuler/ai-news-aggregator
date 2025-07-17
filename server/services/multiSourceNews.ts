import { InsertNewsArticle, NewsSource } from "@shared/schema.js";
import { fetchRSSFeed } from "./rssService.js";
import { newsDataService } from "./newsDataService.js";
import { newsApiService } from "./newsApiService.js";
import { alphaVantageService } from "./alphaVantageService.js";
import { serpApiService } from "./serpApiService.js";

import { storage } from "../storage.js";
import { validateNewsBeforeInsertion } from "./newsVerification.js";
import { cacheService } from "./cacheService.js";
import { removeDuplicateArticles, filterValidArticleUrls } from "./articleDeduplication.js";

export async function collectFromAllSources(purpose?: 'dashboard' | 'market-intelligence'): Promise<InsertNewsArticle[]> {
  console.log(`Starting news collection from sources${purpose ? ` for ${purpose}` : ' (all sources)'}`);
  
  const allArticles: InsertNewsArticle[] = [];
  const sources = purpose 
    ? await storage.getNewsSourcesByPurpose(purpose)
    : await storage.getNewsSources();
  
  console.log(`Found ${sources.length} configured news sources${purpose ? ` for ${purpose}` : ''}`);

  // Get existing article URLs from cache for deduplication
  const existingUrls = cacheService.getProcessedUrls();
  console.log(`Cache contains ${existingUrls.length} processed article URLs`);

  // Collect from all active sources dynamically
  let rssCount = 0;
  let apiCount = 0;
  
  for (const source of sources) {
    if (!source.isActive) {
      console.log(`Skipping inactive source: ${source.name}`);
      continue;
    }

    // Check if source should be fetched based on cache
    if (!cacheService.shouldFetchSource(source.id, 15)) {
      console.log(`Skipping ${source.name} - recently fetched (within 15 minutes)`);
      continue;
    }

    console.log(`Processing ${source.type.toUpperCase()} source: ${source.name}`);
    
    try {
      let sourceArticles: InsertNewsArticle[] = [];

      if (source.type === "rss") {
        sourceArticles = await fetchRSSFeed(source.url as string, source.name);
        rssCount++;
      } else if (source.type === "api") {
        // Handle different API types dynamically
        if (source.name.toLowerCase().includes("newsdata")) {
          sourceArticles = await newsDataService.fetchAINews() as unknown as InsertNewsArticle[];
        } else if (source.name.toLowerCase().includes("newsapi")) {
          sourceArticles = await newsApiService.fetchAINews() as unknown as InsertNewsArticle[];
        } else if (source.name.toLowerCase().includes("alphavantage")) {
          sourceArticles = await alphaVantageService.fetchMarketNews() as unknown as InsertNewsArticle[];

        }
        apiCount++;
      }

      if (sourceArticles.length > 0) {
        // Filter out already processed articles
        const newArticles = sourceArticles.filter(article => 
          article.sourceUrl && !existingUrls.includes(article.sourceUrl)
        );
        
        console.log(`${source.name}: ${newArticles.length} new articles (${sourceArticles.length - newArticles.length} duplicates filtered)`);
        
        if (newArticles.length > 0) {
          allArticles.push(...newArticles);
          
          // Cache new article URLs
          const newUrls = newArticles.map(a => a.sourceUrl).filter(Boolean) as string[];
          cacheService.cacheArticleUrls(newUrls);
        }
        
        // Update source last fetch time in cache
        cacheService.setSourceLastFetch(source.id, source.name, newArticles.length);
        
        // Update last fetch time in database
        await storage.updateNewsSource(source.id, {
          lastFetch: new Date()
        });
      }
    } catch (error) {
      console.error(`Error collecting from ${source.name}:`, error);
    }
  }
  
  console.log(`Collected from ${rssCount} RSS sources`);

  // Collect from NewsData.io API
  try {
    console.log("Fetching from NewsData.io API...");
    const aiArticles = await newsDataService.fetchAINews();
    const marketArticles = await newsDataService.fetchMarketNews();
    
    // Process NewsData.io articles
    const processedAI = await newsDataService.processAINews(aiArticles);
    const processedMarket = await newsDataService.processAINews(marketArticles); // Use same processing for market articles
    
    allArticles.push(...processedAI, ...processedMarket);
    console.log(`NewsData.io: ${processedAI.length + processedMarket.length} articles collected (${processedAI.length} AI, ${processedMarket.length} market)`);
  } catch (error) {
    console.error("Failed to fetch from NewsData.io:", error);
  }

  // Collect from SerpAPI (Google News)
  try {
    console.log("Fetching from SerpAPI Google News...");
    const serpApiArticles = await serpApiService.fetchAINews();
    if (serpApiArticles.length > 0) {
      console.log(`SerpAPI: Fetched ${serpApiArticles.length} articles`);
      allArticles.push(...serpApiArticles);
    } else {
      console.log('SerpAPI: No articles fetched');
    }
  } catch (error) {
    console.error(`SerpAPI: Error - ${error.message}`);
  }

  // Remove duplicates based on title similarity
  const uniqueArticles = removeDuplicateArticles(allArticles);
  console.log(`Collected ${allArticles.length} total articles, ${uniqueArticles.length} unique articles`);
  
  // Filter out articles with RSS feed URLs as source
  const articlesWithValidUrls = filterValidArticleUrls(uniqueArticles);
  console.log(`After URL cleanup: ${articlesWithValidUrls.length} articles with valid source URLs`);
  
  // Verify news authenticity before returning
  console.log(`Starting verification of ${articlesWithValidUrls.length} articles with valid URLs`);
  const verifiedArticles = await validateNewsBeforeInsertion(articlesWithValidUrls);
  console.log(`${verifiedArticles.length} articles passed verification (${articlesWithValidUrls.length - verifiedArticles.length} rejected)`);
  
  if (verifiedArticles.length === 0) {
    console.log("⚠️  WARNING: No articles passed verification - all were rejected!");
    console.log("Sample of rejected articles:");
    articlesWithValidUrls.slice(0, 3).forEach(article => {
      console.log(`- "${article.title}" from ${article.source} (${article.sourceUrl})`);
    });
  }
  
  return verifiedArticles;
}



function convertToRSSUrl(url: string, sourceName: string): string | null {
  // Convert various source URLs to proper RSS feeds
  const conversions: Record<string, string> = {
    "https://www.technologyreview.com/topic/artificial-intelligence/": "https://www.technologyreview.com/feed/",
    "https://venturebeat.com/ai/": "https://venturebeat.com/ai/feed/",
    "https://techcrunch.com/category/artificial-intelligence/feed/": "https://techcrunch.com/category/artificial-intelligence/feed/",
    "https://www.wired.com/tag/artificial-intelligence/": "https://www.wired.com/feed/tag/artificial-intelligence/latest/rss",
    "https://spectrum.ieee.org/topic/artificial-intelligence/": "https://spectrum.ieee.org/feed/topic/artificial-intelligence",
    "https://towardsdatascience.com/": "https://towardsdatascience.com/feed",
    "https://aibusiness.com/": "https://aibusiness.com/rss.xml",
    "https://www.theregister.com/machine_learning/": "https://www.theregister.com/headlines.atom",
    // New sources with RSS feeds
    "https://aimagazine.com/": "https://aimagazine.com/rss.xml",
    "https://www.therundown.ai/": "https://www.therundown.ai/rss",
    "https://bensbites.co/": "https://bensbites.co/rss",
    "https://tldr.tech/ai": "https://tldr.tech/ai/rss",
    "https://www.kdnuggets.com/": "https://www.kdnuggets.com/feed",
    "https://www.analyticsvidhya.com/": "https://www.analyticsvidhya.com/feed/",
    "https://thegradient.pub/": "https://thegradient.pub/rss/",
    "https://www.poynter.org/": "https://www.poynter.org/feed/",
    "https://openai.com/": "https://openai.com/index/rss.xml",
    "https://deepmind.google/discover/blog/": "https://deepmind.google/discover/blog/rss.xml",
    "https://ai.meta.com/research/": "https://ai.meta.com/rss.xml",
    "https://bair.berkeley.edu/blog/": "https://bair.berkeley.edu/blog/feed.xml",
    "https://technode.com/": "https://technode.com/feed/",
    "https://www.cgtn.com/sci-tech.html": "https://www.cgtn.com/rss/sci-tech.xml",
    "https://asia.nikkei.com/": "https://asia.nikkei.com/rss/feed",
    "https://www.aitimes.com/": "https://www.aitimes.com/rss",
    "https://www.aitimes.kr/": "https://www.aitimes.kr/rss",
    "https://www.tahawultech.com/": "https://www.tahawultech.com/feed/",
    "https://www.wamda.com/": "https://www.wamda.com/feed/",
    "https://magnitt.com/": "https://magnitt.com/feed/",
    "https://www.khaleejtimes.com/": "https://www.khaleejtimes.com/rss.xml",
    "https://www.arabnews.com/": "https://www.arabnews.com/rss.xml",
    "https://www.theverge.com/ai-artificial-intelligence/": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    "https://www.zdnet.com/topic/ai/": "https://www.zdnet.com/rss/topic/ai/",
    "https://venturebeat.com/category/ai/": "https://venturebeat.com/category/ai/feed/",
    "https://www.forbes.com/ai/": "https://www.forbes.com/ai/rss/",
    "https://machinelearningmastery.com/": "https://machinelearningmastery.com/feed/",
    "https://medium.com/towards-data-science": "https://medium.com/feed/towards-data-science",
    "https://towardsai.net/": "https://towardsai.net/feed",
    "https://huggingface.co/blog": "https://huggingface.co/blog/feed.xml",
    "https://ai.google/": "https://ai.google/rss.xml",
    "https://blog.google/technology/ai/": "https://blog.google/rss/",
    "https://blogs.nvidia.com/": "https://blogs.nvidia.com/feed/",
    "https://www.brookings.edu/topic/artificial-intelligence/": "https://www.brookings.edu/feed/",
    "https://news.yale.edu/": "https://news.yale.edu/rss.xml",
    "https://news.harvard.edu/gazette/": "https://news.harvard.edu/gazette/feed/",
    "https://gigazine.net/": "https://gigazine.net/news/rss_2.0/",
    "https://www.techinasia.com/": "https://www.techinasia.com/feed",
    "https://www.thenationalnews.com/": "https://www.thenationalnews.com/rss.xml",
    "https://www.zawya.com/": "https://www.zawya.com/rss/",
    "https://economymiddleeast.com/": "https://economymiddleeast.com/feed/",
    "https://www.dailynewsegypt.com/": "https://www.dailynewsegypt.com/feed/"
  };

  // Check for direct conversion
  if (conversions[url]) {
    return conversions[url];
  }

  // Handle feed URLs that are already RSS
  if (url.includes("/feed") || url.includes(".rss") || url.includes(".xml") || url.includes("/rss")) {
    return url;
  }

  // For sources we can't convert, try adding common RSS patterns
  if (url.includes("blog") || url.includes("news")) {
    return url + (url.endsWith("/") ? "" : "/") + "feed";
  }

  console.log(`No RSS conversion available for ${sourceName}: ${url}`);
  return null;
}

// Enhanced RSS feed URLs for better coverage
export const enhancedRSSFeeds = [
  {
    name: "MIT Technology Review AI",
    url: "https://www.technologyreview.com/feed/",
    categories: ["research", "releases", "use-cases"]
  },
  {
    name: "VentureBeat AI",
    url: "https://venturebeat.com/ai/feed/",
    categories: ["startups", "releases", "tools"]
  },
  {
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    categories: ["startups", "releases"]
  },
  {
    name: "Wired AI",
    url: "https://www.wired.com/feed/tag/artificial-intelligence/latest/rss",
    categories: ["use-cases", "releases", "startups"]
  },
  {
    name: "The Register AI",
    url: "https://www.theregister.com/machine_learning/headlines.atom",
    categories: ["tools", "releases", "use-cases"]
  }
];

export async function testMultiSourceCollection(): Promise<void> {
  console.log("Testing multi-source news collection...");
  
  // Test a few key RSS feeds directly
  for (const feed of enhancedRSSFeeds.slice(0, 3)) {
    try {
      console.log(`Testing ${feed.name}...`);
      const articles = await fetchRSSFeed(feed.url, feed.name);
      console.log(`✓ ${feed.name}: ${articles.length} articles collected`);
    } catch (error) {
      console.log(`✗ ${feed.name}: Failed - ${error}`);
    }
  }
}