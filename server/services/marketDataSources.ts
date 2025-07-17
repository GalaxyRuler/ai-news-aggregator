export interface MarketDataSource {
  name: string;
  type: 'funding' | 'analytics' | 'regional' | 'news';
  url: string;
  region?: string;
  apiEndpoint?: string;
  requiresAuth: boolean;
  description: string;
  dataTypes: string[];
}

export const marketIntelligenceSources: MarketDataSource[] = [
  // Real-time Search & News Intelligence
  {
    name: "SerpAPI",
    type: "news",
    url: "https://serpapi.com",
    apiEndpoint: "https://serpapi.com/search",
    requiresAuth: true,
    description: "Real-time Google search results for funding news, company mentions, and technology trends",
    dataTypes: ["real-time-news", "funding-events", "company-mentions", "technology-trends", "market-analysis"]
  },
  {
    name: "NewsData.io",
    type: "news",
    url: "https://newsdata.io",
    apiEndpoint: "https://newsdata.io/api/1/news",
    requiresAuth: true,
    description: "Global news API with AI/ML focus and market intelligence for startup funding and technology trends",
    dataTypes: ["ai-news", "technology-news", "funding-news", "startup-news", "market-intelligence", "business-news"]
  },
  // Global Funding Platforms
  {
    name: "Crunchbase",
    type: "funding",
    url: "https://www.crunchbase.com",
    apiEndpoint: "https://api.crunchbase.com/v4",
    requiresAuth: true,
    description: "Comprehensive database of startups, funding rounds, and investors",
    dataTypes: ["funding", "acquisitions", "investors", "companies", "people"]
  },
  {
    name: "CB Insights",
    type: "analytics",
    url: "https://www.cbinsights.com",
    requiresAuth: true,
    description: "Market intelligence platform for venture capital and startup analytics",
    dataTypes: ["market-analysis", "trends", "valuations", "investor-activity"]
  },
  {
    name: "PitchBook",
    type: "funding",
    url: "https://pitchbook.com",
    requiresAuth: true,
    description: "Private market data and financial research platform",
    dataTypes: ["private-equity", "venture-capital", "m&a", "valuations"]
  },
  {
    name: "Dealroom",
    type: "analytics",
    url: "https://dealroom.co",
    apiEndpoint: "https://api.dealroom.co/v1",
    requiresAuth: true,
    description: "European-focused startup and investment intelligence platform",
    dataTypes: ["startups", "investors", "ecosystems", "funding-rounds"]
  },
  {
    name: "Tracxn",
    type: "analytics",
    url: "https://tracxn.com",
    requiresAuth: true,
    description: "Technology and data for venture capital and corporate development",
    dataTypes: ["startups", "sectors", "investors", "m&a"]
  },

  // Middle East & Africa Focus
  {
    name: "MAGNiTT",
    type: "regional",
    url: "https://magnitt.com",
    region: "MENA",
    requiresAuth: true,
    description: "MENA region's leading venture data platform",
    dataTypes: ["mena-startups", "mena-funding", "mena-investors"]
  },
  {
    name: "Wamda",
    type: "news",
    url: "https://www.wamda.com",
    region: "MENA",
    requiresAuth: false,
    description: "Middle East entrepreneurship news and insights",
    dataTypes: ["mena-news", "ecosystem-updates", "founder-stories"]
  },
  {
    name: "Saudi Venture Capital Company (SVC)",
    type: "regional",
    url: "https://svc.com.sa",
    region: "Saudi Arabia",
    requiresAuth: false,
    description: "Saudi Arabia's government venture capital investment company",
    dataTypes: ["saudi-funding", "government-vc", "local-startups"]
  },
  {
    name: "OurCrowd",
    type: "regional",
    url: "https://www.ourcrowd.com",
    region: "Israel",
    requiresAuth: true,
    description: "Israel-based equity crowdfunding platform",
    dataTypes: ["israeli-startups", "crowdfunding", "tech-investments"]
  },
  {
    name: "Flat6Labs",
    type: "regional",
    url: "https://flat6labs.com",
    region: "MENA",
    requiresAuth: false,
    description: "MENA region seed investor and accelerator",
    dataTypes: ["accelerator", "seed-funding", "mena-startups"]
  },
  {
    name: "Hub71",
    type: "regional",
    url: "https://hub71.com",
    region: "UAE",
    requiresAuth: false,
    description: "Abu Dhabi's global tech ecosystem",
    dataTypes: ["uae-tech", "ecosystem", "government-support"]
  },

  // Asia-Pacific Focus
  {
    name: "DealStreetAsia",
    type: "news",
    url: "https://www.dealstreetasia.com",
    region: "Asia",
    requiresAuth: true,
    description: "Asia-focused financial news and intelligence platform",
    dataTypes: ["asian-deals", "pe-vc-news", "market-analysis"]
  },
  {
    name: "KrAsia",
    type: "news",
    url: "https://kr-asia.com",
    region: "Asia",
    requiresAuth: false,
    description: "Decoding China's tech and business pulse",
    dataTypes: ["china-tech", "asian-startups", "market-insights"]
  },
  {
    name: "Tech in Asia",
    type: "news",
    url: "https://www.techinasia.com",
    region: "Asia",
    requiresAuth: false,
    description: "Connecting Asia's startup ecosystem",
    dataTypes: ["asian-startups", "funding-news", "ecosystem-updates"]
  },
  {
    name: "e27",
    type: "news",
    url: "https://e27.co",
    region: "Asia",
    requiresAuth: false,
    description: "Connecting to Asia's startup and tech ecosystem",
    dataTypes: ["startup-news", "funding-rounds", "ecosystem-insights"]
  },
  {
    name: "Nikkei Asia",
    type: "news",
    url: "https://asia.nikkei.com",
    region: "Asia",
    requiresAuth: true,
    description: "Asian business and financial news",
    dataTypes: ["business-news", "market-analysis", "deal-watch"]
  }
];

// Helper function to get sources by type
export function getSourcesByType(type: MarketDataSource['type']): MarketDataSource[] {
  return marketIntelligenceSources.filter(source => source.type === type);
}

// Helper function to get sources by region
export function getSourcesByRegion(region: string): MarketDataSource[] {
  return marketIntelligenceSources.filter(source => 
    source.region?.toLowerCase().includes(region.toLowerCase())
  );
}

// Helper function to get free sources (no auth required)
export function getFreeSources(): MarketDataSource[] {
  return marketIntelligenceSources.filter(source => !source.requiresAuth);
}

// Configuration for API integrations (when keys are available)
export const sourceAPIConfigs = {
  crunchbase: {
    headers: {
      'X-cb-user-key': process.env.CRUNCHBASE_API_KEY || ''
    },
    rateLimit: 200, // requests per minute
  },
  dealroom: {
    headers: {
      'Authorization': `Bearer ${process.env.DEALROOM_API_KEY || ''}`
    },
    rateLimit: 60,
  },
  // Add more API configurations as needed
};

// Function to check which sources have API keys configured
export function getConfiguredSources(): MarketDataSource[] {
  const configured: MarketDataSource[] = [];
  
  if (process.env.CRUNCHBASE_API_KEY) {
    const crunchbase = marketIntelligenceSources.find(s => s.name === "Crunchbase");
    if (crunchbase) configured.push(crunchbase);
  }
  
  if (process.env.DEALROOM_API_KEY) {
    const dealroom = marketIntelligenceSources.find(s => s.name === "Dealroom");
    if (dealroom) configured.push(dealroom);
  }
  
  // Add more checks for other API keys
  
  return configured;
}