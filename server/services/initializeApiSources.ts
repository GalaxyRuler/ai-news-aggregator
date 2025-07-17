import { storage } from "../storage.js";

export async function initializeNewApiSources() {
  console.log("Initializing new API sources...");
  
  const newSources = [
    {
      name: "Alpha Vantage Financial News",
      type: "api" as const,
      url: "https://www.alphavantage.co/query",
      description: "Real-time financial news with AI sentiment analysis and market data",
      isActive: true,
      category: "Financial Intelligence",
      region: "Global",
      lastFetch: null,
      apiKey: null // Will use ALPHA_VANTAGE_API_KEY environment variable
    },
    {
      name: "The News API",
      type: "api" as const,
      url: "https://api.thenewsapi.com/v1/news",
      description: "Free comprehensive news aggregation with real-time AI/tech coverage",
      isActive: true,
      category: "General News",
      region: "Global", 
      lastFetch: null,
      apiKey: null // Completely free - no API key required
    },
    {
      name: "CoinGecko Crypto Data",
      type: "api" as const,
      url: "https://api.coingecko.com/api/v3",
      description: "Cryptocurrency market data with 17,000+ coins and real-time prices",
      isActive: true,
      category: "Cryptocurrency",
      region: "Global",
      lastFetch: null,
      apiKey: null // Free tier available
    }
  ];

  let addedCount = 0;
  
  for (const sourceData of newSources) {
    try {
      // Check if source already exists
      const existingSources = await storage.getNewsSources();
      const exists = existingSources.some(existing => existing.name === sourceData.name);
      
      if (!exists) {
        await storage.createNewsSource(sourceData);
        console.log(`Added new API source: ${sourceData.name}`);
        addedCount++;
      } else {
        console.log(`API source already exists: ${sourceData.name}`);
      }
    } catch (error) {
      console.error(`Error adding API source ${sourceData.name}:`, error);
    }
  }
  
  console.log(`Initialization complete. Added ${addedCount} new API sources.`);
  return { addedCount, total: newSources.length };
}